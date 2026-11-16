import { rgb, type RGB } from "pdf-lib";
import type { DocTitleConfig, DocumentTitleMapping } from "./pdf-types";

/**
 * Ukuran font bersama untuk teks blok kontak kiri (alamat, email, telp, npwp)
 * dan teks blok No / Ref kanan di header.
 */
export const HEADER_COMMON_FONT_SIZE = 8;

/**
 * Metrik bounding box tinta asli (piksel non-transparan) dari aset penjenamaan Altvira
 * untuk menjamin tinggi ikon sama persis dengan tinggi tinta wordmark.
 */
export const BRAND_IMAGE_METRICS = {
  wordmark: {
    fileWidth: 1024,
    fileHeight: 208,
    inkTopPad: 0,
    inkBottomPad: 5,
    inkHeight: 203,
    inkWidth: 1024,
  },
  icon: {
    fileWidth: 1024,
    fileHeight: 731,
    inkTopPad: 0,
    inkBottomPad: 0,
    inkHeight: 731,
    inkWidth: 1024,
  },
} as const;

// ============================================================================
// DESIGN TOKENS (Spesifikasi Layout Arental / Figma)
// ============================================================================
export const PDF_LAYOUT_TOKENS = {
  pageWidth: 595.28, // A4 Portrait (210 mm)
  pageHeight: 841.89, // A4 Portrait (297 mm)
  marginX: 51.02, // 18 mm
  marginTop: 45.35, // 16 mm
  marginBottom: 56.69, // 20 mm (ruang khusus footer)
  bottomSafeY: 46, // batas aman konten di atas garis footer (y = 44)
  footerLineY: 44,
  footerTextY: 32,
  socialBandHeight: 31.18, // ~11 mm
  fontSizes: {
    docTitle: 22,
    docNumber: 8.5,
    companyName: 15.5,
    legalName: 9,
    body: 9.5,
    label: 9.5,
    tableHeader: 9.5,
    note: 9.5,
    meterai: 7.5,
    footer: 8,
  },
  lineHeights: {
    body: 13.8, // 9.5 * 1.45
    label: 13.5,
    note: 13.5,
  },
} as const;

// Warna resmi sesuai spesifikasi:
// Aksen biru logo, teks #1f2937, label #6b7280, garis #e5e7eb, latar highlight biru brand lembut (turunan icon sosmed altvira)
export const BRAND_BLUE: RGB = rgb(11 / 255, 67 / 255, 200 / 255);
export const TEXT_DARK: RGB = rgb(31 / 255, 41 / 255, 55 / 255); // #1f2937
export const TEXT_LABEL: RGB = rgb(107 / 255, 114 / 255, 128 / 255); // #6b7280
export const BORDER_GRAY: RGB = rgb(229 / 255, 231 / 255, 235 / 255); // #e5e7eb
export const CHIP_BG: RGB = rgb(238 / 255, 243 / 255, 253 / 255); // warna biru brand altvira lembut (opacity diturunkan) agar teks hitam terbaca jelas

// Alias kompatibilitas
export const SLATE_900 = TEXT_DARK;
export const SLATE_700 = TEXT_DARK;
export const SLATE_600 = TEXT_LABEL;
export const SLATE_500 = TEXT_LABEL;
export const BORDER_SLATE = BORDER_GRAY;
export const BORDER_SUBTLE = BORDER_GRAY;
export const SURFACE_SUBTLE = CHIP_BG;
export const SURFACE_CARD = CHIP_BG;

/**
 * Batas lebar maksimum teks judul header kanan (setara lebar 'PURCHASE ORDER (PO)' pada Helvetica-Bold 22 pt = 261.558 pt)
 */
export const MAX_HEADER_TITLE_WIDTH = 261.558;

/**
 * Nilai lebar glyph StandardFonts Helvetica-Bold per 1000 unit em (PostScript AFM standard)
 */
