import {
  degrees,
  PDFDocument,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  decodeImageBytes,
  DEFAULT_SOCIAL_LINKS,
} from "@/lib/asset-utils";
import {
  getAltviraIconBytes,
  getAltviraWordmarkBytes,
} from "@/lib/brand-assets";
import {
  formatDateID,
  formatDateTimeID,
  formatDocDateLong,
  formatDocEmpty,
  formatDocRupiah,
  formatRupiah,
  hasAnyDecimalCurrency,
  terbilangRupiah,
} from "@/lib/formatters";
import type {
  ClientPoItemJson,
  CompanyProfileRow,
  PaymentRequestStatus,
  SpkCharterContent,
} from "@/types/database.types";

export type DocStatusVariant =
  | "neutral"
  | "info"
  | "success"
  | "danger"
  | "warning";

export interface PdfKeyValue {
  label: string;
  value: string;
}

export interface PdfTableColumn {
  header: string;
  widthRatio: number;
  align?: "left" | "right" | "center";
}

export interface PdfDocumentSpec {
  docTitle: string;
  docSubtitle?: string;
  docNumber: string;
  docDate: string;
  docVersion?: number | string;
  statusBadge?: {
    text: string;
    variant?: DocStatusVariant;
  };
  balanceDueBox?: {
    label: string;
    amountText: string;
    dueDateText?: string;
  };
  company: CompanyProfileRow;
  clientLogoUrl?: string | null;
  recipientTitle?: string;
  recipientLines?: string[];
  metaRows?: PdfKeyValue[];
  paragraphsBefore?: string[];
  tableColumns?: PdfTableColumn[];
  tableRows?: string[][];
  summaryRows?: PdfKeyValue[];
  terbilangAmount?: number;
  documentNotes?: string | null;
  paymentDetail?: {
    terbilangText: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    transferNews: string;
    isPaid?: boolean;
    swiftCode?: string | null;
  } | null;
  notes?: string[];
  notesTitle?: string;
  closingNote?: string;
  hasMeterai?: boolean;
  meteraiLabel?: string;
  leftSignatureLabel?: string;
  leftSignatureName?: string;
  leftSignatureImageUrl?: string | null;
  rightSignatureLabel?: string;
  rightSignatureName?: string;
  rightSignatureImageUrl?: string | null;
  thirdSignatureLabel?: string;
  thirdSignatureName?: string;
  thirdSignatureImageUrl?: string | null;
  footerDocNumber?: string;
  hideSystemFooter?: boolean;
  refDocNumber?: string | null;
  docStatus?: string | null;
  watermarkText?: string | null;
}

export interface PdfTextBox {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  zone: string;
}

export interface PdfCollisionIssue {
  pageIndex: number;
  boxA: PdfTextBox;
  boxB: PdfTextBox;
  overlapX: number;
  overlapY: number;
}

export interface PdfMarginIssue {
  pageIndex: number;
  box: PdfTextBox;
  reason: string;
}

export interface PdfHeaderAlignmentMetrics {
  legalNameBaselineY: number;
  noBaselineY: number;
  addrLine1BaselineY: number;
  refBaselineY: number;
  iconInkHeight: number;
  wordmarkInkHeight: number;
  deltaNoVsLegalName: number;
  deltaRefVsAddr1: number;
  deltaIconVsWordmarkInk: number;
}

export interface PdfLayoutInspectionResult {
  pdfBytes: Uint8Array;
  pageCount: number;
  textBoxes: PdfTextBox[];
  collisions: PdfCollisionIssue[];
  marginViolations: PdfMarginIssue[];
  headerAlignment: PdfHeaderAlignmentMetrics;
}

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
  bottomSafeY: 50, // batas aman konten di atas garis footer (y = 44)
  footerLineY: 44,
  footerTextY: 32,
  socialBandHeight: 31.18, // ~11 mm
  fontSizes: {
    docTitle: 22,
    docNumber: 8.5,
    companyName: 15.5,
    legalName: 9,
    body: 9.5,
    label: 8.5,
    tableHeader: 8.5,
    note: 8.5,
    meterai: 7.5,
    footer: 8,
  },
  lineHeights: {
    body: 13.8, // 9.5 * 1.45
    label: 12.2,
    note: 12.4,
  },
} as const;

// Warna resmi sesuai spesifikasi:
// Aksen biru logo, teks #1f2937, label #6b7280, garis #e5e7eb, latar chip #f3f4f6, band media sosial navy gelap
const BRAND_BLUE = rgb(11 / 255, 67 / 255, 200 / 255);
const TEXT_DARK = rgb(31 / 255, 41 / 255, 55 / 255); // #1f2937
const TEXT_LABEL = rgb(107 / 255, 114 / 255, 128 / 255); // #6b7280
const BORDER_GRAY = rgb(229 / 255, 231 / 255, 235 / 255); // #e5e7eb
const CHIP_BG = rgb(243 / 255, 244 / 255, 246 / 255); // #f3f4f6
const NAVY_DARK = rgb(9 / 255, 14 / 255, 25 / 255); // #090e19 token dark navy sistem

export interface DocTitleConfig {
  headerTitle: string;
  fullTitleBar?: string;
}

/**
 * Menghapus prefix simbol mata uang (e.g. "Rp", "Rp ", "-Rp") dari string nominal
 * untuk tampilan tabel dan blok subtotal yang bersih tanpa simbol berulang.
 */
function stripCurrencySymbol(text: string): string {
  if (!text) return "";
  return text.replace(/^(-)?Rp\s*/i, "$1").trim();
}

/**
 * Memetakan judul dokumen menjadi singkatan di header kanan (jika judul panjang)
 * dan judul lengkap untuk baris abu di bawah garis header.
 * Judul pendek (INVOICE, KUITANSI, PURCHASE ORDER (PO)) tidak disingkat dan tidak mendapat baris abu.
 */
export function resolveDocTitleConfig(rawTitle: string): DocTitleConfig {
  const normalized = rawTitle.trim().toUpperCase();

  // 1. JADWAL TERMIN PENAGIHAN PROYEK -> JTPP
  if (normalized.includes("JADWAL TERMIN PENAGIHAN PROYEK") || normalized === "JTPP") {
    return {
      headerTitle: "JTPP",
      fullTitleBar: normalized.includes("JADWAL") ? normalized : "JADWAL TERMIN PENAGIHAN PROYEK (JTPP)",
    };
  }

  // 2. SURAT PENAWARAN HARGA (QUOTATION) -> QUOTATION
  if (normalized.includes("SURAT PENAWARAN HARGA") || normalized.includes("PENAWARAN HARGA")) {
    return {
      headerTitle: "QUOTATION",
      fullTitleBar: normalized,
    };
  }

  // 3. USER ACCEPTANCE TEST (UAT) CHECKLIST -> UAT
  if (normalized.includes("USER ACCEPTANCE TEST") || normalized.includes("UAT CHECKLIST")) {
    return {
      headerTitle: "UAT",
      fullTitleBar: normalized,
    };
  }

  // 4. BERITA ACARA SERAH TERIMA (BAST) -> BAST
  if (normalized.includes("BERITA ACARA SERAH TERIMA") || normalized.includes("(BAST)")) {
    return {
      headerTitle: "BAST",
      fullTitleBar: normalized,
    };
  }

  // 5. BERITA ACARA KEMAJUAN PEKERJAAN (BAKP) -> BAKP
  if (normalized.includes("BERITA ACARA KEMAJUAN PEKERJAAN") || normalized.includes("(BAKP)")) {
    return {
      headerTitle: "BAKP",
      fullTitleBar: normalized,
    };
  }

  // 6. STATEMENT OF WORK (SOW) -> SOW
  if (normalized.includes("STATEMENT OF WORK") || normalized.includes("(SOW)")) {
    return {
      headerTitle: "SOW",
      fullTitleBar: normalized,
    };
  }

  // 7. FORM PERSETUJUAN PEMBAYARAN (PAYMENT APPROVAL) -> PAYMENT APPROVAL
  if (normalized.includes("FORM PERSETUJUAN PEMBAYARAN") || normalized.includes("PAYMENT APPROVAL")) {
    return {
      headerTitle: "PAYMENT APPROVAL",
      fullTitleBar: normalized,
    };
  }

  // 8. PURCHASE ORDER (PO) KLIEN -> PURCHASE ORDER (PO) (kata Klien dihapus hanya di judul)
  if (normalized.includes("PURCHASE ORDER") && normalized.includes("KLIEN")) {
    return {
      headerTitle: "PURCHASE ORDER (PO)",
    };
  }
  if (normalized.includes("PURCHASE ORDER") || normalized === "PURCHASE ORDER (PO)") {
    return {
      headerTitle: "PURCHASE ORDER (PO)",
    };
  }

  // 9. Judul pendek lainnya: INVOICE, KUITANSI
  if (normalized === "INVOICE" || normalized.includes("FAKTUR")) {
    return { headerTitle: "INVOICE" };
  }
  if (normalized === "KUITANSI" || normalized.includes("RECEIPT")) {
    return { headerTitle: "KUITANSI" };
  }

  return { headerTitle: normalized };
}

// Alias kompatibilitas untuk generator SPK 10 Pasal
const SLATE_900 = TEXT_DARK;
const SLATE_700 = TEXT_DARK;
const SLATE_600 = TEXT_LABEL;
const SLATE_500 = TEXT_LABEL;
const BORDER_SLATE = BORDER_GRAY;
const BORDER_SUBTLE = BORDER_GRAY;
const SURFACE_SUBTLE = CHIP_BG;
const SURFACE_CARD = CHIP_BG;

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

/**
 * Memecah kata tunggal yang terlalu panjang (seperti URL panjang tanpa spasi)
 * mengikuti perilaku CSS `overflow-wrap: anywhere`, memprioritaskan karakter pemisah URL.
 */
function breakLongToken(
  token: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (font.widthOfTextAtSize(token, fontSize) <= maxWidth) {
    return [token];
  }
  const chunks: string[] = [];
  let remaining = token;

  while (remaining.length > 0) {
    if (font.widthOfTextAtSize(remaining, fontSize) <= maxWidth) {
      chunks.push(remaining);
      break;
    }
    // Cari indeks karakter maksimum yang muat dalam maxWidth
    let fitIdx = 1;
    for (let i = 1; i <= remaining.length; i++) {
      if (font.widthOfTextAtSize(remaining.slice(0, i), fontSize) <= maxWidth) {
        fitIdx = i;
      } else {
        break;
      }
    }
    // Prioritaskan pemotongan setelah karakter pemisah URL (/, -, _, ?, &, =, .)
    let breakAt = fitIdx;
    const sliceCandidate = remaining.slice(0, fitIdx);
    const naturalBreak = Math.max(
      sliceCandidate.lastIndexOf("/"),
      sliceCandidate.lastIndexOf("-"),
      sliceCandidate.lastIndexOf("_"),
      sliceCandidate.lastIndexOf("?"),
      sliceCandidate.lastIndexOf("&"),
      sliceCandidate.lastIndexOf("="),
    );
    if (naturalBreak >= Math.floor(fitIdx * 0.45)) {
      breakAt = naturalBreak + 1;
    }
    chunks.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }
  return chunks.length > 0 ? chunks : [token];
}

function wrapTextByWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const clean = sanitizePdfText(text);
  if (!clean.trim()) return [""];
  const safeMaxW = Math.max(24, maxWidth);
  const rawParagraphs = clean.split(/\r?\n/);
  const result: string[] = [];

  for (const para of rawParagraphs) {
    const rawWords = para.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) {
      result.push("");
      continue;
    }

    // Pecah token yang melebihi safeMaxW (misal URL panjang)
    const words: string[] = [];
    for (const w of rawWords) {
      if (font.widthOfTextAtSize(w, fontSize) > safeMaxW) {
        words.push(...breakLongToken(w, font, fontSize, safeMaxW));
      } else {
        words.push(w);
      }
    }

    let current = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]!}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= safeMaxW) {
        current = candidate;
      } else {
        result.push(current);
        current = words[i]!;
      }
    }
    result.push(current);
  }
  return result.length > 0 ? result : [""];
}

/**
 * Aturan konsistensi desimal per dokumen (Keputusan K-06):
 * Bila ada SATU angka uang berdesimal (mis. Rp1.234.567,50) di sebuah dokumen,
 * semua angka uang Rp di dokumen tersebut ditampilkan dua desimal (,00) agar kolom sejajar.
 */
function normalizeSpecCurrencyDecimals(spec: PdfDocumentSpec): PdfDocumentSpec {
  const decimalCurrencyRegex = /-?Rp\s?\d+(?:\.\d{3})*,\d{2}\b/;
  const wholeCurrencyRegex = /(-?Rp\s?\d+(?:\.\d{3})*)(?!\.\d|,\d|\d)/g;

  const allStrings: string[] = [];
  spec.metaRows?.forEach((m) => allStrings.push(m.value));
  spec.tableRows?.forEach((row) => row.forEach((cell) => allStrings.push(cell)));
  spec.summaryRows?.forEach((s) => allStrings.push(s.value));
  if (spec.balanceDueBox?.amountText) {
    allStrings.push(spec.balanceDueBox.amountText);
  }

  const hasDecimal = allStrings.some((str) => decimalCurrencyRegex.test(str));
  if (!hasDecimal) {
    return spec;
  }

  const padCurrency = (input: string): string =>
    input.replace(wholeCurrencyRegex, "$1,00");

  return {
    ...spec,
    metaRows: spec.metaRows?.map((m) => ({
      ...m,
      value: padCurrency(m.value),
    })),
    tableRows: spec.tableRows?.map((row) => row.map((cell) => padCurrency(cell))),
    summaryRows: spec.summaryRows?.map((s) => ({
      ...s,
      value: padCurrency(s.value),
    })),
    balanceDueBox: spec.balanceDueBox
      ? {
          ...spec.balanceDueBox,
          amountText: padCurrency(spec.balanceDueBox.amountText),
        }
      : undefined,
  };
}

async function embedOptionalImage(
  pdfDoc: PDFDocument,
  source: string | null | undefined,
): Promise<PDFImage | null> {
  const decoded = await decodeImageBytes(source);
  if (!decoded) return null;
  try {
    return decoded.format === "png"
      ? await pdfDoc.embedPng(decoded.bytes)
      : await pdfDoc.embedJpg(decoded.bytes);
  } catch {
    return null;
  }
}

function fitDimensions(
  img: PDFImage,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  return {
    width: Math.max(1, img.width * scale),
    height: Math.max(1, img.height * scale),
  };
}

/**
 * Menggambar mark logo vektor default Altvira (simbol gelombang A-V setinggi ~14 mm)
 * apabila logo_storage_path belum diunggah di database.
 */
function drawDefaultAltviraMark(page: PDFPage, x: number, topY: number) {
  // Kotak mark: lebar 38 pt, tinggi 34 pt (topY hingga topY - 34)
  const baseY = topY - 30;
  // Kaki kiri 'A' (Biru Altvira)
  page.drawLine({
    start: { x: x + 2, y: baseY + 4 },
    end: { x: x + 13, y: topY - 2 },
    thickness: 3.4,
    color: BRAND_BLUE,
  });
  // Kaki tengah miring dari puncak 'A' ke lembah 'V' (Biru Altvira)
  page.drawLine({
    start: { x: x + 13, y: topY - 2 },
    end: { x: x + 23, y: baseY + 2 },
    thickness: 3.4,
    color: BRAND_BLUE,
  });
  // Palang 'A'
  page.drawLine({
    start: { x: x + 6, y: baseY + 13 },
    end: { x: x + 16, y: baseY + 13 },
    thickness: 2.6,
    color: BRAND_BLUE,
  });
  // Kaki kanan 'V' naik ke kanan atas (Gelap #1f2937)
  page.drawLine({
    start: { x: x + 23, y: baseY + 2 },
    end: { x: x + 35, y: topY - 6 },
    thickness: 3.4,
    color: TEXT_DARK,
  });
}

/**
 * Komponen Bersama: Footer (Zona I) di setiap halaman dokumen.
 * Menempati margin bawah 20 mm (garis tipis di y=40, teks di y=27).
 */
