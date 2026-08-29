import { supabaseClient } from '../config/db';
import { DocumentChunkRecord } from '../types';
import { PreparedChunk } from '../services/chunking.service';
import crypto from 'crypto';

const inMemoryChunks: DocumentChunkRecord[] = [];

export const ChunkModel = {
  async createMany(
    documentId: string,
    chunks: PreparedChunk[]
  ): Promise<DocumentChunkRecord[]> {
    const createdAt = new Date().toISOString();

    const chunkRecords: DocumentChunkRecord[] = chunks.map((c) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `chunk-${Date.now()}-${c.chunk_index}`,
      document_id: documentId,
      chunk_index: c.chunk_index,
      page_number: c.page_number,
      content: c.content,
      metadata: c.metadata,
      embedding: null, // Reserved for Phase 3 vector calculations
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