export const HELVETICA_BOLD_GLYPH_WIDTHS: Record<string, number> = {
  " ": 278, "!": 333, '"': 556, "#": 556, "$": 556, "%": 889, "&": 722, "'": 278,
  "(": 333, ")": 333, "*": 556, "+": 556, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 333, ";": 333, "<": 556, "=": 556, ">": 556, "?": 556,
  "@": 1000,
  "A": 722, "B": 722, "C": 722, "D": 722, "E": 667, "F": 611, "G": 778, "H": 722,
  "I": 278, "J": 556, "K": 722, "L": 611, "M": 833, "N": 722, "O": 778, "P": 667,
  "Q": 778, "R": 722, "S": 667, "T": 611, "U": 722, "V": 667, "W": 944, "X": 667,
  "Y": 667, "Z": 611,
  "[": 333, "\\": 278, "]": 333, "^": 556, "_": 556, "`": 278,
  "a": 556, "b": 611, "c": 556, "d": 611, "e": 556, "f": 333, "g": 611, "h": 611,
  "i": 278, "j": 278, "k": 556, "l": 278, "m": 889, "n": 611, "o": 611, "p": 611,
  "q": 611, "r": 389, "s": 556, "t": 333, "u": 611, "v": 556, "w": 778, "x": 556,
  "y": 556, "z": 500,
  "{": 333, "|": 278, "}": 333, "~": 556,
};

/**
 * Mengukur lebar teks pada font Helvetica-Bold tanpa dependensi instance PDFDocument
 */
export function measureHelveticaBoldWidth(text: string, size = 22): number {
  let units = 0;
  for (const char of text) {
    units += HELVETICA_BOLD_GLYPH_WIDTHS[char] ?? 600;
  }
  return (units * size) / 1000;
}

/**
 * Tabel Pemetaan Tunggal Judul Dokumen Sistem Altcycles ke Dokumen Cetak PDF.
 * Kunci: Judul sumber dokumen persis (huruf kapital).
 * headerTitle: Judul di kanan header (maksimal 2 kata, 16 karakter, lebar <= 261.56 pt).
 * fullTitle: Judul lengkap untuk baris biru di bawah header (kata MASTER dihilangkan).
 */
