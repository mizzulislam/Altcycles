import type { PDFFont } from "pdf-lib";
import type { PdfDocumentSpec } from "./pdf-types";
import { sanitizePdfText } from "./pdf-tokens";

/**
 * Memecah kata tunggal yang terlalu panjang (seperti URL panjang tanpa spasi)
 * mengikuti perilaku CSS `overflow-wrap: anywhere`, memprioritaskan karakter pemisah URL.
 */
export function breakLongToken(
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

/**
 * Memecah paragraf teks menjadi beberapa baris sesuai batas lebar maksimum (safeMaxW).
 */
export function wrapTextByWidth(
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
    const leadingIndent = para.match(/^\s+/)?.[0] ?? "";
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

    let current = leadingIndent ? `${leadingIndent}${words[0]!}` : words[0]!;
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]!}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= safeMaxW) {
        current = candidate;
      } else {
        result.push(current);
        current = leadingIndent ? `${leadingIndent}${words[i]!}` : words[i]!;
      }
    }
    result.push(current);
  }
  return result.length > 0 ? result : [""];
}

/**
 * Mendeteksi apakah dokumen berasal dari modul Siklus Akuntansi atau Laporan Keuangan resmi.
 * Dokumen di luar modul ini wajib menggunakan font normal (regular) pada baris tabel data.
 */
export function isAccountingCycleOrFinancialReport(docTitle?: string): boolean {
  if (!docTitle) return false;
  const upper = docTitle.toUpperCase();
  return (
    upper.includes("JURNAL") ||
    upper.includes("JOURNAL") ||
    upper.includes("BUKU BESAR") ||
    upper.includes("GENERAL LEDGER") ||
    upper.includes("NERACA") ||
    upper.includes("BALANCE SHEET") ||
    upper.includes("TRIAL BALANCE") ||
    upper.includes("LABA RUGI") ||
    upper.includes("INCOME STATEMENT") ||
    upper.includes("PROFIT & LOSS") ||
    upper.includes("POSISI KEUANGAN") ||
    upper.includes("FINANCIAL POSITION") ||
    upper.includes("ARUS KAS") ||
    upper.includes("CASH FLOW") ||
    upper.includes("PERUBAHAN EKUITAS") ||
    upper.includes("CHANGES IN EQUITY") ||
    upper.includes("LAPORAN KEUANGAN") ||
    upper.includes("FINANCIAL STATEMENT")
  );
}

/**
 * Mendeteksi apakah suatu baris tabel merupakan baris klasifikasi/rekapitulasi UPPERCASE
 * sehingga seluruh sel di baris tersebut dicetak tebal (bold).
 * Hanya dievaluasi untuk dokumen siklus akuntansi & laporan keuangan.
 */
export function isRowUppercase(row: string[]): boolean {
  for (const cell of row) {
    if (!cell) continue;
    const trimmed = cell.trim().replace(/^(\d+\.|-|\*)\s*/, "").trim();
    // Abaikan kode/nomor dokumen/referensi yang mengandung slash (misal JRN/..., PRJ/...) atau pola kode singkat yang memiliki angka (misal INV-01, PRJ-1)
    if (trimmed.includes("/") || (/^[A-Z0-9_-]{2,15}$/.test(trimmed) && /\d/.test(trimmed))) continue;
    const lettersOnly = trimmed.replace(/[^A-Za-z]/g, "");
    if (lettersOnly.length >= 4 && lettersOnly === lettersOnly.toUpperCase()) {
      return true;
    }
  }
  return false;
}

/**
 * Aturan konsistensi desimal per dokumen (Keputusan K-06):
 * Bila ada SATU angka uang berdesimal (mis. Rp1.234.567,50) di sebuah dokumen,
 * semua angka uang Rp di dokumen tersebut ditampilkan dua desimal (,00) agar kolom sejajar.
 */
export function normalizeSpecCurrencyDecimals(spec: PdfDocumentSpec): PdfDocumentSpec {
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
