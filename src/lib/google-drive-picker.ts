/**
 * Modul Integrasi Resmi Google Drive Picker API & Google Identity Services (GSI)
 * Menggunakan library resmi Google (gapi + gis) untuk membuka Google Drive Picker asli.
 */

interface GooglePickerDoc {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  url?: string;
  thumbnails?: Array<{ url: string }>;
}

interface GooglePickerCallbackData {
  action: string;
  docs?: GooglePickerDoc[];
}

interface GoogleDocsViewInstance {
  setParent: (parentId: string) => GoogleDocsViewInstance;
  setIncludeFolders: (include: boolean) => GoogleDocsViewInstance;
  setSelectFolderEnabled: (enabled: boolean) => GoogleDocsViewInstance;
  setLabel: (label: string) => GoogleDocsViewInstance;
  setMimeTypes: (mimeTypes: string) => GoogleDocsViewInstance;
  setOwnedByMe: (ownedByMe: boolean) => GoogleDocsViewInstance;
  setStarred: (starred: boolean) => GoogleDocsViewInstance;
}

interface GooglePickerBuilderInstance {
  addView: (view: unknown) => GooglePickerBuilderInstance;
  enableFeature: (feature: string) => GooglePickerBuilderInstance;
  setSize: (width: number, height: number) => GooglePickerBuilderInstance;
  setLocale: (locale: string) => GooglePickerBuilderInstance;
  setOAuthToken: (token: string) => GooglePickerBuilderInstance;
  setDeveloperKey: (key: string) => GooglePickerBuilderInstance;
  setAppId: (appId: string) => GooglePickerBuilderInstance;
  setTitle: (title: string) => GooglePickerBuilderInstance;
  setCallback: (cb: (data: GooglePickerCallbackData) => void) => GooglePickerBuilderInstance;
  build: () => { setVisible: (visible: boolean) => void };
}

interface GoogleOAuthErrorResponse {
  message?: string;
}

interface GoogleOAuthTokenResponse {
  error?: string;
  access_token?: string;
  expires_in?: number | string;
}

interface GapiNamespace {
  load: (api: string, options: { callback: () => void }) => void;
}

interface GoogleNamespace {
  accounts?: {
    oauth2?: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        error_callback: (err: GoogleOAuthErrorResponse) => void;
        callback: (response: GoogleOAuthTokenResponse) => void;
      }) => { requestAccessToken: (options?: { prompt?: string }) => void };
    };
  };
  picker?: {
    Action: { PICKED: string; CANCEL: string };
    ViewId: {
      DOCS: string;
      RECENTLY_PICKED: string;
      DOCS_IMAGES: string;
    };
    Feature?: { SUPPORT_DRIVES?: string };
    DocsView: new (viewId: string) => GoogleDocsViewInstance;
    DocsUploadView: new () => unknown;
    PickerBuilder: new () => GooglePickerBuilderInstance;
  };
}

declare global {
  interface Window {
    gapi?: GapiNamespace;
    google?: GoogleNamespace;
  }
}

export interface GooglePickerItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  url: string;
  thumbnailUrl?: string;
  directImageUrl?: string;
}

const GAPI_SCRIPT_URL = "https://apis.google.com/js/api.js";
const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

// Cache script loading promises
let gapiLoadPromise: Promise<void> | null = null;
let gsiLoadPromise: Promise<void> | null = null;

export function loadGapiScript(): Promise<void> {
  if (gapiLoadPromise) return gapiLoadPromise;
  gapiLoadPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.gapi) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GAPI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Google API Script (api.js)"));
    document.body.appendChild(script);
  });
  return gapiLoadPromise;
}

export function loadGsiScript(): Promise<void> {
  if (gsiLoadPromise) return gsiLoadPromise;
  gsiLoadPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.google?.accounts) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Google Identity Services (gsi/client)"));
    document.body.appendChild(script);
  });
  return gsiLoadPromise;
}

