import { DEMO_COMPANY } from "@/lib/demo-seed";
import {
  formatDocDateLong,
  formatDocRupiah,
} from "@/lib/formatters";
import {
  buildClientPoPdfSpec,
  buildInvoicePdfSpec,
  buildPaymentApprovalPdfSpec,
  buildReceiptPdfSpec,
  type PdfDocumentSpec,
} from "@/lib/pdf-generator";
import type { CompanyProfileRow } from "@/types/database.types";

/**
 * Profil perusahaan standar pengujian (mencakup jabatan "Finance & Accounting" dan NPWP)
 */
export const FIXTURE_COMPANY: CompanyProfileRow = {
  ...DEMO_COMPANY,
  company_name: "Altvira Technology",
  legal_entity_name: "PT Representasi Mitra Mandiri",
  address:
    "Area Pandu Raya, Villa Citra, Bantarjati Jl. Flamboyan F2 No. 12 Kota Bogor, Jawa Barat.",
  email: "altvira.tech@gmail.com",
  phone: "0895-4173-11976",
  tax_id_number: "53.082.027.1-203.000",
  bank_name: "Bank Jago",
  bank_account_number: "103289122849",
  bank_account_holder: "Muhammad Izzul Islam",
  signer_name: "Muhammad Izzul Islam",
  signer_title: "Finance & Accounting",
  pkp_enabled: false,
  ppn_rate: 11,
};

/**
 * 1. INVOICE — Normal (Termin 1 Lunas, mereproduksi gejala a, d, e, f, g)
 */
export function buildFixtureInvoiceNormal(): PdfDocumentSpec {
  return buildInvoicePdfSpec({
    company: FIXTURE_COMPANY,
    invoiceNumber: "INV/ALT/2026/11/001",
    invoiceDate: "2026-11-01",
    dueDate: "2026-11-15",
    customerName: "PT Satu Dental Indonesia (TIMTravel RMM)",
    customerPic: "Anni Nuraini, M.T.",
    customerTitle: "Direktur Operasional",
    customerAddress:
      "Komplek City Resort, Ruko Hawai Blok B No. 61 Timur, Cengkareng, Jakarta Barat, DKI Jakarta 11730",
    projectName:
      "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
    clientPoNumber: "PO-202611-8YQKXM",
    spkNumber: "SPK/ALT/2026/11/001",
    bakpNumber: "BAKP/ALT/2026/11/001",
    servicePeriod: "Termin: Termin 1",
    description:
      "Termin 1 (DP 40%) — Pekerjaan Pengembangan & Optimasi Website TIMTravel RMM",
    qty: 1,
    unit: "Paket",
    unitPrice: 2_000_600,
    subtotal: 2_000_600,
    ppnAmount: 0,
    totalAmount: 2_000_600,
    contractValue: 5_000_000,
    previousBilledAmount: 0,
    remainingContractAmount: 2_999_400,
    docStatus: "issued",
    paymentStatus: "paid",
    balanceDue: 0,
  });
}

/**
 * 2. INVOICE — Ekstrem (Nama proyek 3 baris, alamat 3 baris, label panjang, URL panjang,
 *    bullet 3 baris, tabel 25 baris menjalar 2-3 halaman, nilai besar berdesimal Rp1.234.567.890,50)
 */
