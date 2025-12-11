
import { createClient } from '@supabase/supabase-js';

// These environment variables should be set in .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