export const GOOGLE_CLIENT_ID_STORAGE_KEY = "altcycles_google_client_id";
export const GOOGLE_API_KEY_STORAGE_KEY = "altcycles_google_api_key";
export const GOOGLE_OAUTH_TOKEN_KEY = "altcycles_google_oauth_token";
export const GOOGLE_OAUTH_EXPIRES_AT_KEY = "altcycles_google_oauth_expires_at";
export const GOOGLE_OAUTH_USER_EMAIL_KEY = "altcycles_google_oauth_user_email";
export const GOOGLE_OAUTH_USER_NAME_KEY = "altcycles_google_oauth_user_name";

export function getStoredGoogleCredentials(): { clientId: string; apiKey: string } {
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const envApiKey = import.meta.env.VITE_GOOGLE_API_KEY || "";
  const storedClientId =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY) || ""
      : "";
  const storedApiKey =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(GOOGLE_API_KEY_STORAGE_KEY) || ""
      : "";

  return {
    clientId: storedClientId || envClientId,
    apiKey: storedApiKey || envApiKey,
  };
}

export function saveStoredGoogleCredentials(clientId: string, apiKey: string): void {
  if (typeof localStorage !== "undefined") {
    if (clientId) localStorage.setItem(GOOGLE_CLIENT_ID_STORAGE_KEY, clientId.trim());
    if (apiKey) localStorage.setItem(GOOGLE_API_KEY_STORAGE_KEY, apiKey.trim());
  }
}

/**
 * Mengambil token akses OAuth 2.0 yang tersimpan jika masih berlaku
 */
export function getStoredGoogleOAuthToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem(GOOGLE_OAUTH_TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(GOOGLE_OAUTH_EXPIRES_AT_KEY) || 0);
  if (!token || !expiresAt) return null;
  // Jika sisa masa berlaku kurang dari 30 detik, anggap kedaluwarsa
  if (Date.now() >= expiresAt - 30_000) {
    clearStoredGoogleOAuthToken();
    return null;
  }
  return token;
}

/**
 * Menyimpan token akses OAuth 2.0 dan masa berlakunya di localStorage
 */
export function saveStoredGoogleOAuthToken(
  token: string,
  expiresInSeconds = 3600,
  email?: string,
  name?: string,
): void {
  if (typeof localStorage === "undefined") return;
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem(GOOGLE_OAUTH_TOKEN_KEY, token);
  localStorage.setItem(GOOGLE_OAUTH_EXPIRES_AT_KEY, String(expiresAt));
  if (email) localStorage.setItem(GOOGLE_OAUTH_USER_EMAIL_KEY, email);
  if (name) localStorage.setItem(GOOGLE_OAUTH_USER_NAME_KEY, name);
}

/**
 * Menghapus sesi login Google OAuth
 */
export function clearStoredGoogleOAuthToken(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_OAUTH_EXPIRES_AT_KEY);
  localStorage.removeItem(GOOGLE_OAUTH_USER_EMAIL_KEY);
  localStorage.removeItem(GOOGLE_OAUTH_USER_NAME_KEY);
}

/**
 * Memeriksa apakah pengguna saat ini sudah terhubung ke akun Google
 */
export function isGoogleOAuthConnected(): boolean {
  return getStoredGoogleOAuthToken() !== null;
}

/**
 * Mengambil informasi email & nama akun Google yang terhubung
 */
export function getGoogleOAuthUserInfo(): { email?: string; name?: string } | null {
  if (typeof localStorage === "undefined") return null;
  const email = localStorage.getItem(GOOGLE_OAUTH_USER_EMAIL_KEY);
  const name = localStorage.getItem(GOOGLE_OAUTH_USER_NAME_KEY);
  if (!email && !name) return null;
  return { email: email || undefined, name: name || undefined };
}

/**
 * Membuka Google Drive Picker Resmi dari Google.
 * Jika pengguna sudah pernah login di sesi ini, Google Picker akan langsung terbuka
 * tanpa memunculkan jendela popup login Google lagi.
 */
