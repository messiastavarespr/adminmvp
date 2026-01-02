
import { createClient } from '@supabase/supabase-js';

// These environment variables should be set in .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
}

// SAFE MODE CLIENT - OPTIMIZED FOR STABILITY
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true, // RE-ENABLED: Essential for keeping user logged in
        autoRefreshToken: true, // RE-ENABLED: Essential for valid tokens
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 1, // Minimize events if it tries to connect
        }
    }
});

// REMOVED manual setAuth call which might be blocking
