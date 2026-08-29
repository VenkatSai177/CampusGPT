export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: UserResponse;
}

// --- Phase 2 Document & Chunk Types ---

export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export interface DocumentRecord {
  id: string;
  title: string;
  filename: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  total_pages: number;
  total_chunks: number;
  error_message?: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentChunkMetadata {
  document_id: string;
  document_title: string;
  filename: string;
  page_number: number;
  chunk_index: number;
  page_span?: number[];
  char_count?: number;
}

export interface DocumentChunkRecord {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  metadata: DocumentChunkMetadata;
  embedding?: number[] | null;
  created_at: string;
}

export interface ParsedPdfPage {
  page_number: number;
  text: string;
}

// --- Phase 5 Conversation & Message Types ---

export type MessageSender = 'user' | 'assistant';
export type MessageFeedback = 'like' | 'dislike' | null;

export interface SourceCitation {
  document_title: string;
  filename: string;
  page_number: number;
  chunk_index: number;
}

export interface ConversationRecord {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  text: string;
  sources: SourceCitation[];
  feedback: MessageFeedback;
  created_at: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      file?: any;
    }
  }
}
