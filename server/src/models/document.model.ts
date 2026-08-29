import { supabaseClient } from '../config/db';
import { DocumentRecord, DocumentStatus } from '../types';
import crypto from 'crypto';

const inMemoryDocuments: DocumentRecord[] = [];

export const DocumentModel = {
  async create(docData: {
    title: string;
    filename: string;
    file_size: number;
    mime_type?: string;
    uploaded_by: string;
  }): Promise<DocumentRecord> {
    const id = crypto.randomUUID ? crypto.randomUUID() : `doc-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const newDoc: DocumentRecord = {
      id,
      title: docData.title,
      filename: docData.filename,
      file_size: docData.file_size,
      mime_type: docData.mime_type || 'application/pdf',
      status: 'pending',
      total_pages: 0,
      total_chunks: 0,
      error_message: null,
      uploaded_by: docData.uploaded_by,
      created_at: createdAt,
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('documents')
        .insert([newDoc])
        .select()
        .single();

      if (!error && data) {
        return data as DocumentRecord;
      }
      console.warn('Supabase document create failed or table missing, falling back to local memory store.', error?.message);
    }

    inMemoryDocuments.push(newDoc);
    return newDoc;
  },

  async updateStatus(
    id: string,
    status: DocumentStatus,
    stats?: { total_pages?: number; total_chunks?: number; error_message?: string | null }
  ): Promise<DocumentRecord | null> {
    const updates: Partial<DocumentRecord> = { status };
    if (stats?.total_pages !== undefined) updates.total_pages = stats.total_pages;
    if (stats?.total_chunks !== undefined) updates.total_chunks = stats.total_chunks;
    if (stats?.error_message !== undefined) updates.error_message = stats.error_message;

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return data as DocumentRecord;
      }
    }

    const docIndex = inMemoryDocuments.findIndex((d) => d.id === id);
    if (docIndex !== -1) {
      inMemoryDocuments[docIndex] = {
        ...inMemoryDocuments[docIndex],
        ...updates,
      };
      return inMemoryDocuments[docIndex];
    }

    return null;
  },

  async findAll(): Promise<DocumentRecord[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as DocumentRecord[];
      }
    }

    return [...inMemoryDocuments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async findById(id: string): Promise<DocumentRecord | null> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as DocumentRecord;
      }
    }

    const doc = inMemoryDocuments.find((d) => d.id === id);
    return doc || null;
  },

  async delete(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient
        .from('documents')
        .delete()
        .eq('id', id);

      if (!error) return true;
    }

    const index = inMemoryDocuments.findIndex((d) => d.id === id);
    if (index !== -1) {
      inMemoryDocuments.splice(index, 1);
      return true;
    }

    return false;
  },
};
