/**
 * Helper pemuat aset brand Altvira untuk PDF Generator.
 * Mendukung pembacaan langsung di Node (via filesystem) dan di Browser (via public URL).
 * Menggunakan in-memory cache agar embedding gambar tidak dilakukan berulang.
 */

let cachedIconBytes: Uint8Array | null = null;
let cachedWordmarkBytes: Uint8Array | null = null;

export async function getAltviraIconBytes(): Promise<Uint8Array | null> {
  if (cachedIconBytes) return cachedIconBytes;

  try {
    // 1. Cek environment Node.js (Vitest, Test script, CLI)
    if (typeof process !== "undefined" && process?.versions?.node) {
      try {
        const fsMod = "fs";
        const pathMod = "path";
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const cwd = process.cwd();
        const candidatePaths = [
          path.resolve(cwd, "assets/brand/altvira-icon-dark.png"),
          path.resolve(cwd, "public/brand/altvira-icon-dark.png"),
          path.resolve(cwd, "assets/brand/altvira-icon.png"),
          path.resolve(cwd, "public/brand/altvira-icon.png"),
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            cachedIconBytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
            return cachedIconBytes;
          }
        }
      } catch {
        // Fallback to fetch
      }
    }

    // 2. Browser environment
    if (typeof window !== "undefined" && typeof fetch === "function") {
      const res = await fetch("/brand/altvira-icon-dark.png").catch(() => fetch("/brand/altvira-icon.png"));
      if (res && res.ok) {
        const buf = await res.arrayBuffer();
        cachedIconBytes = new Uint8Array(buf);
        return cachedIconBytes;
      }
    }
  } catch (err) {
    console.error("Gagal memuat ikon Altvira:", err);
  }

  return null;
}

export async function getAltviraWordmarkBytes(): Promise<Uint8Array | null> {
  if (cachedWordmarkBytes) return cachedWordmarkBytes;

  try {
    // 1. Cek environment Node.js
    if (typeof process !== "undefined" && process?.versions?.node) {
      try {
        const fsMod = "fs";
        const pathMod = "path";
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const cwd = process.cwd();
        const candidatePaths = [
          path.resolve(cwd, "assets/brand/altvira-wordmark-pdf.png"),
          path.resolve(cwd, "public/brand/altvira-wordmark-pdf.png"),
          path.resolve(cwd, "assets/brand/altvira-wordmark-dark.png"),
          path.resolve(cwd, "public/brand/altvira-wordmark-dark.png"),
          path.resolve(cwd, "assets/brand/altvira-wordmark.png"),
          path.resolve(cwd, "public/brand/altvira-wordmark.png"),
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            cachedWordmarkBytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
            return cachedWordmarkBytes;
          }
        }
      } catch {
        // Fallback to fetch
      }
    }

    // 2. Browser environment
    if (typeof window !== "undefined" && typeof fetch === "function") {
      const res = await fetch("/brand/altvira-wordmark-pdf.png")
        .catch(() => fetch("/brand/altvira-wordmark-dark.png"))
        .catch(() => fetch("/brand/altvira-wordmark.png"));
      if (res && res.ok) {
        const buf = await res.arrayBuffer();
        cachedWordmarkBytes = new Uint8Array(buf);
        return cachedWordmarkBytes;
      }
    }
  } catch (err) {
    console.error("Gagal memuat wordmark Altvira:", err);
  }

  return null;
}
