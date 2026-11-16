export const COMPANY_EXT_STORAGE_KEY = "altcycles_company_ext_v1";
export const CUSTOMER_EXT_STORAGE_KEY = "altcycles_customers_ext_v1";
export const LOGIN_MEDIA_STORAGE_KEY = "altcycles_login_media_v1";
export const LOGIN_ACTIVE_CACHE_KEY = "altcycles_login_active_media_cache_v1";

export function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Abaikan kuota storage
  }
}
