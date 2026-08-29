import { supabaseClient as supabase } from '../config/db';
import { MessageRecord, MessageSender, SourceCitation, MessageFeedback } from '../types';
import { ConversationModel } from './conversation.model';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// In-Memory Mock Repository for messages when Supabase credentials are missing
const mockMessages: MessageRecord[] = [];

export const MessageModel = {
  /**
   * Add a new message (user or assistant) to a conversation
   */
  async create(
    conversationId: string,
    sender: MessageSender,
    text: string,
    sources: SourceCitation[] = []
  ): Promise<MessageRecord> {
    const now = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender,
          text,
          sources: sources || [],
          feedback: null,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create message in Supabase:', error.message);
        throw new Error(`Database error creating message: ${error.message}`);
      }

      await ConversationModel.touch(conversationId);
      return data as MessageRecord;
    }

    // Mock Fallback
    const newMsg: MessageRecord = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender,
      text,
      sources: sources || [],
      feedback: null,
      created_at: now,
    };
    mockMessages.push(newMsg);
    await ConversationModel.touch(conversationId);
    return newMsg;
  },

  /**
   * List all messages for a given conversation ordered chronologically
   */
  async listByConversation(conversationId: string): Promise<MessageRecord[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch messages from Supabase:', error.message);
        return [];
      }
      return data as MessageRecord[];
    }

    return mockMessages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  /**
   * Find a message by ID
   */
  async findById(messageId: string): Promise<MessageRecord | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (error || !data) return null;
      return data as MessageRecord;
    }

    return mockMessages.find((m) => m.id === messageId) || null;
  },

  /**
   * Update user feedback ('like' | 'dislike') on an assistant message
   */
  async updateFeedback(messageId: string, feedback: MessageFeedback): Promise<MessageRecord | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .update({ feedback })
        .eq('id', messageId)
        .select()
        .single();

      if (error || !data) return null;
      return data as MessageRecord;
    }

    const msg = mockMessages.find((m) => m.id === messageId);
    if (msg) {
      msg.feedback = feedback;
      return { ...msg };
    }
    return null;
  },
};
