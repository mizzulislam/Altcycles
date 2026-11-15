import * as React from "react";
import { isDemoMode, supabase } from "@/lib/supabase";

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

const DATA_UPDATED_EVENT = "altcycles:data-updated";
const BROADCAST_CHANNEL_NAME = "altcycles_realtime_sync_v1";

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === DATA_UPDATED_EVENT) {
        memoryCache.clear();
        window.dispatchEvent(
          new CustomEvent(DATA_UPDATED_EVENT, {
            detail: { source: "broadcast", ts: Date.now() },
          }),
        );
      }
    };
  }
} catch {
  // Ignore if BroadcastChannel is not supported
}

/**
 * Mengambil nilai terakhir dari cache memori secara sinkron (jika tersedia).
 */
export function peekCache<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);
  return entry ? (entry.data as T) : undefined;
}

/**
 * Menjalankan query dengan fitur:
 * 1. Request Deduplication (mencegah query identik dieksekusi ganda secara paralel)
 * 2. In-Memory SWR Cache (mengembalikan hasil instan saat berpindah tab/halaman pada koneksi lambat,
 *    sembari menyegarkan data di latar belakang jika sudah melewati staleMs).
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { staleMs?: number; forceRefresh?: boolean },
): Promise<T> {
  const staleMs = options?.staleMs ?? 15_000;
  const now = Date.now();
  const existing = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (!options?.forceRefresh && existing) {
    const age = now - existing.timestamp;
    if (age < staleMs) {
      return existing.data;
    }
    // Stale-while-revalidate: kembalikan data lama secara instan dan segarkan di background
    if (!inFlightRequests.has(key)) {
      const bgPromise = fetcher()
        .then((fresh) => {
          memoryCache.set(key, { data: fresh, timestamp: Date.now() });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent(DATA_UPDATED_EVENT, {
                detail: { topic: key, ts: Date.now() },
              }),
            );
          }
          return fresh;
        })
        .catch(() => existing.data)
        .finally(() => {
          inFlightRequests.delete(key);
        });
      inFlightRequests.set(key, bgPromise);
    }
    return existing.data;
  }

  const inFlight = inFlightRequests.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const promise = fetcher()
    .then((result) => {
      memoryCache.set(key, { data: result, timestamp: Date.now() });
      return result;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Mengosongkan cache dan memberi tahu seluruh komponen/tab aktif agar memperbarui tampilan secara real-time.
 */
export function invalidateAndNotifyDataChange(topic = "all"): void {
  memoryCache.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(DATA_UPDATED_EVENT, {
        detail: { topic, ts: Date.now() },
      }),
    );
  }
  try {
    broadcastChannel?.postMessage({
      type: DATA_UPDATED_EVENT,
      topic,
      ts: Date.now(),
    });
  } catch {
    // Ignore broadcast errors
  }
}

let realtimeInitialized = false;
let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Mengaktifkan langganan Supabase Realtime (postgres_changes) agar setiap perubahan
 * pada tabel database langsung memperbarui UI secara real-time.
 */
export function initSupabaseRealtimeSync(): () => void {
  if (realtimeInitialized || isDemoMode || !supabase) return () => {};
  realtimeInitialized = true;

  try {
    const channel = supabase
      .channel("altcycles-global-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          if (realtimeDebounceTimer) {
            clearTimeout(realtimeDebounceTimer);
          }
          realtimeDebounceTimer = setTimeout(() => {
            memoryCache.clear();
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent(DATA_UPDATED_EVENT, {
                  detail: {
                    topic: payload.table ?? "postgres_changes",
                    ts: Date.now(),
                  },
                }),
              );
            }
          }, 180);
        },
      )
      .subscribe();

    return () => {
      try {
        if (supabase) void supabase.removeChannel(channel);
      } catch {
        // ignore
      }
      realtimeInitialized = false;
    };
  } catch {
    // Ignore if realtime is not enabled on the Supabase project
    return () => {};
  }
}

/**
 * Hook untuk menyegarkan data halaman secara otomatis ketika ada perubahan data lokal maupun real-time.
 */
export function useRealtimeSync(onRefresh: () => void | Promise<void>): void {
  const callbackRef = React.useRef(onRefresh);
  React.useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  React.useEffect(() => {
    initSupabaseRealtimeSync();
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const handleDataUpdated = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        void callbackRef.current();
      }, 80);
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    return () => {
      if (debounceId) clearTimeout(debounceId);
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, []);
}
