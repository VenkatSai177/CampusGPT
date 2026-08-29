import { supabaseClient as supabase } from '../config/db';
import { ConversationRecord } from '../types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// In-Memory Mock Repository for conversations when Supabase credentials are missing
const mockConversations: ConversationRecord[] = [];

export const ConversationModel = {
  /**
   * Create a new conversation for a user
   */
  async create(userId: string, title: string): Promise<ConversationRecord> {
    const cleanTitle = title.trim().substring(0, 100) || 'New Conversation';
    const now = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: cleanTitle,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create conversation in Supabase:', error.message);
        throw new Error(`Database error creating conversation: ${error.message}`);
      }
      return data as ConversationRecord;
    }

    // Mock Fallback
    const newConv: ConversationRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: cleanTitle,
      created_at: now,
      updated_at: now,
    };
    mockConversations.unshift(newConv);
    return newConv;
  },

  /**
   * Find a conversation by ID and verify user ownership
   */
  async findByIdAndUser(id: string, userId: string): Promise<ConversationRecord | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return data as ConversationRecord;
    }

    return mockConversations.find((c) => c.id === id && c.user_id === userId) || null;
  },

  /**
   * List all conversations owned by a user, ordered by most recently updated
   */
  async listByUser(userId: string): Promise<ConversationRecord[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Failed to list conversations from Supabase:', error.message);
        return [];
      }
      return data as ConversationRecord[];
    }

    return mockConversations
      .filter((c) => c.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  /**
   * Update updated_at timestamp and optionally title
   */
  async touch(id: string, newTitle?: string): Promise<void> {
    const now = new Date().toISOString();

    if (supabase) {
      const updates: any = { updated_at: now };
      if (newTitle) updates.title = newTitle.trim().substring(0, 100);

      await supabase.from('conversations').update(updates).eq('id', id);
      return;
    }

    const conv = mockConversations.find((c) => c.id === id);
    if (conv) {
      conv.updated_at = now;
      if (newTitle) conv.title = newTitle.trim().substring(0, 100);
    }
  },

  /**
   * Delete a conversation by ID for a user
   */
  async delete(id: string, userId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return !error;
    }

    const idx = mockConversations.findIndex((c) => c.id === id && c.user_id === userId);
    if (idx !== -1) {
      mockConversations.splice(idx, 1);
      return true;
    }
    return false;
  },
};
