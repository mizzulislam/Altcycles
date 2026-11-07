import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";
const demoEnvFlag =
  (import.meta.env.VITE_DEMO_MODE as string | undefined)?.trim() === "true";

export const isDemoMode =
  demoEnvFlag ||
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes("your-project-ref");

export const IDLE_TIMEOUT_MINUTES = Math.max(
  5,
  Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES ?? 30) || 30,
);

export const supabase: SupabaseClient<Database> | null = isDemoMode
  ? null
  : createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

