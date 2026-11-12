import type { CompanyProfileRow, SocialMediaEntry } from "@/types/database.types";

export const DEFAULT_SOCIAL_LINKS: SocialMediaEntry[] = [
  { platform: "Instagram", username: "@altvira.tech" },
  { platform: "LinkedIn", username: "altvira-technology" },
  { platform: "TikTok", username: "@altvira.tech" },
];

export const SOCIAL_PLATFORM_OPTIONS = [
  "Instagram",
  "LinkedIn",
  "TikTok",
  "X / Twitter",
  "YouTube",
  "Facebook",
  "GitHub",
  "Website",
] as const;

/**
 * Mengonversi berkas gambar lokal (PNG/JPG/WebP) menjadi PNG/JPG Data URL terkompresi
 * dengan menjaga transparansi (alpha channel) untuk logo, TTD, maupun paraf.
 */
export async function fileToOptimizedDataUrl(
  file: File,
  options: { maxWidth?: number; maxHeight?: number } = {},
): Promise<string> {
  if (file.size > 3 * 1024 * 1024) {
    throw new Error("Ukuran berkas gambar maksimal 3 MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Berkas harus berupa gambar (PNG, JPG, atau WebP).");
  }

  const maxWidth = options.maxWidth ?? 640;
  const maxHeight = options.maxHeight ?? 320;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal memuat berkas gambar."));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxWidth / (img.width || 1), maxHeight / (img.height || 1));
    const width = Math.max(1, Math.round((img.width || 1) * scale));
    const height = Math.max(1, Math.round((img.height || 1) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D tidak didukung di browser ini.");
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Selalu simpan sebagai PNG agar transparansi tanda tangan/logo tetap terjaga & kompatibel dengan pdf-lib/docx
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface DecodedImageAsset {
  bytes: Uint8Array;
  format: "png" | "jpg";
  width?: number;
  height?: number;
}

function detectImageFormat(bytes: Uint8Array, mimeHint?: string): "png" | "jpg" | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (mimeHint?.includes("png")) return "png";
  if (mimeHint?.includes("jpeg") || mimeHint?.includes("jpg")) return "jpg";
  return null;
}

/**
 * Menguraikan Data URL atau mengambil URL gambar menjadi Uint8Array PNG/JPG untuk PDF & Word.
 */
export async function decodeImageBytes(
  source: string | null | undefined,
): Promise<DecodedImageAsset | null> {
  if (!source || !source.trim()) return null;
  const trimmed = source.trim();

  try {
    if (trimmed.startsWith("data:image/")) {
      const commaIdx = trimmed.indexOf(",");
      if (commaIdx === -1) return null;
      const meta = trimmed.slice(0, commaIdx).toLowerCase();
      const base64 = trimmed.slice(commaIdx + 1);
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      const format = detectImageFormat(bytes, meta);
      if (format) {
        return { bytes, format };
      }
      // Konversi WebP/format lain melalui canvas ke PNG
      return await convertImageUrlViaCanvas(trimmed);
    }

    const res = await fetch(trimmed);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const format = detectImageFormat(buf, res.headers.get("content-type") ?? undefined);
    if (format) {
      return { bytes: buf, format };
    }
    return await convertImageUrlViaCanvas(trimmed);
  } catch {
    return null;
  }
}

async function convertImageUrlViaCanvas(url: string): Promise<DecodedImageAsset | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal memuat gambar."));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width || 120;
    canvas.height = img.height || 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const pngDataUrl = canvas.toDataURL("image/png");
    const base64 = pngDataUrl.split(",")[1] ?? "";
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return { bytes, format: "png", width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

export function getNormalizedSocialLinks(
  company?: Partial<CompanyProfileRow> | null,
): SocialMediaEntry[] {
  const raw = Array.isArray(company?.social_links_json)
    ? company!.social_links_json
    : [];
  if (raw.length === 0) {
    return DEFAULT_SOCIAL_LINKS.map((d) => ({ ...d }));
  }
  return raw.map((item, idx) => {
    const fallback = DEFAULT_SOCIAL_LINKS[idx] ?? {
      platform: "Instagram",
      username: "",
    };
    return {
      platform: item?.platform?.trim() || fallback.platform,
      username: item?.username?.trim() ?? "",
    };
  });
}

export function getFooterSocialEntries(
  company?: Partial<CompanyProfileRow> | null,
): SocialMediaEntry[] {
  return getNormalizedSocialLinks(company).filter(
    (s) => s.username.trim().length > 0,
  );
}

/**
 * Merender ikon vektor sosial media ke byte PNG transparan 36x36 secara sinkron
 * untuk disematkan langsung di footer PDF (`pdf-lib`) & Word (`docx`).
 */
export function renderSocialIconPngBytes(
  platform: string,
  colorHex = "#0B43C8",
): Uint8Array | null {
  try {
    const size = 36;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = colorHex;
    ctx.fillStyle = colorHex;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;

    const s = size / 24;
    ctx.scale(s, s);

    const key = platform.toLowerCase();
    if (key.includes("instagram")) {
      ctx.beginPath();
      ctx.roundRect(2.5, 2.5, 19, 19, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12, 12, 4.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(17.2, 6.8, 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (key.includes("linkedin")) {
      ctx.beginPath();
      ctx.roundRect(2.5, 2.5, 19, 19, 4);
      ctx.stroke();
      ctx.font = "bold 12.5px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("in", 12, 12.8);
    } else if (key.includes("tiktok")) {
      ctx.beginPath();
      ctx.arc(9.5, 15.5, 3.8, 0.3 * Math.PI, 2.1 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(13.2, 15.5);
      ctx.lineTo(13.2, 4.5);
      ctx.quadraticCurveTo(14.2, 8.8, 18.5, 9.2);
      ctx.stroke();
    } else if (key.includes("x") || key.includes("twitter")) {
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(4.5, 4);
      ctx.lineTo(19.5, 20);
      ctx.moveTo(19.5, 4);
      ctx.lineTo(4.5, 20);
      ctx.stroke();
    } else if (key.includes("youtube")) {
      ctx.beginPath();
      ctx.roundRect(2, 4.5, 20, 15, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, 8.5);
      ctx.lineTo(16, 12);
      ctx.lineTo(10, 15.5);
      ctx.closePath();
      ctx.fill();
    } else if (key.includes("facebook")) {
      ctx.beginPath();
      ctx.roundRect(2.5, 2.5, 19, 19, 5);
      ctx.stroke();
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("f", 12.3, 13.2);
    } else if (key.includes("github")) {
      ctx.beginPath();
      ctx.arc(12, 12, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("</>", 12, 12.6);
    } else {
      // Website / Globe
      ctx.beginPath();
      ctx.arc(12, 12, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(12, 12, 4.2, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, 12);
      ctx.lineTo(21, 12);
      ctx.stroke();
    }

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1] ?? "";
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

