import { createClient } from '@supabase/supabase-js';

// These variables should be in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Safety check: Ensure environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * The central Supabase client instance.
 * We export this so 'utils.ts' can use it to create the shortcuts.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
