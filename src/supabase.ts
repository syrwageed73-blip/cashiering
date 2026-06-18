import { createClient } from '@supabase/supabase-js';
import { appConfig } from '../config.js';

const supabaseUrl = appConfig.supabase.url;
const supabaseAnonKey = appConfig.supabase.anonKey;

export const hasSupabaseAuthConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseAuthConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
