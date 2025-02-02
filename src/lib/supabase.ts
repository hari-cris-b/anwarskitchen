import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create the default client with anonymous key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a client for admin operations
// Note: In production, this should use a service role key and be handled by a secure backend service
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);