async function drawSocialMediaFooters(params: {
  pdfDoc: PDFDocument;
  pages: PDFPage[];
  company: CompanyProfileRow;
  fontRegular: PDFFont;
  fontBold?: PDFFont;
  marginX: number;
  pageWidth: number;
  docNumber?: string;
  hideSystemFooter?: boolean;
  parafInfo?: {
    leftImage?: PDFImage | null;
    rightImage?: PDFImage | null;
    leftLabel?: string;
    rightLabel?: string;
  };
  recordBox?: (pageIndex: number, x: number, y: number, w: number, h: number, text: string, zone: string) => void;
}) {
  const {
    pages,
    company,
    fontRegular,
    marginX,
    pageWidth,
    docNumber,
    hideSystemFooter,
    parafInfo,
    recordBox,
  } = params;

  const total = pages.length;
  const lineY = PDF_LAYOUT_TOKENS.footerLineY;
  const textY = PDF_LAYOUT_TOKENS.footerTextY;
  const fontSize = PDF_LAYOUT_TOKENS.fontSizes.footer;

  pages.forEach((p, idx) => {
    // Jika SPK menyertakan area paraf per halaman
    if (parafInfo) {
      const parafY = 64;
      p.drawText("Paraf Pihak Pertama:", {
        x: marginX,
        y: parafY,
        size: 7.5,
        font: fontRegular,
        color: TEXT_LABEL,
      });
      if (parafInfo.leftImage) {
        const dims = fitDimensions(parafInfo.leftImage, 44, 20);
        p.drawImage(parafInfo.leftImage, {
          x: marginX + 82,
          y: parafY - 4,
          width: dims.width,
          height: dims.height,
        });
      } else {
        p.drawText("..................", {
          x: marginX + 82,
          y: parafY,
          size: 7.5,
          font: fontRegular,
          color: TEXT_LABEL,
        });
      }

      const midX = pageWidth / 2 + 24;
      p.drawText("Paraf Pihak Kedua:", {
        x: midX,
        y: parafY,
        size: 7.5,
        font: fontRegular,
        color: TEXT_LABEL,
      });
      if (parafInfo.rightImage) {
        const dims = fitDimensions(parafInfo.rightImage, 44, 20);
        p.drawImage(parafInfo.rightImage, {
          x: midX + 76,
          y: parafY - 4,
          width: dims.width,
          height: dims.height,
        });
      } else {
        p.drawText("..................", {
          x: midX + 76,
          y: parafY,
          size: 7.5,
          font: fontRegular,
          color: TEXT_LABEL,
        });
      }
    }

    // Garis pemisah tipis footer (0.5 pt #e5e7eb)
    p.drawLine({
      start: { x: marginX, y: lineY },
      end: { x: pageWidth - marginX, y: lineY },
      thickness: 0.5,
      color: BORDER_GRAY,
    });

    // 3 ikon medsos di sebelah kiri teks Altvira Technology (dapat diklik membuka profil)
    const rawSocials = (company.social_links_json || []).filter(
      (s) => s && s.platform && (s.username?.trim() || s.url?.trim()),
    );
    const activeSocials = (
      rawSocials.length > 0 ? rawSocials : DEFAULT_SOCIAL_LINKS
    ).slice(0, 3);

    const iconSize = 10;
    const iconGap = 4;
    const iconTopY = textY + 6.5;
    const iconBottomY = textY - 3.5;
    let curIconX = marginX;

    for (const soc of activeSocials) {
      const pKey = soc.platform.toLowerCase();
      let iconPath = "M 4 2 L 20 2 Q 22 2 22 4 L 22 20 Q 22 22 20 22 L 4 22 Q 2 22 2 20 L 2 4 Q 2 2 4 2 Z";
      if (pKey.includes("instagram")) {
        iconPath = "M 4 2 L 20 2 Q 22 2 22 4 L 22 20 Q 22 22 20 22 L 4 22 Q 2 22 2 20 L 2 4 Q 2 2 4 2 Z M 12 8 A 4 4 0 1 0 12 16 A 4 4 0 1 0 12 8 Z";
      } else if (pKey.includes("linkedin")) {
        iconPath = "M 4 2 L 20 2 Q 22 2 22 4 L 22 20 Q 22 22 20 22 L 4 22 Q 2 22 2 20 L 2 4 Q 2 2 4 2 Z M 7 10 L 7 17 M 7 6.5 L 7 7.5 M 11 17 L 11 11 Q 11 9 14 9 Q 17 9 17 12 L 17 17";
      } else if (pKey.includes("tiktok")) {
        iconPath = "M 9 12 A 4 4 0 1 0 13 16 L 13 4 Q 14 8 18 8";
      } else if (pKey.includes("x") || pKey.includes("twitter")) {
        iconPath = "M 4 4 L 20 20 M 20 4 L 4 20";
      } else {
        iconPath = "M 12 2 A 10 10 0 1 0 12 22 A 10 10 0 1 0 12 2 Z M 2 12 L 22 12";
      }

      p.drawSvgPath(iconPath, {
        x: curIconX,
        y: iconTopY,
        scale: iconSize / 24,
        borderColor: BRAND_BLUE,
        borderWidth: 0.9,
      });

      const targetUrl =
        soc.url?.trim() ||
        (pKey.includes("instagram")
          ? `https://instagram.com/${soc.username.replace(/^@/, "").trim()}`
          : pKey.includes("linkedin")
            ? `https://linkedin.com/company/${soc.username.replace(/^@/, "").trim()}`
            : pKey.includes("tiktok")
              ? `https://tiktok.com/@${soc.username.replace(/^@/, "").trim()}`
              : `https://${soc.username.replace(/^@/, "").trim()}`);

      if (targetUrl) {
        const linkAnnot = p.doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [curIconX, iconBottomY, curIconX + iconSize, iconTopY],
          Border: [0, 0, 0],
          A: {
            Type: "Action",
            S: "URI",
            URI: PDFString.of(targetUrl),
          },
        });
        p.node.addAnnot(p.doc.context.register(linkAnnot));
      }

      curIconX += iconSize + iconGap;
    }

    const companyNameX = curIconX + 3;
    const companyNameText = sanitizePdfText(company.company_name || "Altvira Technology");
    const companyNameW = fontRegular.widthOfTextAtSize(companyNameText, fontSize);
    p.drawText(companyNameText, {
      x: companyNameX,
      y: textY,
      size: fontSize,
      font: fontRegular,
      color: TEXT_LABEL,
    });
    recordBox?.(idx, companyNameX, textY, companyNameW, fontSize, companyNameText, "I-footer");

    const rightText = `Hal. ${idx + 1} / ${total}`;
    const rightW = fontRegular.widthOfTextAtSize(rightText, fontSize);
    const rightX = pageWidth - marginX - rightW;
    p.drawText(rightText, {
      x: rightX,
      y: textY,
      size: fontSize,
      font: fontRegular,
      color: TEXT_LABEL,
    });
    recordBox?.(idx, rightX, textY, rightW, fontSize, rightText, "I-footer");

    if (!hideSystemFooter) {
      const centerText = "Dokumen ini dibuat otomatis oleh Altcycles";
      const centerW = fontRegular.widthOfTextAtSize(centerText, 7.5);
      const centerX = (pageWidth - centerW) / 2;
      if (centerX > companyNameX + companyNameW + 12 && centerX + centerW < rightX - 12) {
        p.drawText(centerText, {
          x: centerX,
          y: textY,
          size: 7.5,
          font: fontRegular,
          color: TEXT_LABEL,
        });
        recordBox?.(idx, centerX, textY, centerW, 7.5, centerText, "I-footer");
      }
    }
  });
}

/**
 * Menggambar kotak berbingkai sudut membulat dengan SVG path.
 */
