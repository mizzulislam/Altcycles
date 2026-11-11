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

const TAB_ID_SESSION_KEY = "altcycles_tab_instance_id";

function resolveTabAuthStorageKey(): string {
  if (typeof window === "undefined") return "altcycles-auth-server";
  try {
    let tabId = window.sessionStorage.getItem(TAB_ID_SESSION_KEY);
    if (!tabId) {
      tabId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID().slice(0, 12)
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(TAB_ID_SESSION_KEY, tabId);
    }
    return `altcycles-auth-${tabId}`;
  } catch {
    return "altcycles-auth-fallback";
  }
}

/** Storage key auth khusus per tab agar tiap tab browser dapat menguji akun berbeda secara terisolasi. */
export const TAB_AUTH_STORAGE_KEY = resolveTabAuthStorageKey();

export const supabase: SupabaseClient<Database> | null = isDemoMode
  ? null
  : createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
        storageKey: TAB_AUTH_STORAGE_KEY,
      },
    });
