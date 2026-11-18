import type { PdfTableColumn } from "./pdf-types";

/**
 * Konfigurasi Tunggal Lebar & Header Kolom Tabel PDF Altcycles (Bagian A).
 * Aturan Utama:
 * 1. Setiap judul header ditulis dalam 1 baris (single-line).
 * 2. Tidak boleh ada pilihan ganda bertanda '/' (misal: "Tanggal Transfer / Pencairan" dipilih salah satu).
 * 3. Jumlah widthRatio per dokumen tepat 1.00 (100%).
 * 4. Kolom numerik/status/tanggal dialokasikan sempit, kolom deskripsi/nama dialokasikan lebar.
 */
export interface TableColumnsEntry {
  id: PdfTableColumn[];
  en: PdfTableColumn[];
}

export const PDF_TABLE_COLUMN_CONFIGS: Record<string, TableColumnsEntry> = {
  // 1. DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL & TIM (/admin/persetujuan) - ORIENTASI LANDSCAPE
  "DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL": {
    id: [
      { header: "No. & Tanggal", widthRatio: 0.16, align: "left" },
      { header: "Pemohon", widthRatio: 0.16, align: "left" },
      { header: "Keterangan", widthRatio: 0.28, align: "left" },
      { header: "Nominal (IDR)", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
      { header: "Tanggal Transfer", widthRatio: 0.14, align: "center" },
    ],
    en: [
      { header: "No. & Date", widthRatio: 0.16, align: "left" },
      { header: "Requester", widthRatio: 0.16, align: "left" },
      { header: "Description", widthRatio: 0.28, align: "left" },
      { header: "Amount (IDR)", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
      { header: "Transfer Date", widthRatio: 0.14, align: "center" },
    ],
  },
  "PAYMENT APPROVALS & CASH DISBURSEMENTS": {
    id: [
      { header: "No. & Tanggal", widthRatio: 0.16, align: "left" },
      { header: "Pemohon", widthRatio: 0.16, align: "left" },
      { header: "Keterangan", widthRatio: 0.28, align: "left" },
      { header: "Nominal (IDR)", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
      { header: "Tanggal Transfer", widthRatio: 0.14, align: "center" },
    ],
    en: [
      { header: "No. & Date", widthRatio: 0.16, align: "left" },
      { header: "Requester", widthRatio: 0.16, align: "left" },
      { header: "Description", widthRatio: 0.28, align: "left" },
      { header: "Amount (IDR)", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
      { header: "Transfer Date", widthRatio: 0.14, align: "center" },
    ],
  },

  // 2. LAPORAN ANGGARAN VS REALISASI PROYEK (/admin/anggaran) - ORIENTASI LANDSCAPE
  "LAPORAN ANGGARAN VS REALISASI PROYEK": {
    id: [
      { header: "Nama Akun Beban", widthRatio: 0.26, align: "left" },
      { header: "Pagu Anggaran", widthRatio: 0.16, align: "right" },
      { header: "Realisasi", widthRatio: 0.16, align: "right" },
      { header: "Sisa Anggaran", widthRatio: 0.16, align: "right" },
      { header: "Serapan (%)", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.12, align: "center" },
    ],
    en: [
      { header: "Expense Account", widthRatio: 0.26, align: "left" },
      { header: "Budget Ceiling", widthRatio: 0.16, align: "right" },
      { header: "Realization", widthRatio: 0.16, align: "right" },
      { header: "Remaining", widthRatio: 0.16, align: "right" },
      { header: "Absorption (%)", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.12, align: "center" },
    ],
  },
  "PROJECT BUDGETING REPORT": {
    id: [
      { header: "Nama Akun Beban", widthRatio: 0.26, align: "left" },
      { header: "Pagu Anggaran", widthRatio: 0.16, align: "right" },
      { header: "Realisasi", widthRatio: 0.16, align: "right" },
      { header: "Sisa Anggaran", widthRatio: 0.16, align: "right" },
      { header: "Serapan (%)", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.12, align: "center" },
    ],
    en: [
      { header: "Expense Account", widthRatio: 0.26, align: "left" },
      { header: "Budget Ceiling", widthRatio: 0.16, align: "right" },
      { header: "Realization", widthRatio: 0.16, align: "right" },
      { header: "Remaining", widthRatio: 0.16, align: "right" },
      { header: "Absorption (%)", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.12, align: "center" },
    ],
  },

  // 3. DAFTAR MASTER VENDOR PEMASOK (/admin/master) - KOLOM STATUS DIHAPUS (ITEM 2)
  "DAFTAR MASTER VENDOR PEMASOK": {
    id: [
      { header: "Kode", widthRatio: 0.10, align: "center" },
      { header: "Nama Vendor", widthRatio: 0.28, align: "left" },
      { header: "Kontak PIC", widthRatio: 0.35, align: "left" },
      { header: "Rekening Bank", widthRatio: 0.27, align: "left" },
    ],
    en: [
      { header: "Code", widthRatio: 0.10, align: "center" },
      { header: "Vendor Name", widthRatio: 0.28, align: "left" },
      { header: "PIC Contact", widthRatio: 0.35, align: "left" },
      { header: "Bank Account", widthRatio: 0.27, align: "left" },
    ],
  },
  "SUPPLIERS & VENDORS LIST": {
    id: [
      { header: "Kode", widthRatio: 0.10, align: "center" },
      { header: "Nama Vendor", widthRatio: 0.28, align: "left" },
      { header: "Kontak PIC", widthRatio: 0.35, align: "left" },
      { header: "Rekening Bank", widthRatio: 0.27, align: "left" },
    ],
    en: [
      { header: "Code", widthRatio: 0.10, align: "center" },
      { header: "Vendor Name", widthRatio: 0.28, align: "left" },
      { header: "PIC Contact", widthRatio: 0.35, align: "left" },
      { header: "Bank Account", widthRatio: 0.27, align: "left" },
    ],
  },

  // 4. DAFTAR MASTER PELANGGAN/KLIEN (/admin/master) - KOLOM STATUS DIHAPUS (ITEM 2)
  "DAFTAR MASTER PELANGGAN/KLIEN": {
    id: [
      { header: "Kode", widthRatio: 0.10, align: "center" },
      { header: "Nama Klien", widthRatio: 0.30, align: "left" },
      { header: "Kontak PIC", widthRatio: 0.36, align: "left" },
      { header: "NPWP", widthRatio: 0.24, align: "left" },
    ],
    en: [
      { header: "Code", widthRatio: 0.10, align: "center" },
      { header: "Client Name", widthRatio: 0.30, align: "left" },
      { header: "PIC Contact", widthRatio: 0.36, align: "left" },
      { header: "Tax ID", widthRatio: 0.24, align: "left" },
    ],
  },
  "OFFICIAL CLIENTS & CUSTOMERS LIST": {
    id: [
      { header: "Kode", widthRatio: 0.10, align: "center" },
      { header: "Nama Klien", widthRatio: 0.30, align: "left" },
      { header: "Kontak PIC", widthRatio: 0.36, align: "left" },
      { header: "NPWP", widthRatio: 0.24, align: "left" },
    ],
    en: [
      { header: "Code", widthRatio: 0.10, align: "center" },
      { header: "Client Name", widthRatio: 0.30, align: "left" },
      { header: "PIC Contact", widthRatio: 0.36, align: "left" },
      { header: "Tax ID", widthRatio: 0.24, align: "left" },
    ],
  },

  // 5. KATALOG PRODUK & LAYANAN (/admin/master) - KOLOM STATUS DIHAPUS (ITEM 2)
  "DAFTAR KATALOG LAYANAN & PRODUK": {
    id: [
      { header: "Kode", widthRatio: 0.10, align: "center" },
      { header: "Nama Layanan", widthRatio: 0.38, align: "left" },
      { header: "Kategori", widthRatio: 0.20, align: "left" },
      { header: "Satuan", widthRatio: 0.12, align: "center" },
      { header: "Tarif Dasar (IDR)", widthRatio: 0.20, align: "right" },
    ],
    en: [
      { header: "Code", widthRatio: 0.10, align: "center" },
      { header: "Service Name", widthRatio: 0.38, align: "left" },
      { header: "Category", widthRatio: 0.20, align: "left" },
      { header: "Unit", widthRatio: 0.12, align: "center" },
      { header: "Base Rate (IDR)", widthRatio: 0.20, align: "right" },
    ],
  },
  "OFFICIAL PRODUCT & SERVICE CATALOG": {
    id: [
      { header: "Kode", widthRatio: 0.10, align: "center" },
      { header: "Nama Layanan", widthRatio: 0.38, align: "left" },
      { header: "Kategori", widthRatio: 0.20, align: "left" },
      { header: "Satuan", widthRatio: 0.12, align: "center" },
      { header: "Tarif Dasar (IDR)", widthRatio: 0.20, align: "right" },
    ],
    en: [
      { header: "Code", widthRatio: 0.10, align: "center" },
      { header: "Service Name", widthRatio: 0.38, align: "left" },
      { header: "Category", widthRatio: 0.20, align: "left" },
      { header: "Unit", widthRatio: 0.12, align: "center" },
      { header: "Base Rate (IDR)", widthRatio: 0.20, align: "right" },
    ],
  },

  // 6. DAFTAR INVOICE PENAGIHAN & PIUTANG (/admin/penagihan) - ORIENTASI LANDSCAPE
  "DAFTAR INVOICE PENAGIHAN & PIUTANG": {
    id: [
      { header: "No. Invoice", widthRatio: 0.15, align: "left" },
      { header: "Tgl Terbit", widthRatio: 0.12, align: "center" },
      { header: "Jatuh Tempo", widthRatio: 0.12, align: "center" },
      { header: "Proyek Klien", widthRatio: 0.24, align: "left" },
      { header: "Total Tagihan", widthRatio: 0.14, align: "right" },
      { header: "Sisa Tagihan", widthRatio: 0.13, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
    en: [
      { header: "Invoice No.", widthRatio: 0.15, align: "left" },
      { header: "Issue Date", widthRatio: 0.12, align: "center" },
      { header: "Due Date", widthRatio: 0.12, align: "center" },
      { header: "Project Client", widthRatio: 0.24, align: "left" },
      { header: "Total Billed", widthRatio: 0.14, align: "right" },
      { header: "Outstanding", widthRatio: 0.13, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
  },
  "INVOICES & RECEIVABLES LIST": {
    id: [
      { header: "No. Invoice", widthRatio: 0.15, align: "left" },
      { header: "Tgl Terbit", widthRatio: 0.12, align: "center" },
      { header: "Jatuh Tempo", widthRatio: 0.12, align: "center" },
      { header: "Proyek Klien", widthRatio: 0.24, align: "left" },
      { header: "Total Tagihan", widthRatio: 0.14, align: "right" },
      { header: "Sisa Tagihan", widthRatio: 0.13, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
    en: [
      { header: "Invoice No.", widthRatio: 0.15, align: "left" },
      { header: "Issue Date", widthRatio: 0.12, align: "center" },
      { header: "Due Date", widthRatio: 0.12, align: "center" },
      { header: "Project Client", widthRatio: 0.24, align: "left" },
      { header: "Total Billed", widthRatio: 0.14, align: "right" },
      { header: "Outstanding", widthRatio: 0.13, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
  },

  // 7. DAFTAR PURCHASE ORDER PEMBELIAN VENDOR (/admin/po-internal)
  "DAFTAR PURCHASE ORDER PEMBELIAN VENDOR": {
    id: [
      { header: "No. PO", widthRatio: 0.16, align: "left" },
      { header: "Tanggal", widthRatio: 0.12, align: "center" },
      { header: "Nama Vendor", widthRatio: 0.22, align: "left" },
      { header: "Deskripsi Barang", widthRatio: 0.24, align: "left" },
      { header: "Total PO", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
    en: [
      { header: "PO No.", widthRatio: 0.16, align: "left" },
      { header: "Date", widthRatio: 0.12, align: "center" },
      { header: "Vendor Name", widthRatio: 0.22, align: "left" },
      { header: "Item Description", widthRatio: 0.24, align: "left" },
      { header: "Total Amount", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
  },
  "ALL VENDOR PURCHASE ORDERS": {
    id: [
      { header: "No. PO", widthRatio: 0.16, align: "left" },
      { header: "Tanggal", widthRatio: 0.12, align: "center" },
      { header: "Nama Vendor", widthRatio: 0.22, align: "left" },
      { header: "Deskripsi Barang", widthRatio: 0.24, align: "left" },
      { header: "Total PO", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
    en: [
      { header: "PO No.", widthRatio: 0.16, align: "left" },
      { header: "Date", widthRatio: 0.12, align: "center" },
      { header: "Vendor Name", widthRatio: 0.22, align: "left" },
      { header: "Item Description", widthRatio: 0.24, align: "left" },
      { header: "Total Amount", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
  },

  // 8. DAFTAR MASTER PROYEK DAN PENUGASAN TIM (/admin/proyek)
  "DAFTAR MASTER PROYEK DAN PENUGASAN TIM": {
    id: [
      { header: "Kode", widthRatio: 0.12, align: "center" },
      { header: "Nama Proyek", widthRatio: 0.26, align: "left" },
      { header: "Klien", widthRatio: 0.20, align: "left" },
      { header: "Nilai Kontrak", widthRatio: 0.18, align: "right" },
      { header: "Jadwal", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
    en: [
      { header: "Code", widthRatio: 0.12, align: "center" },
      { header: "Project Name", widthRatio: 0.26, align: "left" },
      { header: "Client", widthRatio: 0.20, align: "left" },
      { header: "Contract Value", widthRatio: 0.18, align: "right" },
      { header: "Schedule", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
  },
  "PROJECTS LIST & TEAM ASSIGNMENTS": {
    id: [
      { header: "Kode", widthRatio: 0.12, align: "center" },
      { header: "Nama Proyek", widthRatio: 0.26, align: "left" },
      { header: "Klien", widthRatio: 0.20, align: "left" },
      { header: "Nilai Kontrak", widthRatio: 0.18, align: "right" },
      { header: "Jadwal", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
    en: [
      { header: "Code", widthRatio: 0.12, align: "center" },
      { header: "Project Name", widthRatio: 0.26, align: "left" },
      { header: "Client", widthRatio: 0.20, align: "left" },
      { header: "Contract Value", widthRatio: 0.18, align: "right" },
      { header: "Schedule", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.10, align: "center" },
    ],
  },

  // 9. PERHITUNGAN BAGI HASIL PROYEK (/admin/bagi-hasil)
  "PERHITUNGAN BAGI HASIL PROYEK": {
    id: [
      { header: "Komponen Hak", widthRatio: 0.28, align: "left" },
      { header: "Penerima", widthRatio: 0.22, align: "left" },
      { header: "Porsi (%)", widthRatio: 0.12, align: "center" },
      { header: "Nilai Hak (IDR)", widthRatio: 0.24, align: "right" },
      { header: "Status", widthRatio: 0.14, align: "center" },
    ],
    en: [
      { header: "Share Component", widthRatio: 0.28, align: "left" },
      { header: "Recipient", widthRatio: 0.22, align: "left" },
      { header: "Portion (%)", widthRatio: 0.12, align: "center" },
      { header: "Amount (IDR)", widthRatio: 0.24, align: "right" },
      { header: "Status", widthRatio: 0.14, align: "center" },
    ],
  },
  "PROJECT PROFIT SHARING REPORT": {
    id: [
      { header: "Komponen Hak", widthRatio: 0.28, align: "left" },
      { header: "Penerima", widthRatio: 0.22, align: "left" },
      { header: "Porsi (%)", widthRatio: 0.12, align: "center" },
      { header: "Nilai Hak (IDR)", widthRatio: 0.24, align: "right" },
      { header: "Status", widthRatio: 0.14, align: "center" },
    ],
    en: [
      { header: "Share Component", widthRatio: 0.28, align: "left" },
      { header: "Recipient", widthRatio: 0.22, align: "left" },
      { header: "Portion (%)", widthRatio: 0.12, align: "center" },
      { header: "Amount (IDR)", widthRatio: 0.24, align: "right" },
      { header: "Status", widthRatio: 0.14, align: "center" },
    ],
  },

  // 10. CADANGAN BUKU JURNAL AKUNTANSI ALTCYCLES (ORIENTASI LANDSCAPE)
  "CADANGAN BUKU JURNAL AKUNTANSI ALTCYCLES": {
    id: [
      { header: "Tanggal", widthRatio: 0.12, align: "center" },
      { header: "No. Jurnal", widthRatio: 0.18, align: "left" },
      { header: "Akun Keuangan", widthRatio: 0.26, align: "left" },
      { header: "Keterangan", widthRatio: 0.24, align: "left" },
      { header: "Debit (IDR)", widthRatio: 0.10, align: "right" },
      { header: "Kredit (IDR)", widthRatio: 0.10, align: "right" },
    ],
    en: [
      { header: "Date", widthRatio: 0.12, align: "center" },
      { header: "Journal No.", widthRatio: 0.18, align: "left" },
      { header: "Account Name", widthRatio: 0.26, align: "left" },
      { header: "Description", widthRatio: 0.24, align: "left" },
      { header: "Debit (IDR)", widthRatio: 0.10, align: "right" },
      { header: "Credit (IDR)", widthRatio: 0.10, align: "right" },
    ],
  },
};

/**
 * Mendapatkan konfigurasi kolom tabel terpusat berdasarkan judul dokumen atau kunci identitas.
 */
export function getTableColumnsConfig(
  docTitleOrKey: string,
  isEn = false,
): PdfTableColumn[] | undefined {
  if (!docTitleOrKey) return undefined;
  const upper = docTitleOrKey.trim().toUpperCase();

  // 1. Pencocokan langsung pada konfigurasi
  if (PDF_TABLE_COLUMN_CONFIGS[upper]) {
    const entry = PDF_TABLE_COLUMN_CONFIGS[upper]!;
    return isEn ? entry.en : entry.id;
  }

  // 2. Normalisasi kecocokan awalan judul
  for (const [key, entry] of Object.entries(PDF_TABLE_COLUMN_CONFIGS)) {
    if (upper.includes(key) || key.includes(upper)) {
      return isEn ? entry.en : entry.id;
    }
  }

  // 3. Deteksi kata kunci dokumen spesifik
  if (upper.includes("PAYMENT APPROVAL") || upper.includes("PENGAJUAN PEMBAYARAN")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL"]!;
    return isEn ? entry.en : entry.id;
  }
  if (upper.includes("BUDGET") || upper.includes("ANGGARAN")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["LAPORAN ANGGARAN VS REALISASI PROYEK"]!;
    return isEn ? entry.en : entry.id;
  }
  if (upper.includes("VENDOR") || upper.includes("PEMASOK")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["DAFTAR MASTER VENDOR PEMASOK"]!;
    return isEn ? entry.en : entry.id;
  }
  if (upper.includes("KLIEN") || upper.includes("PELANGGAN") || upper.includes("CLIENT")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["DAFTAR MASTER PELANGGAN/KLIEN"]!;
    return isEn ? entry.en : entry.id;
  }
  if (upper.includes("KATALOG") || upper.includes("CATALOG") || upper.includes("PRODUCT & SERVICE")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["DAFTAR KATALOG LAYANAN & PRODUK"]!;
    return isEn ? entry.en : entry.id;
  }
  if (upper.includes("INVOICE") || upper.includes("TAGIHAN")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["DAFTAR INVOICE PENAGIHAN & PIUTANG"]!;
    return isEn ? entry.en : entry.id;
  }
  if (upper.includes("PURCHASE ORDER") || upper.includes("REKAP PO")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["DAFTAR PURCHASE ORDER PEMBELIAN VENDOR"]!;
    return isEn ? entry.en : entry.id;
  }
  if (upper.includes("PROYEK") || upper.includes("PROJECT")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["DAFTAR MASTER PROYEK DAN PENUGASAN TIM"]!;
    return isEn ? entry.en : entry.id;
  }
  if (upper.includes("BAGI HASIL") || upper.includes("PROFIT SHARING")) {
    const entry = PDF_TABLE_COLUMN_CONFIGS["PERHITUNGAN BAGI HASIL PROYEK"]!;
    return isEn ? entry.en : entry.id;
  }

  return undefined;
}
