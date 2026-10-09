import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ufewrzrelrvdvuhhumde.supabase.co';
const storedAnonKey = typeof window !== 'undefined' ? localStorage.getItem('fertiflow_supabase_anon_key') : null;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || storedAnonKey || '';

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20);
};

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const setSupabaseAnonKey = (key) => {
  if (key && key.trim()) {
    localStorage.setItem('fertiflow_supabase_anon_key', key.trim());
    window.location.reload();
  }
};
