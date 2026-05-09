import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://odmctbgjjonlhyfojfva.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbWN0Ymdqam9ubGh5Zm9qZnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNzQ3NzksImV4cCI6MjA5Mzg1MDc3OX0.cMndolw9OzhxMALaAOwwDpnX8iZbbREErVQJRe3-GTA";

// Export the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
