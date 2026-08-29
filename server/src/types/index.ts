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
  embedding?: number[] | null; // Reserved for Phase 3 vector storage
  created_at: string;
}

export interface ParsedPdfPage {
  page_number: number;
  text: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      file?: any;
    }
  }
}
