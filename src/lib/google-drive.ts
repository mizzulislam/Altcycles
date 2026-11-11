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
 * Menghasilkan URL thumbnail Google Drive alternatif dengan ukuran tertentu
 */
export function getGoogleDriveThumbnailUrl(fileId: string, size = 800): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
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
const AUTH_STORAGE_KEY = "altcycles_google_drive_auth_v1";

export interface GoogleDriveUserSession {
  email: string;
  name: string;
  connectedAt: string;
}

export function isGoogleDriveAuthenticated(): boolean {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getGoogleDriveUserSession(): GoogleDriveUserSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setGoogleDriveUserSession(email: string, name = "Akun Google Terhubung"): void {
  try {
    const session: GoogleDriveUserSession = {
      email,
      name,
      connectedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore
  }
}

export function disconnectGoogleDriveUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

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


/**
 * Mengunduh gambar dari Google Drive (jika dibagikan publik) dan mengonversinya
 * menjadi instance `File` JavaScript yang siap diunggah ke storage internal.
 */
export async function fetchGoogleDriveImageAsFile(
  fileId: string,
  fileName = "google-drive-image.jpg",
): Promise<File> {
  const directUrl = getGoogleDriveDirectImageUrl(fileId);
  try {
    const response = await fetch(directUrl, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`Google Drive merespons dengan status ${response.status}`);
    }
    const blob = await response.blob();
    return new File([blob], fileName, {
      type: blob.type || "image/jpeg",
    });
  } catch {
    // Jika CORS fetch gagal (misal file private), kembalikan null atau gunakan direct URL langsung
    throw new Error(
      "Tidak dapat mengunduh berkas langsung dari Google Drive. Pastikan izin berbagi file disetel ke 'Siapa saja yang memiliki link'.",
    );
  }
}

