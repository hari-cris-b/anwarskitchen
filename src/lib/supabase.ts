import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create the default client with anonymous key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a client for admin operations using service role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey ?? supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});