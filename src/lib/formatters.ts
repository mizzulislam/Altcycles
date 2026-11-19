import type { RevenueRecognitionMethod } from "@/types/database.types";
import { getActiveLanguage } from "@/lib/i18n";

const ANGKA_DASAR = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
] as const;

/**
 * Membulatkan nilai ke Rupiah bulat tanpa sen (BR-11).
 */
export function roundRupiah(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Memformat angka menjadi mata uang Rupiah tanpa pecahan sen (contoh: Rp120.000.000).
 */
export function formatRupiah(amount: number): string {
  const whole = roundRupiah(amount);
  const absFormatted = Math.abs(whole)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return whole < 0 ? `-Rp${absFormatted}` : `Rp${absFormatted}`;
}

export const SHORT_MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export const FULL_MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const FULL_MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const SHORT_MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Menormalisasi dan memformat kode akun Ref akuntansi menjadi format baku tanda hubung (misal: "1-1101", "1-1202").
 * Menangani variasi input dengan spasi (misal "1 1202" -> "1-1202"), titik (misal "1.1202" -> "1-1202"),
 * atau angka 5 digit tanpa pemisah (misal "11202" -> "1-1202").
 */
export function formatAccountRef(code?: string | null): string {
  if (!code) return "-";
  const trimmed = code.trim();
  if (!trimmed) return "-";
  // Ganti spasi, titik, atau underscore dengan tanda hubung
  const normalized = trimmed.replace(/[\s._]+/g, "-");
  // Jika 5 digit angka tanpa pemisah (misal "11202" -> "1-1202")
  if (/^\d{5}$/.test(normalized)) {
    return `${normalized[0]}-${normalized.slice(1)}`;
  }
  return normalized;
}

/**
 * Karakter penanda sel kosong resmi standar dokumen Altvira: en-dash (–), bukan "0" atau "-".
 */
export const DOC_EMPTY_CELL = "–";

/**
 * Memformat sel kosong dokumen menjadi tanda en-dash resmi standar dokumen Altvira ("–").
 */
export function formatDocEmpty(value?: string | number | null | undefined): string {
  if (value === null || value === undefined) return DOC_EMPTY_CELL;
  if (typeof value === "string" && !value.trim()) return DOC_EMPTY_CELL;
  return String(value);
}

/**
 * Memformat angka moneter dokumen resmi Altvira:
 * - Jika nilai bulat dan `forceTwoDecimals` false maka ditulis tanpa sen (contoh: Rp1.234.567)
 * - Jika memiliki nilai desimal pecahan (misal ,01 s/d ,99) atau `forceTwoDecimals` true maka ditulis lengkap 2 desimal (contoh: Rp1.234.567,50 / Rp1.234.567,00)
 * - Format Indonesia: pemisah ribuan titik (.) dan pemisah desimal koma (,).
 */
export function formatDocRupiah(
  amount: number,
  forceTwoDecimals = false,
): string {
  if (!Number.isFinite(amount)) return `${DOC_EMPTY_CELL}`;
  const sign = amount < 0 ? "-Rp" : "Rp";
  const abs = Math.abs(amount);
  const roundedCent = Math.round(abs * 100);
  const isWhole = roundedCent % 100 === 0;

  if (isWhole && !forceTwoDecimals) {
    const wholeVal = Math.round(abs);
    const absFormatted = wholeVal
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${sign}${absFormatted}`;
  }

  const fixed = (roundedCent / 100).toFixed(2);
  const [wholePart, decPart] = fixed.split(".");
  const wholeFormatted = wholePart!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${wholeFormatted},${decPart}`;
}

/**
 * Memformat angka nominal tanpa simbol mata uang (contoh: 1.234.567 atau -400.000).
 * Format Indonesia: pemisah ribuan titik (.) dan pemisah desimal koma (,).
 */
export function formatDocNumber(
  amount: number,
  forceTwoDecimals = false,
): string {
  if (!Number.isFinite(amount)) return `${DOC_EMPTY_CELL}`;
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const roundedCent = Math.round(abs * 100);
  const isWhole = roundedCent % 100 === 0;

  if (isWhole && !forceTwoDecimals) {
    const wholeVal = Math.round(abs);
    const absFormatted = wholeVal
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${sign}${absFormatted}`;
  }

  const fixed = (roundedCent / 100).toFixed(2);
  const [wholePart, decPart] = fixed.split(".");
  const wholeFormatted = wholePart!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${wholeFormatted},${decPart}`;
}

/**
 * Meringkas teks deskripsi/keterangan buku besar agar padat dan informatif.
 * Contoh:
 * - "Dana masuk Invoice INV/ALT/2026/11/002" -> "Dana masuk"
 * - "Penerimaan termin 1 dari PT RMM berupa uang muka development 40%" -> "Penerimaan termin 1 PT RMM"
 */
export function simplifyLedgerDescription(
  desc: string,
  lang?: "id" | "en",
): string {
  if (!desc) return "-";
  const targetLang = lang ?? getActiveLanguage();
  let s = desc.trim();

  // Pola: "Dana masuk Invoice ..." / "Cash receipt for Invoice ..." -> "Dana masuk" / "Cash receipt"
  if (/^(?:Dana masuk|Cash receipt(?:\s+for)?)\s+(?:Invoice|Tagihan|INV).*/i.test(s)) {
    return targetLang === "en" ? "Cash receipt" : "Dana masuk";
  }

  // Pola: "Penerimaan termin X dari PT Y berupa ..." -> "Penerimaan termin X PT Y" / "Milestone X receipt PT Y"
  const mTermin = s.match(
    /^(?:Penerimaan termin|Receipt of milestone|Milestone)\s+(\d+)\s+(?:dari|from)\s+([^,.\s]+(?:\s+[^,.\s]+){0,3})(?:\s+(?:berupa|as).*|\s+—.*|\..*)?$/i,
  );
  if (mTermin) {
    return targetLang === "en"
      ? `Milestone ${mTermin[1]} receipt ${mTermin[2]}`.trim()
      : `Penerimaan termin ${mTermin[1]} ${mTermin[2]}`.trim();
  }

  // Pola: "Penerimaan pembayaran Invoice ... dari PT Y" -> "Penerimaan pembayaran PT Y" / "Payment receipt PT Y"
  const mPenerimaan = s.match(
    /^(?:Penerimaan(?:\s+pembayaran)?|Payment receipt(?:\s+for)?)\s+(?:Invoice\s+[^\s]+\s+)?(?:dari|from)\s+([^,.\s]+(?:\s+[^,.\s]+){0,3})/i,
  );
  if (mPenerimaan) {
    return targetLang === "en"
      ? `Payment receipt ${mPenerimaan[1]}`.trim()
      : `Penerimaan ${mPenerimaan[1]}`.trim();
  }

  // Pola: "Penerimaan pembayaran Invoice INV/..." (tanpa "dari PT Y")
  if (/^(?:Penerimaan pembayaran|Payment receipt(?:\s+for)?)\s+Invoice\s+[^\s]+$/i.test(s)) {
    return targetLang === "en" ? "Invoice payment receipt" : "Penerimaan pembayaran";
  }

  // Pola: "Penagihan Invoice INV/... — ..."
  if (/^(?:Penagihan|Billing(?:\s+for)?)\s+Invoice\s+[^\s]+/i.test(s)) {
    return targetLang === "en" ? "Invoice billing" : "Penagihan invoice";
  }

  // Pola: "Pengakuan pendapatan hosting selama X hari ..."
  const mHosting = s.match(
    /^(?:Pengakuan pendapatan hosting selama|Hosting revenue recognition for)\s+(\d+)\s+(?:hari|days)/i,
  );
  if (mHosting) {
    return targetLang === "en"
      ? `Hosting revenue recognition (${mHosting[1]} days)`
      : `Pengakuan pendapatan hosting (${mHosting[1]} hari)`;
  }

  // Pola: "Pembebanan biaya server tahunan untuk X hari ..."
  const mServer = s.match(
    /^(?:Pembebanan biaya server tahunan untuk|Annual server cost allocation for)\s+(\d+)\s+(?:hari|used days|days)/i,
  );
  if (mServer) {
    return targetLang === "en"
      ? `Annual server cost allocation (${mServer[1]} days)`
      : `Pembebanan biaya server (${mServer[1]} hari)`;
  }

  // Pola umum: potong klausa penjelasan panjang seperti "berupa uang muka...", "— Development cost...", ". Belum diakui..."
  s = s.replace(/\s+(?:berupa\s+uang\s+muka|as\s+\d+%?\s*development\s+down\s+payment).*$/i, "");
  s = s.replace(/\s+(?:berupa|as)\s+.*$/i, "");
  s = s.replace(/\s*—\s*.*$/, "");
  s = s.replace(/\.\s+[A-Z].*$/, ""); // potong kalimat kedua
  s = s.replace(/\s+(?:for\s+)?Invoice\s+INV\/[^\s]+/gi, ""); // hapus nomor invoice panjang karena sudah ada di kolom Ref

  // Rapikan "termin X dari PT Y" -> "termin X PT Y"
  s = s.replace(/termin\s+(\d+)\s+dari\s+/i, targetLang === "en" ? "milestone $1 " : "termin $1 ");

  if (targetLang === "en") {
    s = s
      .replace(/^Dana masuk$/i, "Cash receipt")
      .replace(/^Penerimaan pembayaran$/i, "Payment receipt")
      .replace(/^Penagihan$/i, "Invoice billing")
      .replace(/^Pencairan dana\b/i, "Fund disbursement")
      .replace(/^Pembayaran PO\b/i, "PO payment")
      .replace(/^Jurnal Penutup\b/i, "Closing Entry")
      .replace(/^Jurnal Pembalik\b/i, "Reversing Entry")
      .replace(/^Jurnal Koreksi\b/i, "Correction Entry");
  }

  return s.trim() || desc.trim();
}

/**
 * Mengecek apakah di antara daftar angka terdapat minimal satu angka yang memiliki desimal non-nol.
 */
export function hasAnyDecimalCurrency(
  values: Array<number | null | undefined>,
): boolean {
  return values.some((v) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
    return Math.round(Math.abs(v) * 100) % 100 !== 0;
  });
}

/**
 * Memformat tanggal dokumen resmi Altvira dengan nama bulan lengkap bahasa Indonesia / Inggris (contoh: 14 Oktober 2026 / 14 October 2026).
 */
export function formatDocDateLong(
  value: string | Date | null | undefined,
  lang?: "id" | "en",
): string {
  if (!value) {
    return DOC_EMPTY_CELL;
  }
  const targetLang = lang ?? getActiveLanguage();
  const months = targetLang === "en" ? FULL_MONTHS_EN : FULL_MONTHS_ID;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    const monthIdx = parseInt(month!, 10) - 1;
    const monthName = months[monthIdx] ?? month;
    const dayNum = parseInt(day!, 10);
    return `${dayNum} ${monthName} ${year}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return DOC_EMPTY_CELL;
  }
  const dayNum = date.getDate();
  const monthName = months[date.getMonth()] ?? String(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${dayNum} ${monthName} ${year}`;
}

/**
 * Memformat angka menjadi ringkasan Rupiah kompak (contoh: Rp 1,2 M, Rp 45,0 jt, Rp 500 rb).
 */
export function formatCompactRupiah(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000)} rb`;
  }
  return formatRupiah(amount);
}

/**
 * Memformat tanggal ke format lokal Indonesia dd/mm/yyyy (contoh: 07/11/2026).
 */
export function formatDateID(value: string | Date | null | undefined): string {
  if (!value) {
    return "-";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Memformat tanggal berbasis Intl mengikuti bahasa aktif (id / en).
 * Pada mode EN: 12 Nov 2026; pada mode ID: 12 Nov 2026 / 12/11/2026.
 */
export function formatDateI18n(
  value: string | Date | null | undefined,
  lang: "id" | "en" = "id",
): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Mengembalikan tanggal hari ini (atau offset hari) dalam format ISO YYYY-MM-DD sesuai zona waktu lokal.
 */
export function todayIsoDate(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Memformat cap waktu ke dd/mm/yyyy HH:mm WIB.
 */
export function formatDateTimeID(value: string | Date | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/**
 * Memformat cap waktu berbasis Intl mengikuti bahasa aktif.
 */
export function formatDateTimeI18n(
  value: string | Date | null | undefined,
  lang: "id" | "en" = "id",
): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function terbilangInt(n: number): string {
  if (n < 12) {
    return ANGKA_DASAR[n] ?? "";
  }
  if (n < 20) {
    return `${terbilangInt(n - 10)} belas`.trim();
  }
  if (n < 100) {
    const puluh = Math.floor(n / 10);
    const sisa = n % 10;
    return `${terbilangInt(puluh)} puluh ${terbilangInt(sisa)}`.trim();
  }
  if (n < 200) {
    return `seratus ${terbilangInt(n - 100)}`.trim();
  }
  if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    return `${terbilangInt(ratus)} ratus ${terbilangInt(sisa)}`.trim();
  }
  if (n < 2000) {
    return `seribu ${terbilangInt(n - 1000)}`.trim();
  }
  if (n < 1_000_000) {
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;
    return `${terbilangInt(ribu)} ribu ${terbilangInt(sisa)}`.trim();
  }
  if (n < 1_000_000_000) {
    const juta = Math.floor(n / 1_000_000);
    const sisa = n % 1_000_000;
    return `${terbilangInt(juta)} juta ${terbilangInt(sisa)}`.trim();
  }
  if (n < 1_000_000_000_000) {
    const miliar = Math.floor(n / 1_000_000_000);
    const sisa = n % 1_000_000_000;
    return `${terbilangInt(miliar)} miliar ${terbilangInt(sisa)}`.trim();
  }
  const triliun = Math.floor(n / 1_000_000_000_000);
  const sisa = n % 1_000_000_000_000;
  return `${terbilangInt(triliun)} triliun ${terbilangInt(sisa)}`.trim();
}

const ONES_EN = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS_EN = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

function numberToWordsIntEn(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES_EN[n]!;
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const rem = n % 10;
    return rem === 0 ? TENS_EN[ten]! : `${TENS_EN[ten]}-${ONES_EN[rem]}`;
  }
  if (n < 1000) {
    const hundred = Math.floor(n / 100);
    const rem = n % 100;
    return rem === 0
      ? `${ONES_EN[hundred]} hundred`
      : `${ONES_EN[hundred]} hundred ${numberToWordsIntEn(rem)}`;
  }
  if (n < 1_000_000) {
    const thousand = Math.floor(n / 1000);
    const rem = n % 1000;
    return rem === 0
      ? `${numberToWordsIntEn(thousand)} thousand`
      : `${numberToWordsIntEn(thousand)} thousand ${numberToWordsIntEn(rem)}`;
  }
  if (n < 1_000_000_000) {
    const million = Math.floor(n / 1_000_000);
    const rem = n % 1_000_000;
    return rem === 0
      ? `${numberToWordsIntEn(million)} million`
      : `${numberToWordsIntEn(million)} million ${numberToWordsIntEn(rem)}`;
  }
  if (n < 1_000_000_000_000) {
    const billion = Math.floor(n / 1_000_000_000);
    const rem = n % 1_000_000_000;
    return rem === 0
      ? `${numberToWordsIntEn(billion)} billion`
      : `${numberToWordsIntEn(billion)} billion ${numberToWordsIntEn(rem)}`;
  }
  const trillion = Math.floor(n / 1_000_000_000_000);
  const rem = n % 1_000_000_000_000;
  return rem === 0
    ? `${numberToWordsIntEn(trillion)} trillion`
    : `${numberToWordsIntEn(trillion)} trillion ${numberToWordsIntEn(rem)}`;
}

export function terbilangEnglish(amount: number): string {
  const whole = roundRupiah(amount);
  if (whole === 0) {
    return "Zero rupiah";
  }
  const prefix = whole < 0 ? "minus " : "";
  const raw = `${prefix}${numberToWordsIntEn(Math.abs(whole))} rupiah`.replace(/\s+/g, " ").trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Mengubah nominal Rupiah bulat menjadi kalimat terbilang Bahasa Indonesia / Inggris (Lampiran A.0).
 */
export function terbilangRupiah(amount: number, lang?: "id" | "en"): string {
  const targetLang = lang ?? getActiveLanguage();
  if (targetLang === "en") {
    return terbilangEnglish(amount);
  }
  const whole = roundRupiah(amount);
  if (whole === 0) {
    return "Nol rupiah";
  }
  const prefix = whole < 0 ? "minus " : "";
  const raw = `${prefix}${terbilangInt(Math.abs(whole))} rupiah`.replace(/\s+/g, " ").trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Menentukan metode pengakuan pendapatan default berdasarkan jumlah termin proyek (BR-13 & Bagian 7.1).
 */
export function inferRevenueMethodFromTerms(termCount: number): RevenueRecognitionMethod {
  if (termCount <= 1) {
    return "single_term_deferral";
  }
  if (termCount === 2) {
    return "two_term_accrual";
  }
  return "progress_billing";
}

export const REVENUE_METHOD_LABELS: Record<RevenueRecognitionMethod, string> = {
  single_term_deferral: "Satu Termin (Deferral Pendapatan Diterima di Muka)",
  two_term_accrual: "Dua Termin (Akrual Akhir Tahun + Pembalik Opsional)",
  progress_billing: "Progress Billing (≥ 3 Termin: Jasa dalam Proses & Penagihan Kontrak)",
};

export const ROLE_LABELS = {
  user: "User (Tim Proyek)",
  admin: "Admin (Bendahara / Akuntan)",
  super_admin: "Super Admin (Pengelola Sistem)",
} as const;

export const ACCOUNT_TYPE_LABELS = {
  asset: "Aset",
  contra_asset: "Kontra-Aset",
  liability: "Liabilitas",
  equity: "Ekuitas",
  revenue: "Pendapatan",
  expense: "Beban",
} as const;