function drawRoundedRect(
  page: PDFPage,
  x: number,
  topY: number,
  width: number,
  height: number,
  radius: number,
  options?: {
    borderColor?: RGB;
    borderWidth?: number;
    color?: RGB;
  },
) {
  if (radius <= 0) {
    page.drawRectangle({
      x,
      y: topY - height,
      width,
      height,
      borderColor: options?.borderColor,
      borderWidth: options?.borderWidth,
      color: options?.color,
    });
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  const w = width;
  const h = height;
  const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  page.drawSvgPath(d, {
    x,
    y: topY,
    borderColor: options?.borderColor,
    borderWidth: options?.borderWidth,
    color: options?.color,
  });
}

/**
 * Mesin internal pembuat PDF beserta perekam kotak batas (bounding box) setiap elemen teks
 * untuk verifikasi anti-tabrakan dan anti-keluar-margin.
 */
async function renderDocumentPdfInternal(
  rawSpec: PdfDocumentSpec,
): Promise<{
  pdfBytes: Uint8Array;
  pageCount: number;
  textBoxes: PdfTextBox[];
  headerAlignment: PdfHeaderAlignmentMetrics;
}> {
  const spec = normalizeSpecCurrencyDecimals(rawSpec);
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const [
    companyLogo,
    rightSigImg,
    leftSigImg,
    thirdSigImg,
    altviraIconBytes,
    altviraWordmarkBytes,
  ] = await Promise.all([
    embedOptionalImage(pdfDoc, spec.company.logo_storage_path),
    embedOptionalImage(
      pdfDoc,
      spec.rightSignatureImageUrl !== undefined
        ? spec.rightSignatureImageUrl
        : spec.company.signer_signature_path,
    ),
    embedOptionalImage(pdfDoc, spec.leftSignatureImageUrl),
    embedOptionalImage(pdfDoc, spec.thirdSignatureImageUrl),
    getAltviraIconBytes(),
    getAltviraWordmarkBytes(),
  ]);

  const [altviraIconImg, altviraWordmarkImg] = await Promise.all([
    altviraIconBytes ? pdfDoc.embedPng(altviraIconBytes).catch(() => null) : Promise.resolve(null),
    altviraWordmarkBytes ? pdfDoc.embedPng(altviraWordmarkBytes).catch(() => null) : Promise.resolve(null),
  ]);

  const { pageWidth, pageHeight, marginX, marginTop, bottomSafeY } =
    PDF_LAYOUT_TOKENS;
  const contentWidth = pageWidth - marginX * 2; // 493.24 pt

  const pages: PDFPage[] = [];
  const textBoxes: PdfTextBox[] = [];

  const drawWatermarkOnPage = (targetPage: PDFPage) => {
    const statusStr = (spec.docStatus || spec.statusBadge?.text || "").toLowerCase();
    const isDraft = statusStr.includes("draft");
    const isCancelled = statusStr.includes("batal") || statusStr.includes("cancel");

    if (!isDraft && !isCancelled && !spec.watermarkText) return;

    const wmText = spec.watermarkText || (isDraft ? "DRAFT" : "BATAL");
    const wmSize = 68;
    const wmW = fontBold.widthOfTextAtSize(wmText, wmSize);
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    const rad = 32 * (Math.PI / 180);

    targetPage.drawText(wmText, {
      x: centerX - (wmW / 2) * Math.cos(rad),
      y: centerY - (wmW / 2) * Math.sin(rad),
      size: wmSize,
      font: fontBold,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.11,
      rotate: degrees(32),
    });
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  drawWatermarkOnPage(page);
  pages.push(page);
  let pageIndex = 0;
  let y = pageHeight - marginTop; // 796.54 pt

  const recordBox = (
    pIdx: number,
    x: number,
    baselineY: number,
    w: number,
    size: number,
    text: string,
    zone: string,
  ) => {
    if (!text.trim()) return;
    textBoxes.push({
      pageIndex: pIdx,
      x,
      y: baselineY,
      width: w,
      height: size,
      text,
      zone,
    });
  };

  const drawTrackedText = (
    text: string,
    opts: {
      x: number;
      y: number;
      size: number;
      font: PDFFont;
      color: RGB;
    },
    zone: string,
  ) => {
    const clean = sanitizePdfText(text);
    if (!clean) return;
    page.drawText(clean, opts);
    const w = opts.font.widthOfTextAtSize(clean, opts.size);
    recordBox(pageIndex, opts.x, opts.y, w, opts.size, clean, zone);
  };

  // ==========================================================================
  // KOMPONEN 1: HEADER (ZONA A) — Format Global Standard
  // - Kolom kiri (maks 235 pt): Ikon Altvira (~15 mm) + Wordmark Altvira (proporsional),
  //   disusun 1 garis tengah horizontal dengan Judul Dokumen di kolom kanan.
  //   Di bawahnya: Nama Badan Usaha (8.5 pt bold), Alamat (maks 2 baris),
  //   Email : ..., Telp. : ..., dan NPWP : ...
  // - Kolom kanan (maks 248 pt): Judul Dokumen (22 pt bold, disingkat bila panjang),
  //   No : {nomor} sejajar baseline Telp., dan Ref : {induk} sejajar baseline NPWP.
  //   SEMUA chip status di bawah nomor dokumen dihapus total.
  // - Baris abu selebar penuh konten di bawah garis header jika judul panjang.
  // ==========================================================================
  const docTitleConfig = resolveDocTitleConfig(spec.docTitle);
  let headerAlignment: PdfHeaderAlignmentMetrics = {
    legalNameBaselineY: 0,
    noBaselineY: 0,
    addrLine1BaselineY: 0,
    refBaselineY: 0,
    iconInkHeight: 0,
    wordmarkInkHeight: 0,
    deltaNoVsLegalName: 0,
    deltaRefVsAddr1: 0,
    deltaIconVsWordmarkInk: 0,
  };

  const drawDocumentHeader = () => {
    const headerTopY = y;
    const leftColMaxW = 235;
    const rightEdgeX = pageWidth - marginX;

    // Target tinggi tinta ikon & wordmark Altvira (diperbesar lagi sesuai arahan)
    const iconInkHeight = 36; // Ikon logo (~36 pt)
    const wordmarkInkHeight = 22; // Wordmark (~22 pt)

    // Perhitungan dimensi aset berdasarkan rasio asli dan bounding box tinta
    const iconInkH = BRAND_IMAGE_METRICS.icon.inkHeight; // 731 px
    const iconFileW_raw = BRAND_IMAGE_METRICS.icon.fileWidth; // 1024 px
    const iconScale = iconInkHeight / iconInkH;
    const iconH = iconInkHeight; // 28 pt
    const iconW = iconFileW_raw * iconScale; // ~39.22 pt (rasio asli 1024:731)

    const wmInkH = BRAND_IMAGE_METRICS.wordmark.inkHeight; // 203 px
    const wmFileH_raw = BRAND_IMAGE_METRICS.wordmark.fileHeight; // 208 px
    const wmFileW_raw = BRAND_IMAGE_METRICS.wordmark.fileWidth; // 1024 px
    const wmBottomPad_raw = BRAND_IMAGE_METRICS.wordmark.inkBottomPad; // 5 px

    const wmScale = wordmarkInkHeight / wmInkH;
    const wmH = wmFileH_raw * wmScale; // ~17.42 pt
    const wmW = wmFileW_raw * wmScale; // ~85.75 pt
    const wmBottomPad = wmBottomPad_raw * wmScale; // ~0.42 pt

    // Common Center Y untuk ikon, wordmark, dan judul dokumen di kolom kanan
    const headerCenterY = headerTopY - 17;
    const iconY = headerCenterY - iconH / 2;
    const wmY = headerCenterY - wmH / 2 - wmBottomPad / 2;
    const brandInkBottomY = Math.min(iconY, wmY);

    const iconX = marginX;

    if (altviraIconImg) {
      page.drawImage(altviraIconImg, {
        x: iconX,
        y: iconY,
        width: iconW,
        height: iconH,
      });
    } else if (companyLogo) {
      const dims = fitDimensions(companyLogo, 52, 28);
      page.drawImage(companyLogo, {
        x: iconX,
        y: headerCenterY - dims.height / 2,
        width: dims.width,
        height: dims.height,
      });
    } else {
      drawDefaultAltviraMark(page, iconX, headerCenterY + 14);
    }

    // 2. Wordmark Altvira (posisi sejajar vertikal di tengah dengan ikon)
    const wmX = iconX + iconW + 8; // jarak ikon ke wordmark 8 pt


    if (altviraWordmarkImg) {
      page.drawImage(altviraWordmarkImg, {
        x: wmX,
        y: wmY,
        width: wmW,
        height: wmH,
      });
    } else {
      drawTrackedText(
        "Altvira Technology",
        {
          x: wmX,
          y: headerCenterY - 4,
          size: 14,
          font: fontBold,
          color: BRAND_BLUE,
        },
        "A-header-left",
      );
    }

    // 3. Judul Dokumen di kolom kanan (rata kanan, berpusat di garis tengah headerCenterY)
    const titleText = sanitizePdfText(docTitleConfig.headerTitle.toUpperCase());
    const titleSize = 22;
    const titleCapCenterOffset = 7.5;
    const titleBaselineY = headerCenterY - titleCapCenterOffset;
    const titleW = fontBold.widthOfTextAtSize(titleText, titleSize);
    const titleX = rightEdgeX - titleW;

    drawTrackedText(
      titleText,
      {
        x: titleX,
        y: titleBaselineY,
        size: titleSize,
        font: fontBold,
        color: TEXT_DARK,
      },
      "A-header-right-title",
    );

    // 4. Blok Kontak Kiri di bawah brand
    // Jarak dari batas bawah brand ink ke baris pertama nama badan usaha (diberi spasi lebih lega sesuai arahan)
    const brandToContactGap = 16;
    const legalNameBaselineY = brandInkBottomY - brandToContactGap;
    const contactSize = HEADER_COMMON_FONT_SIZE; // 8 pt (konstanta bersama untuk blok kiri & No/Ref kanan)
    const contactLineH = 10;
    let leftCursorY = legalNameBaselineY;

    // 4a. Nama Badan Usaha (8 pt fontBold)
    const legalNameClean = sanitizePdfText(
      spec.company.legal_entity_name || "PT Representasi Mitra Mandiri",
    );
    drawTrackedText(
      legalNameClean,
      {
        x: marginX,
        y: legalNameBaselineY,
        size: contactSize,
        font: fontBold,
        color: TEXT_DARK,
      },
      "A-header-legal-name",
    );
    leftCursorY -= 11;

    // 4b. Alamat (wrap maks 2 baris, 8 pt fontRegular)
    const rawAddrLines = wrapTextByWidth(
      spec.company.address,
      fontRegular,
      contactSize,
      leftColMaxW,
    );
    const addrLines = rawAddrLines.slice(0, 2);
    const addrLine1BaselineY = leftCursorY;
    if (addrLines[0]) {
      drawTrackedText(
        addrLines[0],
        {
          x: marginX,
          y: addrLine1BaselineY,
          size: contactSize,
          font: fontRegular,
          color: TEXT_DARK,
        },
        "A-header-addr-1",
      );
      leftCursorY -= contactLineH;
    }
    if (addrLines[1]) {
      drawTrackedText(
        addrLines[1],
        {
          x: marginX,
          y: leftCursorY,
          size: contactSize,
          font: fontRegular,
          color: TEXT_DARK,
        },
        "A-header-contact",
      );
      leftCursorY -= contactLineH;
    }

    // 4c. Email
    const emailVal = spec.company.email
      ? `Email : ${spec.company.email}`
      : "Email : -";
    drawTrackedText(
      emailVal,
      {
        x: marginX,
        y: leftCursorY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-contact",
    );
    leftCursorY -= contactLineH;

    // 4d. Telepon
    const phoneVal = spec.company.phone
      ? `Telp. : ${spec.company.phone}`
      : "Telp. : -";
    drawTrackedText(
      phoneVal,
      {
        x: marginX,
        y: leftCursorY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-contact",
    );
    leftCursorY -= contactLineH;

    // 4e. NPWP
    const npwpBaselineY = leftCursorY;
    const npwpVal = spec.company.tax_id_number?.trim()
      ? `NPWP : ${spec.company.tax_id_number.trim()}`
      : "NPWP : -";
    drawTrackedText(
      npwpVal,
      {
        x: marginX,
        y: npwpBaselineY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-contact",
    );
    leftCursorY -= contactLineH;

    // 5. Blok No & Ref di Kanan (sejajar baseline dengan Nama Badan Usaha & Baris Pertama Alamat)
    const verSuffix = spec.docVersion
      ? ` · ${typeof spec.docVersion === "number" ? `v${spec.docVersion}` : spec.docVersion}`
      : "";
    const noClean = spec.docNumber?.trim()
      ? `${spec.docNumber.trim()}${verSuffix}`
      : "-";
    const noStr = `No : ${noClean}`;
    const refClean = spec.refDocNumber?.trim() ? spec.refDocNumber.trim() : "-";
    const refStr = `Ref : ${refClean}`;

    const noBaselineY = legalNameBaselineY;
    const refBaselineY = addrLine1BaselineY;

    const noW = fontRegular.widthOfTextAtSize(noStr, contactSize);
    const refW = fontRegular.widthOfTextAtSize(refStr, contactSize);
    const maxBlockW = Math.max(noW, refW);
    const noRefStartX = rightEdgeX - maxBlockW;

    drawTrackedText(
      noStr,
      {
        x: noRefStartX,
        y: noBaselineY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-right-no",
    );

    drawTrackedText(
      refStr,
      {
        x: noRefStartX,
        y: refBaselineY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-right-ref",
    );

    // Simpan metrik penjajaran header untuk automated alignment verifier
    headerAlignment = {
      legalNameBaselineY,
      noBaselineY,
      addrLine1BaselineY,
      refBaselineY,
      iconInkHeight,
      wordmarkInkHeight,
      deltaNoVsLegalName: Math.abs(noBaselineY - legalNameBaselineY),
      deltaRefVsAddr1: Math.abs(refBaselineY - addrLine1BaselineY),
      deltaIconVsWordmarkInk: Math.abs(iconInkHeight - wordmarkInkHeight),
    };

    // 6. Garis pemisah horizontal di bawah header (0.75 pt #e5e7eb)
    const separatorLineY = npwpBaselineY - 7;
    page.drawLine({
      start: { x: marginX, y: separatorLineY },
      end: { x: rightEdgeX, y: separatorLineY },
      thickness: 0.75,
      color: BORDER_GRAY,
    });

    // 7. Baris Abu Judul Lengkap (jika judul panjang)
    if (docTitleConfig.fullTitleBar) {
      const barTopMargin = 6;
      const barHeight = 22;
      const barY = separatorLineY - barTopMargin - barHeight;

      page.drawRectangle({
        x: marginX,
        y: barY,
        width: contentWidth,
        height: barHeight,
        color: CHIP_BG,
      });

      drawTrackedText(
        docTitleConfig.fullTitleBar,
        {
          x: marginX + 10,
          y: barY + 6,
          size: 10,
          font: fontBold,
          color: TEXT_DARK,
        },
        "A-header-fulltitle-bar",
      );

      y = barY - 15;
    } else {
      y = separatorLineY - 15;
    }
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < bottomSafeY) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawWatermarkOnPage(page);
      pages.push(page);
      pageIndex = pages.length - 1;
      y = pageHeight - marginTop;
      drawDocumentHeader();
    }
  };

  // Gambar Header pada halaman pertama
  drawDocumentHeader();

  // ==========================================================================
  // KOMPONEN 2: BLOK PIHAK & PASANGAN LABEL : NILAI (ZONA B)
  // - Tanggal dokumen otomatis dimasukkan ke awal metaRows bila belum ada.
  // - Grid tiga kolom untuk pasangan label : nilai:
  //   Label (34-40 mm / 96.4-113.4 pt, atau adaptif/wrap 2 baris) | Titik dua (3.5 mm / 10 pt) | Nilai (sisa lebar, wrap).
  // ==========================================================================
  const effectiveMetaRows: PdfKeyValue[] = [];
  const rawMeta = spec.metaRows ?? [];

  // Pastikan tanggal dokumen ada di Zona B
  if (spec.docDate && spec.docDate.trim()) {
    const formattedDocDate = formatDocDateLong(spec.docDate);
    const alreadyHasDocDate = rawMeta.some(
      (m) =>
        /tanggal\s*(terbit|dokumen|invoice|kuitansi|po|uji|pengujian|evaluasi|serah\s*terima|pengajuan)/i.test(
          m.label,
        ) || m.value === formattedDocDate,
    );
    if (!alreadyHasDocDate) {
      effectiveMetaRows.push({
        label: "Tanggal Dokumen",
        value: formattedDocDate,
      });
    }
  }

  // Salin & bersihkan duplikasi kecil seperti "Termin: Termin 1"
  for (const m of rawMeta) {
    const cleanedVal = m.value.replace(/^Termin:\s*(Termin\b)/i, "$1");
    effectiveMetaRows.push({
      label: m.label.replace(/\s*:\s*$/, "").trim(),
      value: cleanedVal,
    });
  }

  // Jika docSubtitle memuat "Masa Berlaku s.d. ..." (misal pada Quotation) dan belum ada di metaRows, masukkan ke Zona B
  if (spec.docSubtitle && /masa\s+berlaku|berlaku\s+s\.?d\.?/i.test(spec.docSubtitle)) {
    const hasValidUntilMeta = effectiveMetaRows.some((m) =>
      /masa\s+berlaku|berlaku\s+s\.?d\.?/i.test(m.label),
    );
    if (!hasValidUntilMeta) {
      const cleanedValidUntil = spec.docSubtitle
        .replace(/^(masa\s+berlaku\s*(s\.?d\.?)?|berlaku\s*s\.?d\.?)\s*:?\s*/i, "")
        .trim();
      if (cleanedValidUntil) {
        effectiveMetaRows.splice(Math.min(1, effectiveMetaRows.length), 0, {
          label: "Masa Berlaku s.d.",
          value: cleanedValidUntil,
        });
      }
    }
  }

  const hasRecipient = Boolean(spec.recipientLines && spec.recipientLines.length > 0);
  const hasMeta = effectiveMetaRows.length > 0;

  if (hasRecipient || hasMeta) {
    const labelFontSize = PDF_LAYOUT_TOKENS.fontSizes.label; // 8.5 pt
    const valFontSize = PDF_LAYOUT_TOKENS.fontSizes.body; // 9.5 pt
    const rowLineH = 12.2;
    const rowGap = 4;

    if (hasRecipient && hasMeta) {
      // Tata Letak 2 Kolom: Kiri = Penerima, Kanan = Grid Label : Nilai (digeser & dipersempit ke kanan)
      const rightColW = 245; // Blok kanan dipersempit dan menempel ke sisi kanan
      const rightColX = pageWidth - marginX - rightColW; // Mulai di ~300.6 pt
      const colGutter = 16;
      const leftColW = rightColX - marginX - colGutter; // ~233.6 pt

      // Siapkan baris kolom kiri
      const rawRecipientTitle = (spec.recipientTitle ?? "Kepada Yth.")
        .replace(/Bill To\s*\/\s*/i, "")
        .replace(/\s*:\s*$/, "");
      const leftPrepared: Array<{
        lines: string[];
        font: PDFFont;
        size: number;
        color: RGB;
        gapAfter: number;
      }> = [
        {
          lines: [sanitizePdfText(rawRecipientTitle)],
          font: fontBold,
          size: labelFontSize,
          color: TEXT_LABEL,
          gapAfter: 4,
        },
      ];

      spec.recipientLines!.forEach((rLine, idx) => {
        const isFirst = idx === 0;
        const rFont = isFirst ? fontBold : fontRegular;
        const rSize = isFirst ? 10 : 8.5;
        const rColor = TEXT_DARK; // Nama klien maupun alamat klien di blok kiri berseragam warna TEXT_DARK
        const wrapped = wrapTextByWidth(rLine, rFont, rSize, leftColW);
        leftPrepared.push({
          lines: wrapped,
          font: rFont,
          size: rSize,
          color: rColor,
          gapAfter: isFirst ? 3 : 2,
        });
      });

      // Hitung lebar kolom label adaptif (fontBold selaras dengan Ditagihkan Kepada)
      const minLabelW = 96.4; // 34 mm
      const maxLabelW = 110;
      const colonColW = 8;
      const longestSingleLineLabel = Math.max(
        ...effectiveMetaRows.map((m) =>
          fontBold.widthOfTextAtSize(sanitizePdfText(m.label), labelFontSize),
        ),
        minLabelW,
      );
      const labelColW = Math.min(maxLabelW, Math.ceil(longestSingleLineLabel) + 4);
      const valColW = rightColW - labelColW - colonColW;

      const rightPrepared = effectiveMetaRows.map((m) => {
        const labelLines = wrapTextByWidth(
          m.label,
          fontBold,
          labelFontSize,
          labelColW,
        );
        const valueLines = wrapTextByWidth(
          m.value || formatDocEmpty(),
          fontRegular,
          valFontSize,
          valColW,
        );
        const lineCount = Math.max(labelLines.length, valueLines.length, 1);
        return { labelLines, valueLines, lineCount };
      });

      const leftTotalH = leftPrepared.reduce(
        (sum, item) => sum + item.lines.length * 12.5 + item.gapAfter,
        0,
      );
      const rightTotalH = rightPrepared.reduce(
        (sum, item) => sum + item.lineCount * rowLineH + rowGap,
        0,
      );
      const sectionH = Math.max(leftTotalH, rightTotalH);
      ensureSpace(sectionH + 20);

      const sectionTopY = y;

      // Gambar Kolom Kiri (Penerima)
      let curLeftY = sectionTopY;
      for (const item of leftPrepared) {
        for (const line of item.lines) {
          drawTrackedText(
            line,
            {
              x: marginX,
              y: curLeftY,
              size: item.size,
              font: item.font,
              color: item.color,
            },
            "B-recipient",
          );
          curLeftY -= 12.5;
        }
        curLeftY -= item.gapAfter;
      }

      // Gambar Kolom Kanan (Grid 3 Kolom: Label | : | Nilai)
      let curRightY = sectionTopY;
      const colonX = rightColX + labelColW + 2;
      const valX = rightColX + labelColW + colonColW;

      for (const row of rightPrepared) {
        row.labelLines.forEach((lLine, lIdx) => {
          drawTrackedText(
            lLine,
            {
              x: rightColX,
              y: curRightY - lIdx * rowLineH,
              size: labelFontSize,
              font: fontBold,
              color: TEXT_LABEL,
            },
            "B-meta-label",
          );
        });

        drawTrackedText(
          ":",
          {
            x: colonX,
            y: curRightY,
            size: labelFontSize,
            font: fontBold,
            color: TEXT_LABEL,
          },
          "B-meta-colon",
        );

        row.valueLines.forEach((vLine, vIdx) => {
          drawTrackedText(
            vLine,
            {
              x: valX,
              y: curRightY - vIdx * rowLineH,
              size: valFontSize,
              font: fontRegular,
              color: TEXT_DARK,
            },
            "B-meta-value",
          );
        });

        curRightY -= row.lineCount * rowLineH + rowGap;
      }

      y = Math.min(curLeftY, curRightY) - 4;
    } else if (hasMeta) {
      // Hanya Metadata (misal Kuitansi): Grid 3 Kolom penuh selebar contentWidth
      const minLabelW = 102; // ~36 mm
      const maxLabelW = 128; // ~45 mm
      const colonColW = 12;
      const longestLabel = Math.max(
        ...effectiveMetaRows.map((m) =>
          fontBold.widthOfTextAtSize(sanitizePdfText(m.label), labelFontSize),
        ),
        minLabelW,
      );
      const labelColW = Math.min(maxLabelW, Math.ceil(longestLabel) + 6);
      const valColW = contentWidth - labelColW - colonColW;
      const colonX = marginX + labelColW + 2;
      const valX = marginX + labelColW + colonColW;

      const prepared = effectiveMetaRows.map((m) => {
        const labelLines = wrapTextByWidth(
          m.label,
          fontBold,
          labelFontSize,
          labelColW,
        );
        const valueLines = wrapTextByWidth(
          m.value || formatDocEmpty(),
          fontRegular,
          valFontSize,
          valColW,
        );
        const lineCount = Math.max(labelLines.length, valueLines.length, 1);
        return { labelLines, valueLines, lineCount };
      });

      const totalH = prepared.reduce(
        (sum, r) => sum + r.lineCount * rowLineH + rowGap,
        0,
      );
      ensureSpace(totalH + 20);

      for (const row of prepared) {
        row.labelLines.forEach((lLine, lIdx) => {
          drawTrackedText(
            lLine,
            {
              x: marginX,
              y: y - lIdx * rowLineH,
              size: labelFontSize,
              font: fontBold,
              color: TEXT_LABEL,
            },
            "B-meta-label",
          );
        });
        drawTrackedText(
          ":",
          {
            x: colonX,
            y,
            size: labelFontSize,
            font: fontBold,
            color: TEXT_LABEL,
          },
          "B-meta-colon",
        );
        row.valueLines.forEach((vLine, vIdx) => {
          drawTrackedText(
            vLine,
            {
              x: valX,
              y: y - vIdx * rowLineH,
              size: valFontSize,
              font: fontRegular,
              color: TEXT_DARK,
            },
            "B-meta-value",
          );
        });
        y -= row.lineCount * rowLineH + rowGap;
      }
      y -= 4;
    } else if (hasRecipient) {
      // Hanya Penerima
      const rawRecipientTitle = (spec.recipientTitle ?? "Kepada Yth.").replace(
        /\s*:\s*$/,
        "",
      );
      ensureSpace(48);
      drawTrackedText(
        rawRecipientTitle,
        {
          x: marginX,
          y,
          size: labelFontSize,
          font: fontBold,
          color: TEXT_LABEL,
        },
        "B-recipient",
      );
      y -= 14;
      spec.recipientLines!.forEach((rLine, idx) => {
        const isFirst = idx === 0;
        const rFont = isFirst ? fontBold : fontRegular;
        const rSize = isFirst ? 10 : 9;
        const wrapped = wrapTextByWidth(rLine, rFont, rSize, contentWidth);
        for (const wLine of wrapped) {
          drawTrackedText(
            wLine,
            {
              x: marginX,
              y,
              size: rSize,
              font: rFont,
              color: TEXT_DARK,
            },
            "B-recipient",
          );
          y -= 13;
        }
      });
      y -= 4;
    }

    // Garis pemisah tipis di bawah Zona B
    page.drawLine({
      start: { x: marginX, y },
      end: { x: pageWidth - marginX, y },
      thickness: 0.5,
      color: BORDER_GRAY,
    });
    y -= 12;
  }

  // ==========================================================================
  // KOMPONEN 3: PARAGRAF PEMBUKA / NARASI
  // Isi 9.5 pt, line-height 1.45 (~13.8 pt)
  // ==========================================================================
  if (spec.paragraphsBefore && spec.paragraphsBefore.length > 0) {
    const bodySize = PDF_LAYOUT_TOKENS.fontSizes.body; // 9.5 pt
    const bodyLineH = PDF_LAYOUT_TOKENS.lineHeights.body; // 13.8 pt

    for (const para of spec.paragraphsBefore) {
      const wrapped = wrapTextByWidth(para, fontRegular, bodySize, contentWidth);
      ensureSpace(wrapped.length * bodyLineH + 8);
      for (const line of wrapped) {
        drawTrackedText(
          line,
          {
            x: marginX,
            y,
            size: bodySize,
            font: fontRegular,
            color: TEXT_DARK,
          },
          "C-paragraph",
        );
        y -= bodyLineH;
      }
      y -= 6;
    }
    y -= 6;
  }

  // ==========================================================================
  // KOMPONEN 4: TABEL RINCIAN (ZONA D)
  // - Header tabel tinggi 28 pt, teks 8.5 pt tebal, latar #f3f4f6.
  // - Hanya garis horizontal tipis antar baris (#e5e7eb), padding vertikal 8 pt.
  // - Header tabel berulang tiap halaman; satu baris tidak terpotong antar halaman.
  // ==========================================================================
  if (
    spec.tableColumns &&
    spec.tableColumns.length > 0 &&
    spec.tableRows &&
    spec.tableRows.length > 0
  ) {
    const cols = spec.tableColumns;
    const totalRatio = cols.reduce((s, c) => s + c.widthRatio, 0) || 1;
    const colWidths = cols.map((c) => (c.widthRatio / totalRatio) * contentWidth);
    const headerH = 28;
    const headerFontSize = PDF_LAYOUT_TOKENS.fontSizes.tableHeader; // 8.5 pt
    const cellFontSize = PDF_LAYOUT_TOKENS.fontSizes.body; // 9.5 pt
    const cellLineH = 13.5;
    const cellPadY = 8;

    const drawTableHeader = () => {
      const rectBottomY = y - headerH + 8;
      page.drawRectangle({
        x: marginX,
        y: rectBottomY,
        width: contentWidth,
        height: headerH,
        color: CHIP_BG,
      });
      page.drawLine({
        start: { x: marginX, y: rectBottomY + headerH },
        end: { x: pageWidth - marginX, y: rectBottomY + headerH },
        thickness: 0.75,
        color: BORDER_GRAY,
      });
      page.drawLine({
        start: { x: marginX, y: rectBottomY },
        end: { x: pageWidth - marginX, y: rectBottomY },
        thickness: 0.75,
        color: BORDER_GRAY,
      });

      let colX = marginX;
      const textBaselineY = rectBottomY + (headerH - headerFontSize) / 2 + 1;
      cols.forEach((col, idx) => {
        const w = colWidths[idx]!;
        const headerClean = sanitizePdfText(col.header);
        const textW = fontBold.widthOfTextAtSize(headerClean, headerFontSize);
        let drawX = colX + 8;
        if (col.align === "right") {
          drawX = colX + w - textW - 8;
        } else if (col.align === "center") {
          drawX = colX + (w - textW) / 2;
        }
        drawTrackedText(
          headerClean,
          {
            x: drawX,
            y: textBaselineY,
            size: headerFontSize,
            font: fontBold,
            color: TEXT_DARK,
          },
          "D-table-header",
        );
        colX += w;
      });

      y = rectBottomY - cellPadY - 9;
    };

    // Pastikan ruang cukup untuk header tabel + minimal 1 baris pertama
    ensureSpace(headerH + 36);
    drawTableHeader();

    for (const row of spec.tableRows) {
      const wrappedCells = cols.map((col, idx) => {
        const rawCell = row[idx] ?? "";
        const cleanCell = col.align === "right" ? stripCurrencySymbol(rawCell) : rawCell;
        return wrapTextByWidth(
          cleanCell,
          fontRegular,
          cellFontSize,
          colWidths[idx]! - 16,
        );
      });
      const maxLines = Math.max(...wrappedCells.map((c) => c.length), 1);
      const rowContentH = (maxLines - 1) * cellLineH + cellFontSize;
      const totalRowH = rowContentH + cellPadY * 2;

      // Jika baris tidak muat di halaman ini, buat halaman baru dan ulangi Header Dokumen + Header Tabel
      if (y - rowContentH - cellPadY < bottomSafeY) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(page);
        pageIndex = pages.length - 1;
        y = pageHeight - marginTop;
        drawDocumentHeader();
        drawTableHeader();
      }

      let cellX = marginX;
      cols.forEach((col, idx) => {
        const w = colWidths[idx]!;
        const lines = wrappedCells[idx] ?? [""];
        lines.forEach((l, lIdx) => {
          const cleanL = sanitizePdfText(l);
          const textW = fontRegular.widthOfTextAtSize(cleanL, cellFontSize);
          let drawX = cellX + 8;
          if (col.align === "right") {
            drawX = cellX + w - textW - 8;
          } else if (col.align === "center") {
            drawX = cellX + (w - textW) / 2;
          }
          drawTrackedText(
            cleanL,
            {
              x: drawX,
              y: y - lIdx * cellLineH,
              size: cellFontSize,
              font: fontRegular,
              color: TEXT_DARK,
            },
            "D-table-cell",
          );
        });
        cellX += w;
      });

      const bottomLineY = y - (maxLines - 1) * cellLineH - cellPadY;
      page.drawLine({
        start: { x: marginX, y: bottomLineY },
        end: { x: pageWidth - marginX, y: bottomLineY },
        thickness: 0.5,
        color: BORDER_GRAY,
      });

      // Siapkan y untuk baris berikutnya (jika masih ada)
      y = bottomLineY - cellPadY - 9;
      void totalRowH;
    }

    y += cellPadY; // sesuaikan offset setelah baris terakhir
    y -= 8;
  }

  // ==========================================================================
  // KOMPONEN 5: BLOK TOTAL & TERBILANG (ZONA E)
  // - Blok selebar 45% di kanan: label kiri, nilai kanan, garis di atas baris total,
  //   baris total tebal & lebih besar.
  // - Terbilang ditulis di bawahnya (tanpa "# ... #" pada Invoice, Quotation, PO;
  //   dipertahankan pada Kuitansi sesuai Keputusan K-02).
  // ==========================================================================
  const hasSummary = Boolean(spec.summaryRows && spec.summaryRows.length > 0);
  const hasTerbilang = typeof spec.terbilangAmount === "number";
  const isInvoiceDoc =
    spec.docTitle.toUpperCase().includes("INVOICE") || Boolean(spec.paymentDetail);

  if (isInvoiceDoc && (hasSummary || Boolean(spec.paymentDetail))) {
    const totalBlockW = 215;
    const totalBlockX = pageWidth - marginX - totalBlockW;
    const rightEdgeX = pageWidth - marginX;
    const gap = 12;
    const keteranganX = marginX;
    const keteranganW = totalBlockX - marginX - gap;

    const allSummaryRows = spec.summaryRows ?? [];
    const summaryFontSize = 8.5;
    const rowPitch = 15;
    const summaryBlockH = Math.max(allSummaryRows.length * rowPitch + 4, 60);

    ensureSpace(summaryBlockH + (spec.paymentDetail ? 75 : 0) + 15);

    const blockTopY = y;
    const blockBottomY = blockTopY - summaryBlockH;

    // 1. Kotak Keterangan di sebelah kiri blok total (tinggi sejajar dengan blok total, sudut kaku/sharp 0)
    drawRoundedRect(
      page,
      keteranganX,
      blockTopY,
      keteranganW,
      summaryBlockH,
      0,
      { borderWidth: 0.5, borderColor: BORDER_GRAY },
    );
    drawTrackedText(
      "Keterangan",
      {
        x: keteranganX + 10,
        y: blockTopY - 13,
        size: 8.5,
        font: fontBold,
        color: TEXT_DARK,
      },
      "E-keterangan-title",
    );

    if (spec.documentNotes && spec.documentNotes.trim()) {
      const noteLines = wrapTextByWidth(
        spec.documentNotes.trim(),
        fontRegular,
        8,
        keteranganW - 20,
      );
      noteLines.slice(0, 4).forEach((nLine, nIdx) => {
        drawTrackedText(
          nLine,
          {
            x: keteranganX + 10,
            y: blockTopY - 26 - nIdx * 11,
            size: 8,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "E-keterangan-content",
        );
      });
    }

    // 2. Blok Subtotal dan Total di sebelah kanan (font size seragam, garis tipis di bawah tiap baris)
    let curSummaryY = blockTopY - 11;
    allSummaryRows.forEach((row) => {
      const isGrandTotal =
        /^total\s+tagihan\s+invoice/i.test(row.label.trim()) ||
        (/^total\b/i.test(row.label.trim()) && !/kontrak/i.test(row.label));
      const rowFont = isGrandTotal ? fontBold : fontRegular;
      const labelColor = isGrandTotal ? TEXT_DARK : TEXT_LABEL;

      const cleanLabel = sanitizePdfText(row.label);
      const cleanVal = sanitizePdfText(stripCurrencySymbol(row.value));
      const valW = rowFont.widthOfTextAtSize(cleanVal, summaryFontSize);

      drawTrackedText(
        cleanLabel,
        {
          x: totalBlockX,
          y: curSummaryY,
          size: summaryFontSize,
          font: rowFont,
          color: labelColor,
        },
        "E-total-label",
      );
      drawTrackedText(
        cleanVal,
        {
          x: rightEdgeX - valW,
          y: curSummaryY,
          size: summaryFontSize,
          font: rowFont,
          color: TEXT_DARK,
        },
        "E-total-value",
      );

      // Garis tipis pemisah yang sama di bawah tiap baris
      const lineY = curSummaryY - 4;
      page.drawLine({
        start: { x: totalBlockX, y: lineY },
        end: { x: rightEdgeX, y: lineY },
        thickness: 0.4,
        color: BORDER_GRAY,
      });

      curSummaryY -= rowPitch;
    });

    y = blockBottomY - 10;

    // 3. Kotak Detail Pembayaran (Payment Detail)
    if (spec.paymentDetail) {
      const pd = spec.paymentDetail;
      const pdBoxW = contentWidth;
      const pdBoxH = 76;
      ensureSpace(pdBoxH + 15);
      const pdBoxTopY = y;
      const pdBoxBottomY = pdBoxTopY - pdBoxH;

      drawRoundedRect(
        page,
        marginX,
        pdBoxTopY,
        pdBoxW,
        pdBoxH,
        0,
        { borderWidth: 0.5, borderColor: BORDER_GRAY },
      );

      // Header Detail Pembayaran
      drawTrackedText(
        "Detail Pembayaran",
        {
          x: marginX + 10,
          y: pdBoxTopY - 12,
          size: 8.5,
          font: fontBold,
          color: TEXT_DARK,
        },
        "E-pd-title",
      );

      // Garis pemisah di bawah judul
      const pdDividerY = pdBoxTopY - 18;
      page.drawLine({
        start: { x: marginX + 8, y: pdDividerY },
        end: { x: rightEdgeX - 8, y: pdDividerY },
        thickness: 0.4,
        color: BORDER_GRAY,
      });

      // Kolom Kanan Info Bank sejajar dengan posisi teks blok subtotal (totalBlockX)
      const rightColX = totalBlockX;
      const rightColTopY = pdDividerY - 11;
      const bLabelW = 70;

      // Kolom Kiri: Terbilang (lebar menyesuaikan hingga sebelum kolom bank)
      const leftColX = marginX + 10;
      const leftColW = rightColX - leftColX - 16;
      const leftColTopY = pdDividerY - 11;
      drawTrackedText(
        "Terbilang",
        {
          x: leftColX,
          y: leftColTopY,
          size: 8,
          font: fontBold,
          color: TEXT_DARK,
        },
        "E-pd-terbilang-lbl",
      );
      const tLines = wrapTextByWidth(pd.terbilangText, fontRegular, 8, leftColW);
      tLines.slice(0, 3).forEach((tLine, tIdx) => {
        drawTrackedText(
          tLine,
          {
            x: leftColX,
            y: leftColTopY - 12 - tIdx * 11.5,
            size: 8,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "E-pd-terbilang-val",
        );
      });

      const bankItems: Array<{ label: string; value: string }> = [
        { label: "Nama Bank", value: pd.bankName },
        { label: "Nomor Rekening", value: pd.accountNumber },
        { label: "Atas Nama", value: pd.accountHolder },
        { label: "Berita Transfer", value: pd.transferNews },
      ];
      if (pd.isPaid) {
        bankItems.push({ label: "Status", value: "LUNAS" });
      }
      if (pd.swiftCode) {
        bankItems.push({ label: "Swift Code", value: pd.swiftCode });
      }

      let bCursorY = rightColTopY;
      bankItems.slice(0, 4).forEach((bItem) => {
        drawTrackedText(
          bItem.label,
          {
            x: rightColX,
            y: bCursorY,
            size: 8,
            font: fontBold,
            color: TEXT_DARK,
          },
          "E-pd-bank-lbl",
        );
        drawTrackedText(
          ":",
          {
            x: rightColX + bLabelW,
            y: bCursorY,
            size: 8,
            font: fontBold,
            color: TEXT_DARK,
          },
          "E-pd-bank-colon",
        );
        drawTrackedText(
          bItem.value,
          {
            x: rightColX + bLabelW + 6,
            y: bCursorY,
            size: 8,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "E-pd-bank-val",
        );
        bCursorY -= 12.5;
      });

      y = pdBoxBottomY - 7;
    }
  } else if (hasSummary || hasTerbilang) {
    const totalBlockW = Math.round(contentWidth * 0.45); // ~222 pt
    const totalBlockX = pageWidth - marginX - totalBlockW;
    const rightEdgeX = pageWidth - marginX;

    // Pisahkan baris perhitungan tagihan utama vs baris informasi kontrak tambahan
    const isContractInfoRow = (label: string) =>
      /kontrak|sebelumnya|berjalan|estimasi/i.test(label) &&
      !/^total\s+(nilai\s+purchase\s+order|nilai\s+po|penawaran|biaya|nilai\s+termin|tagihan)/i.test(
        label.trim(),
      );

    const primaryRows = (spec.summaryRows ?? []).filter(
      (r) => !isContractInfoRow(r.label),
    );
    const secondaryRows = (spec.summaryRows ?? []).filter((r) =>
      isContractInfoRow(r.label),
    );

    const isReceiptDoc = spec.docTitle.toUpperCase().includes("KUITANSI");
    const terbilangStr = hasTerbilang
      ? isReceiptDoc
        ? `Terbilang: # ${terbilangRupiah(spec.terbilangAmount!)} #`
        : `Terbilang: ${terbilangRupiah(spec.terbilangAmount!)}`
      : null;
    const terbilangLines = terbilangStr
      ? wrapTextByWidth(terbilangStr, fontBold, 8.5, contentWidth)
      : [];

    const neededH =
      primaryRows.length * 18 +
      (secondaryRows.length > 0 ? secondaryRows.length * 14 + 12 : 0) +
      (terbilangLines.length > 0 ? terbilangLines.length * 13 + 12 : 0) +
      8;
    ensureSpace(neededH);

    // Render baris perhitungan utama
    primaryRows.forEach((row, idx) => {
      const isGrandTotal =
        idx === primaryRows.length - 1 ||
        /^total\b/i.test(row.label.trim());

      if (isGrandTotal) {
        page.drawLine({
          start: { x: totalBlockX, y: y + 11 },
          end: { x: rightEdgeX, y: y + 11 },
          thickness: 0.75,
          color: TEXT_DARK,
        });
        y -= 2;
      }

      const rowFont = isGrandTotal ? fontBold : fontRegular;
      const labelSize = isGrandTotal ? 9.5 : 8.5;
      const valSize = isGrandTotal ? 10.5 : 9.5;
      const labelColor = isGrandTotal ? TEXT_DARK : TEXT_LABEL;

      const cleanLabel = sanitizePdfText(row.label);
      const cleanVal = sanitizePdfText(stripCurrencySymbol(row.value));
      const valW = rowFont.widthOfTextAtSize(cleanVal, valSize);

      drawTrackedText(
        cleanLabel,
        {
          x: totalBlockX,
          y,
          size: labelSize,
          font: rowFont,
          color: labelColor,
        },
        "E-total-label",
      );
      drawTrackedText(
        cleanVal,
        {
          x: rightEdgeX - valW,
          y,
          size: valSize,
          font: rowFont,
          color: TEXT_DARK,
        },
        "E-total-value",
      );

      y -= isGrandTotal ? 17 : 15;
    });

    // Render baris informasi progres kontrak (bila ada)
    if (secondaryRows.length > 0) {
      y -= 2;
      page.drawLine({
        start: { x: totalBlockX, y: y + 9 },
        end: { x: rightEdgeX, y: y + 9 },
        thickness: 0.4,
        color: BORDER_GRAY,
      });
      for (const sRow of secondaryRows) {
        const cleanLabel = sanitizePdfText(sRow.label);
        const cleanVal = sanitizePdfText(stripCurrencySymbol(sRow.value));
        const valW = fontRegular.widthOfTextAtSize(cleanVal, 8.5);
        drawTrackedText(
          cleanLabel,
          {
            x: totalBlockX,
            y,
            size: 8,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "E-contract-label",
        );
        drawTrackedText(
          cleanVal,
          {
            x: rightEdgeX - valW,
            y,
            size: 8.5,
            font: fontRegular,
            color: TEXT_DARK,
          },
          "E-contract-value",
        );
        y -= 13.5;
      }
    }

    // Render kalimat Terbilang
    if (terbilangLines.length > 0) {
      y -= 4;
      for (const tLine of terbilangLines) {
        drawTrackedText(
          tLine,
          {
            x: marginX,
            y,
            size: 8.5,
            font: fontBold,
            color: TEXT_LABEL,
          },
          "E-terbilang",
        );
        y -= 12.5;
      }
    }

    y -= 10;
  }

  // ==========================================================================
  // KOMPONEN 6: DAFTAR BULLET / CATATAN (ZONA F)
  // - Dua kolom: marker (lebar tetap 12 pt) | teks (hanging indent sejajar huruf pertama).
  // - Jarak antar item 3.5 pt; teks tidak melewati margin kanan.
  // ==========================================================================
  if (spec.notes && spec.notes.length > 0) {
    const defaultNotesTitle = spec.docTitle.toUpperCase().includes("UAT")
      ? "Catatan Pengujian & Tindak Lanjut"
      : spec.docTitle.toUpperCase().includes("BAST")
        ? "Catatan & Ketentuan Serah Terima"
        : spec.docTitle.toUpperCase().includes("BAKP")
          ? "Catatan Pemeriksaan Capaian"
          : spec.docTitle.toUpperCase().includes("QUOTATION")
            ? "Ketentuan Penawaran Harga"
            : spec.docTitle.toUpperCase().includes("SPK") ||
                spec.docTitle.toUpperCase().includes("SOW")
              ? "Ketentuan Pelaksanaan Pekerjaan"
              : spec.docTitle.toUpperCase().includes("INVOICE") ||
                  spec.docTitle.toUpperCase().includes("TAGIHAN")
                ? "Ketentuan Pembayaran"
                : "Catatan & Ketentuan";
    const notesHeading = (spec.notesTitle ?? defaultNotesTitle).replace(
      /\s*:\s*$/,
      "",
    );

    const markerColW = 12;
    const noteTextMaxW = contentWidth - markerColW;
    const noteSize = PDF_LAYOUT_TOKENS.fontSizes.note; // 8.5 pt
    const noteLineH = 11.5; // proporsional untuk 8.5 pt
    const itemGap = 2.5;

    ensureSpace(28);
    drawTrackedText(
      notesHeading,
      {
        x: marginX,
        y,
        size: 8.5,
        font: fontBold,
        color: TEXT_DARK,
      },
      "F-notes-heading",
    );
    y -= 14;

    for (const rawNote of spec.notes) {
      // Bersihkan marker bawaan bila string sudah diawali "• " atau "- "
      const strippedNote = rawNote.replace(/^[•\-*]\s+/, "").trim();
      const wrappedLines = wrapTextByWidth(
        strippedNote,
        fontRegular,
        noteSize,
        noteTextMaxW,
      );
      ensureSpace(wrappedLines.length * noteLineH + itemGap);

      wrappedLines.forEach((line, lineIdx) => {
        if (lineIdx === 0) {
          drawTrackedText(
            "\u2022",
            {
              x: marginX,
              y,
              size: noteSize,
              font: fontBold,
              color: TEXT_LABEL,
            },
            "F-bullet-marker",
          );
        }
        drawTrackedText(
          line,
          {
            x: marginX + markerColW,
            y,
            size: noteSize,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "F-bullet-text",
        );
        y -= noteLineH;
      });
      y -= itemGap;
    }

    y -= 8;
  }

  // ==========================================================================
  // KOMPONEN 7: BLOK PENGESAHAN & SLOT E-METERAI (ZONA G)
  // - Dua kolom sejajar dengan lebar sama (atau 3 kolom untuk PO Vendor).
  // - Ruang tanda tangan minimal 62 pt (atau 99 pt bila ada Slot e-Meterai 25x35 mm = 71x99 pt).
  // - Urutan mengalir (flow): Label -> Ruang TTD / e-Meterai -> Garis tipis -> Nama tebal -> Jabatan 8.5 pt abu.
  // - Blok pengesahan tidak terbelah antar halaman.
  // ==========================================================================
  if (
    spec.rightSignatureName ||
    spec.leftSignatureName ||
    spec.thirdSignatureName
  ) {
    const meteraiW = 71; // 25 mm
    const meteraiH = 99; // 35 mm
    const sigSpaceH = spec.hasMeterai ? meteraiH + 8 : (spec.minSignatureSpace || 46);
    // Blok Altvira (kanan) memiliki 2 baris teks judul (Baris 1: pembuka, Baris 2: "Altvira Technology"),
    // sehingga membutuhkan alokasi 24 pt sebelum ruang tanda tangan.
    const totalSigBlockH =
      24 + sigSpaceH + 26 + (spec.closingNote ? 24 : 0);

    // Pastikan seluruh blok pengesahan utuh pada satu halaman
    ensureSpace(totalSigBlockH);

    y -= 4;
    const sigTopY = y;
    // Baseline garis tanda tangan diturunkan 24 pt dari sigTopY agar sejajar sempurna
    // antara kolom kiri (1 baris) dan kolom kanan (2 baris: pembuka + Altvira Technology).
    const lineY = sigTopY - 24 - sigSpaceH;
    const nameY = lineY - 13;
    const titleY = nameY - 12;

    const splitSigner = (raw?: string): { name: string; title: string } => {
      if (!raw) return { name: "", title: "" };
      const trimmed = raw.trim();
      const cleaned =
        trimmed.startsWith("(") && trimmed.endsWith(")")
          ? trimmed.slice(1, -1).trim()
          : trimmed;
      const dashParts = cleaned.split(/\s+-\s+/);
      if (dashParts.length > 1) {
        return {
          name: dashParts[0]?.trim() ?? cleaned,
          title: dashParts.slice(1).join(" - ").trim(),
        };
      }
      const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        return {
          name: parenMatch[1]!.trim(),
          title: parenMatch[2]!.trim(),
        };
      }
      return { name: cleaned, title: "" };
    };

    const parseRightOpening = (raw?: string): string => {
      if (!raw || !raw.trim()) return "Hormat kami,";
      const trimmed = raw.trim();
      if (trimmed.includes(",")) {
        const first = trimmed.split(",")[0]?.trim();
        if (first) return `${first},`;
      }
      if (/pelaksana/i.test(trimmed)) return "Pelaksana,";
      if (/penerima/i.test(trimmed)) return "Penerima,";
      if (/dikeluarkan\s+oleh/i.test(trimmed)) return "Dikeluarkan Oleh,";
      if (/diterima\s+oleh/i.test(trimmed)) return "Diterima Oleh,";
      if (/hormat\s+kami/i.test(trimmed)) return "Hormat kami,";
      return trimmed.endsWith(",") ? trimmed : `${trimmed},`;
    };

    if (spec.thirdSignatureName) {
      // Skenario 3 Kolom Sejajar (Dibuat, Disetujui, Diterima)
      const colGap = 20;
      const colW = (contentWidth - colGap * 2) / 3;
      const cols = [
        {
          x: marginX,
          label: spec.leftSignatureLabel ?? "Dibuat Oleh,",
          signer: splitSigner(spec.leftSignatureName),
          img: leftSigImg,
          defaultTitle: "Staff Pengadaan",
        },
        {
          x: marginX + colW + colGap,
          label: spec.thirdSignatureLabel ?? "Disetujui Oleh,",
          signer: splitSigner(spec.thirdSignatureName),
          img: thirdSigImg,
          defaultTitle: "Pejabat Penyetuju",
        },
        {
          x: marginX + (colW + colGap) * 2,
          label: spec.rightSignatureLabel ?? "Diterima Oleh,",
          signer: splitSigner(spec.rightSignatureName),
          img: rightSigImg,
          defaultTitle: "Perwakilan Vendor",
        },
      ];

      for (const c of cols) {
        if (!c.signer.name) continue;
        const labelLines = wrapTextByWidth(c.label, fontRegular, 8.5, colW);
        labelLines.forEach((ll, idx) => {
          drawTrackedText(
            ll,
            {
              x: c.x,
              y: sigTopY - idx * 11.5,
              size: 8.5,
              font: fontRegular,
              color: TEXT_LABEL,
            },
            "G-sig-label",
          );
        });

        if (c.img) {
          const dims = fitDimensions(c.img, colW - 16, sigSpaceH - 12);
          page.drawImage(c.img, {
            x: c.x,
            y: lineY + 6,
            width: dims.width,
            height: dims.height,
          });
        }

        page.drawLine({
          start: { x: c.x, y: lineY },
          end: { x: c.x + Math.min(colW - 8, 140), y: lineY },
          thickness: 0.6,
          color: BORDER_GRAY,
        });

        const nameLines = wrapTextByWidth(c.signer.name, fontBold, 9.5, colW);
        drawTrackedText(
          nameLines[0]!,
          {
            x: c.x,
            y: nameY,
            size: 9.5,
            font: fontBold,
            color: TEXT_DARK,
          },
          "G-sig-name",
        );

        const roleText = c.signer.title || c.defaultTitle;
        if (roleText) {
          const roleLines = wrapTextByWidth(roleText, fontRegular, 8.5, colW);
          drawTrackedText(
            roleLines[0]!,
            {
              x: c.x,
              y: titleY,
              size: 8.5,
              font: fontRegular,
              color: TEXT_LABEL,
            },
            "G-sig-title",
          );
        }
      }
      y = titleY - 14;
    } else {
      // Skenario 2 Kolom: Kolom kiri menempel ke margin kiri, kolom kanan digeser hingga menyentuh margin kanan
      const colLeftX = marginX;
      const rightEdgeX = pageWidth - marginX;
      const sigLineWidth = 176;
      const colRightX = rightEdgeX - sigLineWidth;

      // Kolom Kiri (Pihak Kedua / Klien)
      if (spec.leftSignatureName) {
        const leftSigner = splitSigner(spec.leftSignatureName);
        drawTrackedText(
          spec.leftSignatureLabel ?? "Pihak Klien,",
          {
            x: colLeftX,
            y: sigTopY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "G-sig-left-label",
        );

        if (leftSigImg) {
          const dims = fitDimensions(leftSigImg, 120, 52);
          page.drawImage(leftSigImg, {
            x: colLeftX,
            y: lineY + 6,
            width: dims.width,
            height: dims.height,
          });
        }

        page.drawLine({
          start: { x: colLeftX, y: lineY },
          end: { x: colLeftX + 168, y: lineY },
          thickness: 0.6,
          color: BORDER_GRAY,
        });

        drawTrackedText(
          leftSigner.name,
          {
            x: colLeftX,
            y: nameY,
            size: 9.5,
            font: fontBold,
            color: TEXT_DARK,
          },
          "G-sig-left-name",
        );

        const defaultLeftRole = /pemohon|pengaju/i.test(
          spec.leftSignatureLabel ?? "",
        )
          ? "Pemohon / Pengaju"
          : /penguji/i.test(spec.leftSignatureLabel ?? "")
            ? "Penguji Pihak Klien"
            : "Perwakilan Klien";
        const leftRole = leftSigner.title || defaultLeftRole;
        drawTrackedText(
          leftRole,
          {
            x: colLeftX,
            y: titleY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "G-sig-left-title",
        );
      }

      // Kolom Kanan (Pihak Pertama / Altvira) + Slot e-Meterai 25x35 mm di atas nama penandatangan
      if (spec.rightSignatureName) {
        const rightSigner = splitSigner(spec.rightSignatureName);
        const openingText = parseRightOpening(spec.rightSignatureLabel);

        // Baris 1: Kata pembuka
        drawTrackedText(
          openingText,
          {
            x: colRightX,
            y: sigTopY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "G-sig-right-label",
        );

        // Baris 2: "Altvira Technology" tebal (ukuran 9.5 pt sama dengan nama penandatangan)
        drawTrackedText(
          "Altvira Technology",
          {
            x: colRightX,
            y: sigTopY - 12,
            size: 9.5,
            font: fontBold,
            color: TEXT_DARK,
          },
          "G-sig-right-company",
        );

        let sigImgOffsetX = colRightX;

        if (spec.hasMeterai) {
          // Kotak e-Meterai 25x35 mm (71 x 99 pt) di atas nama penandatangan kanan
          const mBoxX = colRightX;
          const mBoxY = lineY + 4;
          page.drawRectangle({
            x: mBoxX,
            y: mBoxY,
            width: meteraiW,
            height: meteraiH,
            color: CHIP_BG,
            borderColor: BORDER_GRAY,
            borderWidth: 0.75,
          });

          const mLines: Array<{ text: string; size: number; bold: boolean; color: RGB; dy: number }> = [
            { text: "METERAI", size: 7.5, bold: true, color: TEXT_LABEL, dy: 20 },
            { text: "ELEKTRONIK", size: 7.5, bold: true, color: TEXT_LABEL, dy: 32 },
            { text: "Rp10.000", size: 9.5, bold: true, color: TEXT_DARK, dy: 52 },
            { text: "Tempat e-Meterai", size: 7.5, bold: false, color: TEXT_LABEL, dy: 72 },
            { text: "25 x 35 mm", size: 7.5, bold: false, color: TEXT_LABEL, dy: 84 },
          ];

          for (const ml of mLines) {
            const mFont = ml.bold ? fontBold : fontRegular;
            const tw = mFont.widthOfTextAtSize(ml.text, ml.size);
            drawTrackedText(
              ml.text,
              {
                x: mBoxX + (meteraiW - tw) / 2,
                y: mBoxY + meteraiH - ml.dy,
                size: ml.size,
                font: mFont,
                color: ml.color,
              },
              "G-meterai",
            );
          }

          sigImgOffsetX = colRightX + meteraiW + 10;
        }

        if (rightSigImg) {
          const dims = fitDimensions(rightSigImg, 115, 52);
          page.drawImage(rightSigImg, {
            x: sigImgOffsetX,
            y: lineY + 6,
            width: dims.width,
            height: dims.height,
          });
        }

        page.drawLine({
          start: { x: colRightX, y: lineY },
          end: { x: rightEdgeX, y: lineY },
          thickness: 0.6,
          color: BORDER_GRAY,
        });

        drawTrackedText(
          rightSigner.name,
          {
            x: colRightX,
            y: nameY,
            size: 9.5,
            font: fontBold,
            color: TEXT_DARK,
          },
          "G-sig-right-name",
        );

        const rightRole =
          rightSigner.title || spec.company.signer_title || "Pejabat Berwenang";
        drawTrackedText(
          rightRole,
          {
            x: colRightX,
            y: titleY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "G-sig-right-title",
        );
      }

      y = titleY - 14;
    }

    // Jika ada closingNote, ditempatkan mengalir di bawah blok pengesahan dengan jarak 24 pt
    if (spec.closingNote && spec.closingNote.trim()) {
      y -= 10; // ditambah 14 pt di atas = 24 pt dari baris jabatan
      const cClean = sanitizePdfText(spec.closingNote.trim());
      const cW = fontBold.widthOfTextAtSize(cClean, 8.5);
      drawTrackedText(
        cClean,
        {
          x: (pageWidth - cW) / 2,
          y,
          size: 8.5,
          font: fontBold,
          color: TEXT_LABEL,
        },
        "G-closing-note",
      );
      y -= 14;
    }
  }

  // ==========================================================================
  // KOMPONEN 8: FOOTER (ZONA I) DI SETIAP HALAMAN
  // ==========================================================================
  await drawSocialMediaFooters({
    pdfDoc,
    pages,
    company: spec.company,
    fontRegular,
    fontBold,
    marginX,
    pageWidth,
    docNumber:
      spec.footerDocNumber ?? (spec.docNumber ? spec.docNumber : undefined),
    hideSystemFooter: spec.hideSystemFooter,
    recordBox,
  });

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes,
    pageCount: pages.length,
    textBoxes,
    headerAlignment,
  };
}

/**
 * Menghasilkan berkas PDF A4 Bahasa Indonesia dengan komponen bersama terstandar.
 */
export async function generateDocumentPdf(
  spec: PdfDocumentSpec,
): Promise<Uint8Array> {
  const { pdfBytes } = await renderDocumentPdfInternal(spec);
  return pdfBytes;
}

/**
 * Pemeriksa otomatis tata letak PDF:
 * Membandingkan kotak batas (bounding box) seluruh elemen teks per halaman
 * dan melaporkan bila ada dua elemen teks beririsan atau teks melewati batas margin.
 */
export async function inspectPdfDocumentLayout(
  spec: PdfDocumentSpec,
): Promise<PdfLayoutInspectionResult> {
  const { pdfBytes, pageCount, textBoxes, headerAlignment } =
    await renderDocumentPdfInternal(spec);
  const collisions: PdfCollisionIssue[] = [];
  const marginViolations: PdfMarginIssue[] = [];

  const { pageWidth, pageHeight, marginX } = PDF_LAYOUT_TOKENS;
  const minX = marginX - 1.5;
  const maxX = pageWidth - marginX + 1.5;
  const minY = 20;
  const maxY = pageHeight - 20;

  for (const box of textBoxes) {
    if (box.x < minX) {
      marginViolations.push({
        pageIndex: box.pageIndex,
        box,
        reason: `Lewat margin kiri: x=${box.x.toFixed(1)} < ${marginX.toFixed(1)}`,
      });
    }
    if (box.x + box.width > maxX) {
      marginViolations.push({
        pageIndex: box.pageIndex,
        box,
        reason: `Lewat margin kanan: x+w=${(box.x + box.width).toFixed(1)} > ${(pageWidth - marginX).toFixed(1)}`,
      });
    }
    if (box.y < minY || box.y + box.height > maxY) {
      marginViolations.push({
        pageIndex: box.pageIndex,
        box,
        reason: `Lewat batas vertikal halaman: y=${box.y.toFixed(1)}`,
      });
    }
  }

  for (let p = 0; p < pageCount; p++) {
    const pageBoxes = textBoxes.filter((b) => b.pageIndex === p);
    for (let i = 0; i < pageBoxes.length; i++) {
      for (let j = i + 1; j < pageBoxes.length; j++) {
        const a = pageBoxes[i]!;
        const b = pageBoxes[j]!;

        const aLeft = a.x;
        const aRight = a.x + a.width;
        const aBottom = a.y - a.height * 0.15;
        const aTop = a.y + a.height * 0.78;

        const bLeft = b.x;
        const bRight = b.x + b.width;
        const bBottom = b.y - b.height * 0.15;
        const bTop = b.y + b.height * 0.78;

        const overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
        const overlapY = Math.min(aTop, bTop) - Math.max(aBottom, bBottom);

        if (overlapX > 1.2 && overlapY > 1.2) {
          collisions.push({
            pageIndex: p,
            boxA: a,
            boxB: b,
            overlapX,
            overlapY,
          });
        }
      }
    }
  }

  return {
    pdfBytes,
    pageCount,
    textBoxes,
    collisions,
    marginViolations,
    headerAlignment,
  };
}

/**
 * Generator PDF Khusus SPK / Project Charter Altvira (PC-1126-01 Reference)
 * Memuat kop dua logo, identitas lengkap Pihak I & II, Pasal 1–10 beserta tabel Timeline,
 * Tim & Tata Kelola, Event, Pembiayaan, gambar TTD, paraf per halaman, & footer 3 sosial media.
 */
export async function generateSpkProjectCharterPdf(params: {
  docNumber: string;
  docDate: string;
  docTitle: string;
  company: CompanyProfileRow;
  content: SpkCharterContent;
}): Promise<Uint8Array> {
  const { docNumber, docDate, docTitle, company, content } = params;
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const [
    companyLogo,
    clientLogo,
    p1SigImg,
    p2SigImg,
    p1ParafImg,
    p2ParafImg,
  ] = await Promise.all([
    embedOptionalImage(pdfDoc, company.logo_storage_path),
    embedOptionalImage(pdfDoc, content.clientLogoDataUrl),
    embedOptionalImage(
      pdfDoc,
      content.partyOneSignatureUrl ?? company.signer_signature_path,
    ),
    embedOptionalImage(pdfDoc, content.partyTwoSignatureUrl),
    embedOptionalImage(
      pdfDoc,
      content.partyOneParafUrl ?? company.signer_paraf_path,
    ),
    embedOptionalImage(pdfDoc, content.partyTwoParafUrl),
  ]);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 42;
  const contentWidth = pageWidth - marginX * 2;
  const bottomSafeY = 74;

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const drawSpkHeader = (p: PDFPage) => {
    const topY = pageHeight - 30;
    const boxH = 44;
    const subH = 18;

    // Header Card Berbingkai Bersih & Proporsional Modern
    p.drawRectangle({
      x: marginX,
      y: topY - boxH,
      width: contentWidth,
      height: boxH,
      color: SURFACE_SUBTLE,
      borderColor: BORDER_SLATE,
      borderWidth: 0.6,
    });

    // Kiri: Logo Altvira
    if (companyLogo) {
      const dims = fitDimensions(companyLogo, 84, 34);
      p.drawImage(companyLogo, {
        x: marginX + 8,
        y: topY - boxH + (boxH - dims.height) / 2,
        width: dims.width,
        height: dims.height,
      });
    } else {
      p.drawText(sanitizePdfText(company.company_name), {
        x: marginX + 10,
        y: topY - 25,
        size: 10,
        font: fontBold,
        color: SLATE_900,
      });
    }

    // Tengah: Judul Kop
    const topBrand = sanitizePdfText(company.company_name.toUpperCase());
    const topBrandW = fontBold.widthOfTextAtSize(topBrand, 8.8);
    p.drawText(topBrand, {
      x: marginX + (contentWidth - topBrandW) / 2,
      y: topY - 17,
      size: 8.8,
      font: fontBold,
      color: SLATE_900,
    });
    const subTitle = sanitizePdfText(
      content.headerSubtitle || "Project Charter / Surat Perjanjian Kerjasama",
    );
    const subTitleW = fontBold.widthOfTextAtSize(subTitle, 10.5);
    p.drawText(subTitle, {
      x: marginX + (contentWidth - subTitleW) / 2,
      y: topY - 33,
      size: 10.5,
      font: fontBold,
      color: SLATE_700,
    });

    // Kanan: Logo Klien
    if (clientLogo) {
      const cDims = fitDimensions(clientLogo, 84, 34);
      p.drawImage(clientLogo, {
        x: pageWidth - marginX - cDims.width - 8,
        y: topY - boxH + (boxH - cDims.height) / 2,
        width: cDims.width,
        height: cDims.height,
      });
    } else if (content.partyTwo?.company) {
      const cName = sanitizePdfText(content.partyTwo.company).slice(0, 22);
      const cW = fontBold.widthOfTextAtSize(cName, 8);
      p.drawText(cName, {
        x: pageWidth - marginX - cW - 10,
        y: topY - 25,
        size: 8,
        font: fontBold,
        color: SLATE_700,
      });
    }

    // Sub-bar Metadata (No Dokumen | Versi | Tanggal) - Hairline Bersih
    p.drawRectangle({
      x: marginX,
      y: topY - boxH - subH,
      width: contentWidth,
      height: subH,
      color: SURFACE_CARD,
      borderColor: BORDER_SLATE,
      borderWidth: 0.5,
    });

    const col3W = contentWidth / 3;
    p.drawText(sanitizePdfText(`No. Dokumen: ${docNumber}`), {
      x: marginX + 8,
      y: topY - boxH - 12,
      size: 8,
      font: fontBold,
      color: SLATE_900,
    });
    p.drawText(sanitizePdfText(`Versi: ${content.docVersion || "1.0"}`), {
      x: marginX + col3W + 8,
      y: topY - boxH - 12,
      size: 8,
      font: fontBold,
      color: SLATE_700,
    });
    p.drawText(
      sanitizePdfText(`Tanggal: ${formatDateID(content.signingDate || docDate)}`),
      {
        x: marginX + col3W * 2 + 8,
        y: topY - boxH - 12,
        size: 8,
        font: fontBold,
        color: SLATE_700,
      },
    );

    return topY - boxH - subH - 22;
  };

  const addNewPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    pages.push(page);
    y = drawSpkHeader(page);
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < bottomSafeY) {
      addNewPage();
    }
  };

  const drawParagraph = (text: string, opts?: { bold?: boolean; size?: number; indent?: number; color?: ReturnType<typeof rgb> }) => {
    const size = opts?.size ?? 9;
    const font = opts?.bold ? fontBold : fontRegular;
    const indent = opts?.indent ?? 0;
    const color = opts?.color ?? SLATE_900;
    const lines = wrapTextByWidth(text, font, size, contentWidth - indent);
    ensureSpace(lines.length * (size + 3) + 4);
    for (const line of lines) {
      page.drawText(line, { x: marginX + indent, y, size, font, color });
      y -= size + 3;
    }
    y -= 3;
  };

  const drawPasalHeading = (pasalNo: string, heading: string) => {
    ensureSpace(34);
    y -= 4;
    const label1 = sanitizePdfText(pasalNo.toUpperCase());
    const label2 = sanitizePdfText(heading.toUpperCase());
    const w1 = fontBold.widthOfTextAtSize(label1, 9.5);
    const w2 = fontBold.widthOfTextAtSize(label2, 9.5);
    page.drawText(label1, {
      x: marginX + (contentWidth - w1) / 2,
      y,
      size: 9.5,
      font: fontBold,
      color: BRAND_BLUE,
    });
    y -= 12;
    page.drawText(label2, {
      x: marginX + (contentWidth - w2) / 2,
      y,
      size: 9.5,
      font: fontBold,
      color: SLATE_900,
    });
    y -= 14;
  };

  const drawTable = (headers: string[], widthRatios: number[], rows: string[][]) => {
    if (rows.length === 0) return;
    const totalR = widthRatios.reduce((a, b) => a + b, 0) || 1;
    const widths = widthRatios.map((r) => (r / totalR) * contentWidth);

    const drawHdr = () => {
      ensureSpace(22);
      // Header tabel SPK clean dengan garis hairline horizontal
      page.drawRectangle({
        x: marginX,
        y: y - 5,
        width: contentWidth,
        height: 18,
        color: SURFACE_SUBTLE,
      });
      page.drawLine({
        start: { x: marginX, y: y + 13 },
        end: { x: pageWidth - marginX, y: y + 13 },
        thickness: 0.55,
        color: BORDER_SLATE,
      });
      page.drawLine({
        start: { x: marginX, y: y - 5 },
        end: { x: pageWidth - marginX, y: y - 5 },
        thickness: 0.75,
        color: SLATE_700,
      });
      let cx = marginX;
      headers.forEach((h, i) => {
        page.drawText(sanitizePdfText(h), {
          x: cx + 6,
          y: y + 1,
          size: 8.2,
          font: fontBold,
          color: SLATE_700,
        });
        cx += widths[i]!;
      });
      y -= 18;
    };

    drawHdr();

    for (const row of rows) {
      const wrappedCols = widths.map((w, i) =>
        wrapTextByWidth(row[i] ?? "", fontRegular, 8.2, w - 12),
      );
      const maxL = Math.max(...wrappedCols.map((c) => c.length), 1);
      const rH = maxL * 11 + 8;

      if (y - rH < bottomSafeY) {
        addNewPage();
        drawHdr();
      }

      let cx = marginX;
      widths.forEach((w, i) => {
        const lines = wrappedCols[i] ?? [""];
        lines.forEach((l, li) => {
          page.drawText(l, {
            x: cx + 6,
            y: y - li * 11,
            size: 8.2,
            font: i === 0 ? fontBold : fontRegular,
            color: SLATE_900,
          });
        });
        cx += w;
      });
      const bY = y - (maxL - 1) * 11 - 6;
      page.drawLine({
        start: { x: marginX, y: bY },
        end: { x: pageWidth - marginX, y: bY },
        thickness: 0.35,
        color: BORDER_SUBTLE,
      });
      y = bY - 12;
    }
    y -= 4;
  };

  addNewPage();

  // Judul Utama SPK
  const mainTitle = sanitizePdfText(docTitle.toUpperCase());
  const titleLines = wrapTextByWidth(mainTitle, fontBold, 12.5, contentWidth);
  for (const tl of titleLines) {
    const w = fontBold.widthOfTextAtSize(tl, 12.5);
    page.drawText(tl, {
      x: marginX + (contentWidth - w) / 2,
      y,
      size: 12.5,
      font: fontBold,
      color: SLATE_900,
    });
    y -= 15;
  }
  y -= 4;

  // Pembukaan
  drawParagraph(
    `Pada hari ini, tanggal ${formatDateID(content.signingDate || docDate)}, yang bertempat di ${content.signingCity || company.signing_city || "Bogor"}, kami yang bertanda tangan di bawah ini:`,
  );

  // Blok Identitas PIHAK PERTAMA & PIHAK KEDUA
  const drawPartyBlock = (
    heading: string,
    party: NonNullable<SpkCharterContent["partyOne"]>,
    roleLabel: string,
  ) => {
    const rows: PdfKeyValue[] = [
      { label: "Nama", value: party.name || "-" },
      { label: "Jabatan", value: party.title || "-" },
      { label: "Perusahaan", value: party.company || "-" },
      { label: "Alamat", value: party.address || "-" },
      { label: "Email", value: party.email || "-" },
      { label: "No. Telepon", value: party.phone || "-" },
    ];
    ensureSpace(115);
    page.drawText(sanitizePdfText(heading), {
      x: marginX,
      y,
      size: 9,
      font: fontBold,
      color: BRAND_BLUE,
    });
    y -= 13;
    for (const r of rows) {
      const valLines = wrapTextByWidth(r.value, fontRegular, 8.8, contentWidth - 110);
      ensureSpace(valLines.length * 11.5);
      page.drawText(sanitizePdfText(r.label), {
        x: marginX,
        y,
        size: 8.8,
        font: fontBold,
        color: SLATE_700,
      });
      page.drawText(":", {
        x: marginX + 88,
        y,
        size: 8.8,
        font: fontBold,
        color: SLATE_700,
      });
      valLines.forEach((vl, li) => {
        page.drawText(vl, {
          x: marginX + 98,
          y: y - li * 11.5,
          size: 8.8,
          font: fontRegular,
          color: SLATE_900,
        });
      });
      y -= Math.max(12.5, valLines.length * 11.5 + 1);
    }
    drawParagraph(
      `Dalam hal ini bertindak untuk dan atas nama ${party.company}, selanjutnya disebut sebagai ${roleLabel}.`,
    );
    y -= 2;
  };

  if (content.partyOne) {
    drawPartyBlock("PIHAK PERTAMA (PENYEDIA JASA)", content.partyOne, "PIHAK PERTAMA");
  }
  if (content.partyTwo) {
    drawPartyBlock("PIHAK KEDUA (CLIENT/CUSTOMER)", content.partyTwo, "PIHAK KEDUA");
  }

  // PASAL 1
  drawPasalHeading("PASAL 1", "MAKSUD DAN TUJUAN");
  drawParagraph(content.pasal1Tujuan || "-");

  // PASAL 2
  drawPasalHeading("PASAL 2", "RUANG LINGKUP PEKERJAAN");
  drawParagraph(
    `${content.partyOne?.company || company.company_name} (PIHAK PERTAMA) akan menyediakan layanan pekerjaan sesuai rincian berikut:`,
  );
  for (const grp of content.scopeGroups ?? []) {
    ensureSpace(28);
    drawParagraph(grp.category, { bold: true, size: 9, color: BRAND_BLUE });
    for (const item of grp.items) {
      drawParagraph(`- ${item}`, { indent: 12, size: 8.8 });
    }
  }
  if (content.outOfScope && content.outOfScope.length > 0) {
    ensureSpace(24);
    drawParagraph("Hal-hal yang tidak terlingkupi (Out of Scope):", { bold: true, size: 8.8 });
    content.outOfScope.forEach((oos, i) => {
      drawParagraph(`${i + 1}. ${oos}`, { indent: 12, size: 8.7 });
    });
  }

  // PASAL 3
  drawPasalHeading("PASAL 3", "JANGKA WAKTU & TIMELINE");
  if (content.pasal3Intro) drawParagraph(content.pasal3Intro);
  if (content.timelineRows && content.timelineRows.length > 0) {
    drawTable(
      ["Week / Tahap", "Aktivitas Utama", "Output / Deliverable"],
      [0.2, 0.44, 0.36],
      content.timelineRows.map((t) => [t.week, t.activities, t.output]),
    );
  }

  // PASAL 4
  drawPasalHeading("PASAL 4", "TIM & TATA KELOLA");
  if (content.teamRoles && content.teamRoles.length > 0) {
    drawParagraph("Struktur Tim Pelaksana (PIHAK PERTAMA):", { bold: true, size: 8.8 });
    drawTable(
      ["Peran", "Kapasitas", "Tanggung Jawab Utama"],
      [0.24, 0.16, 0.6],
      content.teamRoles.map((r) => [r.role, r.capacity, r.responsibility]),
    );
  }
  if (content.clientRoles && content.clientRoles.length > 0) {
    drawParagraph("Peran & Keterlibatan Klien (PIHAK KEDUA):", { bold: true, size: 8.8 });
    drawTable(
      ["Peran Klien", "Tanggung Jawab"],
      [0.3, 0.7],
      content.clientRoles.map((r) => [r.role, r.responsibility]),
    );
  }
  if (content.ceremonies && content.ceremonies.length > 0) {
    drawParagraph("Pelaksanaan Event / Ceremony Proyek:", { bold: true, size: 8.8 });
    drawTable(
      ["Sesi / Event", "Frekuensi", "Peserta", "Jadwal Pelaksanaan"],
      [0.28, 0.18, 0.3, 0.24],
      content.ceremonies.map((c) => [c.event, c.frequency, c.attendees, c.schedule]),
    );
  }

  // PASAL 5
  drawPasalHeading("PASAL 5", "PEMBIAYAAN & PEMBAYARAN");
  const totalCost = content.totalProjectCost ?? 0;
  drawParagraph(
    `1. Total biaya proyek adalah sebesar ${formatRupiah(totalCost)} (${terbilangRupiah(totalCost)}), dengan rincian:`,
    { bold: true, size: 9 },
  );
  for (const cd of content.costDetails ?? []) {
    drawParagraph(`- ${cd.label}: ${formatRupiah(cd.amount)}`, { indent: 12, size: 8.8 });
  }
  drawParagraph("2. Mekanisme Pembayaran:", { bold: true, size: 9 });
  for (const pt of content.paymentTermsText ?? []) {
    drawParagraph(`- ${pt}`, { indent: 12, size: 8.8 });
  }
  drawParagraph(
    `3. Rekening Tujuan Transfer Resmi PIHAK PERTAMA: ${company.bank_name} No. Rek ${company.bank_account_number} a.n. ${company.bank_account_holder}. Transfer selain ke rekening tersebut bukan menjadi tanggung jawab PIHAK PERTAMA.`,
    { indent: 12, size: 8.6, color: SLATE_700 },
  );

  // PASAL 6 - 10
  drawPasalHeading("PASAL 6", "KERAHASIAAN");
  drawParagraph(content.pasal6Kerahasiaan || "-");

  drawPasalHeading("PASAL 7", "HAK KEPEMILIKAN DAN INTELLECTUAL PROPERTY");
  (content.pasal7Haki ?? []).forEach((h, i) => {
    drawParagraph(`${i + 1}. ${h}`, { indent: 8 });
  });

  drawPasalHeading("PASAL 8", "FORCE MAJEURE");
  drawParagraph(content.pasal8ForceMajeure || "-");

  drawPasalHeading("PASAL 9", "PENYELESAIAN PERMASALAHAN");
  drawParagraph(content.pasal9Penyelesaian || "-");

  drawPasalHeading("PASAL 10", "LAIN-LAIN");
  drawParagraph(content.pasal10LainLain || "-");

  // PENUTUP & TANDA TANGAN
  ensureSpace(178);
  y -= 4;
  drawParagraph("PENUTUP", { bold: true, size: 9.5, color: BRAND_BLUE });
  drawParagraph(
    content.closingText ||
      "Demikian surat perjanjian kerja sama ini dibuat dan mempunyai kekuatan hukum yang sama bagi kedua belah pihak.",
  );
  drawParagraph(
    `${content.signingCity || company.signing_city || "Bogor"}, ${formatDateID(content.signingDate || docDate)}`,
    { bold: true },
  );

  y -= 6;
  const sigY = y;
  const p1X = marginX + 12;
  const p2X = pageWidth - marginX - 185;
  const lineY = sigY - 118;
  const nameY = lineY - 13;
  const titleY = nameY - 12;

  // Slot e-Meterai Rp10.000 proporsional 25 x 35 mm (71 x 99 pt, min 7.5 pt)
  const spkMeteraiW = 71;
  const spkMeteraiH = 99;
  const spkMeteraiX = (pageWidth - spkMeteraiW) / 2;
  const spkMeteraiY = lineY + 4;

  page.drawRectangle({
    x: spkMeteraiX,
    y: spkMeteraiY,
    width: spkMeteraiW,
    height: spkMeteraiH,
    color: SURFACE_CARD,
    borderColor: BORDER_SLATE,
    borderWidth: 0.75,
  });

  const spkMLines: Array<{ text: string; size: number; bold: boolean; color: RGB; dy: number }> = [
    { text: "METERAI", size: 7.5, bold: true, color: SLATE_600, dy: 20 },
    { text: "ELEKTRONIK", size: 7.5, bold: true, color: SLATE_600, dy: 32 },
    { text: "Rp10.000", size: 9.5, bold: true, color: SLATE_900, dy: 52 },
    { text: "Tempat e-Meterai", size: 7.5, bold: false, color: SLATE_500, dy: 72 },
    { text: "25 x 35 mm", size: 7.5, bold: false, color: SLATE_500, dy: 84 },
  ];

  for (const ml of spkMLines) {
    const mFont = ml.bold ? fontBold : fontRegular;
    const tw = mFont.widthOfTextAtSize(ml.text, ml.size);
    page.drawText(ml.text, {
      x: spkMeteraiX + (spkMeteraiW - tw) / 2,
      y: spkMeteraiY + spkMeteraiH - ml.dy,
      size: ml.size,
      font: mFont,
      color: ml.color,
    });
  }

  page.drawText("PIHAK PERTAMA", {
    x: p1X,
    y: sigY,
    size: 9,
    font: fontBold,
    color: BRAND_BLUE,
  });
  page.drawText(sanitizePdfText(content.partyOne?.company || company.company_name), {
    x: p1X,
    y: sigY - 12,
    size: 8.5,
    font: fontRegular,
    color: SLATE_700,
  });
  if (p1SigImg) {
    const d1 = fitDimensions(p1SigImg, 115, 52);
    page.drawImage(p1SigImg, {
      x: p1X,
      y: lineY + 6,
      width: d1.width,
      height: d1.height,
    });
  }
  page.drawLine({
    start: { x: p1X, y: lineY },
    end: { x: p1X + 160, y: lineY },
    thickness: 0.6,
    color: BORDER_SLATE,
  });
  page.drawText(sanitizePdfText(content.partyOne?.name || company.signer_name), {
    x: p1X,
    y: nameY,
    size: 9.5,
    font: fontBold,
    color: SLATE_900,
  });
  page.drawText(sanitizePdfText(content.partyOne?.title || company.signer_title), {
    x: p1X,
    y: titleY,
    size: 8.5,
    font: fontRegular,
    color: SLATE_500,
  });

  page.drawText("PIHAK KEDUA", {
    x: p2X,
    y: sigY,
    size: 9,
    font: fontBold,
    color: BRAND_BLUE,
  });
  page.drawText(sanitizePdfText(content.partyTwo?.company || "Pihak Klien"), {
    x: p2X,
    y: sigY - 12,
    size: 8.5,
    font: fontRegular,
    color: SLATE_700,
  });
  if (p2SigImg) {
    const d2 = fitDimensions(p2SigImg, 115, 52);
    page.drawImage(p2SigImg, {
      x: p2X,
      y: lineY + 6,
      width: d2.width,
      height: d2.height,
    });
  }
  page.drawLine({
    start: { x: p2X, y: lineY },
    end: { x: p2X + 160, y: lineY },
    thickness: 0.6,
    color: BORDER_SLATE,
  });
  page.drawText(sanitizePdfText(content.partyTwo?.name || "Perwakilan Klien"), {
    x: p2X,
    y: nameY,
    size: 9.5,
    font: fontBold,
    color: SLATE_900,
  });
  page.drawText(sanitizePdfText(content.partyTwo?.title || "Direktur"), {
    x: p2X,
    y: titleY,
    size: 8.5,
    font: fontRegular,
    color: SLATE_500,
  });

  // Footer tiap halaman: Paraf para pihak + Ikon Sosial Media + Hal X/Y
  await drawSocialMediaFooters({
    pdfDoc,
    pages,
    company,
    fontRegular,
    fontBold,
    marginX,
    pageWidth,
    docNumber,
    parafInfo: {
      leftImage: p1ParafImg,
      rightImage: p2ParafImg,
    },
  });

  return pdfDoc.save();
}

let activePdfPrintUrl: string | null = null;

/**
 * Menampilkan pratinjau cetak / Save as PDF bawaan peramban (seperti halaman Siklus Akuntansi & Laporan Keuangan)
 * untuk seluruh dokumen PDF di semua portal sistem Altcycles.
 */
export function downloadPdfBytes(bytes: Uint8Array, fileName: string): void {
  const safeBytes = new Uint8Array(bytes.byteLength);
  safeBytes.set(bytes);
  const blob = new Blob([safeBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  if (activePdfPrintUrl) {
    URL.revokeObjectURL(activePdfPrintUrl);
  }
  activePdfPrintUrl = url;

  const existingFrame = document.getElementById(
    "altcycles-pdf-print-frame",
  ) as HTMLIFrameElement | null;
  if (existingFrame) {
    existingFrame.remove();
  }

  const cleanBaseName = fileName.replace(/\.pdf$/i, "").trim() || "Dokumen_Altcycles";
  const iframe = document.createElement("iframe");
  iframe.id = "altcycles-pdf-print-frame";
  iframe.title = cleanBaseName;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "2px";
  iframe.style.height = "2px";
  iframe.style.border = "0";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-1";

  iframe.onload = () => {
    setTimeout(() => {
      const previousTitle = document.title;
      document.title = cleanBaseName;

      const restoreTitle = () => {
        document.title = previousTitle;
        window.removeEventListener("focus", restoreTitle);
      };
      window.addEventListener("focus", restoreTitle);

      try {
        const frameWin = iframe.contentWindow;
        if (frameWin) {
          frameWin.focus();
          frameWin.print();
          setTimeout(() => {
            if (document.title === cleanBaseName) {
              document.title = previousTitle;
            }
          }, 1500);
          return;
        }
      } catch {
        // Fallback apabila peramban tidak mengizinkan print dari iframe
      }

      document.title = previousTitle;
      window.removeEventListener("focus", restoreTitle);
      const fallbackWin = window.open(url, "_blank", "noopener,noreferrer");
      if (!fallbackWin) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${cleanBaseName}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    }, 120);
  };

  iframe.src = url;
  document.body.appendChild(iframe);
}

/**
 * Helper pembuat spesifikasi PDF/Word Invoice Penagihan sesuai PRD Lampiran A.5 + Standar Dokumen Altvira.
 */
export function buildInvoicePdfSpec(params: {
  company: CompanyProfileRow;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerPic?: string | null;
  customerTitle?: string | null;
  customerAddress: string;
  customerLogoUrl?: string | null;
  projectName: string;
  clientPoNumber: string;
  description: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  subtotal: number;
  ppnAmount: number;
  totalAmount: number;
  spkNumber?: string | null;
  bakpNumber?: string | null;
  bastNumber?: string | null;
  servicePeriod?: string | null;
  items?: Array<{
    description: string;
    qty: number;
    unit?: string;
    unitPrice: number;
    duration?: string;
    subtotal: number;
  }>;
  contractValue?: number | null;
  previousBilledAmount?: number | null;
  remainingContractAmount?: number | null;
  includePph23Estimate?: boolean;
  paymentTermsText?: string | null;
  overdueClauseText?: string | null;
  docStatus?: "draft" | "issued" | "paid" | "cancelled" | string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "cancelled" | string;
  balanceDue?: number;
  statusBadge?: {
    text: string;
    variant?: DocStatusVariant;
  };
}): PdfDocumentSpec {
  const pph23EstVal = params.includePph23Estimate
    ? Math.round(params.subtotal * 0.02)
    : 0;
  const netEstVal = params.includePph23Estimate
    ? Math.max(0, params.totalAmount - pph23EstVal)
    : 0;
  const prevBilledVal = params.previousBilledAmount ?? 0;
  const remainingContractVal =
    params.contractValue && params.contractValue > 0
      ? params.remainingContractAmount !== undefined &&
        params.remainingContractAmount !== null
        ? params.remainingContractAmount
        : Math.max(0, params.contractValue - (prevBilledVal + params.subtotal))
      : 0;

  const itemValues =
    params.items && params.items.length > 0
      ? params.items.flatMap((it) => [it.unitPrice, it.subtotal])
      : [
          params.unitPrice ??
            Math.round(params.subtotal / Math.max(1, params.qty ?? 1)),
          params.subtotal,
        ];

  const forceTwoDecimals = hasAnyDecimalCurrency([
    ...itemValues,
    params.subtotal,
    params.ppnAmount,
    params.totalAmount,
    params.contractValue,
    prevBilledVal,
    remainingContractVal,
    pph23EstVal,
    netEstVal,
    params.balanceDue,
  ]);

  const fmtRp = (val: number) => formatDocRupiah(val, forceTwoDecimals);

  const nonPkpNote = params.company.pkp_enabled
    ? `PPN (${params.company.ppn_rate}%) telah diperhitungkan sebesar ${fmtRp(params.ppnAmount)}.`
    : "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).";

  const picDisplay = params.customerPic
    ? `${params.customerPic}${params.customerTitle ? ` (${params.customerTitle})` : ""}`
    : null;

  const dueAmount =
    params.balanceDue !== undefined ? params.balanceDue : params.totalAmount;

  // Status badge logic
  const statusBadge =
    params.statusBadge ??
    (params.paymentStatus === "paid"
      ? { text: "LUNAS", variant: "success" as const }
      : params.docStatus === "cancelled"
        ? { text: "DIBATALKAN", variant: "danger" as const }
        : params.docStatus === "draft"
          ? { text: "DRAFT", variant: "neutral" as const }
          : { text: "TERBIT", variant: "info" as const });

  // Tabel rincian item: dukung multi-item dan single-item
  let tableColumns: PdfTableColumn[];
  let tableRows: string[][];

  if (params.items && params.items.length > 0) {
    const hasDuration = params.items.some((it) => Boolean(it.duration));
    if (hasDuration) {
      tableColumns = [
        { header: "No", widthRatio: 0.06, align: "center" },
        { header: "Deskripsi", widthRatio: 0.34 },
        { header: "Qty", widthRatio: 0.11, align: "center" },
        { header: "Durasi", widthRatio: 0.11, align: "center" },
        { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
        { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
      ];
      tableRows = params.items.map((it, idx) => [
        String(idx + 1),
        it.description,
        `${it.qty} ${it.unit ?? "Paket"}`,
        it.duration ?? formatDocEmpty(),
        fmtRp(it.unitPrice),
        fmtRp(it.subtotal),
      ]);
    } else {
      tableColumns = [
        { header: "No", widthRatio: 0.07, align: "center" },
        { header: "Deskripsi", widthRatio: 0.43 },
        { header: "Qty", widthRatio: 0.12, align: "center" },
        { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
        { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
      ];
      tableRows = params.items.map((it, idx) => [
        String(idx + 1),
        it.description,
        `${it.qty} ${it.unit ?? "Paket"}`,
        fmtRp(it.unitPrice),
        fmtRp(it.subtotal),
      ]);
    }
  } else {
    const qty = params.qty ?? 1;
    const unitPrice =
      params.unitPrice ?? Math.round(params.subtotal / Math.max(1, qty));
    tableColumns = [
      { header: "No", widthRatio: 0.07, align: "center" },
      { header: "Deskripsi", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ];
    tableRows = [
      [
        "1",
        params.description,
        `${qty} ${params.unit ?? "Paket"}`,
        fmtRp(unitPrice),
        fmtRp(params.subtotal),
      ],
    ];
  }

  // Akumulasi termin dan estimasi PPh 23
  const summaryRows: PdfKeyValue[] = [
    { label: "Subtotal Tagihan", value: fmtRp(params.subtotal) },
    ...(params.company.pkp_enabled
      ? [
          {
            label: `PPN (${params.company.ppn_rate}%)`,
            value: fmtRp(params.ppnAmount),
          },
        ]
      : []),
    { label: "Total Tagihan Invoice", value: fmtRp(params.totalAmount) },
  ];

  if (params.contractValue && params.contractValue > 0) {
    summaryRows.push(
      {
        label: "Total Nilai Kontrak Proyek",
        value: fmtRp(params.contractValue),
      },
      {
        label: "Akumulasi Tagihan Sebelumnya",
        value: fmtRp(prevBilledVal),
      },
      {
        label: "Tagihan Termin Berjalan",
        value: fmtRp(params.subtotal),
      },
      {
        label: "Sisa Nilai Kontrak",
        value: fmtRp(remainingContractVal),
      },
    );
  }

  if (params.includePph23Estimate) {
    summaryRows.push(
      {
        label: "Estimasi Potongan PPh 23 (2%)",
        value: fmtRp(pph23EstVal),
      },
      {
        label: "Estimasi Kas Neto Diterima",
        value: fmtRp(netEstVal),
      },
    );
  }

  const normalizedServicePeriod = params.servicePeriod
    ? params.servicePeriod.replace(/^Termin:\s*(Termin\b)/i, "$1")
    : null;

  const rawBankName = (params.company.bank_name || "").trim().replace(/^bank\s+/i, "");
  const cleanBankName = rawBankName ? `Bank ${rawBankName}` : "-";

  return {
    docTitle: "INVOICE",
    docSubtitle: params.company.pkp_enabled
      ? undefined
      : "DOKUMEN TAGIHAN RESMI (NON-PKP)",
    docNumber: params.invoiceNumber,
    docDate: params.invoiceDate,
    statusBadge,
    balanceDueBox: {
      label:
        dueAmount === 0
          ? "STATUS TAGIHAN"
          : "TOTAL TAGIHAN JATUH TEMPO",
      amountText: dueAmount === 0 ? "LUNAS" : fmtRp(dueAmount),
      dueDateText:
        dueAmount === 0
          ? "Lunas Sepenuhnya"
          : `Jatuh Tempo: ${formatDocDateLong(params.dueDate)}`,
    },
    company: params.company,
    clientLogoUrl: params.customerLogoUrl ?? null,
    recipientTitle: "Ditagihkan Kepada",
    recipientLines: [
      params.customerName,
      ...(picDisplay ? [picDisplay] : []),
      params.customerAddress || "-",
    ],
    metaRows: [
      {
        label: "Tanggal Terbit",
        value: formatDocDateLong(params.invoiceDate),
      },
      {
        label: "Tanggal Jatuh Tempo",
        value: formatDocDateLong(params.dueDate),
      },
      { label: "Proyek", value: params.projectName },
      { label: "Referensi PO Klien", value: params.clientPoNumber },
      ...(params.spkNumber
        ? [{ label: "Referensi SPK / Kontrak", value: params.spkNumber }]
        : []),
      ...(params.bakpNumber
        ? [{ label: "Referensi BAKP Acuan", value: params.bakpNumber }]
        : []),
      ...(params.bastNumber
        ? [{ label: "Referensi BAST Acuan", value: params.bastNumber }]
        : []),
      ...(normalizedServicePeriod
        ? [{ label: "Periode Layanan", value: normalizedServicePeriod }]
        : []),
    ],
    tableColumns,
    tableRows,
    summaryRows,
    terbilangAmount: params.totalAmount,
    notes: [
      "Pembayaran dilakukan via transfer ke rekening di atas paling lambat pada tanggal jatuh tempo.",
      `Klausul Keterlambatan: ${params.overdueClauseText ?? "Keterlambatan pembayaran setelah tanggal jatuh tempo dapat mengakibatkan penangguhan sementara operasional layanan dan/atau penyesuaian jadwal pelaksanaan sesuai perjanjian kerja sama."}`,
      "Konfirmasi pembayaran ke finance +62 878-0256-8095 atau altvira.tech@gmail.com",
    ],
    notesTitle: "Ketentuan Pembayaran",
    paymentDetail: {
      terbilangText: terbilangRupiah(params.totalAmount),
      bankName: cleanBankName,
      accountNumber: params.company.bank_account_number || "-",
      accountHolder: params.company.bank_account_holder || "-",
      transferNews: params.invoiceNumber,
      isPaid: params.paymentStatus === "paid" || dueAmount === 0,
      swiftCode: (params.company as any).swift_code || null,
    },
    documentNotes: (params as any).documentNotes ?? null,
    rightSignatureLabel: `Hormat kami, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.invoiceNumber,
    refDocNumber:
      params.bakpNumber ||
      params.clientPoNumber ||
      params.spkNumber ||
      "-",
    docStatus: params.docStatus,
  };
}

/**
 * Helper pembuat spesifikasi PDF/Word Kuitansi Bukti Pembayaran sesuai PRD Lampiran A.6 + Standar Dokumen Altvira.
 */
export function buildReceiptPdfSpec(params: {
  company: CompanyProfileRow;
  receiptNumber: string;
  receiptDate: string;
  receivedFrom: string;
  invoiceNumber: string;
  projectName: string;
  amount: number;
  clientPoNumber?: string | null;
  servicePeriod?: string | null;
  paymentMethod?: string | null;
  hasMeterai?: boolean;
}): PdfDocumentSpec {
  const needsMeterai =
    params.hasMeterai !== undefined
      ? params.hasMeterai
      : params.amount > 5_000_000;

  const forceTwoDecimals = hasAnyDecimalCurrency([params.amount]);
  const fmtAmount = formatDocRupiah(params.amount, forceTwoDecimals);
  const normalizedServicePeriod = params.servicePeriod
    ? params.servicePeriod.replace(/^Termin:\s*(Termin\b)/i, "$1")
    : null;

  return {
    docTitle: "KUITANSI",
    docSubtitle: "BUKTI PENERIMAAN PEMBAYARAN RESMI",
    docNumber: params.receiptNumber,
    docDate: params.receiptDate,
    statusBadge: {
      text: "LUNAS",
      variant: "success",
    },
    balanceDueBox: {
      label: "STATUS PEMBAYARAN: LUNAS",
      amountText: fmtAmount,
      dueDateText: `Diterima Pada: ${formatDocDateLong(params.receiptDate)}`,
    },
    company: params.company,
    metaRows: [
      { label: "Tanggal Terima", value: formatDocDateLong(params.receiptDate) },
      { label: "Telah Terima Dari", value: params.receivedFrom },
      {
        label: "Untuk Pembayaran",
        value: `Pelunasan / Pembayaran Invoice ${params.invoiceNumber}`,
      },
      { label: "Nama Proyek", value: params.projectName },
      ...(params.clientPoNumber
        ? [{ label: "Referensi PO Klien", value: params.clientPoNumber }]
        : []),
      ...(normalizedServicePeriod
        ? [{ label: "Periode Layanan", value: normalizedServicePeriod }]
        : []),
      ...(params.paymentMethod
        ? [{ label: "Metode / Rekening", value: params.paymentMethod }]
        : []),
      { label: "Jumlah Pembayaran", value: fmtAmount },
    ],
    summaryRows: [{ label: "Jumlah Diterima", value: fmtAmount }],
    terbilangAmount: params.amount,
    hasMeterai: needsMeterai,
    meteraiLabel: "TEMPAT E-METERAI Rp10.000",
    notes: [
      "Kuitansi ini merupakan bukti penerimaan pembayaran yang sah dan mengikat atas tagihan invoice terkait.",
      needsMeterai
        ? "Bea meterai Rp10.000 telah diperhitungkan sesuai UU No. 10 Tahun 2020 tentang Bea Meterai."
        : "Nilai pembayaran di bawah batas pengenaan bea meterai sesuai UU No. 10 Tahun 2020.",
      "Dokumen ini diterbitkan secara resmi melalui sistem komputerisasi Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    rightSignatureLabel: `Penerima, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.receiptNumber,
    refDocNumber: params.invoiceNumber || "-",
    docStatus: "paid",
  };
}

/**
 * Helper pembuat spesifikasi PDF resmi untuk Purchase Order (PO) Klien dari Portal Pembeli.
 */
export function buildClientPoPdfSpec(params: {
  company: CompanyProfileRow;
  poNumber: string;
  poDate: string;
  clientName: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  quotationReference?: string | null;
  statusLabel: string;
  projectLabel?: string | null;
  items: ClientPoItemJson[];
  poValue: number;
}): PdfDocumentSpec {
  const safeItems =
    params.items.length > 0
      ? params.items
      : [{ item: "Paket Pekerjaan / Layanan Sesuai Pengajuan PO", qty: 1, price: params.poValue }];

  const forceTwoDecimals = hasAnyDecimalCurrency([
    params.poValue,
    ...safeItems.flatMap((it) => [it.price, it.qty * it.price]),
  ]);
  const fmtRp = (val: number) => formatDocRupiah(val, forceTwoDecimals);

  const recipientLines = [
    params.clientCompany?.trim() || params.clientName,
    ...(params.clientCompany?.trim() && params.clientCompany.trim() !== params.clientName
      ? [params.clientName]
      : []),
    params.clientEmail?.trim() || null,
    params.clientPhone?.trim() || null,
  ].filter((line): line is string => Boolean(line));

  const statusUpper = params.statusLabel.toUpperCase();
  const statusBadge: { text: string; variant: DocStatusVariant } =
    /terverifikasi|disetujui|sah/i.test(statusUpper)
      ? { text: "TERVERIFIKASI", variant: "success" }
      : /tolak|batal/i.test(statusUpper)
        ? { text: "DITOLAK", variant: "danger" }
        : { text: statusUpper || "DIAJUKAN", variant: "info" };

  const metaRows: PdfKeyValue[] = [
    { label: "Tanggal PO", value: formatDocDateLong(params.poDate) },
    { label: "Nomor PO Klien", value: params.poNumber },
    { label: "Status Verifikasi", value: params.statusLabel },
    ...(params.quotationReference?.trim()
      ? [{ label: "Referensi Quotation", value: params.quotationReference.trim() }]
      : []),
    ...(params.projectLabel?.trim()
      ? [{ label: "Proyek Terkait", value: params.projectLabel.trim() }]
      : []),
  ];

  return {
    docTitle: "PURCHASE ORDER (PO) KLIEN",
    docSubtitle: "Dokumen Pengajuan Pesanan Resmi Pelanggan",
    docNumber: params.poNumber,
    docDate: params.poDate,
    statusBadge,
    company: params.company,
    recipientTitle: "Diajukan Oleh Klien",
    recipientLines,
    metaRows,
    paragraphsBefore: [
      "Dokumen Purchase Order (PO) Klien ini diterbitkan secara resmi melalui Portal Pelanggan Altvira Technology sebagai bukti pengajuan pesanan pekerjaan atau layanan.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.07, align: "center" },
      { header: "Deskripsi Paket / Pekerjaan", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ],
    tableRows: safeItems.map((it, idx) => [
      String(idx + 1),
      it.item,
      it.qty.toLocaleString("id-ID"),
      fmtRp(it.price),
      fmtRp(it.qty * it.price),
    ]),
    summaryRows: [
      { label: "Total Nilai Purchase Order", value: fmtRp(params.poValue) },
    ],
    terbilangAmount: params.poValue,
    notes: [
      "Gunakan Kode Akses PO di atas pada Portal Pembeli untuk memantau progres pekerjaan dan mengunduh dokumen tagihan resmi.",
      "Dokumen ini diterbitkan secara resmi melalui sistem komputerisasi Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Diajukan Oleh (Klien),",
    leftSignatureName: `${params.clientName} - ${params.clientCompany?.trim() || "Pihak Klien"}`,
    rightSignatureLabel: `Diterima Oleh, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.poNumber,
    refDocNumber: params.quotationReference || "-",
    docStatus: params.statusLabel,
  };
}

/**
 * Helper pembuat spesifikasi PDF/Word Form Persetujuan Pembayaran & Pencairan Dana (Payment Approval)
 * Sesuai PRD Lampiran A & Standar Dokumen Altvira Butir 5.1–5.8.
 */
export function buildPaymentApprovalPdfSpec(params: {
  company: CompanyProfileRow;
  requestNumber: string;
  revisionNo?: number;
  requestDate: string;
  requesterName: string;
  requesterRole?: string;
  projectName?: string | null;
  expenseAccountName?: string | null;
  recipientName: string;
  recipientBankInfo?: string | null;
  purpose: string;
  amount: number;
  status: PaymentRequestStatus | string;
  statusLabel?: string;
  approverName?: string | null;
  approvedAt?: string | null;
  paidDate?: string | null;
  rejectionReason?: string | null;
  attachmentNames?: string[];
}): PdfDocumentSpec {
  const statusTone: DocStatusVariant =
    params.status === "paid"
      ? "success"
      : params.status === "approved"
        ? "info"
        : params.status === "rejected"
          ? "danger"
          : "warning";

  const statusText =
    params.status === "paid"
      ? "TELAH DICAIRKAN (PAID)"
      : params.status === "approved"
        ? "DISETUJUI (APPROVED)"
        : params.status === "rejected"
          ? "DITOLAK (REJECTED)"
          : "MENUNGGU PERSETUJUAN";

  const forceTwoDecimals = hasAnyDecimalCurrency([params.amount]);
  const fmtAmount = formatDocRupiah(params.amount, forceTwoDecimals);
  const leftSigDisplay = params.requesterRole
    ? `${params.requesterName} - ${params.requesterRole}`
    : params.requesterName;

  return {
    docTitle: "FORM PERSETUJUAN PEMBAYARAN (PAYMENT APPROVAL)",
    docSubtitle:
      params.revisionNo && params.revisionNo > 0
        ? `LEMBAR VERIFIKASI & PENCAIRAN DANA BIAYA (REV.${params.revisionNo})`
        : "LEMBAR VERIFIKASI & PENCAIRAN DANA BIAYA",
    docNumber: params.requestNumber,
    docDate: params.requestDate,
    statusBadge: {
      text: statusText,
      variant: statusTone,
    },
    balanceDueBox: {
      label: "TOTAL NOMINAL PEMBAYARAN",
      amountText: fmtAmount,
      dueDateText: params.paidDate
        ? `Telah Dicairkan: ${formatDocDateLong(params.paidDate)}`
        : `Diajukan Pada: ${formatDocDateLong(params.requestDate)}`,
    },
    company: params.company,
    recipientTitle: "Penerima Dana / Rekening Tujuan",
    recipientLines: [
      params.recipientName,
      params.recipientBankInfo
        ? `Rekening / Bank: ${params.recipientBankInfo}`
        : "Rekening Tujuan: –",
    ],
    metaRows: [
      { label: "Tanggal Pengajuan", value: formatDocDateLong(params.requestDate) },
      { label: "Nomor Form PA", value: params.requestNumber },
      { label: "Pemohon / Pengaju", value: params.requesterName },
      { label: "Proyek Terkait", value: params.projectName ?? "Operasional Umum" },
      { label: "Pos Akun Beban", value: params.expenseAccountName ?? "-" },
      ...(params.approvedAt
        ? [{ label: "Disetujui Pada", value: formatDateTimeID(params.approvedAt) }]
        : []),
      ...(params.paidDate
        ? [{ label: "Tanggal Pencairan Kas", value: formatDocDateLong(params.paidDate) }]
        : []),
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Deskripsi Keperluan Pembayaran", widthRatio: 0.62 },
      { header: "Nominal (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: [["1", params.purpose, fmtAmount]],
    summaryRows: [
      { label: "Total Biaya Diajukan", value: fmtAmount },
    ],
    terbilangAmount: params.amount,
    notes: [
      ...(params.rejectionReason
        ? [`Alasan Penolakan: ${params.rejectionReason}`]
        : []),
      ...(params.attachmentNames && params.attachmentNames.length > 0
        ? [`Dokumen Pendukung Terlampir: ${params.attachmentNames.join(", ")}`]
        : []),
      "Pengajuan pembayaran ini wajib diverifikasi dan disetujui Pejabat Keuangan sebelum pencairan kas atau transfer bank dilakukan.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Diajukan Oleh (Pemohon),",
    leftSignatureName: leftSigDisplay,
    rightSignatureLabel: "Disetujui Oleh (Finance / Admin),",
    rightSignatureName:
      params.approverName ??
      `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.requestNumber,
    refDocNumber: "-",
    docStatus: params.status,
  };
}
