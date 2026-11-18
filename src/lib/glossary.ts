/**
 * Glosarium Istilah Akuntansi, Modul ERP, dan Kamus Akun Bilingual Altcycles
 * Single Source of Truth (SSOT) untuk seluruh terminologi teknis keuangan & modul.
 */

export const GLOSSARY = {
  // Modul & Dokumen Proyek
  termin: {
    id: "Termin",
    en: "Milestone Payment",
  },
  jadwal_termin: {
    id: "Jadwal Termin Penagihan",
    en: "Milestone Payment Schedule",
  },
  penagihan: {
    id: "Penagihan",
    en: "Invoicing",
  },
  piutang_usaha: {
    id: "Piutang Usaha",
    en: "Accounts Receivable",
  },
  kuitansi: {
    id: "Kuitansi",
    en: "Payment Receipt",
  },
  pagu_anggaran: {
    id: "Pagu Anggaran",
    en: "Budget Ceiling",
  },
  realisasi_belanja: {
    id: "Realisasi Belanja",
    en: "Budget Realization",
  },
  sisa_anggaran: {
    id: "Sisa Anggaran",
    en: "Remaining Budget",
  },
  bagi_hasil: {
    id: "Bagi Hasil Proyek",
    en: "Project Profit Sharing",
  },
  bakp: {
    id: "Berita Acara Kemajuan Pekerjaan (BAKP)",
    en: "Work Progress Certificate (BAKP)",
  },
  uat: {
    id: "Pengujian Penerimaan Pengguna (UAT)",
    en: "User Acceptance Testing (UAT)",
  },
  bast: {
    id: "Berita Acara Serah Terima (BAST)",
    en: "Official Handover Certificate (BAST)",
  },
  spk: {
    id: "Surat Perintah Kerja (SPK)",
    en: "Work Order (SPK)",
  },
  sow: {
    id: "Kerangka Kerja (SoW)",
    en: "Statement of Work (SoW)",
  },
  quotation: {
    id: "Penawaran Harga (Quotation)",
    en: "Price Quotation",
  },
  po_klien: {
    id: "Purchase Order Klien",
    en: "Client Purchase Order",
  },
  po_vendor: {
    id: "PO Pembelian Vendor",
    en: "Vendor Purchase Order",
  },

  // Siklus Akuntansi & Laporan
  buku_besar: {
    id: "Buku Besar",
    en: "General Ledger",
  },
  jurnal_umum: {
    id: "Jurnal Umum",
    en: "General Journal",
  },
  jurnal_penyesuaian: {
    id: "Jurnal Penyesuaian",
    en: "Adjusting Journal Entries",
  },
  jurnal_penutup: {
    id: "Jurnal Penutup",
    en: "Closing Journal Entries",
  },
  jurnal_pembalik: {
    id: "Jurnal Pembalik",
    en: "Reversing Journal Entries",
  },
  neraca_saldo: {
    id: "Neraca Saldo",
    en: "Trial Balance",
  },
  neraca: {
    id: "Neraca",
    en: "Balance Sheet",
  },
  laba_rugi: {
    id: "Laporan Laba Rugi",
    en: "Income Statement",
  },
  perubahan_ekuitas: {
    id: "Laporan Perubahan Ekuitas",
    en: "Statement of Changes in Equity",
  },
  arus_kas: {
    id: "Laporan Arus Kas",
    en: "Cash Flow Statement",
  },
  bagan_akun: {
    id: "Bagan Akun (CoA)",
    en: "Chart of Accounts (CoA)",
  },
  tutup_buku: {
    id: "Tutup Buku",
    en: "Period Closing",
  },
} as const;

/**
 * Pemetaan Akun Standar (Bagan Akun / CoA) Bilingual
 * Kunci adalah kode akun (code) yang tidak pernah berubah.
 */
export const COA_NAME_MAP: Record<string, { id: string; en: string }> = {
  // Aset Lancar (1-1xxx)
  "1-1101": { id: "Kas Kecil Operasional", en: "Operational Petty Cash" },
  "1-1102": { id: "Kas di Bank - Bank Jago", en: "Cash in Bank - Bank Jago" },
  "1-1201": { id: "Piutang Usaha Klien", en: "Accounts Receivable - Clients" },
  "1-1202": { id: "Piutang Usaha Belum Ditagih", en: "Unbilled Receivables" },
  "1-1210": { id: "Piutang Belum Ditagih (Accrued Revenue)", en: "Accrued Revenue" },
  "1-1300": { id: "Jasa dalam Proses", en: "Work in Progress (WIP)" },
  "1-1310": { id: "Penagihan atas Kontrak", en: "Billings on Contracts" },

  // Liabilitas (2-1xxx)
  "2-1101": { id: "Utang Usaha Vendor", en: "Accounts Payable - Vendors" },
  "2-1201": { id: "Utang Beban Akrual", en: "Accrued Expense Payable" },
  "2-1301": { id: "Utang Bagi Hasil Proyek", en: "Project Profit Sharing Payable" },
  "2-1401": { id: "Pendapatan Diterima di Muka", en: "Unearned Revenue" },
  "2-1402": { id: "Pendapatan Diterima di Muka - Development", en: "Unearned Revenue - Development" },
  "2-1501": { id: "Utang PPN Keluaran", en: "VAT Payable" },

  // Ekuitas (3-1xxx)
  "3-1101": { id: "Modal Disetor", en: "Paid-in Capital" },
  "3-1201": { id: "Laba Ditahan", en: "Retained Earnings" },
  "3-1301": { id: "Ikhtisar Laba Rugi", en: "Income Summary" },

  // Pendapatan (4-1xxx)
  "4-1101": { id: "Pendapatan Jasa Pengembangan Perangkat Lunak", en: "Software Development Service Revenue" },
  "4-1201": { id: "Pendapatan Jasa Konsultasi & Pemeliharaan", en: "Consulting & Maintenance Service Revenue" },

  // Beban Pokok & Beban Proyek (5-1xxx)
  "5-1101": { id: "Beban Cloud, Hosting, & Domain Proyek", en: "Project Cloud, Hosting & Domain Expense" },
  "5-1201": { id: "Beban Tenaga Ahli & Subkontraktor Proyek", en: "Project Subcontractor & Expert Expense" },
  "5-1401": { id: "Beban Bagi Hasil Proyek", en: "Project Profit Sharing Expense" },

  // Beban Operasional Umum (6-1xxx & 7-1xxx)
  "6-1101": { id: "Beban Langganan Alat Kerja Bersama", en: "Shared Tools Subscription Expense" },
  "6-1201": { id: "Beban Administrasi Bank", en: "Bank Administrative Expense" },
  "7-2101": { id: "Beban Pajak Final atas Bunga", en: "Final Tax on Interest Expense" },
};

