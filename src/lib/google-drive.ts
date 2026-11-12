/**
 * Utilitas Integrasi Google Drive untuk Sistem Altcycles
 * Mendukung ekstraksi File ID dari berbagai format URL sharing Google Drive,
 * pembentukan direct thumbnail/image URL, dan pengambilan berkas.
 */

/**
 * Mengekstrak Google Drive File ID dari URL atau teks ID mentah.
 * Mendukung format:
 * - https://drive.google.com/file/d/FILE_ID/view...
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID...
 * - https://docs.google.com/document/d/FILE_ID/...
 * - https://docs.google.com/spreadsheets/d/FILE_ID/...
 * - ID mentah (panjang 25-60 karakter alfanumerik)
 */
export function extractGoogleDriveFileId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Cek format /file/d/ID atau /d/ID
  const fileDMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch?.[1]) {
    return fileDMatch[1];
  }

  // 2. Cek format query param id=ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch?.[1]) {
    return idParamMatch[1];
  }

  // 3. Cek format open?id=ID
  const openMatch = trimmed.match(/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch?.[1]) {
    return openMatch[1];
  }

  // 4. Cek apakah string adalah File ID mentah langsung (karakter alfanumerik dengan panjang wajar)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Menghasilkan URL direct image/thumbnail resmi dari Google User Content
 * yang dapat langsung dimuat pada elemen <img> tanpa hambatan otorisasi web.
 */
export function getGoogleDriveDirectImageUrl(fileId: string): string {
  // lh3.googleusercontent.com/d/ adalah endpoint resmi Google untuk streaming gambar langsung
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Menghasilkan URL pratinjau web Google Drive standar
 */
export function getGoogleDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export interface GoogleDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeFormatted: string;
  thumbnailUrl: string;
  directImageUrl: string;
  viewUrl: string;
  category: "image" | "document";
  folderId?: string; // e.g. "my-drive", "shared", "recent", "starred"
  modifiedDate: string;
}

// Koleksi berkas Google Drive pengguna (dimulai dari berkas yang ditautkan langsung oleh pengguna)
export const DEFAULT_GOOGLE_DRIVE_FILES: GoogleDriveFileItem[] = [];

const STORAGE_KEY = "altcycles_google_drive_files_v1";

/**
 * Mengambil daftar berkas Google Drive pengguna (kombinasi berkas tersimpan di cache + default)
 */
export function getSavedGoogleDriveFiles(category?: "image" | "document"): GoogleDriveFileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let items: GoogleDriveFileItem[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items) || items.length === 0) {
      items = DEFAULT_GOOGLE_DRIVE_FILES;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    if (category) {
      return items.filter((item) => item.category === category);
    }
    return items;
  } catch {
    return category
      ? DEFAULT_GOOGLE_DRIVE_FILES.filter((i) => i.category === category)
      : DEFAULT_GOOGLE_DRIVE_FILES;
  }
}

/**
 * Menyimpan berkas baru ke daftar Google Drive pengguna
 */
export function saveGoogleDriveFile(item: GoogleDriveFileItem): void {
  try {
    const current = getSavedGoogleDriveFiles();
    const updated = [item, ...current.filter((x) => x.id !== item.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Abaikan jika localStorage dibatasi
  }
}

