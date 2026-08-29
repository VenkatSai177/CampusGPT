import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let supabaseClient: SupabaseClient | null = null;

const url = env.SUPABASE_URL ? env.SUPABASE_URL.trim() : '';
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY ? (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY).trim() : '';

const isValidSupabaseConfig =
  url.length > 10 &&
  url.startsWith('https://') &&
  !url.includes('your-supabase-project-ref') &&
  key.length > 20 &&
  !key.includes('your_supabase_');

if (isValidSupabaseConfig) {
  try {
    supabaseClient = createClient(url, key);
    console.log(`[MODE] 🟢 REAL SUPABASE DATABASE ACTIVE (URL: ${url})`);
  } catch (err: any) {
    console.warn(`[MODE] ⚠️ Failed to initialize Supabase client: ${err.message}. Switching to fallback.`);
  }
} else {
  console.log('[MODE] 🟡 EXPLICIT LOCAL FALLBACK MODE: Supabase credentials not provided in .env. Utilizing in-memory repository for local development.');
}

export { supabaseClient };
