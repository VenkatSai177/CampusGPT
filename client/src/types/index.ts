export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

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
