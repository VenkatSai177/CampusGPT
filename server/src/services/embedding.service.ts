import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

let genAIClient: GoogleGenAI | null = null;
const rawKey = env.GEMINI_API_KEY ? env.GEMINI_API_KEY.trim() : '';

const isValidKeyFormat =
  rawKey.length > 35 &&
  rawKey.startsWith('AIzaSy') &&
  !rawKey.includes('dummy') &&
  !rawKey.includes('your_') &&
  !rawKey.includes('_key') &&
  !rawKey.includes('MXqyKlo');

if (isValidKeyFormat) {
  try {
    genAIClient = new GoogleGenAI({ apiKey: rawKey });
    logger.info(`✅ Google Gen AI SDK initialized with model: ${env.EMBEDDING_MODEL} (${env.EMBEDDING_DIMENSIONS}d).`);
  } catch (err: any) {
    logger.warn('Failed to initialize Google Gen AI SDK:', err.message);
  }
} else {
  if (env.ENABLE_DETERMINISTIC_EMBEDDING_FALLBACK) {
    logger.info('ℹ️ Live GEMINI_API_KEY not supplied or placeholder used. Utilizing deterministic 768-dim vector embedding generator for local dev/testing.');
  } else {
    logger.warn('⚠️ Live GEMINI_API_KEY missing or invalid in production configuration.');
  }
}

/**
 * Generates a deterministic, normalized 768-dimensional vector embedding for testing/dev
 * that maps words and stems into dense topic dimensions so semantic overlap produces realistic similarity scores.
 */
export function generateDeterministicEmbedding(text: string): number[] {
  const dim = env.EMBEDDING_DIMENSIONS; // 768
  const vector: number[] = new Array(dim).fill(0);
  const normalizedText = text.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
  const words = normalizedText.split(/\s+/).filter((w) => w.length >= 2);

  if (words.length === 0) {
    vector[0] = 1.0;
    return vector;
  }

  // Common stop words to exclude from hashing
  const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'what', 'where', 'when', 'how', 'who', 'which', 'are', 'was', 'were']);

  for (const word of words) {
    if (stopWords.has(word)) continue;

    // Stemming prefix (first 4 chars)
    const stem = word.length > 4 ? word.substring(0, 4) : word;

    let hash = 0;
    for (let i = 0; i < stem.length; i++) {
      hash = (hash << 5) - hash + stem.charCodeAt(i);
      hash |= 0;
    }

    // Spread word energy over 8 primary semantic topic dimensions
    const baseIdx = Math.abs(hash) % dim;
    for (let offset = 0; offset < 8; offset++) {
      const targetIdx = (baseIdx + offset * 97) % dim;
      vector[targetIdx] += 1.0 / (offset + 1);
    }
  }

  // Calculate L2 norm and normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] = parseFloat((vector[i] / magnitude).toFixed(6));
    }
  } else {
    vector[0] = 1.0;
  }

  return vector;
}

export const EmbeddingService = {
  /**
   * Generates a 768-dimensional embedding vector for a single string.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new AppError('Text content cannot be empty for embedding generation.', 400);
    }

    if (!genAIClient) {
      if (!env.ENABLE_DETERMINISTIC_EMBEDDING_FALLBACK) {
        throw new AppError('Google Gemini Embedding API key is missing or invalid, and fallback generator is disabled in production.', 500);
      }
      return generateDeterministicEmbedding(text);
    }

    let retries = 2;
    let delayMs = 300;

    while (retries > 0) {
      try {
        const response: any = await genAIClient.models.embedContent({
          model: env.EMBEDDING_MODEL,
          contents: text,
        });

        const embeddingValues = response.embedding?.values || response.embeddings?.[0]?.values;
        if (!embeddingValues || !Array.isArray(embeddingValues)) {
          throw new AppError('Invalid embedding response format received from Gemini API.', 502);
        }

        // Validate dimension
        if (embeddingValues.length !== env.EMBEDDING_DIMENSIONS) {
          throw new AppError(
            `Embedding dimension mismatch: expected ${env.EMBEDDING_DIMENSIONS}, received ${embeddingValues.length}`,
            500
          );
        }

        return embeddingValues;
      } catch (error: any) {
        if (
          error.message &&
          (error.message.includes('API key not valid') ||
            error.message.includes('API_KEY_INVALID') ||
            error.message.includes('INVALID_ARGUMENT'))
        ) {
          if (!env.ENABLE_DETERMINISTIC_EMBEDDING_FALLBACK) {
            throw new AppError(`Gemini API key error in production: ${error.message}`, 502);
          }
          logger.warn('⚠️ Gemini API Key invalid or expired. Falling back to deterministic local embedding generator for testing.');
          genAIClient = null;
          return generateDeterministicEmbedding(text);
        }

        retries--;
        if (retries === 0) {
          if (!env.ENABLE_DETERMINISTIC_EMBEDDING_FALLBACK) {
            throw new AppError(`Gemini Embedding API call failed: ${error.message}`, 502);
          }
          logger.warn('Gemini Embedding API call failed after retries. Falling back to local deterministic embedding generator.');
          genAIClient = null;
          return generateDeterministicEmbedding(text);
        }
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
      }
    }

    if (!env.ENABLE_DETERMINISTIC_EMBEDDING_FALLBACK) {
      throw new AppError('Gemini Embedding generation failed in production mode.', 500);
    }
    return generateDeterministicEmbedding(text);
  },

  /**
   * Generates embeddings for a batch of text strings while preserving order.
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    logger.info(`🔢 Generating batch embeddings for ${texts.length} text chunks...`);

    if (!genAIClient) {
      if (!env.ENABLE_DETERMINISTIC_EMBEDDING_FALLBACK) {
        throw new AppError('Google Gemini Embedding API key is missing or invalid in production.', 500);
      }
      return texts.map((t) => generateDeterministicEmbedding(t));
    }

    const results: number[][] = [];
    const batchSize = 10;

    for (let i = 0; i < texts.length; i += batchSize) {
      const chunkBatch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        chunkBatch.map((text) => this.generateEmbedding(text))
      );
      results.push(...batchResults);

      if (!genAIClient && !env.ENABLE_DETERMINISTIC_EMBEDDING_FALLBACK) {
        throw new AppError('Gemini API connection lost during batch embedding generation in production.', 502);
      }
    }

    return results;
  },

  /**
   * Helper utility to compute cosine similarity between two numeric vectors.
   */
  computeCosineSimilarity(v1: number[], v2: number[]): number {
    if (!v1 || !v2 || v1.length !== v2.length || v1.length === 0) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return parseFloat(similarity.toFixed(4));
  },
};
