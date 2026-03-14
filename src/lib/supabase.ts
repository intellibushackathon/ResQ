import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "public" | "staff" | "admin";

export type ProfileRecord = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: AppRole | null;
  staff_org: string | null;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

