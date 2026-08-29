import { supabaseClient } from '../config/db';
import { DocumentChunkRecord } from '../types';
import { PreparedChunk } from '../services/chunking.service';
import { EmbeddingService } from '../services/embedding.service';
import crypto from 'crypto';

const inMemoryChunks: DocumentChunkRecord[] = [];

export interface SearchResultChunk extends DocumentChunkRecord {
  similarity: number;
}

export const ChunkModel = {
  async createMany(
    documentId: string,
    chunks: PreparedChunk[],
    embeddings?: number[][]
  ): Promise<DocumentChunkRecord[]> {
    const createdAt = new Date().toISOString();

    const chunkRecords: DocumentChunkRecord[] = chunks.map((c, index) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `chunk-${Date.now()}-${c.chunk_index}`,
      document_id: documentId,
      chunk_index: c.chunk_index,
      page_number: c.page_number,
      content: c.content,
      metadata: c.metadata,
      embedding: embeddings && embeddings[index] ? embeddings[index] : null,
      created_at: createdAt,
    }));

    if (supabaseClient && chunkRecords.length > 0) {
      const { data, error } = await supabaseClient
        .from('document_chunks')
        .insert(chunkRecords)
        .select();

      if (!error && data) {
        return data as DocumentChunkRecord[];
      }
      console.warn('Supabase chunk batch insertion failed or table missing, falling back to local memory store.', error?.message);
    }

    inMemoryChunks.push(...chunkRecords);
    return chunkRecords;
  },

  async updateEmbeddings(
    documentId: string,
    embeddings: { chunk_index: number; embedding: number[] }[]
  ): Promise<void> {
    if (supabaseClient) {
      for (const item of embeddings) {
        await supabaseClient
          .from('document_chunks')
          .update({ embedding: item.embedding })
          .eq('document_id', documentId)
          .eq('chunk_index', item.chunk_index);
      }
    }

    // Update in-memory fallback store
    for (const item of embeddings) {
      const target = inMemoryChunks.find(
        (c) => c.document_id === documentId && c.chunk_index === item.chunk_index
      );
      if (target) {
        target.embedding = item.embedding;
      }
    }
  },

  async findByDocumentId(documentId: string): Promise<DocumentChunkRecord[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('document_chunks')
        .select('*')
        .eq('document_id', documentId)
        .order('chunk_index', { ascending: true });

      if (!error && data) {
        return data as DocumentChunkRecord[];
      }
    }

    return inMemoryChunks
      .filter((c) => c.document_id === documentId)
      .sort((a, b) => a.chunk_index - b.chunk_index);
  },

  async searchVectorSimilarity(
    queryEmbedding: number[],
    topK: number,
    threshold: number
  ): Promise<SearchResultChunk[]> {
    // 1. Try Supabase pgvector RPC search
    if (supabaseClient) {
      const { data, error } = await supabaseClient.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_count: topK,
        similarity_threshold: threshold,
      });

      if (!error && data) {
        return data as SearchResultChunk[];
      }
    }

    // 2. Fallback in-memory vector similarity search
    const results: SearchResultChunk[] = [];

    for (const chunk of inMemoryChunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;

      const similarity = EmbeddingService.computeCosineSimilarity(queryEmbedding, chunk.embedding);
      if (similarity >= threshold) {
        results.push({
          ...chunk,
          similarity,
        });
      }
    }

    // Sort descending by similarity score and take topK
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  },

  async deleteByDocumentId(documentId: string): Promise<number> {
    let deletedCount = 0;

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId)
        .select();

      if (!error && data) {
        deletedCount = data.length;
      }
    }

    // Purge in-memory chunks
    for (let i = inMemoryChunks.length - 1; i >= 0; i--) {
      if (inMemoryChunks[i].document_id === documentId) {
        inMemoryChunks.splice(i, 1);
        deletedCount++;
      }
    }

    return deletedCount;
  },
};
