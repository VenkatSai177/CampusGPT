import { VectorService, FormattedRetrievalResult } from './vector.service';
import { LLMService } from './llm.service';
import { env } from '../config/env';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export interface SourceCitation {
  document_title: string;
  filename: string;
  page_number: number;
  chunk_index: number;
}

export interface LatencyBreakdown {
  retrieval_ms: number;
  llm_generation_ms: number;
  total_rag_ms: number;
}

export interface RAGQueryResponse {
  answer: string;
  sources: SourceCitation[];
  grounded: boolean;
  fallback: boolean;
  similarity_score?: number;
  latency?: LatencyBreakdown;
}

export const SAFE_RAG_FALLBACK_MESSAGE =
  'I could not find relevant official college information regarding your request.';

// Check if live API key is configured
const rawKey = env.GEMINI_API_KEY ? env.GEMINI_API_KEY.trim() : '';
const isLiveApiKeyPresent =
  rawKey.length > 35 &&
  rawKey.startsWith('AIzaSy') &&
  !rawKey.includes('dummy') &&
  !rawKey.includes('your_') &&
  !rawKey.includes('_key') &&
  !rawKey.includes('MXqyKlo');

export const RAGService = {
  /**
   * Complete RAG Question-Answering Pipeline:
   * Query -> Vector Retrieval -> Threshold Check -> Grounded Context Assembly -> Gemini 2.0 Flash Synthesis -> Authoritative Source Citations
   */
  async processQuery(queryText: string): Promise<RAGQueryResponse> {
    const startTime = Date.now();

    // 1. Input Validation
    if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
      throw new AppError('Query text must be a non-empty string.', 400);
    }

    const trimmedQuery = queryText.trim();
    if (trimmedQuery.length > 1000) {
      throw new AppError('Query text exceeds maximum allowed length of 1000 characters.', 400);
    }

    logger.info(`🤖 Starting RAG Pipeline execution for query: "${trimmedQuery}"`);

    // Target threshold: 0.65 in production with live Gemini embeddings, 0.35 in local offline dev/testing mode
    const effectiveThreshold = isLiveApiKeyPresent ? env.RAG_SIMILARITY_THRESHOLD : 0.35;

    // 2. Vector Similarity Search
    const retrievalStart = Date.now();
    const searchResponse = await VectorService.searchRelevantChunks(trimmedQuery, {
      topK: env.TOP_K,
      threshold: effectiveThreshold,
    });
    const retrievalMs = Date.now() - retrievalStart;

    // 3. Hard Hallucination Prevention Boundaries (Rules A & B)
    if (searchResponse.total_matches === 0 || searchResponse.results.length === 0) {
      logger.info('🛡️ Hard Boundary Triggered: 0 matches above similarity threshold. Skipping Gemini generation & returning safe fallback.');
      return {
        answer: SAFE_RAG_FALLBACK_MESSAGE,
        sources: [],
        grounded: false,
        fallback: true,
        similarity_score: 0,
        latency: {
          retrieval_ms: retrievalMs,
          llm_generation_ms: 0,
          total_rag_ms: Date.now() - startTime,
        },
      };
    }

    const topChunk = searchResponse.results[0];
    if (topChunk.similarity < effectiveThreshold) {
      logger.info(`🛡️ Hard Boundary Triggered: Top similarity (${topChunk.similarity}) is below threshold (${effectiveThreshold}). Returning safe fallback.`);
      return {
        answer: SAFE_RAG_FALLBACK_MESSAGE,
        sources: [],
        grounded: false,
        fallback: true,
        similarity_score: topChunk.similarity,
        latency: {
          retrieval_ms: retrievalMs,
          llm_generation_ms: 0,
          total_rag_ms: Date.now() - startTime,
        },
      };
    }

    // 4. Build Structured Grounded Context Document Stack
    const contextBlocks: string[] = searchResponse.results.map((chunk: FormattedRetrievalResult) => {
      return `---
Source: ${chunk.filename} | Page: ${chunk.page_number} | Chunk: ${chunk.chunk_index}

Content:
${chunk.content}
-----------------------------------------------------------------------------`;
    });

    const groundedContext = contextBlocks.join('\n\n');

    // 5. Call Gemini 2.0 Flash for Synthesis
    const llmStart = Date.now();
    const generatedAnswer = await LLMService.generateGroundedAnswer(groundedContext, trimmedQuery);
    const llmMs = Date.now() - llmStart;

    // 6. Construct Authoritative Source Provenance List & Deduplicate
    const sourceMap = new Map<string, SourceCitation>();

    for (const match of searchResponse.results) {
      const key = `${match.document_title}___${match.page_number}`;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, {
          document_title: match.document_title,
          filename: match.filename,
          page_number: match.page_number,
          chunk_index: match.chunk_index,
        });
      }
    }

    const deduplicatedSources = Array.from(sourceMap.values());
    const totalMs = Date.now() - startTime;

    logger.info(`🎉 RAG Pipeline Execution Completed in ${totalMs}ms (${deduplicatedSources.length} cited source pages).`);

    return {
      answer: generatedAnswer,
      sources: deduplicatedSources,
      grounded: true,
      fallback: false,
      similarity_score: topChunk.similarity,
      latency: {
        retrieval_ms: retrievalMs,
        llm_generation_ms: llmMs,
        total_rag_ms: totalMs,
      },
    };
  },
};