export const DOCUMENT_TITLE_MAPPINGS: Record<string, DocumentTitleMapping> = {
  "DAFTAR MASTER PROYEK DAN PENUGASAN TIM": {
    headerTitle: "PROYEK TIM",
    fullTitle: "DAFTAR PROYEK DAN PENUGASAN TIM",
  },
  "DAFTAR PERSETUJUAN PEMBAYARAN & PENCAIRAN DANA": {
    headerTitle: "PAYMENT APPROVAL",
    fullTitle: "DAFTAR PERSETUJUAN PEMBAYARAN & PENCAIRAN DANA",
  },
  "CADANGAN BUKU JURNAL AKUNTANSI ALTCYCLES": {
    headerTitle: "BACKUP JURNAL",
    fullTitle: "CADANGAN BUKU JURNAL AKUNTANSI ALTCYCLES",
  },
  "LAPORAN ANGGARAN VS REALISASI PROYEK": {
    headerTitle: "BUDGETING",
    fullTitle: "LAPORAN ANGGARAN VS REALISASI PROYEK",
  },
  "DAFTAR INVOICE PENAGIHAN & PIUTANG": {
    headerTitle: "DAFTAR INVOICE",
    fullTitle: "DAFTAR INVOICE PENAGIHAN & PIUTANG",
  },
  "DAFTAR MASTER PELANGGAN/KLIEN": {
    headerTitle: "DAFTAR KLIEN",
    fullTitle: "DAFTAR PELANGGAN/KLIEN",
  },
  "DAFTAR MASTER VENDOR PEMASOK": {
    headerTitle: "DAFTAR VENDOR",
    fullTitle: "DAFTAR VENDOR PEMASOK",
  },
  "DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL": {
    headerTitle: "PENGAJUAN PA",
    fullTitle: "DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL",
  },
  "DAFTAR PURCHASE ORDER PEMBELIAN VENDOR": {
    headerTitle: "REKAP PO",
    fullTitle: "DAFTAR PURCHASE ORDER PEMBELIAN VENDOR",
  },
  "PERHITUNGAN BAGI HASIL PROYEK": {
    headerTitle: "BAGI HASIL",
    fullTitle: "PERHITUNGAN BAGI HASIL PROYEK",
  },
  "DOKUMEN PROYEK": {
    headerTitle: "DOKUMEN PROYEK",
    fullTitle: "DOKUMEN PROYEK",
  },
  "JURNAL UMUM": {
    headerTitle: "JURNAL UMUM",
    fullTitle: "BUKU JURNAL UMUM",
  },
  "JURNAL PENYESUAIAN & KOREKSI": {
    headerTitle: "JURNAL AJP",
    fullTitle: "JURNAL PENYESUAIAN DAN KOREKSI",
  },
  "BUKU BESAR (GENERAL LEDGER)": {
    headerTitle: "BUKU BESAR",
    fullTitle: "BUKU BESAR (GENERAL LEDGER)",
  },
  "NERACA SALDO (TRIAL BALANCE)": {
    headerTitle: "NERACA SALDO",
    fullTitle: "NERACA SALDO (TRIAL BALANCE)",
  },
  "LAPORAN LABA RUGI BASIS AKRUAL": {
    headerTitle: "LABA RUGI",
    fullTitle: "LAPORAN LABA RUGI BASIS AKRUAL",
  },
  "LAPORAN PERUBAHAN EKUITAS": {
    headerTitle: "MUTASI EKUITAS",
    fullTitle: "LAPORAN PERUBAHAN EKUITAS",
  },
  "LAPORAN POSISI KEUANGAN (NERACA)": {
    headerTitle: "POSISI KEUANGAN",
    fullTitle: "LAPORAN POSISI KEUANGAN (NERACA)",
  },
  "LAPORAN ARUS KAS METODE LANGSUNG": {
    headerTitle: "ARUS KAS",
    fullTitle: "LAPORAN ARUS KAS METODE LANGSUNG",
  },
  "LAPORAN KEUANGAN LENGKAP": {
    headerTitle: "LAPORAN KEUANGAN",
    fullTitle: "LAPORAN KEUANGAN LENGKAP",
  },
};

/**
 * Variasi judul sumber di kode pemanggil aplikasi (seperti penggunaan '&' atau spasi garis miring)
 * yang dipetakan secara identik ke entri resmi.
 */
const TITLE_MAPPING_ALIASES: Record<string, DocumentTitleMapping> = {
  "DAFTAR MASTER PROYEK & PENUGASAN TIM":
    DOCUMENT_TITLE_MAPPINGS["DAFTAR MASTER PROYEK DAN PENUGASAN TIM"]!,
  "DAFTAR MASTER PELANGGAN / KLIEN":
    DOCUMENT_TITLE_MAPPINGS["DAFTAR MASTER PELANGGAN/KLIEN"]!,
  "BUKU JURNAL UMUM": DOCUMENT_TITLE_MAPPINGS["JURNAL UMUM"]!,
  "JURNAL PENYESUAIAN DAN KOREKSI":
    DOCUMENT_TITLE_MAPPINGS["JURNAL PENYESUAIAN & KOREKSI"]!,
  "BUKU BESAR": DOCUMENT_TITLE_MAPPINGS["BUKU BESAR (GENERAL LEDGER)"]!,
  "NERACA SALDO": DOCUMENT_TITLE_MAPPINGS["NERACA SALDO (TRIAL BALANCE)"]!,
  "LAPORAN LABA RUGI": DOCUMENT_TITLE_MAPPINGS["LAPORAN LABA RUGI BASIS AKRUAL"]!,
  "LAPORAN POSISI KEUANGAN":
    DOCUMENT_TITLE_MAPPINGS["LAPORAN POSISI KEUANGAN (NERACA)"]!,
  "LAPORAN ARUS KAS":
    DOCUMENT_TITLE_MAPPINGS["LAPORAN ARUS KAS METODE LANGSUNG"]!,
  "LAPORAN KEUANGAN": DOCUMENT_TITLE_MAPPINGS["LAPORAN KEUANGAN LENGKAP"]!,
};

