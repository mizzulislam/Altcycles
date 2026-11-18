/**
 * Pelacak Frekuensi Kunjungan Halaman Altcycles
 * Menyimpan riwayat kunjungan halaman di localStorage per role pengguna.
 * Dilengkapi in-memory fallback untuk lingkungan non-browser / SSR / unit testing.
 */

export interface PageVisitEntry {
  id: string;
  count: number;
  lastVisited: number;
}

const STORAGE_PREFIX = "altcycles_page_visits_v1";

// In-memory fallback untuk lingkungan node/SSR atau saat localStorage tidak tersedia
const inMemoryStore: Record<string, string> = {};

function getStorageKey(role: string): string {
  return `${STORAGE_PREFIX}_${role || "anonymous"}`;
}

function getStoredItem(key: string): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      // Abaikan error kuota / akses
    }
  }
  return inMemoryStore[key] || null;
}

function setStoredItem(key: string, value: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      // Abaikan error kuota / akses
    }
  }
  inMemoryStore[key] = value;
}

function removeStoredItem(key: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Abaikan
    }
  }
  delete inMemoryStore[key];
}

/**
 * Mencatat kunjungan ke suatu item halaman/rute
 */
export function recordPageVisit(pageId: string, role: string): void {
  if (!pageId) return;

  try {
    const key = getStorageKey(role);
    const raw = getStoredItem(key);
    const records: Record<string, PageVisitEntry> = raw ? JSON.parse(raw) : {};

    const existing = records[pageId] || { id: pageId, count: 0, lastVisited: 0 };
    records[pageId] = {
      id: pageId,
      count: existing.count + 1,
      lastVisited: Date.now(),
    };

    setStoredItem(key, JSON.stringify(records));
  } catch {
    // Abaikan kegagalan parsing
  }
}

/**
 * Mengambil daftar ID halaman yang paling sering dikunjungi untuk role tertentu
 */
export function getFrequentPageIds(role: string, limit: number = 5): string[] {
  try {
    const key = getStorageKey(role);
    const raw = getStoredItem(key);
    if (!raw) return [];

    const records: Record<string, PageVisitEntry> = JSON.parse(raw);
    const sorted = Object.values(records).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count; // Urutkan frekuensi tertinggi
      }
      return b.lastVisited - a.lastVisited; // Urutkan terbaru bila frekuensi sama
    });

    return sorted.slice(0, limit).map((entry) => entry.id);
  } catch {
    return [];
  }
}

/**
 * Mengosongkan riwayat kunjungan (misal untuk testing atau reset preferensi)
 */
export function clearPageVisitHistory(role?: string): void {
  try {
    if (role) {
      removeStoredItem(getStorageKey(role));
    } else {
      for (const r of ["super_admin", "admin", "user"]) {
        removeStoredItem(getStorageKey(r));
      }
    }
  } catch {
    // Silently ignore
  }
}
