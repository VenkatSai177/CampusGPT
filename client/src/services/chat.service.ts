import { api } from './api';

export interface SourceCitation {
  document_title: string;
  filename: string;
  page_number: number;
  chunk_index: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources: SourceCitation[];
  feedback: 'like' | 'dislike' | null;
  created_at: string;
}

export interface SendChatResponse {
  success: boolean;
  conversation_id: string;
  user_message_id?: string;
  assistant_message_id?: string;
  answer: string;
  sources: SourceCitation[];
  grounded: boolean;
  fallback: boolean;
  similarity_score?: number;
  latency?: {
    retrieval_ms: number;
    llm_generation_ms: number;
    total_rag_ms: number;
  };
}

export const chatService = {
  /**
   * List student's conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<{ success: boolean; conversations: Conversation[] }>('/conversations');
    return response.data.conversations;
  },

  /**
   * Get single conversation with full message history
   */
  async getConversationById(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const response = await api.get<{
      success: boolean;
      conversation: Conversation;
      messages: Message[];
    }>(`/conversations/${id}`);
    return {
      conversation: response.data.conversation,
      messages: response.data.messages,
    };
  },

  /**
   * Create a new conversation thread
   */
  async createConversation(title?: string): Promise<Conversation> {
    const response = await api.post<{ success: boolean; conversation: Conversation }>('/conversations', { title });
    return response.data.conversation;
  },

  /**
   * Delete a conversation thread
   */
  async deleteConversation(id: string): Promise<void> {
    await api.delete(`/conversations/${id}`);
  },

  /**
   * Send a query to the grounded RAG chat API
   */
  async sendQuery(query: string, conversationId?: string): Promise<SendChatResponse> {
    const response = await api.post<SendChatResponse>('/chat', {
      query,
      conversation_id: conversationId,
    });
    return response.data;
  },

  /**
   * Submit like/dislike feedback for an assistant message
   */
  async updateFeedback(messageId: string, feedback: 'like' | 'dislike' | null): Promise<Message> {
    const response = await api.patch<{ success: boolean; message: Message }>(`/messages/${messageId}/feedback`, {
      feedback,
    });
    return response.data.message;
  },
};