/**
 * Mencari pemetaan judul berdasarkan kecocokan persis atau setelah normalisasi simbol.
 */
export function findDocumentTitleMapping(rawTitle: string): DocumentTitleMapping | undefined {
  const trimmed = rawTitle.trim().toUpperCase();
  if (DOCUMENT_TITLE_MAPPINGS[trimmed]) {
    return DOCUMENT_TITLE_MAPPINGS[trimmed];
  }
  if (TITLE_MAPPING_ALIASES[trimmed]) {
    return TITLE_MAPPING_ALIASES[trimmed];
  }
  const normalized = trimmed
    .replace(/\s*&\s*/g, " DAN ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");
  if (DOCUMENT_TITLE_MAPPINGS[normalized]) {
    return DOCUMENT_TITLE_MAPPINGS[normalized];
  }
  // Dukungan judul dinamis yang memuat kode proyek atau kategori dokumen
  if (normalized.startsWith("PERHITUNGAN BAGI HASIL PROYEK")) {
    return {
      headerTitle: "BAGI HASIL",
      fullTitle: trimmed,
    };
  }
  if (normalized.startsWith("DOKUMEN PROYEK")) {
    return {
      headerTitle: "DOKUMEN PROYEK",
      fullTitle: trimmed,
    };
  }
  return undefined;
}

/**
 * Pencatat dokumen yang memicu fallback cadangan karena tidak terdaftar di pemetaan
 * dan lebarnya melebihi batas 'PURCHASE ORDER (PO)'.
 */
export const DOCUMENT_TITLE_FALLBACK_RECORD: Array<{
  rawTitle: string;
  fallbackHeader: string;
  measuredWidth: number;
}> = [];

export function clearDocumentTitleFallbackRecord(): void {
  DOCUMENT_TITLE_FALLBACK_RECORD.length = 0;
}

/**
 * Menghapus prefix simbol mata uang (e.g. "Rp", "Rp ", "-Rp") dari string nominal
 * untuk tampilan tabel dan blok subtotal yang bersih tanpa simbol berulang.
 */
export function stripCurrencySymbol(text: string): string {
  if (!text) return "";
  return text.replace(/^(-)?Rp\s*/i, "$1").trim();
}

/**
 * Memetakan judul dokumen menjadi singkatan di header kanan (jika judul panjang)
 * dan judul lengkap untuk baris biru di bawah garis header.
 * Judul pendek (INVOICE, KUITANSI, PURCHASE ORDER) tidak disingkat dan tidak mendapat baris biru.
 */