export function buildFixtureInvoiceExtreme(): PdfDocumentSpec {
  const rows25 = Array.from({ length: 25 }, (_, i) => {
    const idx = i + 1;
    const isDecimalItem = idx === 1;
    const unitPrice = isDecimalItem ? 49_382_715.62 : 49_382_715;
    const subtotal = unitPrice;
    return {
      description: `Modul Enterprise Ke-${idx}: Integrasi Arsitektur Microservices, Sinkronisasi Data Multi-Cabang Real-Time, Audit Keamanan Terenkripsi, dan Pelaporan Keuangan Otomatis`,
      qty: 1,
      unit: "Modul",
      duration: "3 Bulan",
      unitPrice,
      subtotal,
    };
  });

  const totalAmount = 1_234_567_890.5;

  const spec = buildInvoicePdfSpec({
    company: {
      ...FIXTURE_COMPANY,
      address:
        "Gedung Cyber Tower Lantai 18 Suite 1804, Kawasan Bisnis Terpadu Kuningan Barat, Jl. Kapten Tendean Kav. 12-14, Mampang Prapatan, Jakarta Selatan, DKI Jakarta 12790",
    },
    invoiceNumber: "INV/ALT/2026/11/099",
    invoiceDate: "2026-11-15",
    dueDate: "2026-11-29",
    customerName:
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk",
    customerPic: "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA",
    customerTitle: "Chief Information & Digital Transformation Officer",
    customerAddress:
      "Kawasan Industri Jababeka Tahap VII Blok K-14 No. 22-25, Jl. Raya Industri Utama Cikarang Utara, Kabupaten Bekasi, Provinsi Jawa Barat 17530, Indonesia",
    projectName:
      "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
    clientPoNumber: "PO-202611-EXT99K",
    spkNumber: "SPK/ALT/2026/11/099",
    bakpNumber: "BAKP/ALT/2026/11/099",
    bastNumber: "BAST/ALT/2026/11/099",
    servicePeriod: "1 November 2026 – 31 Januari 2027 (3 Bulan Kalender)",
    description: "Implementasi Penuh 25 Modul Enterprise",
    items: rows25,
    subtotal: totalAmount,
    ppnAmount: 0,
    totalAmount,
    contractValue: 2_500_000_000,
    previousBilledAmount: 500_000_000,
    remainingContractAmount: 765_432_109.5,
    docStatus: "issued",
    paymentStatus: "unpaid",
    balanceDue: totalAmount,
    overdueClauseText:
      "Apabila pembayaran belum diterima secara penuh hingga melewati batas tanggal jatuh tempo yang telah disepakati bersama di dalam Surat Perjanjian Kerja Sama (SPK), maka akses ke lingkungan produksi dan layanan dukungan teknis terkelola akan ditangguhkan sementara waktu hingga pelunasan diverifikasi oleh bagian keuangan.",
  });

  spec.metaRows = [
    ...(spec.metaRows ?? []),
    {
      label: "Tautan Portal Verifikasi Tagihan & Bukti Serah Terima",
      value:
        "https://portal.altvira.id/verifikasi-dokumen/invoice/2026/11/INV-ALT-2026-11-099?token=8f92a3b4c5d6e7f8a9b0c1d2e3f4",
    },
  ];

  return spec;
}

/**
 * 3. INVOICE — Minimum (Field opsional kosong, 1 baris pendek)
 */
export function buildFixtureInvoiceMinimum(): PdfDocumentSpec {
  return buildInvoicePdfSpec({
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    invoiceNumber: "INV/ALT/2026/11/002",
    invoiceDate: "2026-11-10",
    dueDate: "2026-11-24",
    customerName: "CV Maju Bersama",
    customerAddress: "",
    projectName: "Pemeliharaan Website",
    clientPoNumber: "PO-202611-MIN01",
    description: "Layanan Pemeliharaan Bulanan",
    qty: 1,
    unit: "Bulan",
    unitPrice: 1_500_000,
    subtotal: 1_500_000,
    ppnAmount: 0,
    totalAmount: 1_500_000,
    docStatus: "draft",
    paymentStatus: "unpaid",
    balanceDue: 1_500_000,
  });
}

/**
 * 4. KUITANSI — Normal (> Rp5.000.000 dengan e-Meterai, mereproduksi gejala f & h)
 */
export function buildFixtureReceiptNormal(): PdfDocumentSpec {
  return buildReceiptPdfSpec({
    company: FIXTURE_COMPANY,
    receiptNumber: "KW/ALT/2026/11/001",
    receiptDate: "2026-11-05",
    receivedFrom: "PT Satu Dental Indonesia (TIMTravel RMM)",
    invoiceNumber: "INV/ALT/2026/11/001",
    projectName:
      "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
    clientPoNumber: "PO-202611-8YQKXM",
    servicePeriod: "Termin: Termin 1",
    paymentMethod: "Transfer Bank Jago (103289122849)",
    amount: 7_500_000,
    hasMeterai: true,
  });
}

/**
 * 5. QUOTATION — Normal
 */
