import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let supabaseClient: SupabaseClient | null = null;

if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY && !env.SUPABASE_URL.includes('your-supabase-project-ref')) {
  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized.');
} else {
  console.log('ℹ️ Supabase credentials not provided or placeholder used. Utilizing in-memory mock repository for local development.');
}

export { supabaseClient };