/**
 * Mengembalikan nama akun yang sesuai dengan bahasa aktif.
 * Kode akun (code) tetap utuh, hanya nama deskripsinya yang disesuaikan.
 */
export function getLocalizedAccountName(
  account: { code?: string | null; name: string } | null | undefined,
  lang: "id" | "en",
): string {
  if (!account) return "";
  const code = account.code?.trim();
  if (code && COA_NAME_MAP[code]) {
    return lang === "en" ? COA_NAME_MAP[code].en : COA_NAME_MAP[code].id;
  }
  // Fallback ke account.name asli bila tidak ada di pemetaan
  return account.name;
}

/**
 * Menerjemahkan nama termin bawaan sistem bila dalam mode EN.
 */
export function getLocalizedMilestoneName(name: string | null | undefined, lang: "id" | "en"): string {
  if (!name) return "";
  if (lang === "id") return name;

  let res = name;
  res = res.replace(/Termin 1 \(Uang Muka \/ DP\)/gi, "Milestone 1 (Down Payment / Advance)");
  res = res.replace(/Termin 2 \(Progres Pengembangan\)/gi, "Milestone 2 (Progress Milestone)");
  res = res.replace(/Termin 3 \(Pelunasan Akhir\)/gi, "Milestone 3 (Final Settlement)");
  res = res.replace(/Termin (\d+)/gi, "Milestone $1");
  res = res.replace(/Uang Muka/gi, "Down Payment");
  res = res.replace(/Pelunasan Akhir/gi, "Final Settlement");
  res = res.replace(/Progres Pengembangan/gi, "Development Progress");
  return res;
}

/**
 * Menerjemahkan kriteria pencapaian bawaan sistem
 */
export function getLocalizedAchievementCriteria(criteria: string | null | undefined, lang: "id" | "en"): string {
  if (!criteria) return "-";
  if (lang === "id") return criteria;

  let res = criteria;
  res = res.replace(/Penandatanganan SPK & Verifikasi PO Klien/gi, "SPK Signing & Client PO Verification");
  res = res.replace(/Persetujuan BAKP Modul Inti/gi, "Core Module BAKP Approval");
  res = res.replace(/BAST Final & UAT Diterima Penuh/gi, "Final BAST & Fully Accepted UAT");
  return res;
}

/**
 * Pola terjemahan deskripsi transaksi bawaan sistem dan format umum
 */
export function getLocalizedTransactionDescription(
  desc: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!desc) return "";
  if (lang === "id") return desc;

  let translated = desc;

  // Pola penerimaan termin uang muka
  translated = translated.replace(
    /Penerimaan termin (\d+) dari (.*?) berupa uang muka development (\d+)%\. Belum diakui pendapatan karena pekerjaan belum selesai\./gi,
    "Receipt of milestone $1 from $2 as development advance payment $3%. Revenue not yet recognized as work is in progress.",
  );

  // Pola pengakuan pendapatan progres
  translated = translated.replace(
    /Pengakuan pendapatan progres (\d+)% — (.*)/gi,
    "Revenue recognition at progress $1% — $2",
  );

  // Pola penagihan invoice
  translated = translated.replace(
    /Penagihan Invoice (INV\/[\w/-]+) — (.*)/gi,
    "Invoice Billing $1 — $2",
  );

  // Pola penerimaan pembayaran invoice
  translated = translated.replace(
    /Penerimaan pembayaran Invoice (INV\/[\w/-]+)/gi,
    "Payment receipt for Invoice $1",
  );

  // Pola jurnal penutup
  translated = translated.replace(
    /Jurnal Penutup Manual Akhir Periode/gi,
    "Period-End Manual Closing Entry",
  );
  translated = translated.replace(
    /Jurnal Pembalik Otomatis Awal Periode/gi,
    "Period-Start Automated Reversing Entry",
  );

  return translated;
}