export async function openOfficialGooglePicker(options: {
  clientId?: string;
  apiKey?: string;
  mimeTypeFilter?: "image" | "document" | "all";
  onSelect: (item: GooglePickerItem) => void;
  onCancel?: () => void;
}): Promise<void> {
  const creds = getStoredGoogleCredentials();
  const clientId = options.clientId || creds.clientId;
  const apiKey = options.apiKey || creds.apiKey;

  if (!clientId || !apiKey) {
    throw new Error(
      "Kredensial Google Cloud (Client ID & API Key) belum dikonfigurasi pada sistem Altcycles (.env.local).",
    );
  }

  // Muat kedua script Google
  await Promise.all([loadGapiScript(), loadGsiScript()]);

  // Muat modul 'picker' gapi
  const gapi = window.gapi;
  if (!gapi) {
    throw new Error("Google API Script (gapi) belum siap digunakan.");
  }
  await new Promise<void>((resolve) => {
    gapi.load("picker", { callback: resolve });
  });

  // Injeksi style untuk memastikan dialog picker berukuran standar modal (tidak memenuhi layar) & terpusat sempurna
  const styleId = "altcycles-google-picker-dialog-style";
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    .picker-dialog {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 750px !important;
      height: 480px !important;
      max-width: 92vw !important;
      max-height: 88vh !important;
      z-index: 999999 !important;
      pointer-events: auto !important;
      border-radius: 14px !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45) !important;
      overflow: hidden !important;
      background: #ffffff !important;
    }
    .picker-dialog iframe {
      width: 100% !important;
      height: 100% !important;
      border: none !important;
    }
    .picker-dialog-bg {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 999998 !important;
      pointer-events: auto !important;
      background-color: rgba(0, 0, 0, 0.6) !important;
      backdrop-filter: blur(2px) !important;
    }
  `;

  return new Promise((resolve, reject) => {
    // Fungsi pembangun dan penampil Google Picker
    function renderPicker(accessToken: string) {
      try {
        const googlePicker = window.google?.picker;
        if (!googlePicker) {
          throw new Error("Modul Google Picker belum termuat dengan sempurna.");
        }
        const imgMimes = "image/png,image/jpeg,image/webp,image/gif";

        // View 1: Drive Saya (My Drive) - Menampilkan struktur folder root asli pengguna
        const myDriveView = new googlePicker.DocsView(
          googlePicker.ViewId.DOCS,
        )
          .setParent("root")
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false)
          .setLabel("Drive Saya");

        if (options.mimeTypeFilter === "image") {
          myDriveView.setMimeTypes(imgMimes);
        }

        // View 2: Dibagikan kepada saya (Shared with me)
        const sharedView = new googlePicker.DocsView(
          googlePicker.ViewId.DOCS,
        )
          .setOwnedByMe(false)
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false)
          .setLabel("Dibagikan dengan saya");

        if (options.mimeTypeFilter === "image") {
          sharedView.setMimeTypes(imgMimes);
        }

        // View 3: Terbaru (Recent)
        const recentView = new googlePicker.DocsView(
          googlePicker.ViewId.RECENTLY_PICKED,
        ).setLabel("Terbaru");

        // View 4: Berbintang (Starred)
        const starredView = new googlePicker.DocsView(
          googlePicker.ViewId.DOCS,
        )
          .setStarred(true)
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false)
          .setLabel("Berbintang");

        if (options.mimeTypeFilter === "image") {
          starredView.setMimeTypes(imgMimes);
        }

        // View 5: Upload langsung dari komputer ke Drive
        const uploadView = new googlePicker.DocsUploadView();

        // Inisialisasi PickerBuilder
        const pickerBuilder = new googlePicker.PickerBuilder()
          .addView(myDriveView)
          .addView(sharedView)
          .addView(recentView)
          .addView(starredView);

        // View tambahan: Jika mencari foto, tambahkan tab "Semua Gambar" untuk pencarian cepat
        if (options.mimeTypeFilter === "image") {
          const allImagesView = new googlePicker.DocsView(
            googlePicker.ViewId.DOCS_IMAGES,
          ).setLabel("Semua Gambar");
          pickerBuilder.addView(allImagesView);
        }

        // Tambahkan tab Upload
        pickerBuilder.addView(uploadView);

        // Aktifkan dukungan Shared Drives jika tersedia
        if (googlePicker.Feature?.SUPPORT_DRIVES) {
          pickerBuilder.enableFeature(googlePicker.Feature.SUPPORT_DRIVES);
        }

        // Ukuran standar modal Google Picker yang kompak dan proporsional (750px x 480px)
        // Pas di layar, tidak memenuhi seluruh layar, dan memiliki margin yang lega agar tombol tidak menabrak batas bawah
        pickerBuilder.setSize(750, 480);

        // Opsi umum & Lokalisasi Bahasa Indonesia
        pickerBuilder.setLocale("id");
        pickerBuilder.setOAuthToken(accessToken);
        pickerBuilder.setDeveloperKey(apiKey);
        pickerBuilder.setAppId(clientId.split("-")[0] || "");
        pickerBuilder.setTitle("Pilih Berkas dari Google Drive Anda");

        pickerBuilder.setCallback((data: GooglePickerCallbackData) => {
          if (data.action === googlePicker.Action.PICKED) {
            const doc = data.docs?.[0];
            if (doc) {
              let directImg = `https://lh3.googleusercontent.com/d/${doc.id}`;
              if (doc.thumbnails?.[0]?.url) {
                directImg = doc.thumbnails[0].url.replace(/=s\d+/, "=s1200");
              }
              options.onSelect({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                sizeBytes: doc.sizeBytes,
                url: doc.url || `https://drive.google.com/file/d/${doc.id}/view`,
                thumbnailUrl: doc.thumbnails?.[0]?.url || directImg,
                directImageUrl: directImg,
              });
              resolve();
            }
          } else if (data.action === googlePicker.Action.CANCEL) {
            options.onCancel?.();
            resolve();
          }
        });

        const picker = pickerBuilder.build();
        picker.setVisible(true);

        // Berikan fokus ke iframe Google Picker agar event roda mouse (scroll wheel)
        // dan pan trackpad langsung diteruskan ke dalam daftar folder Google Drive
        const setupIframeFocus = () => {
          const iframe = document.querySelector(".picker-dialog iframe") as HTMLIFrameElement | null;
          if (iframe) {
            iframe.focus();
            iframe.parentElement?.addEventListener("mouseenter", () => {
              iframe.focus();
            });
          }
        };
        setTimeout(setupIframeFocus, 80);
        setTimeout(setupIframeFocus, 250);
        setTimeout(setupIframeFocus, 500);
      } catch (err) {
        options.onCancel?.();
        reject(err);
      }
    }

    // 1. Cek apakah ada token yang masih tersimpan & valid dari login sebelumnya
    const cachedToken = getStoredGoogleOAuthToken();
    if (cachedToken) {
      // Langsung buka picker Google tanpa memunculkan popup login lagi!
      renderPicker(cachedToken);
      return;
    }

    // 2. Jika belum ada token, minta izin OAuth 2.0 lewat GIS satu kali
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      options.onCancel?.();
      reject(new Error("Layanan autentikasi Google Identity (GSI) belum termuat."));
      return;
    }
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      error_callback: (err: GoogleOAuthErrorResponse) => {
        options.onCancel?.();
        reject(
          new Error(err?.message || "Otorisasi akun Google dibatalkan atau ditutup."),
        );
      },
      callback: (response: GoogleOAuthTokenResponse) => {
        if (response.error !== undefined) {
          options.onCancel?.();
          reject(new Error(`Otorisasi Google gagal: ${response.error}`));
          return;
        }

        const accessToken = response.access_token;
        if (!accessToken) {
          options.onCancel?.();
          reject(new Error("Tidak menerima Access Token dari Google."));
          return;
        }

        // Simpan token ke localStorage dengan masa berlaku (standar 3600 detik / 1 jam)
        const expiresIn = response.expires_in ? Number(response.expires_in) : 3600;
        saveStoredGoogleOAuthToken(accessToken, expiresIn);

        // Ambil info profil pengguna Google secara background untuk ditampilkan di UI
        fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.user) {
              saveStoredGoogleOAuthToken(
                accessToken,
                expiresIn,
                data.user.emailAddress,
                data.user.displayName,
              );
            }
          })
          .catch(() => {});

        // Tampilkan picker resmi
        renderPicker(accessToken);
      },
    });

    // Luncurkan popup login Google
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