export function buildFixtureQuotationNormal(): PdfDocumentSpec {
  return {
    docTitle: "SURAT PENAWARAN HARGA (QUOTATION)",
    docSubtitle: "Masa Berlaku s.d. 15 November 2026",
    docNumber: "QT/ALT/2026/11/001",
    docDate: "2026-11-01",
    statusBadge: { text: "DISETUJUI", variant: "success" },
    balanceDueBox: {
      label: "TOTAL PENAWARAN HARGA",
      amountText: formatDocRupiah(120_000_000),
      dueDateText: "Berlaku s.d. 15 November 2026",
    },
    company: FIXTURE_COMPANY,
    recipientTitle: "Kepada Yth.:",
    recipientLines: [
      "PT Sinar Niaga Digital",
      "Hendra Wijaya (Direktur Operasional)",
      "Jl. Jend. Sudirman Kav. 45, Jakarta Selatan",
    ],
    metaRows: [
      {
        label: "Judul Proyek",
        value: "Pengembangan Sistem Portal Distribusi Sinar Niaga",
      },
      { label: "Estimasi Durasi", value: "12 Minggu Kalender" },
      { label: "Batas Sesi Revisi", value: "2x Sesi" },
    ],
    paragraphsBefore: [
      "Ringkasan Kebutuhan Proyek: Aplikasi web pemesanan distributor multi-cabang & pelacakan pengiriman terintegrasi.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Modul / Lingkup Fitur Pekerjaan", widthRatio: 0.62 },
      { header: "Biaya (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: [
      [
        "1",
        "Modul Katalog & Pemesanan Distributor - Keranjang B2B, kuota stok, & riwayat order",
        formatDocRupiah(50_000_000),
      ],
      [
        "2",
        "Modul Gudang, Surat Jalan, & Dashboard Analitik - Pelacakan pengiriman & rekap omzet cabang",
        formatDocRupiah(70_000_000),
      ],
    ],
    summaryRows: [
      { label: "TOTAL PENAWARAN HARGA", value: formatDocRupiah(120_000_000) },
    ],
    terbilangAmount: 120_000_000,
    notesTitle: "Ketentuan Penawaran Harga:",
    notes: [
      "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).",
      "Penawaran harga ini sah sebagai dasar penerbitan Purchase Order (PO) resmi oleh Pihak Klien.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    rightSignatureLabel: `Hormat kami, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "QT/ALT/2026/11/001",
  };
}

/**
 * 6. SOW (Statement of Work) — Normal (mereproduksi gejala d: "Kode & Nama Proyek:")
 */
export function buildFixtureSowNormal(): PdfDocumentSpec {
  return {
    docTitle: "STATEMENT OF WORK (SOW)",
    docSubtitle: "RUANG LINGKUP PEKERJAAN & KRITERIA PENERIMAAN",
    docNumber: "SOW/ALT/2026/11/001",
    docDate: "2026-11-15",
    statusBadge: { text: "DISETUJUI SAH", variant: "success" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      "TIMTravel RMM",
      "Anni Nuraini, M.T.",
      "Komplek City Resort, Ruko Hawai Blok B No. 61 Timur, Jakarta Barat",
    ],
    metaRows: [
      {
        label: "Kode & Nama Proyek",
        value:
          "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
      },
      { label: "Referensi PO Klien", value: "PO-202611-8YQKXM" },
      { label: "Nilai Kontrak", value: formatDocRupiah(5_000_000) },
      {
        label: "Target Penyelesaian",
        value: formatDocDateLong("2027-01-31"),
      },
      { label: "Status Pengesahan", value: "Telah Ditandatangani Sah" },
    ],
    paragraphsBefore: [
      "Dokumen SOW ini mengatur ruang lingkup teknis, kriteria penerimaan, hak kekayaan intelektual (source code beralih setelah pelunasan 100%), serta jadwal termin pelaksanaan pekerjaan proyek Development cost of Enhancement & Optimization Website TIMTravel RMM.",
    ],
    notesTitle: "Ketentuan Pelaksanaan Pekerjaan:",
    notes: [
      "Perubahan di luar ruang lingkup yang telah disepakati akan diproses melalui mekanisme Change Request (CR) tertulis.",
      "Hak cipta kode sumber beralih sepenuhnya kepada Pihak Klien setelah pelunasan 100% nilai kontrak.",
    ],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName: "Anni Nuraini, M.T.",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "SOW/ALT/2026/11/001",
  };
}

/**
 * 7. PO KLIEN — Normal
 */
export function buildFixtureClientPoNormal(): PdfDocumentSpec {
  return buildClientPoPdfSpec({
    company: FIXTURE_COMPANY,
    poNumber: "PO-202611-8YQKXM",
    poDate: "2026-11-01",
    clientName: "Anni Nuraini, M.T.",
    clientCompany: "TIMTravel RMM",
    clientEmail: "anni@timtravel.co.id",
    clientPhone: "0812-8899-0011",
    quotationReference: "QT/ALT/2026/11/001",
    statusLabel: "Terverifikasi Sah",
    projectLabel:
      "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
    items: [
      {
        item: "Development cost of Enhancement & Optimization Website TIMTravel RMM",
        qty: 1,
        price: 7_000_000,
      },
    ],
    poValue: 7_000_000,
  });
}

/**
 * 8. PO INTERNAL (Vendor) — Normal (3 kolom tanda tangan)
 */
export function buildFixtureVendorPoNormal(): PdfDocumentSpec {
  return {
    docTitle: "PURCHASE ORDER (PO PEMBELIAN VENDOR)",
    docSubtitle: "PESANAN PENGADAAN BARANG / JASA INTERNAL",
    docNumber: "POP/ALT/2026/11/001",
    docDate: "2026-11-05",
    statusBadge: { text: "DITERBITKAN", variant: "info" },
    balanceDueBox: {
      label: "TOTAL NILAI PESANAN (PO)",
      amountText: formatDocRupiah(4_500_000),
      dueDateText: "Syarat Pembayaran: Transfer Bank Resmi",
    },
    company: FIXTURE_COMPANY,
    recipientTitle: "Kepada Vendor / Pemasok:",
    recipientLines: [
      "PT Awan Nusantara Cloud",
      "Jl. Gatot Subroto Kav. 32, Jakarta Selatan",
      "Kontak: Rizky Pratama | Telp: 021-5550101",
    ],
    metaRows: [
      { label: "Nomor PO", value: "POP/ALT/2026/11/001" },
      { label: "Tanggal Terbit", value: "5 November 2026" },
      {
        label: "Proyek Terkait",
        value: "PRJ/ALT/2026/001 - Portal Distribusi Sinar Niaga",
      },
      { label: "Alamat Pengiriman", value: FIXTURE_COMPANY.address },
      {
        label: "Kontak Penerima",
        value: `${FIXTURE_COMPANY.signer_name} (${FIXTURE_COMPANY.phone})`,
      },
      {
        label: "Catatan Tambahan",
        value: "Sewa infrastruktur VPS staging & produksi 3 bulan",
      },
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Deskripsi Barang / Jasa", widthRatio: 0.44 },
      { header: "Qty", widthRatio: 0.14, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.17, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.17, align: "right" },
    ],
    tableRows: [
      [
        "1",
        "Cloud Server 4 vCPU 8GB RAM (3 Bulan)",
        "3 Bulan",
        formatDocRupiah(1_500_000),
        formatDocRupiah(4_500_000),
      ],
    ],
    summaryRows: [
      { label: "TOTAL NILAI PO", value: formatDocRupiah(4_500_000) },
    ],
    terbilangAmount: 4_500_000,
    notes: [
      "Harap cantumkan Nomor PO ini pada setiap surat jalan, tanda terima, dan tagihan/invoice vendor.",
      "Barang atau jasa yang dikirim harus sesuai dengan spesifikasi dan dalam kondisi baik saat diterima.",
      "Dokumen PO ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Dibuat Oleh (Staff Pengadaan),",
    leftSignatureName: FIXTURE_COMPANY.signer_name,
    thirdSignatureLabel: "Disetujui Oleh (Finance / Admin),",
    thirdSignatureName: "Direktur Keuangan",
    rightSignatureLabel: "Diterima & Dikonfirmasi Oleh, PT Awan Nusantara Cloud",
    rightSignatureName: "Rizky Pratama",
    footerDocNumber: "POP/ALT/2026/11/001",
  };
}

/**
 * 9. BAKP (Berita Acara Kemajuan Pekerjaan) — Normal
 */
export function buildFixtureBakpNormal(): PdfDocumentSpec {
  return {
    docTitle: "BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)",
    docSubtitle: "BUKTI CAPAIAN PROGRES TERMIN PEKERJAAN",
    docNumber: "BAKP/ALT/2026/11/001",
    docDate: "2026-11-20",
    statusBadge: { text: "DISETUJUI KLIEN", variant: "success" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      "TIMTravel RMM",
      "Anni Nuraini, M.T.",
      "Komplek City Resort, Ruko Hawai Blok B No. 61 Timur, Jakarta Barat",
    ],
    metaRows: [
      {
        label: "Proyek",
        value:
          "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
      },
      { label: "Referensi PO Klien", value: "PO-202611-8YQKXM" },
      { label: "Referensi SPK / Kontrak", value: "SPK/ALT/2026/11/001" },
      { label: "Termin Terkait", value: "Termin 1 (DP & Fondasi Sistem)" },
      { label: "Capaian Fisik", value: "40%" },
      { label: "Nilai Tagihan Termin", value: formatDocRupiah(2_000_600) },
    ],
    paragraphsBefore: [
      "Pada tanggal 20 November 2026, telah dilakukan pemeriksaan bersama atas pencapaian pekerjaan termin Termin 1 proyek Development cost of Enhancement & Optimization Website TIMTravel RMM dengan capaian fisik kumulatif sebesar 40%. Hasil pemeriksaan dinyatakan memenuhi syarat dan dapat ditagihkan melalui Invoice Termin resmi.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.1, align: "center" },
      { header: "Deliverable / Komponen Pekerjaan", widthRatio: 0.65 },
      { header: "Status Capaian", widthRatio: 0.25, align: "center" },
    ],
    tableRows: [
      ["1", "Desain Arsitektur Database & UI/UX", "SELESAI 100%"],
      ["2", "Implementasi Modul Otentikasi & Katalog Paket", "SELESAI 100%"],
    ],
    notesTitle: "Catatan Pemeriksaan Capaian:",
    notes: [
      "Dokumen Berita Acara Kemajuan Pekerjaan (BAKP) ini sah sebagai dasar penagihan Invoice Termin.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName: "Anni Nuraini, M.T.",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "BAKP/ALT/2026/11/001",
  };
}

/**
 * 10. UAT (User Acceptance Test Checklist) — Normal (mereproduksi gejala c: "Lingkungan Uji (Staging):" menabrak URL)
 */
export function buildFixtureUatNormal(): PdfDocumentSpec {
  return {
    docTitle: "USER ACCEPTANCE TEST (UAT) CHECKLIST",
    docSubtitle: "BERITA ACARA PENGUJIAN PENERIMAAN PENGGUNA",
    docNumber: "UAT/ALT/2027/01/004",
    docDate: "2027-01-25",
    statusBadge: { text: "LULUS / SESUAI (ACCEPTED)", variant: "success" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Pihak Penguji (Klien):",
    recipientLines: [
      "TIMTravel RMM",
      "Penguji: Anni Nuraini, M.T.",
      "Area Pandu Raya, Villa Citra, Bantarjati Jl. Flamboyan F2 No. 12 Kota Bogor, Jawa Barat.",
    ],
    metaRows: [
      {
        label: "Proyek",
        value:
          "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
      },
      { label: "Referensi PO Klien", value: "PO-202611-8YQKXM" },
      { label: "Referensi SPK / Kontrak", value: "SPK/ALT/2026/11/001" },
      {
        label: "Lingkungan Uji (Staging)",
        value: "https://staging.altvira.id/projects/timtravel-rmm/uat-preview",
      },
      { label: "Penguji Pihak Klien", value: "Anni Nuraini, M.T." },
      { label: "Pendamping Altvira", value: "Fajar Nugroho" },
      { label: "Hasil Pengujian", value: "LULUS / SESUAI (ACCEPTED)" },
    ],
    paragraphsBefore: [
      "Pengujian User Acceptance Test (UAT) untuk proyek Development cost of Enhancement & Optimization Website TIMTravel RMM telah dilaksanakan bersama pada lingkungan https://staging.altvira.id. Seluruh skenario di bawah ini telah diuji dan diverifikasi langsung oleh perwakilan Klien.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Fitur / Modul", widthRatio: 0.32 },
      { header: "Skenario Uji", widthRatio: 0.44 },
      { header: "Hasil Pengujian", widthRatio: 0.16, align: "center" },
    ],
    tableRows: [
      [
        "1",
        "Otentikasi & Hak Akses",
        "Pengujian alur masuk dan otorisasi peran pengguna",
        "SESUAI",
      ],
      [
        "2",
        "Transaksi Utama & Laporan",
        "Validasi perhitungan dan unduh dokumen PDF",
        "SESUAI",
      ],
    ],
    notesTitle: "Catatan Pengujian & Tindak Lanjut:",
    notes: [
      "Seluruh skenario pengujian telah dinyatakan SESUAI oleh penguji klien dan siap dilanjutkan ke tahap serah terima (BAST).",
      "Dokumen UAT ini sah sebagai lampiran teknis Berita Acara Serah Terima (BAST).",
    ],
    leftSignatureLabel: "Penguji Pihak Klien,",
    leftSignatureName: "Anni Nuraini, M.T. - Perwakilan Klien",
    rightSignatureLabel: "Pendamping Teknis Altvira,",
    rightSignatureName: "Fajar Nugroho - Lead Frontend Engineer",
    footerDocNumber: "UAT/ALT/2027/01/004",
  };
}

/**
 * 11. BAST (Berita Acara Serah Terima) — Normal (mereproduksi gejala b & h: "Referensi Dokumen UAT" & e-Meterai)
 */
export function buildFixtureBastNormal(): PdfDocumentSpec {
  return {
    docTitle: "BERITA ACARA SERAH TERIMA (BAST)",
    docSubtitle: "SERAH TERIMA HASIL PEKERJAAN PENGEMBANGAN SISTEM",
    docNumber: "BAST/ALT/2027/01/004",
    docDate: "2027-01-30",
    statusBadge: { text: "DITANDATANGANI SAH", variant: "success" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      "TIMTravel RMM",
      "Anni Nuraini, M.T.",
      "Area Pandu Raya, Villa Citra, Bantarjati Jl. Flamboyan F2 No. 12 Kota Bogor, Jawa Barat.",
    ],
    metaRows: [
      {
        label: "Proyek",
        value:
          "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
      },
      { label: "Referensi PO Klien", value: "PO-202611-8YQKXM" },
      { label: "Referensi SPK / Kontrak", value: "SPK/ALT/2026/11/001" },
      { label: "Referensi Dokumen UAT", value: "UAT/ALT/2027/01/004" },
      { label: "Masa Garansi Bug-Fix", value: "30 Hari Kalender" },
    ],
    paragraphsBefore: [
      "Pada hari ini, 30 Januari 2027, telah dilakukan serah terima penyelesaian pekerjaan proyek Development cost of Enhancement & Optimization Website TIMTravel RMM antara PIHAK PERTAMA (Altvira Technology) dan PIHAK KEDUA (TIMTravel RMM).",
      "Kedua belah pihak menyatakan bahwa seluruh ruang lingkup pekerjaan pengembangan perangkat lunak telah diselesaikan 100%, seluruh item pengujian UAT telah disetujui, dan seluruh artefak hasil pekerjaan diserahkan dengan baik. Masa garansi bug-fix berlaku selama 30 hari kalender terhitung sejak tanggal dokumen ini ditandatangani.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Objek / Komponen Serah Terima", widthRatio: 0.46 },
      { header: "Format / Media", widthRatio: 0.22 },
      { header: "Catatan Kelengkapan", widthRatio: 0.24 },
    ],
    tableRows: [
      [
        "1",
        "Source Code & Dokumentasi Teknis",
        "Git Repository + PDF",
        "Lengkap",
      ],
    ],
    hasMeterai: true,
    meteraiLabel: "TEMPAT E-METERAI Rp10.000",
    notesTitle: "Catatan & Ketentuan Serah Terima:",
    notes: [
      "Berita Acara Serah Terima (BAST) ini merupakan dokumen sah penyelesaian pekerjaan dan menjadi syarat penerbitan Invoice Pelunasan.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Penerima Hasil Pekerjaan (Klien),",
    leftSignatureName: "Anni Nuraini, M.T. - Perwakilan Klien",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "BAST/ALT/2027/01/004",
  };
}

/**
 * 12. PAYMENT APPROVAL (PA) — Normal
 */
export function buildFixturePaymentApprovalNormal(): PdfDocumentSpec {
  return buildPaymentApprovalPdfSpec({
    company: FIXTURE_COMPANY,
    requestNumber: "PA/ALT/2026/11/001",
    revisionNo: 0,
    requestDate: "2026-11-06",
    requesterName: "Fajar Nugroho (Lead Frontend Engineer)",
    projectName:
      "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
    expenseAccountName: "5-1101 - Beban Cloud, Hosting, & Domain Proyek",
    recipientName: "PT Awan Nusantara Cloud",
    recipientBankInfo: "Bank Mandiri 1240098765432 a.n. PT Awan Nusantara Cloud",
    purpose:
      "Pembayaran Sewa Cloud Server Staging & Produksi 3 Bulan (Ref PO: POP/ALT/2026/11/001)",
    amount: 4_500_000,
    status: "approved",
    approverName: "Nadia Putri - Finance & Accounting Lead",
    approvedAt: "2026-11-06T14:30:00.000Z",
    attachmentNames: ["invoice-awan-nusantara-nov2026.pdf"],
  });
}

/**
 * 13. JADWAL TERMIN / REKAP PROYEK — Normal
 */
export function buildFixtureScheduleNormal(): PdfDocumentSpec {
  return {
    docTitle: "JADWAL TERMIN PENAGIHAN PROYEK",
    docSubtitle:
      "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
    docNumber: "SCH/PRJ-001/2026",
    docDate: "2026-11-15",
    company: FIXTURE_COMPANY,
    recipientTitle: "Informasi Proyek & Klien:",
    recipientLines: [
      "Nama Proyek: Development cost of Enhancement & Optimization Website TIMTravel RMM (PRJ/ALT/2026/001)",
      "Klien: TIMTravel RMM",
      `Total Nilai Kontrak: ${formatDocRupiah(5_000_000)}`,
    ],
    tableColumns: [
      { header: "Termin", widthRatio: 0.16, align: "center" },
      { header: "Keterangan Termin", widthRatio: 0.44 },
      { header: "Porsi", widthRatio: 0.16, align: "center" },
      { header: "Nominal (IDR)", widthRatio: 0.24, align: "right" },
    ],
    tableRows: [
      ["Termin 1", "DP & Fondasi Sistem", "40%", formatDocRupiah(2_000_000)],
      [
        "Termin 2",
        "Pelunasan Serah Terima BAST",
        "60%",
        formatDocRupiah(3_000_000),
      ],
    ],
    summaryRows: [
      { label: "TOTAL NILAI TERMIN", value: formatDocRupiah(5_000_000) },
    ],
    terbilangAmount: 5_000_000,
    notes: [
      "Jadwal termin penagihan ini menjadi dasar penerbitan Berita Acara Kemajuan Pekerjaan (BAKP) dan Invoice resmi termin proyek.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira.",
    ],
    rightSignatureLabel: `Dikeluarkan Oleh, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "SCH/PRJ-001/2026",
  };
}

export const ALL_BASELINE_FIXTURES: Array<{
  slug: string;
  title: string;
  buildSpec: () => PdfDocumentSpec;
}> = [
  {
    slug: "01-invoice-normal",
    title: "Invoice (Normal)",
    buildSpec: buildFixtureInvoiceNormal,
  },
  {
    slug: "01b-invoice-extreme",
    title: "Invoice (Ekstrem 25 Baris & Desimal)",
    buildSpec: buildFixtureInvoiceExtreme,
  },
  {
    slug: "01c-invoice-minimum",
    title: "Invoice (Minimum)",
    buildSpec: buildFixtureInvoiceMinimum,
  },
  {
    slug: "02-kuitansi-normal",
    title: "Kuitansi Pembayaran",
    buildSpec: buildFixtureReceiptNormal,
  },
  {
    slug: "03-quotation-normal",
    title: "Quotation (Penawaran Harga)",
    buildSpec: buildFixtureQuotationNormal,
  },
  {
    slug: "04-sow-normal",
    title: "Statement of Work (SoW)",
    buildSpec: buildFixtureSowNormal,
  },
  {
    slug: "05-po-klien-normal",
    title: "PO Klien (Portal Pembeli)",
    buildSpec: buildFixtureClientPoNormal,
  },
  {
    slug: "06-po-vendor-normal",
    title: "PO Pembelian Vendor Internal",
    buildSpec: buildFixtureVendorPoNormal,
  },
  {
    slug: "07-bakp-normal",
    title: "Berita Acara Kemajuan Pekerjaan (BAKP)",
    buildSpec: buildFixtureBakpNormal,
  },
  {
    slug: "08-uat-normal",
    title: "User Acceptance Test (UAT) Checklist",
    buildSpec: buildFixtureUatNormal,
  },
  {
    slug: "09-bast-normal",
    title: "Berita Acara Serah Terima (BAST)",
    buildSpec: buildFixtureBastNormal,
  },
  {
    slug: "10-payment-approval-normal",
    title: "Form Persetujuan Pembayaran (PA)",
    buildSpec: buildFixturePaymentApprovalNormal,
  },
  {
    slug: "11-jadwal-termin-normal",
    title: "Jadwal Termin Proyek",
    buildSpec: buildFixtureScheduleNormal,
  },
];