export function resolveDocTitleConfig(rawTitle: string): DocTitleConfig {
  const normalized = rawTitle.trim().toUpperCase();

  // 1. Cek tabel pemetaan tunggal terlebih dahulu
  const mapped = findDocumentTitleMapping(rawTitle);
  if (mapped) {
    return {
      headerTitle: mapped.headerTitle,
      fullTitleBar: mapped.headerTitle !== mapped.fullTitle ? mapped.fullTitle : undefined,
    };
  }

  // 2. JADWAL TERMIN PENAGIHAN PROYEK -> JTPP
  if (normalized.includes("JADWAL TERMIN PENAGIHAN PROYEK") || normalized === "JTPP") {
    return {
      headerTitle: "JTPP",
      fullTitleBar: normalized.includes("JADWAL") ? normalized : "JADWAL TERMIN PENAGIHAN PROYEK (JTPP)",
    };
  }

  // 3. SURAT PENAWARAN HARGA (QUOTATION) -> QUOTATION
  if (normalized.includes("SURAT PENAWARAN HARGA") || normalized.includes("PENAWARAN HARGA")) {
    return {
      headerTitle: "QUOTATION",
      fullTitleBar: normalized,
    };
  }

  // 4. USER ACCEPTANCE TEST (UAT) CHECKLIST -> UAT
  if (normalized.includes("USER ACCEPTANCE TEST") || normalized.includes("UAT CHECKLIST")) {
    return {
      headerTitle: "UAT",
      fullTitleBar: normalized,
    };
  }

  // 5. BERITA ACARA SERAH TERIMA (BAST) -> BAST
  if (normalized.includes("BERITA ACARA SERAH TERIMA") || normalized.includes("(BAST)")) {
    return {
      headerTitle: "BAST",
      fullTitleBar: normalized,
    };
  }

  // 6. BERITA ACARA KEMAJUAN PEKERJAAN (BAKP) -> BAKP
  if (normalized.includes("BERITA ACARA KEMAJUAN PEKERJAAN") || normalized.includes("(BAKP)")) {
    return {
      headerTitle: "BAKP",
      fullTitleBar: normalized,
    };
  }

  // 7. STATEMENT OF WORK (SOW) -> SOW
  if (normalized.includes("STATEMENT OF WORK") || normalized.includes("(SOW)")) {
    return {
      headerTitle: "SOW",
      fullTitleBar: normalized,
    };
  }

  // 8. FORM PERSETUJUAN PEMBAYARAN (PAYMENT APPROVAL) -> PAYMENT APPROVAL
  if (normalized.includes("FORM PERSETUJUAN PEMBAYARAN")) {
    return {
      headerTitle: "PAYMENT APPROVAL",
      fullTitleBar: normalized,
    };
  }

  // 9. PURCHASE ORDER KLIEN & VENDOR (kata (PO) dihapus di header title, fullTitleBar ditambahkan)
  if (normalized.includes("PURCHASE ORDER") && (normalized.includes("VENDOR") || normalized.includes("PEMASOK"))) {
    return {
      headerTitle: "PURCHASE ORDER",
      fullTitleBar: "PURCHASE ORDER (PO) VENDOR",
    };
  }
  if (normalized.includes("PURCHASE ORDER") && (normalized.includes("KLIEN") || normalized.includes("CLIENT"))) {
    return {
      headerTitle: "PURCHASE ORDER",
      fullTitleBar: "PURCHASE ORDER (PO) KLIEN",
    };
  }
  if (normalized.includes("PURCHASE ORDER") || normalized === "PURCHASE ORDER (PO)") {
    return {
      headerTitle: "PURCHASE ORDER",
      fullTitleBar: "PURCHASE ORDER (PO) KLIEN",
    };
  }

  // 10. Judul pendek lainnya: INVOICE, KUITANSI
  if (normalized === "INVOICE" || normalized.includes("FAKTUR")) {
    return { headerTitle: "INVOICE" };
  }
  if (normalized === "KUITANSI" || normalized.includes("RECEIPT")) {
    return { headerTitle: "KUITANSI" };
  }

  // 11. Pengaman: bila dokumen tidak ada di pemetaan dan lebarnya melebihi batas 'PURCHASE ORDER (PO)'
  const measuredWidth = measureHelveticaBoldWidth(normalized, 22);
  if (measuredWidth > MAX_HEADER_TITLE_WIDTH) {
    const words = normalized.split(/\s+/).slice(0, 2).join(" ");
    const fallbackHeader = words.slice(0, 16).trim();
    console.warn(
      `[PDF Generator Warning] Judul dokumen "${rawTitle}" (lebar ${measuredWidth.toFixed(1)} pt) melebihi batas lebar header (${MAX_HEADER_TITLE_WIDTH.toFixed(1)} pt) dan tidak terdaftar di DOCUMENT_TITLE_MAPPINGS. Menggunakan fallback cadangan: "${fallbackHeader}".`,
    );
    DOCUMENT_TITLE_FALLBACK_RECORD.push({
      rawTitle,
      fallbackHeader,
      measuredWidth,
    });
    return {
      headerTitle: fallbackHeader,
      fullTitleBar: normalized,
    };
  }

  return { headerTitle: normalized };
}

export function sanitizePdfText(text: string): string {
  // StandardFonts Helvetica menggunakan WinAnsiEncoding.
  // Karakter bullet \u2022 (•) dan en-dash \u2013 (–) didukung secara native oleh WinAnsiEncoding.
  return text
    .replace(/\u2014/g, "\u2013")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2022]/g, "");
}
