import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Export the client if the environment variables are present, otherwise null.
if (!supabaseUrl) console.warn("VITE_SUPABASE_URL is missing in .env");
if (!supabaseAnonKey) console.warn("VITE_SUPABASE_ANON_KEY is missing in .env");

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
