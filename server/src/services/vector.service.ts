import { EmbeddingService } from './embedding.service';
import { ChunkModel, SearchResultChunk } from '../models/chunk.model';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface FormattedRetrievalResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  filename: string;
  page_number: number;
  chunk_index: number;
  content: string;
  similarity: number;
}

export interface RetrievalSearchResponse {
  query: string;
  top_k: number;
  similarity_threshold: number;
  total_matches: number;
  results: FormattedRetrievalResult[];
}

export const VectorService = {
  /**
   * Phase 3 Semantic Similarity Retrieval Engine:
   * 1. Converts natural language question to 768-dim query vector
   * 2. Executes pgvector Cosine similarity match query
   * 3. Filters results using RAG_SIMILARITY_THRESHOLD
   * 4. Orders results by relevance and takes Top-K
   */
  async searchRelevantChunks(
    query: string,
    options?: { topK?: number; threshold?: number }
  ): Promise<RetrievalSearchResponse> {
    const topK = options?.topK || env.TOP_K;
    const threshold = options?.threshold !== undefined ? options.threshold : env.RAG_SIMILARITY_THRESHOLD;

    logger.info(`🔍 Executing Vector Similarity Search for query: "${query}" (Top-K: ${topK}, Threshold: ${threshold})`);

    // 1. Generate query vector embedding
    const queryEmbedding = await EmbeddingService.generateEmbedding(query);

    // 2. Perform Cosine Similarity vector search
    const matches: SearchResultChunk[] = await ChunkModel.searchVectorSimilarity(
      queryEmbedding,
      topK,
      threshold
    );

    // 3. Format traceable retrieval results for Phase 4 citation generation
    const formattedResults: FormattedRetrievalResult[] = matches.map((m) => ({
      chunk_id: m.id,
      document_id: m.document_id,
      document_title: m.metadata?.document_title || 'College Document',
      filename: m.metadata?.filename || 'document.pdf',
      page_number: m.page_number,
      chunk_index: m.chunk_index,
      content: m.content,
      similarity: m.similarity,
    }));

    logger.info(`🎯 Vector Search Complete: Retrieved ${formattedResults.length} relevant chunk(s) (Max similarity: ${formattedResults[0]?.similarity || 0}).`);

    return {
      query,
      top_k: topK,
      similarity_threshold: threshold,
      total_matches: formattedResults.length,
      results: formattedResults,
    };
  },
};
