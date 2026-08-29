import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  // Phase 1 Required Variables
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_campusgpt_2026_dev_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Database Connection
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Phase 2 Ingestion Settings
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10),
  UPLOAD_TEMP_DIR: process.env.UPLOAD_TEMP_DIR || path.resolve(__dirname, '../../uploads/temp'),

  // Phase 3 Embedding & Retrieval Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'text-embedding-004',
  EMBEDDING_DIMENSIONS: parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10),
  RAG_SIMILARITY_THRESHOLD: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.65'),
  TOP_K: parseInt(process.env.TOP_K || '4', 10),

  // Future Phase Configuration (Phase 4+)
  LLM_MODEL: process.env.LLM_MODEL || 'gemini-2.0-flash',
};

// Validate critical Phase 1 environment variables
if (!env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET is not explicitly defined in .env. Using fallback key.');
}
