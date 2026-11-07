import type { RevenueRecognitionMethod } from "@/types/database.types";

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

/**
 * Mengubah nominal Rupiah bulat menjadi kalimat terbilang Bahasa Indonesia (Lampiran A.0).
 */
export function terbilangRupiah(amount: number): string {
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

