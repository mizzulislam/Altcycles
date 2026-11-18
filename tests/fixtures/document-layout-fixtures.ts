import { DEMO_COMPANY } from "@/lib/demo-seed";
import {
  formatDocDateLong,
  formatDocRupiah,
} from "@/lib/formatters";
import {
  buildBalanceSheetPdfSpec,
  buildCashFlowPdfSpec,
  buildClientPoPdfSpec,
  buildCompleteFinancialStatementsPdfSpec,
  buildGeneralLedgerPdfSpec,
  buildIncomeStatementPdfSpec,
  buildInvoicePdfSpec,
  buildJournalsPdfSpec,
  buildPaymentApprovalPdfSpec,
  buildReceiptPdfSpec,
  buildRetainedEarningsPdfSpec,
  buildTrialBalancePdfSpec,
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
 * 4b. KUITANSI — Ekstrem (Nama proyek >120 karakter, URL panjang, angka miliaran dengan desimal, 6 bullet panjang)
 */
export function buildFixtureReceiptExtreme(): PdfDocumentSpec {
  const spec = buildReceiptPdfSpec({
    company: FIXTURE_COMPANY,
    receiptNumber: "KW/ALT/2026/11/099",
    receiptDate: "2026-11-18",
    receivedFrom:
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk (Divisi Keuangan & Perbendaharaan Pusat)",
    invoiceNumber: "INV/ALT/2026/11/099",
    projectName:
      "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
    clientPoNumber: "PO-202611-EXT99K",
    servicePeriod: "Termin: Termin 1 (1 November 2026 – 31 Januari 2027)",
    paymentMethod:
      "Transfer RTGS Bank Jago · Rekening 103289122849 · Bukti: https://portal.altvira.id/verifikasi-pembayaran/kuitansi/2026/11/KW-ALT-2026-11-099?ref=rtgs8899001122334455",
    amount: 1_234_567_890.5,
    hasMeterai: true,
  });

  spec.notes = [
    ...(spec.notes ?? []),
    "Konfirmasi pelunasan ini telah tercatat secara otomatis pada Buku Besar dan Arus Kas sistem akuntansi Altcycles.",
    "Apabila terdapat selisih biaya transfer antarbank atau potongan pajak PPh Pasal 23, bukti potong resmi wajib diunggah melalui portal klien.",
    "Arsip digital kuitansi ini dapat diverifikasi keasliannya melalui tautan portal verifikasi resmi Altvira Technology.",
  ];

  return spec;
}

/**
 * 4c. KUITANSI — Minimum (Di bawah Rp5 juta tanpa e-Meterai, tanpa field opsional)
 */
export function buildFixtureReceiptMinimum(): PdfDocumentSpec {
  return buildReceiptPdfSpec({
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    receiptNumber: "KW/ALT/2026/11/002",
    receiptDate: "2026-11-12",
    receivedFrom: "CV Maju Bersama",
    invoiceNumber: "INV/ALT/2026/11/002",
    projectName: "Pemeliharaan Website",
    amount: 1_500_000,
    hasMeterai: false,
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
    recipientTitle: "Kepada Yth.",
    recipientLines: [
      "PT Sinar Niaga Digital",
      "Hendra Wijaya (Direktur Operasional)",
      "Jl. Jend. Sudirman Kav. 45, Jakarta Selatan",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: "1 November 2026" },
      { label: "Masa Berlaku s.d.", value: "15 November 2026" },
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
      { label: "Total Penawaran Harga", value: formatDocRupiah(120_000_000) },
    ],
    terbilangAmount: 120_000_000,
    notesTitle: "Ketentuan Penawaran Harga",
    notes: [
      "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).",
      "Penawaran harga ini sah sebagai dasar penerbitan Purchase Order (PO) resmi oleh Pihak Klien.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Oleh (Klien),",
    leftSignatureName: "Hendra Wijaya - Direktur Operasional",
    rightSignatureLabel: `Hormat kami, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "QT/ALT/2026/11/001",
  };
}

/**
 * 5b. QUOTATION — Ekstrem (25 item modul, nama proyek >120 karakter, URL >80 karakter, angka miliaran desimal, 6 bullet)
 */
export function buildFixtureQuotationExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => {
    const cost = i === 0 ? 49_382_715.62 : 49_382_715;
    return [
      String(i + 1),
      `Modul Enterprise Ke-${i + 1}: Pengembangan Arsitektur Layanan Terdistribusi, Integrasi API Gateway Keamanan Berlapis, serta Dashboard Pemantauan Transaksi Real-Time Lintas Wilayah`,
      formatDocRupiah(cost, true),
    ];
  });

  return {
    docTitle: "SURAT PENAWARAN HARGA (QUOTATION)",
    docSubtitle: "Masa Berlaku s.d. 15 Desember 2026",
    docNumber: "QT/ALT/2026/11/099",
    docDate: "2026-11-15",
    statusBadge: { text: "TERKIRIM", variant: "info" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Kepada Yth.",
    recipientLines: [
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk",
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA (Chief Information & Digital Transformation Officer)",
      "Kawasan Industri Jababeka Tahap VII Blok K-14 No. 22-25, Jl. Raya Industri Utama Cikarang Utara, Kabupaten Bekasi, Provinsi Jawa Barat 17530",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: "15 November 2026" },
      { label: "Masa Berlaku s.d.", value: "15 Desember 2026" },
      {
        label: "Judul Proyek",
        value:
          "Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
      },
      { label: "Estimasi Durasi", value: "36 Minggu Kalender" },
      { label: "Batas Sesi Revisi", value: "5x Sesi Mayor" },
      {
        label: "Tautan Dokumen Kerangka Acuan Kerja (TOR)",
        value:
          "https://portal.altvira.id/dokumen-tor/quotation/2026/11/QT-ALT-2026-11-099/spesifikasi-teknis-lengkap?token=998877665544332211",
      },
    ],
    paragraphsBefore: [
      "Ringkasan Kebutuhan Proyek: Penawaran komprehensif untuk perancangan, pengembangan, pengujian beban tinggi, serta implementasi penuh sistem ERP korporasi multi-entitas beserta migrasi data historis.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Modul / Lingkup Fitur Pekerjaan", widthRatio: 0.62 },
      { header: "Biaya (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: rows,
    summaryRows: [
      {
        label: "Total Penawaran Harga",
        value: formatDocRupiah(1_234_567_890.5, true),
      },
    ],
    terbilangAmount: 1_234_567_890.5,
    notesTitle: "Ketentuan Penawaran Harga",
    notes: [
      "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).",
      "Skema pembayaran dilakukan secara bertahap sesuai pencapaian milestone pada Surat Perintah Kerja (SPK) yang disepakati kedua belah pihak.",
      "Penawaran harga ini berlaku selama 30 hari kalender sejak tanggal diterbitkan dan dapat diperpanjang melalui konfirmasi tertulis.",
      "Biaya lisensi pihak ketiga, penyewaan cloud server produksi, dan sertifikat SSL korporasi mengikuti rincian pada lampiran spesifikasi.",
      "Penawaran harga ini sah sebagai dasar penerbitan Purchase Order (PO) resmi oleh Pihak Klien.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Oleh (Klien),",
    leftSignatureName:
      "Prof. Dr. Ir. Hendrawan Suryaningrat - Chief Information Officer",
    rightSignatureLabel: `Hormat kami, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "QT/ALT/2026/11/099",
  };
}

/**
 * 5c. QUOTATION — Minimum (1 item pendek, tanpa catatan/paragraf opsional)
 */
export function buildFixtureQuotationMinimum(): PdfDocumentSpec {
  return {
    docTitle: "SURAT PENAWARAN HARGA (QUOTATION)",
    docSubtitle: "Masa Berlaku s.d. 24 November 2026",
    docNumber: "QT/ALT/2026/11/002",
    docDate: "2026-11-10",
    statusBadge: { text: "DRAF", variant: "neutral" },
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    recipientTitle: "Kepada Yth.",
    recipientLines: ["CV Maju Bersama", "-"],
    metaRows: [
      { label: "Tanggal Terbit", value: "10 November 2026" },
      { label: "Masa Berlaku s.d.", value: "24 November 2026" },
      { label: "Judul Proyek", value: "Pemeliharaan Website" },
      { label: "Estimasi Durasi", value: "4 Minggu Kalender" },
      { label: "Batas Sesi Revisi", value: "1x Sesi" },
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Modul / Lingkup Fitur Pekerjaan", widthRatio: 0.62 },
      { header: "Biaya (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: [["1", "Pemeliharaan Rutin Bulanan", formatDocRupiah(1_500_000)]],
    summaryRows: [
      { label: "Total Penawaran Harga", value: formatDocRupiah(1_500_000) },
    ],
    terbilangAmount: 1_500_000,
    leftSignatureLabel: "Disetujui Oleh (Klien),",
    leftSignatureName: "CV Maju Bersama - Pihak Klien",
    rightSignatureLabel: `Hormat kami, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "QT/ALT/2026/11/002",
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
      { label: "Tanggal Terbit", value: "15 November 2026" },
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
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName: "Anni Nuraini, M.T. - Pihak Klien",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "SOW/ALT/2026/11/001",
  };
}

/**
 * 6b. SOW — Ekstrem (25 deliverable, nama proyek >120 karakter, URL >80 karakter, nilai miliaran desimal, 6 bullet)
 */
export function buildFixtureSowExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => [
    String(i + 1),
    `Ruang Lingkup Teknis & Deliverable Modul Ke-${i + 1}: Arsitektur Microservices, Integrasi Single Sign-On OAuth2/OIDC, dan Otomatisasi Pipeline CI/CD Multi-Cluster`,
    "Wajib Selesai 100% & Lulus UAT",
  ]);

  return {
    docTitle: "STATEMENT OF WORK (SOW)",
    docSubtitle: "RUANG LINGKUP PEKERJAAN & KRITERIA PENERIMAAN",
    docNumber: "SOW/ALT/2026/11/099",
    docDate: "2026-11-15",
    statusBadge: { text: "DISETUJUI SAH", variant: "success" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk",
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA",
      "Gedung Cyber 2 Tower Lantai 32 Suite A-F, Jl. H.R. Rasuna Said Blok X-5 Kav. 13, Kuningan Timur, Setiabudi, Jakarta Selatan 12950",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: "15 November 2026" },
      {
        label: "Kode & Nama Proyek",
        value:
          "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
      },
      { label: "Referensi PO Klien", value: "PO-202611-EXT99K" },
      {
        label: "Nilai Kontrak",
        value: formatDocRupiah(1_234_567_890.5, true),
      },
      {
        label: "Target Penyelesaian",
        value: formatDocDateLong("2027-06-30"),
      },
      {
        label: "Tautan Repositori Spesifikasi Teknis",
        value:
          "https://portal.altvira.id/projects/PRJ-ALT-2026-099/sow-specification/v2.4/architecture-blueprint?token=9988776655443322",
      },
      { label: "Status Pengesahan", value: "Telah Ditandatangani Sah" },
    ],
    paragraphsBefore: [
      "Dokumen Statement of Work (SOW) ini mengatur secara rinci ruang lingkup teknis, arsitektur sistem, kriteria penerimaan (acceptance criteria), hak kekayaan intelektual (source code beralih setelah pelunasan 100%), serta jadwal termin pelaksanaan pekerjaan proyek.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Deliverable / Ruang Lingkup Pekerjaan", widthRatio: 0.64 },
      { header: "Kriteria Penerimaan", widthRatio: 0.28 },
    ],
    tableRows: rows,
    notesTitle: "Ketentuan Pelaksanaan Pekerjaan:",
    notes: [
      "Perubahan di luar ruang lingkup yang telah disepakati akan diproses melalui mekanisme Change Request (CR) tertulis.",
      "Hak cipta kode sumber beralih sepenuhnya kepada Pihak Klien setelah pelunasan 100% nilai kontrak.",
      "Pengujian penerimaan pengguna (UAT) wajib dilaksanakan bersama pada lingkungan staging resmi sebelum serah terima BAST.",
      "Keterlambatan penyediaan akses API pihak ketiga oleh Klien akan menyesuaikan lini masa penyelesaian secara proporsional.",
      "Seluruh dokumentasi arsitektur dan panduan operasional diserahkan dalam format repositori Git dan dokumen PDF resmi.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName:
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA - Direktur Utama",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "SOW/ALT/2026/11/099",
  };
}

/**
 * 6c. SOW — Minimum (ringkas, tanpa field opsional)
 */
export function buildFixtureSowMinimum(): PdfDocumentSpec {
  return {
    docTitle: "STATEMENT OF WORK (SOW)",
    docSubtitle: "RUANG LINGKUP PEKERJAAN & KRITERIA PENERIMAAN",
    docNumber: "SOW/ALT/2026/11/002",
    docDate: "2026-11-10",
    statusBadge: { text: "DRAF REVIEW", variant: "neutral" },
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: ["CV Maju Bersama", "-"],
    metaRows: [
      { label: "Tanggal Terbit", value: "10 November 2026" },
      { label: "Kode & Nama Proyek", value: "PRJ/ALT/2026/002 - Pemeliharaan Website" },
      { label: "Nilai Kontrak", value: formatDocRupiah(1_500_000) },
      { label: "Target Penyelesaian", value: "10 Desember 2026" },
      { label: "Status Pengesahan", value: "Draf Review" },
    ],
    paragraphsBefore: [
      "Dokumen SOW ini mengatur ruang lingkup pemeliharaan rutin website CV Maju Bersama.",
    ],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName: "CV Maju Bersama - Pihak Klien",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "SOW/ALT/2026/11/002",
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
 * 7b. PO KLIEN — Ekstrem (25 item, nama proyek >120 karakter, URL >80 karakter, angka miliaran desimal, 6 bullet)
 */
export function buildFixtureClientPoExtreme(): PdfDocumentSpec {
  const items = Array.from({ length: 25 }, (_, i) => ({
    item: `Paket Implementasi Modul Enterprise Ke-${i + 1}: Integrasi Layanan Microservices, Keamanan OAuth2/OIDC, dan Sinkronisasi Database Multi-Region`,
    qty: 1,
    price: i === 0 ? 49_382_715.62 : 49_382_715,
  }));

  const spec = buildClientPoPdfSpec({
    company: FIXTURE_COMPANY,
    poNumber: "PO-202611-EXT99K",
    poDate: "2026-11-15",
    clientName: "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA",
    clientCompany:
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk",
    clientEmail: "hendrawan.suryaningrat@konsorsium-digital-nusantara.co.id",
    clientPhone: "021-88997766 / 0811-2233-4455",
    quotationReference: "QT/ALT/2026/11/099",
    statusLabel: "Terverifikasi Sah",
    projectLabel:
      "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
    items,
    poValue: 1_234_567_890.5,
  });

  spec.metaRows = [
    ...(spec.metaRows ?? []),
    {
      label: "Tautan Portal Verifikasi PO Pelanggan",
      value:
        "https://portal.altvira.id/buyer-portal/po-verification/2026/11/PO-202611-EXT99K?verify_hash=a1b2c3d4e5f60718293a",
    },
  ];
  spec.notes = [
    ...(spec.notes ?? []),
    "Penerbitan PO Klien ini mengikat secara komersial sesuai syarat dan ketentuan pada Quotation acuan.",
    "Jadwal pelaksanaan pekerjaan dimulai setelah pembayaran Termin 1 (Down Payment) diverifikasi oleh bagian keuangan.",
    "Perubahan spesifikasi di luar daftar item PO di atas wajib diajukan melalui adendum tertulis.",
    "Arsip digital PO Klien ini disimpan secara terenkripsi pada basis data Altcycles.",
  ];

  return spec;
}

/**
 * 7c. PO KLIEN — Minimum (1 item pendek, tanpa field opsional)
 */
export function buildFixtureClientPoMinimum(): PdfDocumentSpec {
  return buildClientPoPdfSpec({
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    poNumber: "PO-202611-MIN01",
    poDate: "2026-11-10",
    clientName: "CV Maju Bersama",
    statusLabel: "Diajukan",
    items: [
      {
        item: "Pemeliharaan Rutin Website",
        qty: 1,
        price: 1_500_000,
      },
    ],
    poValue: 1_500_000,
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
    recipientTitle: "Kepada Vendor / Pemasok",
    recipientLines: [
      "PT Awan Nusantara Cloud",
      "Jl. Gatot Subroto Kav. 32, Jakarta Selatan",
      "Kontak: Rizky Pratama · Telp: 021-5550101",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: "5 November 2026" },
      { label: "Nomor PO", value: "POP/ALT/2026/11/001" },
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
      { header: "No", widthRatio: 0.07, align: "center" },
      { header: "Deskripsi Barang / Jasa", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
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
      { label: "Total Nilai PO", value: formatDocRupiah(4_500_000) },
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
 * 8b. PO INTERNAL (Vendor) — Ekstrem (25 item, nama proyek >120 karakter, URL >80 karakter, angka miliaran desimal, 6 bullet)
 */
export function buildFixtureVendorPoExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => {
    const unitPrice = i === 0 ? 49_382_715.62 : 49_382_715;
    return [
      String(i + 1),
      `Pengadaan Lisensi & Infrastruktur Klaster Server Ke-${i + 1}: Dedicated Bare-Metal Node 64-Core, Penyimpanan NVMe Enterprise RAID-10, dan Lisensi Dukungan Teknis 24/7`,
      "1 Unit",
      formatDocRupiah(unitPrice, true),
      formatDocRupiah(unitPrice, true),
    ];
  });

  return {
    docTitle: "PURCHASE ORDER (PO PEMBELIAN VENDOR)",
    docSubtitle: "PESANAN PENGADAAN BARANG / JASA INTERNAL",
    docNumber: "POP/ALT/2026/11/099",
    docDate: "2026-11-15",
    statusBadge: { text: "DITERBITKAN", variant: "info" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Kepada Vendor / Pemasok",
    recipientLines: [
      "PT Awan Nusantara Cloud Infrastruktur Internasional Tbk",
      "Gedung Data Center Nusantara Tower B Lantai 12, Jl. Gatot Subroto Kav. 32-34, Kuningan Timur, Jakarta Selatan 12950",
      "Kontak: Ir. Rizky Pratama, M.T. · Telp: 021-5550101 / 0811-9988-7766",
    ],
    metaRows: [
      { label: "Tanggal Terbit", value: "15 November 2026" },
      { label: "Nomor PO", value: "POP/ALT/2026/11/099" },
      {
        label: "Proyek Terkait",
        value:
          "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
      },
      { label: "Alamat Pengiriman", value: FIXTURE_COMPANY.address },
      {
        label: "Kontak Penerima",
        value: `${FIXTURE_COMPANY.signer_name} (${FIXTURE_COMPANY.phone})`,
      },
      {
        label: "Tautan Portal Konfirmasi Pengiriman Vendor",
        value:
          "https://portal.altvira.id/vendor-procurement/po/2026/11/POP-ALT-2026-11-099/delivery-confirmation?vendor_token=77665544332211",
      },
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.07, align: "center" },
      { header: "Deskripsi Barang / Jasa", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ],
    tableRows: rows,
    summaryRows: [
      {
        label: "Total Nilai PO",
        value: formatDocRupiah(1_234_567_890.5, true),
      },
    ],
    terbilangAmount: 1_234_567_890.5,
    notes: [
      "Harap cantumkan Nomor PO ini pada setiap surat jalan, berita acara serah terima barang/jasa, dan tagihan/invoice vendor.",
      "Barang atau lisensi layanan yang diserahkan wajib memenuhi standar spesifikasi teknis dan SLA 99,95% sesuai kesepakatan.",
      "Pembayaran tagihan vendor diproses melalui mekanisme Form Payment Approval (PA) maksimal 14 hari kerja setelah BAST diverifikasi.",
      "Keterlambatan aktivasi atau pengiriman perangkat melewati batas waktu yang ditentukan dapat dikenakan penyesuaian nilai tagihan.",
      "Seluruh kredensial akses server produksi wajib dikirimkan melalui saluran terenkripsi kepada Kontak Penerima yang tertera.",
      "Dokumen PO ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Dibuat Oleh (Staff Pengadaan),",
    leftSignatureName: FIXTURE_COMPANY.signer_name,
    thirdSignatureLabel: "Disetujui Oleh (Finance / Admin),",
    thirdSignatureName: "Direktur Keuangan",
    rightSignatureLabel:
      "Diterima & Dikonfirmasi Oleh, PT Awan Nusantara Cloud Infrastruktur Internasional Tbk",
    rightSignatureName: "Ir. Rizky Pratama, M.T.",
    footerDocNumber: "POP/ALT/2026/11/099",
  };
}

/**
 * 8c. PO INTERNAL (Vendor) — Minimum (1 item pendek, tanpa catatan opsional)
 */
export function buildFixtureVendorPoMinimum(): PdfDocumentSpec {
  return {
    docTitle: "PURCHASE ORDER (PO PEMBELIAN VENDOR)",
    docSubtitle: "PESANAN PENGADAAN BARANG / JASA INTERNAL",
    docNumber: "POP/ALT/2026/11/002",
    docDate: "2026-11-10",
    statusBadge: { text: "DRAF", variant: "neutral" },
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    recipientTitle: "Kepada Vendor / Pemasok",
    recipientLines: ["CV Mitra Hosting", "-"],
    metaRows: [
      { label: "Tanggal Terbit", value: "10 November 2026" },
      { label: "Nomor PO", value: "POP/ALT/2026/11/002" },
      { label: "Proyek Terkait", value: "-" },
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.07, align: "center" },
      { header: "Deskripsi Barang / Jasa", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ],
    tableRows: [
      [
        "1",
        "Perpanjangan Domain .id (1 Tahun)",
        "1 Tahun",
        formatDocRupiah(250_000),
        formatDocRupiah(250_000),
      ],
    ],
    summaryRows: [
      { label: "Total Nilai PO", value: formatDocRupiah(250_000) },
    ],
    terbilangAmount: 250_000,
    leftSignatureLabel: "Dibuat Oleh (Staff Pengadaan),",
    leftSignatureName: FIXTURE_COMPANY.signer_name,
    thirdSignatureLabel: "Disetujui Oleh (Finance / Admin),",
    thirdSignatureName: "Direktur Keuangan",
    rightSignatureLabel: "Diterima Oleh, CV Mitra Hosting",
    rightSignatureName: "Perwakilan Vendor",
    footerDocNumber: "POP/ALT/2026/11/002",
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
      { label: "Tanggal Pemeriksaan", value: "20 November 2026" },
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
    leftSignatureName: "Anni Nuraini, M.T. - Pihak Klien",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "BAKP/ALT/2026/11/001",
  };
}

/**
 * 9b. BAKP — Ekstrem (25 deliverable, nama proyek >120 karakter, URL >80 karakter, nilai miliaran desimal, 6 bullet)
 */
export function buildFixtureBakpExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => [
    String(i + 1),
    `Komponen Deliverable Pemeriksaan Termin Ke-${i + 1}: Implementasi Layanan Terdistribusi, Audit Keamanan Penetrasi, dan Optimasi Kueri Transaksional`,
    "SELESAI 100%",
  ]);

  return {
    docTitle: "BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)",
    docSubtitle: "BUKTI CAPAIAN PROGRES TERMIN PEKERJAAN",
    docNumber: "BAKP/ALT/2026/11/099",
    docDate: "2026-11-20",
    statusBadge: { text: "DISETUJUI KLIEN", variant: "success" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk",
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA",
      "Gedung Cyber 2 Tower Lantai 32 Suite A-F, Jl. H.R. Rasuna Said Blok X-5 Kav. 13, Kuningan Timur, Setiabudi, Jakarta Selatan 12950",
    ],
    metaRows: [
      { label: "Tanggal Pemeriksaan", value: "20 November 2026" },
      {
        label: "Proyek",
        value:
          "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
      },
      { label: "Referensi PO Klien", value: "PO-202611-EXT99K" },
      { label: "Referensi SPK / Kontrak", value: "SPK/ALT/2026/11/099" },
      {
        label: "Termin Terkait",
        value: "Termin 2 (Integrasi Modul Inti & Sinkronisasi Multi-Region)",
      },
      { label: "Capaian Fisik", value: "75%" },
      {
        label: "Nilai Tagihan Termin",
        value: formatDocRupiah(1_234_567_890.5, true),
      },
      {
        label: "Tautan Bukti Artefak Pemeriksaan",
        value:
          "https://portal.altvira.id/projects/PRJ-ALT-2026-099/bakp-inspection-evidence/2026/11/BAKP-099?verify_token=1122334455667788",
      },
    ],
    paragraphsBefore: [
      "Pada tanggal 20 November 2026, telah dilakukan pemeriksaan bersama atas pencapaian pekerjaan termin kedua proyek dengan capaian fisik kumulatif sebesar 75%. Hasil pemeriksaan dinyatakan memenuhi syarat dan dapat ditagihkan melalui Invoice Termin resmi.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.1, align: "center" },
      { header: "Deliverable / Komponen Pekerjaan", widthRatio: 0.65 },
      { header: "Status Capaian", widthRatio: 0.25, align: "center" },
    ],
    tableRows: rows,
    notesTitle: "Catatan Pemeriksaan Capaian:",
    notes: [
      "Dokumen Berita Acara Kemajuan Pekerjaan (BAKP) ini sah sebagai dasar penagihan Invoice Termin.",
      "Seluruh komponen deliverable pada tabel di atas telah diverifikasi bersama oleh tim teknis Klien dan Altvira.",
      "Bukti tangkapan layar dan log pengujian terlampir pada portal repositori proyek.",
      "Pekerjaan tahap berikutnya dilanjutkan sesuai jadwal milestone pada SPK / Project Charter.",
      "Apabila terdapat penyesuaian minor, tim pengembang akan menindaklanjuti pada iterasi berjalan tanpa menghambat penagihan termin.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName:
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA - Direktur Utama",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "BAKP/ALT/2026/11/099",
  };
}

/**
 * 9c. BAKP — Minimum (1 deliverable pendek, tanpa field opsional)
 */
export function buildFixtureBakpMinimum(): PdfDocumentSpec {
  return {
    docTitle: "BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)",
    docSubtitle: "BUKTI CAPAIAN PROGRES TERMIN PEKERJAAN",
    docNumber: "BAKP/ALT/2026/11/002",
    docDate: "2026-11-10",
    statusBadge: { text: "DRAF", variant: "neutral" },
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: ["CV Maju Bersama", "-"],
    metaRows: [
      { label: "Tanggal Pemeriksaan", value: "10 November 2026" },
      { label: "Proyek", value: "PRJ/ALT/2026/002 - Pemeliharaan Website" },
      { label: "Termin Terkait", value: "Termin 1" },
      { label: "Capaian Fisik", value: "50%" },
      { label: "Nilai Tagihan Termin", value: formatDocRupiah(750_000) },
    ],
    paragraphsBefore: [
      "Pemeriksaan capaian pekerjaan Termin 1 sebesar 50% telah dilakukan bersama.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.1, align: "center" },
      { header: "Deliverable / Komponen Pekerjaan", widthRatio: 0.65 },
      { header: "Status Capaian", widthRatio: 0.25, align: "center" },
    ],
    tableRows: [["1", "Pembaruan Keamanan & Backup Database", "SELESAI"]],
    leftSignatureLabel: "Disetujui Pihak Klien,",
    leftSignatureName: "CV Maju Bersama - Pihak Klien",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "BAKP/ALT/2026/11/002",
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
      { label: "Tanggal Pengujian", value: "25 Januari 2027" },
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
    leftSignatureName: "Anni Nuraini, M.T. - Penguji Pihak Klien",
    rightSignatureLabel: "Pendamping Teknis Altvira,",
    rightSignatureName: "Fajar Nugroho - Pendamping Teknis Altvira",
    footerDocNumber: "UAT/ALT/2027/01/004",
  };
}

/**
 * 10b. UAT — Ekstrem (25 skenario uji, nama proyek >120 karakter, URL >80 karakter, 6 bullet)
 */
export function buildFixtureUatExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => [
    String(i + 1),
    `Modul Enterprise Ke-${i + 1}: Integrasi SSO & Transaksi Multi-Entitas`,
    `Verifikasi alur end-to-end skenario ke-${i + 1} termasuk validasi hak akses berbasis peran, pencatatan audit trail, dan ekspor laporan`,
    "SESUAI",
  ]);

  return {
    docTitle: "USER ACCEPTANCE TEST (UAT) CHECKLIST",
    docSubtitle: "BERITA ACARA PENGUJIAN PENERIMAAN PENGGUNA",
    docNumber: "UAT/ALT/2027/01/099",
    docDate: "2027-01-25",
    statusBadge: { text: "LULUS / SESUAI (ACCEPTED)", variant: "success" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Pihak Penguji (Klien):",
    recipientLines: [
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk",
      "Penguji: Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA",
      "Gedung Cyber 2 Tower Lantai 32 Suite A-F, Jl. H.R. Rasuna Said Blok X-5 Kav. 13, Kuningan Timur, Setiabudi, Jakarta Selatan 12950",
    ],
    metaRows: [
      { label: "Tanggal Pengujian", value: "25 Januari 2027" },
      {
        label: "Proyek",
        value:
          "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
      },
      { label: "Referensi PO Klien", value: "PO-202611-EXT99K" },
      { label: "Referensi SPK / Kontrak", value: "SPK/ALT/2026/11/099" },
      {
        label: "Lingkungan Uji (Staging)",
        value:
          "https://staging-enterprise-cluster.altvira.id/projects/konsorsium-nusantara/uat-environment/v2.4?session_verify=9988776655443322",
      },
      {
        label: "Penguji Pihak Klien",
        value: "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA",
      },
      { label: "Pendamping Altvira", value: "Fajar Nugroho" },
      { label: "Hasil Pengujian", value: "LULUS / SESUAI (ACCEPTED)" },
    ],
    paragraphsBefore: [
      "Pengujian User Acceptance Test (UAT) untuk proyek Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu telah dilaksanakan bersama pada lingkungan staging terdedikasi. Seluruh 25 skenario di bawah ini telah diuji dan diverifikasi langsung oleh perwakilan Klien.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Fitur / Modul", widthRatio: 0.32 },
      { header: "Skenario Uji", widthRatio: 0.44 },
      { header: "Hasil Pengujian", widthRatio: 0.16, align: "center" },
    ],
    tableRows: rows,
    notesTitle: "Catatan Pengujian & Tindak Lanjut:",
    notes: [
      "Seluruh skenario pengujian telah dinyatakan SESUAI oleh penguji klien dan siap dilanjutkan ke tahap serah terima (BAST).",
      "Pengujian beban (load testing) hingga 10.000 pengguna simultan telah lulus batas ambang waktu respons < 250 ms.",
      "Seluruh log aktivitas pengujian dan bukti tangkapan layar disimpan dalam arsip digital UAT.",
      "Konfigurasi lingkungan produksi telah disiapkan identik dengan lingkungan staging yang diuji.",
      "Masa garansi pemeliharaan bug-fix akan dimulai sejak tanggal penandatanganan BAST.",
      "Dokumen UAT ini sah sebagai lampiran teknis Berita Acara Serah Terima (BAST).",
    ],
    leftSignatureLabel: "Penguji Pihak Klien,",
    leftSignatureName:
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA - Penguji Pihak Klien",
    rightSignatureLabel: "Pendamping Teknis Altvira,",
    rightSignatureName: "Fajar Nugroho - Pendamping Teknis Altvira",
    footerDocNumber: "UAT/ALT/2027/01/099",
  };
}

/**
 * 10c. UAT — Minimum (1 skenario pendek, tanpa field opsional)
 */
export function buildFixtureUatMinimum(): PdfDocumentSpec {
  return {
    docTitle: "USER ACCEPTANCE TEST (UAT) CHECKLIST",
    docSubtitle: "BERITA ACARA PENGUJIAN PENERIMAAN PENGGUNA",
    docNumber: "UAT/ALT/2027/01/002",
    docDate: "2027-01-10",
    statusBadge: { text: "DALAM PENGUJIAN (PENDING)", variant: "neutral" },
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    recipientTitle: "Pihak Penguji (Klien):",
    recipientLines: ["CV Maju Bersama", "Penguji: Budi Santoso", "-"],
    metaRows: [
      { label: "Tanggal Pengujian", value: "10 Januari 2027" },
      { label: "Proyek", value: "PRJ/ALT/2026/002 - Pemeliharaan Website" },
      { label: "Lingkungan Uji (Staging)", value: "-" },
      { label: "Penguji Pihak Klien", value: "Budi Santoso" },
      { label: "Pendamping Altvira", value: "Fajar Nugroho" },
      { label: "Hasil Pengujian", value: "DALAM PENGUJIAN (PENDING)" },
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Fitur / Modul", widthRatio: 0.32 },
      { header: "Skenario Uji", widthRatio: 0.44 },
      { header: "Hasil Pengujian", widthRatio: 0.16, align: "center" },
    ],
    tableRows: [["1", "Halaman Utama", "Pemeriksaan tampilan responsif", "SESUAI"]],
    leftSignatureLabel: "Penguji Pihak Klien,",
    leftSignatureName: "Budi Santoso - Penguji Pihak Klien",
    rightSignatureLabel: "Pendamping Teknis Altvira,",
    rightSignatureName: "Fajar Nugroho - Pendamping Teknis Altvira",
    footerDocNumber: "UAT/ALT/2027/01/002",
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
      { label: "Tanggal Serah Terima", value: "30 Januari 2027" },
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
 * 11b. BAST — Ekstrem (25 artefak serah terima, nama proyek >120 karakter, URL >80 karakter, 6 bullet, e-Meterai)
 */
export function buildFixtureBastExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => [
    String(i + 1),
    `Artefak Serah Terima Modul Enterprise Ke-${i + 1}: Repositori Source Code, Skema Migrasi Database, dan Panduan Operasional`,
    "Git Repo + Dokumen PDF",
    "Lengkap & Terverifikasi",
  ]);

  return {
    docTitle: "BERITA ACARA SERAH TERIMA (BAST)",
    docSubtitle: "SERAH TERIMA HASIL PEKERJAAN PENGEMBANGAN SISTEM",
    docNumber: "BAST/ALT/2027/01/099",
    docDate: "2027-01-30",
    statusBadge: { text: "DITANDATANGANI SAH", variant: "success" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: [
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk",
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA",
      "Gedung Cyber 2 Tower Lantai 32 Suite A-F, Jl. H.R. Rasuna Said Blok X-5 Kav. 13, Kuningan Timur, Setiabudi, Jakarta Selatan 12950",
    ],
    metaRows: [
      { label: "Tanggal Serah Terima", value: "30 Januari 2027" },
      {
        label: "Proyek",
        value:
          "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
      },
      { label: "Referensi PO Klien", value: "PO-202611-EXT99K" },
      { label: "Referensi SPK / Kontrak", value: "SPK/ALT/2026/11/099" },
      { label: "Referensi Dokumen UAT", value: "UAT/ALT/2027/01/099" },
      { label: "Masa Garansi Bug-Fix", value: "90 Hari Kalender" },
      {
        label: "Tautan Repositori Serah Terima Akhir",
        value:
          "https://portal.altvira.id/projects/PRJ-ALT-2026-099/handover-package/2027/01/BAST-099?release_hash=abcdef1234567890",
      },
    ],
    paragraphsBefore: [
      "Pada hari ini, 30 Januari 2027, telah dilakukan serah terima penyelesaian pekerjaan proyek Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu antara PIHAK PERTAMA (Altvira Technology) dan PIHAK KEDUA (PT Konsorsium Transformasi Digital Nusantara Internasional Tbk).",
      "Kedua belah pihak menyatakan bahwa seluruh ruang lingkup pekerjaan pengembangan perangkat lunak telah diselesaikan 100%, seluruh item pengujian UAT telah disetujui, dan seluruh artefak hasil pekerjaan diserahkan dengan baik. Masa garansi bug-fix berlaku selama 90 hari kalender terhitung sejak tanggal dokumen ini ditandatangani.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Objek / Komponen Serah Terima", widthRatio: 0.46 },
      { header: "Format / Media", widthRatio: 0.22 },
      { header: "Catatan Kelengkapan", widthRatio: 0.24 },
    ],
    tableRows: rows,
    hasMeterai: true,
    meteraiLabel: "TEMPAT E-METERAI Rp10.000",
    notesTitle: "Catatan & Ketentuan Serah Terima:",
    notes: [
      "Berita Acara Serah Terima (BAST) ini merupakan dokumen sah penyelesaian pekerjaan dan menjadi syarat penerbitan Invoice Pelunasan.",
      "Hak kekayaan intelektual atas kode sumber beralih sepenuhnya kepada Pihak Klien setelah pelunasan tagihan akhir 100%.",
      "Selama masa garansi bug-fix 90 hari kalender, perbaikan cacat fungsi (bug) pada cakupan awal tidak dikenakan biaya tambahan.",
      "Permintaan penambahan fitur baru di luar cakupan BAST ini akan diatur melalui kontrak pemeliharaan atau pengembangan terpisah.",
      "Kredensial administrator utama (root/superadmin) telah diserahkan dan wajib segera diperbarui oleh tim IT Klien.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Penerima Hasil Pekerjaan (Klien),",
    leftSignatureName:
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA - Direktur Utama",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "BAST/ALT/2027/01/099",
  };
}

/**
 * 11c. BAST — Minimum (1 artefak pendek, dengan e-Meterai)
 */
export function buildFixtureBastMinimum(): PdfDocumentSpec {
  return {
    docTitle: "BERITA ACARA SERAH TERIMA (BAST)",
    docSubtitle: "SERAH TERIMA HASIL PEKERJAAN PENGEMBANGAN SISTEM",
    docNumber: "BAST/ALT/2027/01/002",
    docDate: "2027-01-15",
    statusBadge: { text: "DRAF", variant: "neutral" },
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    recipientTitle: "Pihak Klien (Pemberi Kerja):",
    recipientLines: ["CV Maju Bersama", "-"],
    metaRows: [
      { label: "Tanggal Serah Terima", value: "15 Januari 2027" },
      { label: "Proyek", value: "PRJ/ALT/2026/002 - Pemeliharaan Website" },
      { label: "Masa Garansi Bug-Fix", value: "14 Hari Kalender" },
    ],
    paragraphsBefore: [
      "Telah dilakukan serah terima hasil pekerjaan pemeliharaan website CV Maju Bersama dalam kondisi baik dan lengkap.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Objek / Komponen Serah Terima", widthRatio: 0.46 },
      { header: "Format / Media", widthRatio: 0.22 },
      { header: "Catatan Kelengkapan", widthRatio: 0.24 },
    ],
    tableRows: [["1", "Laporan Pemeliharaan & Backup", "PDF + ZIP", "Lengkap"]],
    hasMeterai: true,
    meteraiLabel: "TEMPAT E-METERAI Rp10.000",
    leftSignatureLabel: "Penerima Hasil Pekerjaan (Klien),",
    leftSignatureName: "CV Maju Bersama - Pihak Klien",
    rightSignatureLabel: `Pelaksana, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "BAST/ALT/2027/01/002",
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
 * 12b. PAYMENT APPROVAL (PA) — Ekstrem (25 rincian beban, nama proyek >120 karakter, URL >80 karakter, angka miliaran desimal, 6 bullet)
 */
export function buildFixturePaymentApprovalExtreme(): PdfDocumentSpec {
  const spec = buildPaymentApprovalPdfSpec({
    company: FIXTURE_COMPANY,
    requestNumber: "PA/ALT/2026/11/099",
    revisionNo: 2,
    requestDate: "2026-11-15",
    requesterName: "Ir. Fajar Nugroho, M.Kom. (Principal Cloud Architect)",
    projectName:
      "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
    expenseAccountName:
      "5-1101 - Beban Cloud, Hosting, Lisensi Infrastruktur, & Keamanan Proyek",
    recipientName: "PT Awan Nusantara Cloud Infrastruktur Internasional Tbk",
    recipientBankInfo:
      "Bank Mandiri Cabang KCP Gatot Subroto — 1240098765432 a.n. PT Awan Nusantara Cloud Infrastruktur Internasional Tbk",
    purpose:
      "Pelunasan Pengadaan Klaster Server Produksi Multi-Region & Lisensi Enterprise",
    amount: 1_234_567_890.5,
    status: "approved",
    approverName: "Nadia Putri - Finance & Accounting Lead",
    approvedAt: "2026-11-15T16:45:00.000Z",
    attachmentNames: [
      "invoice-awan-nusantara-cluster-nov2026.pdf",
      "bast-infrastruktur-node-01-25.pdf",
      "faktur-pajak-awan-nusantara-099.pdf",
    ],
  });

  spec.metaRows = [
    ...(spec.metaRows ?? []),
    {
      label: "Tautan Verifikasi Dokumen Tagihan Vendor",
      value:
        "https://portal.altvira.id/finance/payment-approval/2026/11/PA-ALT-2026-11-099/attachments?audit_token=998877665544332211",
    },
  ];
  spec.tableRows = Array.from({ length: 25 }, (_, i) => {
    const unitAmt = i === 0 ? 49_382_715.62 : 49_382_715;
    return [
      String(i + 1),
      `Pembayaran Komponen Klaster Infrastruktur Ke-${i + 1}: Dedicated Bare-Metal Node, Lisensi Keamanan, dan Replikasi Data`,
      "5-1101 - Beban Cloud & Infrastruktur",
      formatDocRupiah(unitAmt, true),
    ];
  });
  spec.notes = [
    ...(spec.notes ?? []),
    "Seluruh dokumen tagihan asli dan Berita Acara Serah Terima (BAST) vendor telah diverifikasi oleh bagian pengadaan.",
    "Pembayaran ditransfer langsung ke rekening resmi badan hukum vendor yang terdaftar pada master pemasok.",
    "Bukti transfer bank wajib diunggah kembali ke sistem maksimal 1x24 jam setelah eksekusi pembayaran.",
  ];

  return spec;
}

/**
 * 12c. PAYMENT APPROVAL (PA) — Minimum (1 baris pendek, status pending)
 */
export function buildFixturePaymentApprovalMinimum(): PdfDocumentSpec {
  return buildPaymentApprovalPdfSpec({
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    requestNumber: "PA/ALT/2026/11/002",
    revisionNo: 0,
    requestDate: "2026-11-10",
    requesterName: "Fajar Nugroho",
    projectName: null,
    expenseAccountName: "6-1201 - Beban Operasional Kantor",
    recipientName: "Toko Alat Tulis Jaya",
    recipientBankInfo: "BCA 8810293847 a.n. Toko Alat Tulis Jaya",
    purpose: "Pembelian Kertas A4 & Tinta Printer",
    amount: 350_000,
    status: "pending",
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
    statusBadge: { text: "JADWAL AKTIF", variant: "info" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Informasi Proyek & Klien:",
    recipientLines: [
      "TIMTravel RMM",
      "Anni Nuraini, M.T.",
      "Komplek City Resort, Ruko Hawai Blok B No. 61 Timur, Jakarta Barat",
    ],
    metaRows: [
      { label: "Tanggal Cetak", value: "15 November 2026" },
      {
        label: "Kode & Nama Proyek",
        value:
          "PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
      },
      { label: "Total Nilai Kontrak", value: formatDocRupiah(5_000_000) },
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
      { label: "Total Nilai Termin", value: formatDocRupiah(5_000_000) },
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

/**
 * 13b. JADWAL TERMIN — Ekstrem (25 termin bertahap, nama proyek >120 karakter, URL >80 karakter, angka miliaran desimal, 6 bullet)
 */
export function buildFixtureScheduleExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => {
    const amt = i === 0 ? 49_382_715.62 : 49_382_715;
    return [
      `Termin ${i + 1}`,
      `Capaian Fase Implementasi & Integrasi Modul Enterprise Ke-${i + 1} (Deliverable Terverifikasi BAKP)`,
      "4%",
      formatDocRupiah(amt, true),
    ];
  });

  return {
    docTitle: "JADWAL TERMIN PENAGIHAN PROYEK",
    docSubtitle:
      "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu",
    docNumber: "SCH/PRJ-099/2026",
    docDate: "2026-11-15",
    statusBadge: { text: "JADWAL AKTIF", variant: "info" },
    company: FIXTURE_COMPANY,
    recipientTitle: "Informasi Proyek & Klien:",
    recipientLines: [
      "PT Konsorsium Transformasi Digital Nusantara Internasional Tbk",
      "Prof. Dr. Ir. Hendrawan Suryaningrat, M.Sc., MBA",
      "Gedung Cyber 2 Tower Lantai 32 Suite A-F, Jl. H.R. Rasuna Said Blok X-5 Kav. 13, Kuningan Timur, Setiabudi, Jakarta Selatan 12950",
    ],
    metaRows: [
      { label: "Tanggal Cetak", value: "15 November 2026" },
      {
        label: "Kode & Nama Proyek",
        value:
          "PRJ/ALT/2026/099 - Pembangunan Ekosistem Enterprise Resource Planning (ERP) Terpadu Lintas Entitas Anak Perusahaan, Integrasi Payment Gateway Nasional, dan Data Warehouse Analitik Real-Time",
      },
      {
        label: "Total Nilai Kontrak",
        value: formatDocRupiah(1_234_567_890.5, true),
      },
      {
        label: "Tautan Portal Pemantauan Termin Klien",
        value:
          "https://portal.altvira.id/projects/PRJ-ALT-2026-099/milestone-billing-schedule?client_view=true&token=1234567890abcdef",
      },
    ],
    tableColumns: [
      { header: "Termin", widthRatio: 0.16, align: "center" },
      { header: "Keterangan Termin", widthRatio: 0.44 },
      { header: "Porsi", widthRatio: 0.16, align: "center" },
      { header: "Nominal (IDR)", widthRatio: 0.24, align: "right" },
    ],
    tableRows: rows,
    summaryRows: [
      {
        label: "Total Nilai Termin",
        value: formatDocRupiah(1_234_567_890.5, true),
      },
    ],
    terbilangAmount: 1_234_567_890.5,
    notes: [
      "Jadwal termin penagihan ini menjadi dasar penerbitan Berita Acara Kemajuan Pekerjaan (BAKP) dan Invoice resmi termin proyek.",
      "Setiap penagihan termin wajib dilampiri BAKP yang telah disetujui oleh perwakilan resmi Pihak Klien.",
      "Jatuh tempo pelunasan masing-masing invoice termin adalah 14 hari kalender sejak tanggal invoice diterbitkan.",
      "Perubahan jadwal atau porsi termin hanya berlaku apabila disepakati melalui adendum kontrak tertulis.",
      "Rekapitulasi jadwal termin ini diperbarui secara otomatis mengikuti status penagihan aktual pada sistem.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira.",
    ],
    rightSignatureLabel: `Dikeluarkan Oleh, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "SCH/PRJ-099/2026",
  };
}

/**
 * 13c. JADWAL TERMIN — Minimum (1 termin pembayaran penuh)
 */
export function buildFixtureScheduleMinimum(): PdfDocumentSpec {
  return {
    docTitle: "JADWAL TERMIN PENAGIHAN PROYEK",
    docSubtitle: "PRJ/ALT/2026/002 - Pemeliharaan Website",
    docNumber: "SCH/PRJ-002/2026",
    docDate: "2026-11-10",
    statusBadge: { text: "JADWAL AKTIF", variant: "info" },
    company: {
      ...FIXTURE_COMPANY,
      tax_id_number: null,
    },
    recipientTitle: "Informasi Proyek & Klien:",
    recipientLines: ["CV Maju Bersama", "-"],
    metaRows: [
      { label: "Tanggal Cetak", value: "10 November 2026" },
      { label: "Kode & Nama Proyek", value: "PRJ/ALT/2026/002 - Pemeliharaan Website" },
      { label: "Total Nilai Kontrak", value: formatDocRupiah(1_500_000) },
    ],
    tableColumns: [
      { header: "Termin", widthRatio: 0.16, align: "center" },
      { header: "Keterangan Termin", widthRatio: 0.44 },
      { header: "Porsi", widthRatio: 0.16, align: "center" },
      { header: "Nominal (IDR)", widthRatio: 0.24, align: "right" },
    ],
    tableRows: [["Termin 1", "Pembayaran Penuh (100%)", "100%", formatDocRupiah(1_500_000)]],
    summaryRows: [
      { label: "Total Nilai Termin", value: formatDocRupiah(1_500_000) },
    ],
    terbilangAmount: 1_500_000,
    rightSignatureLabel: `Dikeluarkan Oleh, ${FIXTURE_COMPANY.company_name}`,
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
    footerDocNumber: "SCH/PRJ-002/2026",
  };
}

export interface BaselineFixtureEntry {
  slug: string;
  title: string;
  buildSpec: () => PdfDocumentSpec;
}

export const ALL_BASELINE_FIXTURES: BaselineFixtureEntry[] = [
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
    title: "Kuitansi Pembayaran (Normal)",
    buildSpec: buildFixtureReceiptNormal,
  },
  {
    slug: "02b-kuitansi-extreme",
    title: "Kuitansi Pembayaran (Ekstrem)",
    buildSpec: buildFixtureReceiptExtreme,
  },
  {
    slug: "02c-kuitansi-minimum",
    title: "Kuitansi Pembayaran (Minimum)",
    buildSpec: buildFixtureReceiptMinimum,
  },
  {
    slug: "03-quotation-normal",
    title: "Quotation (Normal)",
    buildSpec: buildFixtureQuotationNormal,
  },
  {
    slug: "03b-quotation-extreme",
    title: "Quotation (Ekstrem 25 Item)",
    buildSpec: buildFixtureQuotationExtreme,
  },
  {
    slug: "03c-quotation-minimum",
    title: "Quotation (Minimum)",
    buildSpec: buildFixtureQuotationMinimum,
  },
  {
    slug: "04-sow-normal",
    title: "Statement of Work (SoW - Normal)",
    buildSpec: buildFixtureSowNormal,
  },
  {
    slug: "04b-sow-extreme",
    title: "Statement of Work (SoW - Ekstrem 25 Baris)",
    buildSpec: buildFixtureSowExtreme,
  },
  {
    slug: "04c-sow-minimum",
    title: "Statement of Work (SoW - Minimum)",
    buildSpec: buildFixtureSowMinimum,
  },
  {
    slug: "05-po-klien-normal",
    title: "PO Klien (Normal)",
    buildSpec: buildFixtureClientPoNormal,
  },
  {
    slug: "05b-po-klien-extreme",
    title: "PO Klien (Ekstrem 25 Item)",
    buildSpec: buildFixtureClientPoExtreme,
  },
  {
    slug: "05c-po-klien-minimum",
    title: "PO Klien (Minimum)",
    buildSpec: buildFixtureClientPoMinimum,
  },
  {
    slug: "06-po-vendor-normal",
    title: "PO Pembelian Vendor (Normal)",
    buildSpec: buildFixtureVendorPoNormal,
  },
  {
    slug: "06b-po-vendor-extreme",
    title: "PO Pembelian Vendor (Ekstrem 25 Item)",
    buildSpec: buildFixtureVendorPoExtreme,
  },
  {
    slug: "06c-po-vendor-minimum",
    title: "PO Pembelian Vendor (Minimum)",
    buildSpec: buildFixtureVendorPoMinimum,
  },
  {
    slug: "07-bakp-normal",
    title: "Berita Acara Kemajuan Pekerjaan (BAKP - Normal)",
    buildSpec: buildFixtureBakpNormal,
  },
  {
    slug: "07b-bakp-extreme",
    title: "Berita Acara Kemajuan Pekerjaan (BAKP - Ekstrem 25 Item)",
    buildSpec: buildFixtureBakpExtreme,
  },
  {
    slug: "07c-bakp-minimum",
    title: "Berita Acara Kemajuan Pekerjaan (BAKP - Minimum)",
    buildSpec: buildFixtureBakpMinimum,
  },
  {
    slug: "08-uat-normal",
    title: "User Acceptance Test (UAT - Normal)",
    buildSpec: buildFixtureUatNormal,
  },
  {
    slug: "08b-uat-extreme",
    title: "User Acceptance Test (UAT - Ekstrem 25 Skenario)",
    buildSpec: buildFixtureUatExtreme,
  },
  {
    slug: "08c-uat-minimum",
    title: "User Acceptance Test (UAT - Minimum)",
    buildSpec: buildFixtureUatMinimum,
  },
  {
    slug: "09-bast-normal",
    title: "Berita Acara Serah Terima (BAST - Normal)",
    buildSpec: buildFixtureBastNormal,
  },
  {
    slug: "09b-bast-extreme",
    title: "Berita Acara Serah Terima (BAST - Ekstrem 25 Artefak)",
    buildSpec: buildFixtureBastExtreme,
  },
  {
    slug: "09c-bast-minimum",
    title: "Berita Acara Serah Terima (BAST - Minimum)",
    buildSpec: buildFixtureBastMinimum,
  },
  {
    slug: "10-payment-approval-normal",
    title: "Form Persetujuan Pembayaran (PA - Normal)",
    buildSpec: buildFixturePaymentApprovalNormal,
  },
  {
    slug: "10b-payment-approval-extreme",
    title: "Form Persetujuan Pembayaran (PA - Ekstrem 25 Item)",
    buildSpec: buildFixturePaymentApprovalExtreme,
  },
  {
    slug: "10c-payment-approval-minimum",
    title: "Form Persetujuan Pembayaran (PA - Minimum)",
    buildSpec: buildFixturePaymentApprovalMinimum,
  },
  {
    slug: "11-jadwal-termin-normal",
    title: "Jadwal Termin Proyek (Normal)",
    buildSpec: buildFixtureScheduleNormal,
  },
  {
    slug: "11b-jadwal-termin-extreme",
    title: "Jadwal Termin Proyek (Ekstrem 25 Termin)",
    buildSpec: buildFixtureScheduleExtreme,
  },
  {
    slug: "11c-jadwal-termin-minimum",
    title: "Jadwal Termin Proyek (Minimum)",
    buildSpec: buildFixtureScheduleMinimum,
  },
];

/**
 * 12a. DAFTAR MASTER PROYEK DAN PENUGASAN TIM — Normal
 */
export function buildFixtureProjectsMasterNormal(): PdfDocumentSpec {
  return {
    docTitle: "DAFTAR MASTER PROYEK DAN PENUGASAN TIM",
    docSubtitle: "Total Proyek Ditampilkan: 5 proyek",
    docNumber: "PRJ-RPT/20261116",
    docDate: "2026-11-16",
    company: FIXTURE_COMPANY,
    tableColumns: [
      { header: "Kode", widthRatio: 0.16 },
      { header: "Nama Proyek", widthRatio: 0.30 },
      { header: "Periode", widthRatio: 0.20 },
      { header: "Nilai Kontrak", widthRatio: 0.16, align: "right" },
      { header: "Termin", widthRatio: 0.08, align: "center" },
      { header: "Status", widthRatio: 0.10 },
    ],
    tableRows: [
      [
        "PRJ/ALT/2026/001",
        "Website Enhancement & Optimization TIMTravel RMM",
        "01/11/2026 - 15/12/2026",
        "Rp2.000.600",
        "3",
        "Aktif",
      ],
      [
        "PRJ/ALT/2026/002",
        "ERP Keuangan Internal Altcycles Phase 2",
        "15/10/2026 - 31/01/2027",
        "Rp85.000.000",
        "4",
        "Aktif",
      ],
      [
        "PRJ/ALT/2026/003",
        "Aplikasi Point of Sale Cloud Multi-Cabang",
        "01/09/2026 - 30/11/2026",
        "Rp45.000.000",
        "2",
        "Selesai",
      ],
      [
        "PRJ/ALT/2026/004",
        "Infrastruktur Cloud CI/CD & Security Hardening",
        "01/11/2026 - 30/04/2027",
        "Rp120.000.000",
        "6",
        "Aktif",
      ],
      [
        "PRJ/ALT/2026/005",
        "Mobile App E-Commerce iOS & Android",
        "10/11/2026 - 28/02/2027",
        "Rp60.000.000",
        "3",
        "Perencanaan",
      ],
    ],
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
  };
}

export function buildFixtureProjectsMasterExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 30 }, (_, i) => [
    `PRJ/ALT/2026/${String(i + 1).padStart(3, "0")}`,
    `Proyek Transformasi Digital Enterprise Entitas ${i + 1}`,
    "01/11/2026 - 31/12/2027",
    formatDocRupiah((i + 1) * 15_000_000),
    String((i % 4) + 1),
    i % 2 === 0 ? "Aktif" : "Selesai",
  ]);
  return {
    ...buildFixtureProjectsMasterNormal(),
    tableRows: rows,
    docSubtitle: `Total Proyek Ditampilkan: ${rows.length} proyek`,
  };
}

export function buildFixtureProjectsMasterMinimum(): PdfDocumentSpec {
  return {
    ...buildFixtureProjectsMasterNormal(),
    tableRows: [],
    docSubtitle: "Total Proyek Ditampilkan: 0 proyek",
  };
}

/**
 * 13a. DAFTAR PERSETUJUAN PEMBAYARAN & PENCAIRAN DANA — Normal
 */
export function buildFixturePaymentApprovalListNormal(): PdfDocumentSpec {
  return {
    docTitle: "DAFTAR PERSETUJUAN PEMBAYARAN & PENCAIRAN DANA",
    docSubtitle: "Total Pengajuan Ditampilkan: 5 dokumen",
    docNumber: "PA-RPT/20261116",
    docDate: "2026-11-16",
    company: FIXTURE_COMPANY,
    orientation: "landscape",
    tableColumns: [
      { header: "Nomor PA", widthRatio: 0.16 },
      { header: "Pengaju", widthRatio: 0.16 },
      { header: "Penerima & Keperluan", widthRatio: 0.28 },
      { header: "Nominal", widthRatio: 0.16, align: "right" },
      { header: "Status", widthRatio: 0.10 },
      { header: "Tgl Bayar", widthRatio: 0.14, align: "center" },
    ],
    tableRows: [
      [
        "PA/ALT/2026/11/001",
        "Anni Nuraini",
        "PT Cipta Solusi - Server Hosting",
        "Rp7.500.000",
        "Disetujui",
        "10/11/2026",
      ],
      [
        "PA/ALT/2026/11/002",
        "Izzul Islam",
        "Mitra Mandiri - Pengadaan Lisensi Dev",
        "Rp3.200.000",
        "Disetujui",
        "12/11/2026",
      ],
      [
        "PA/ALT/2026/11/003",
        "Budi Santoso",
        "Operasional Kantor - Internet Fiber",
        "Rp1.500.000",
        "Pending",
        "-",
      ],
      [
        "PA/ALT/2026/11/004",
        "Siti Rahma",
        "Konsultan Hukum - Review Kontrak SPK",
        "Rp5.000.000",
        "Disetujui",
        "15/11/2026",
      ],
      [
        "PA/ALT/2026/11/005",
        "Ahmad Fauzi",
        "Reimbursement Transport & Akomodasi Klien",
        "Rp850.000",
        "Selesai",
        "16/11/2026",
      ],
    ],
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
  };
}

export function buildFixturePaymentApprovalListExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 30 }, (_, i) => [
    `PA/ALT/2026/11/${String(i + 1).padStart(3, "0")}`,
    `Pengaju Operasional ${i + 1}`,
    `Penerima Vendor Rekanan ${i + 1} - Keperluan Pekerjaan Teknis`,
    formatDocRupiah((i + 1) * 2_500_000),
    i % 3 === 0 ? "Disetujui" : i % 3 === 1 ? "Pending" : "Selesai",
    i % 2 === 0 ? "15/11/2026" : "-",
  ]);
  return {
    ...buildFixturePaymentApprovalListNormal(),
    tableRows: rows,
    docSubtitle: `Total Pengajuan Ditampilkan: ${rows.length} dokumen`,
  };
}

export function buildFixturePaymentApprovalListMinimum(): PdfDocumentSpec {
  return {
    ...buildFixturePaymentApprovalListNormal(),
    tableRows: [],
    docSubtitle: "Total Pengajuan Ditampilkan: 0 dokumen",
  };
}

/**
 * 14a. CADANGAN BUKU JURNAL AKUNTANSI ALTCYCLES — Normal
 */
export function buildFixtureBackupJurnalNormal(): PdfDocumentSpec {
  return {
    docTitle: "CADANGAN BUKU JURNAL AKUNTANSI ALTCYCLES",
    docSubtitle: "Total Entri Jurnal: 6 transaksi",
    docNumber: "BKP/20261116",
    docDate: "2026-11-16",
    company: FIXTURE_COMPANY,
    orientation: "landscape",
    tableColumns: [
      { header: "Tanggal", widthRatio: 0.12, align: "center" },
      { header: "No. Jurnal", widthRatio: 0.18, align: "left" },
      { header: "Akun Keuangan", widthRatio: 0.26, align: "left" },
      { header: "Keterangan", widthRatio: 0.24, align: "left" },
      { header: "Debit (IDR)", widthRatio: 0.10, align: "right" },
      { header: "Kredit (IDR)", widthRatio: 0.10, align: "right" },
    ],
    tableRows: [
      [
        "01/11/2026",
        "JV/2026/11/001",
        "1101 - Kas & Setara Kas",
        "Penerimaan DP Klien Termin 1",
        "Rp2.000.600",
        "-",
      ],
      [
        "01/11/2026",
        "JV/2026/11/001",
        "4101 - Pendapatan Jasa Web",
        "Penerimaan DP Klien Termin 1",
        "-",
        "Rp2.000.600",
      ],
      [
        "05/11/2026",
        "JV/2026/11/002",
        "5102 - Beban Hosting & Cloud",
        "Pembayaran Cloud Server AWS",
        "Rp1.450.000",
        "-",
      ],
      [
        "05/11/2026",
        "JV/2026/11/002",
        "1101 - Kas & Setara Kas",
        "Pembayaran Cloud Server AWS",
        "-",
        "Rp1.450.000",
      ],
      [
        "10/11/2026",
        "JV/2026/11/003",
        "1102 - Piutang Usaha",
        "Penagihan Invoice Termin 2",
        "Rp5.000.000",
        "-",
      ],
      [
        "10/11/2026",
        "JV/2026/11/003",
        "4101 - Pendapatan Jasa Web",
        "Penagihan Invoice Termin 2",
        "-",
        "Rp5.000.000",
      ],
    ],
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
  };
}

export function buildFixtureBackupJurnalExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 30 }, (_, i) => [
    "01/11/2026",
    `JV/2026/11/${String(i + 1).padStart(3, "0")}`,
    i % 2 === 0 ? "1101 - Kas & Setara Kas" : "4101 - Pendapatan Usaha",
    `Pencatatan Transaksi Operasional Ke-${i + 1}`,
    i % 2 === 0 ? formatDocRupiah((i + 1) * 1_000_000) : "-",
    i % 2 === 1 ? formatDocRupiah(i * 1_000_000) : "-",
  ]);
  return {
    ...buildFixtureBackupJurnalNormal(),
    tableRows: rows,
    docSubtitle: `Total Entri Jurnal: ${rows.length} transaksi`,
  };
}

export function buildFixtureBackupJurnalMinimum(): PdfDocumentSpec {
  return {
    ...buildFixtureBackupJurnalNormal(),
    tableRows: [],
    docSubtitle: "Total Entri Jurnal: 0 transaksi",
  };
}

/**
 * 15a. LAPORAN ANGGARAN VS REALISASI PROYEK — Normal
 */
export function buildFixtureBudgetingReportNormal(): PdfDocumentSpec {
  return {
    docTitle: "LAPORAN ANGGARAN VS REALISASI PROYEK",
    docSubtitle:
      "Proyek: PRJ/ALT/2026/001 - Development cost of Enhancement & Optimization Website TIMTravel RMM",
    docNumber: "BDG-PRJ-001/20261116",
    docDate: "2026-11-16",
    company: FIXTURE_COMPANY,
    orientation: "landscape",
    metaRows: [
      { label: "Total Pagu Anggaran", value: "Rp120.000.000" },
      { label: "Realisasi Terposting", value: "Rp45.000.000" },
      { label: "Sisa Anggaran", value: "Rp75.000.000" },
    ],
    tableColumns: [
      { header: "Akun Beban", widthRatio: 0.26 },
      { header: "Pagu", widthRatio: 0.16, align: "right" },
      { header: "Realisasi", widthRatio: 0.16, align: "right" },
      { header: "Sisa", widthRatio: 0.16, align: "right" },
      { header: "Serapan", widthRatio: 0.14, align: "center" },
      { header: "Status", widthRatio: 0.12, align: "center" },
    ],
    tableRows: [
      [
        "5101 - Biaya Tenaga Kerja Ahli Frontend",
        "Rp40.000.000",
        "Rp18.000.000",
        "Rp22.000.000",
        "45%",
        "Aman",
      ],
      [
        "5102 - Biaya Tenaga Kerja Ahli Backend",
        "Rp45.000.000",
        "Rp20.000.000",
        "Rp25.000.000",
        "44%",
        "Aman",
      ],
      [
        "5103 - Infrastruktur Cloud Server & DB",
        "Rp15.000.000",
        "Rp5.000.000",
        "Rp10.000.000",
        "33%",
        "Aman",
      ],
      [
        "5104 - Lisensi Software & API Provider",
        "Rp10.000.000",
        "Rp1.500.000",
        "Rp8.500.000",
        "15%",
        "Aman",
      ],
      [
        "5105 - Biaya QA Testing & Security Audit",
        "Rp10.000.000",
        "Rp500.000",
        "Rp9.500.000",
        "5%",
        "Aman",
      ],
    ],
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
  };
}

export function buildFixtureBudgetingReportExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => [
    `510${(i % 9) + 1} - Pos Anggaran Belanja Beban Proyek Ke-${i + 1}`,
    formatDocRupiah((i + 1) * 10_000_000),
    formatDocRupiah((i + 1) * 4_000_000),
    formatDocRupiah((i + 1) * 6_000_000),
    "40%",
    "Aman",
  ]);
  return {
    ...buildFixtureBudgetingReportNormal(),
    tableRows: rows,
  };
}

export function buildFixtureBudgetingReportMinimum(): PdfDocumentSpec {
  return {
    ...buildFixtureBudgetingReportNormal(),
    tableRows: [],
  };
}

/**
 * 16a. DAFTAR INVOICE PENAGIHAN & PIUTANG — Normal
 */
export function buildFixtureInvoicesListNormal(): PdfDocumentSpec {
  return {
    docTitle: "DAFTAR INVOICE PENAGIHAN & PIUTANG",
    docSubtitle: "Total Nilai Invoice: Rp25.000.000 | Sisa Piutang: Rp7.500.000",
    docNumber: "INV-RPT/20261116",
    docDate: "2026-11-16",
    company: FIXTURE_COMPANY,
    orientation: "landscape",
    tableColumns: [
      { header: "No. Invoice", widthRatio: 0.15 },
      { header: "Tanggal", widthRatio: 0.12 },
      { header: "Jatuh Tempo", widthRatio: 0.12 },
      { header: "Proyek / Klien", widthRatio: 0.24 },
      { header: "Total", widthRatio: 0.14, align: "right" },
      { header: "Sisa", widthRatio: 0.13, align: "right" },
      { header: "Status", widthRatio: 0.10 },
    ],
    tableRows: [
      [
        "INV/ALT/2026/11/001",
        "01/11/2026",
        "15/11/2026",
        "PRJ/ALT/2026/001 - TIMTravel RMM",
        "Rp2.000.600",
        "Rp0",
        "Lunas",
      ],
      [
        "INV/ALT/2026/11/002",
        "05/11/2026",
        "19/11/2026",
        "PRJ/ALT/2026/002 - PT Sinar Niaga",
        "Rp10.000.000",
        "Rp2.500.000",
        "Sebagian",
      ],
      [
        "INV/ALT/2026/11/003",
        "10/11/2026",
        "24/11/2026",
        "PRJ/ALT/2026/003 - CV Mitra Abadi",
        "Rp5.000.000",
        "Rp5.000.000",
        "Belum Lunas",
      ],
      [
        "INV/ALT/2026/11/004",
        "12/11/2026",
        "26/11/2026",
        "PRJ/ALT/2026/004 - PT Global Nusa",
        "Rp8.000.000",
        "Rp0",
        "Lunas",
      ],
    ],
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
  };
}

export function buildFixtureInvoicesListExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 30 }, (_, i) => [
    `INV/ALT/2026/11/${String(i + 1).padStart(3, "0")}`,
    "01/11/2026",
    "15/11/2026",
    `PRJ/ALT/2026/001 - Mitra Korporasi ${i + 1}`,
    formatDocRupiah((i + 1) * 3_000_000),
    i % 2 === 0 ? "Rp0" : formatDocRupiah((i + 1) * 1_000_000),
    i % 2 === 0 ? "Lunas" : "Belum Lunas",
  ]);
  return {
    ...buildFixtureInvoicesListNormal(),
    tableRows: rows,
  };
}

export function buildFixtureInvoicesListMinimum(): PdfDocumentSpec {
  return {
    ...buildFixtureInvoicesListNormal(),
    tableRows: [],
  };
}

/**
 * 17a. DAFTAR MASTER PELANGGAN/KLIEN — Normal
 */
export function buildFixtureCustomersMasterNormal(): PdfDocumentSpec {
  return {
    docTitle: "DAFTAR PELANGGAN/KLIEN",
    docSubtitle: "Rekapitulasi Klien & Pemegang Akun Portal Pembeli",
    docNumber: "REKAP-CST-20261116",
    docDate: "2026-11-16",
    company: FIXTURE_COMPANY,
    metaRows: [
      { label: "Total Pelanggan", value: "4 klien" },
      { label: "Status Klien", value: "4 Aktif, 0 Nonaktif" },
    ],
    tableColumns: [
      { header: "Kode", widthRatio: 0.10 },
      { header: "Nama Klien / Perusahaan", widthRatio: 0.30 },
      { header: "PIC & Jabatan", widthRatio: 0.36 },
      { header: "Kontak", widthRatio: 0.24 },
    ],
    tableRows: [
      [
        "CST-001",
        "PT Satu Dental Indonesia (TIMTravel RMM)",
        "Anni Nuraini, M.T. (Direktur)",
        "0812-8889-0011",
      ],
      [
        "CST-002",
        "PT Sinar Niaga Digital",
        "Hendra Wijaya (Operasional)",
        "0813-7778-9900",
      ],
      [
        "CST-003",
        "CV Mitra Abadi Makmur",
        "Siti Fatimah (Finance)",
        "0815-4433-2211",
      ],
      [
        "CST-004",
        "PT Global Prima Solusindo",
        "Bambang Hermanto (Direktur Utama)",
        "0811-9988-7766",
      ],
    ],
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
  };
}

export function buildFixtureCustomersMasterExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => [
    `CST-${String(i + 1).padStart(3, "0")}`,
    `PT Korporasi Mitra Strategis Nusantara ${i + 1}`,
    `Bpk. Pimpinan Eksekutif ${i + 1}`,
    `0812-${String(1000 + i)}-${String(5000 + i)}`,
  ]);
  return {
    ...buildFixtureCustomersMasterNormal(),
    tableRows: rows,
    metaRows: [
      { label: "Total Pelanggan", value: `${rows.length} klien` },
      { label: "Status Klien", value: `${rows.length} Aktif, 0 Nonaktif` },
    ],
  };
}

export function buildFixtureCustomersMasterMinimum(): PdfDocumentSpec {
  return {
    ...buildFixtureCustomersMasterNormal(),
    tableRows: [],
    metaRows: [
      { label: "Total Pelanggan", value: "0 klien" },
      { label: "Status Klien", value: "0 Aktif, 0 Nonaktif" },
    ],
  };
}

/**
 * 18a. DAFTAR MASTER VENDOR PEMASOK — Normal
 */
export function buildFixtureVendorsMasterNormal(): PdfDocumentSpec {
  return {
    docTitle: "DAFTAR MASTER VENDOR PEMASOK",
    docSubtitle: "Rekapitulasi Data Rekanan & Mitra Vendor Terdaftar",
    docNumber: "REKAP-VND-20261116",
    docDate: "2026-11-16",
    company: FIXTURE_COMPANY,
    metaRows: [
      { label: "Total Vendor", value: "4 vendor" },
      { label: "Status Vendor", value: "4 Aktif, 0 Nonaktif" },
    ],
    tableColumns: [
      { header: "Kode", widthRatio: 0.10 },
      { header: "Nama Vendor", widthRatio: 0.28 },
      { header: "PIC / Kontak", widthRatio: 0.35 },
      { header: "Bank & Rekening", widthRatio: 0.27 },
    ],
    tableRows: [
      [
        "VND-001",
        "PT Cipta Solusi Hosting",
        "Reza Permana (0812-1111-2222)",
        "8820192831\nBCA",
      ],
      [
        "VND-002",
        "CV Digital Kreasi Mandiri",
        "Diana Lestari (0813-3333-4444)",
        "133001928311\nMandiri",
      ],
      [
        "VND-003",
        "PT Net Solusi Indonesia",
        "Farhan Aziz (0815-5555-6666)",
        "0982319201\nBNI",
      ],
      [
        "VND-004",
        "Mitra Legal Prima",
        "Dewi Sartika (0818-7777-8888)",
        "103289122849\nBank Jago",
      ],
    ],
    rightSignatureName: `${FIXTURE_COMPANY.signer_name} - ${FIXTURE_COMPANY.signer_title}`,
  };
}

export function buildFixtureVendorsMasterExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 25 }, (_, i) => [
    `VND-${String(i + 1).padStart(3, "0")}`,
    `PT Rekanan Vendor Pemasok Layanan ${i + 1}`,
    `Kontak PIC Vendor ${i + 1}`,
    `144000${String(i + 1).padStart(4, "0")}\nBank Mandiri`,
  ]);
  return {
    ...buildFixtureVendorsMasterNormal(),
    tableRows: rows,
    metaRows: [
      { label: "Total Vendor", value: `${rows.length} vendor` },
      { label: "Status Vendor", value: `${rows.length} Aktif, 0 Nonaktif` },
    ],
  };
}

export function buildFixtureVendorsMasterMinimum(): PdfDocumentSpec {
  return {
    ...buildFixtureVendorsMasterNormal(),
    tableRows: [],
    metaRows: [
      { label: "Total Vendor", value: "0 vendor" },
      { label: "Status Vendor", value: "0 Aktif, 0 Nonaktif" },
    ],
  };
}

/**
 * 7 Fixture Dokumen Daftar & Laporan Master
 */
export const REPORT_LIST_FIXTURES: BaselineFixtureEntry[] = [
  {
    slug: "12-daftar-proyek-tim",
    title: "Daftar Proyek dan Penugasan Tim (Normal)",
    buildSpec: buildFixtureProjectsMasterNormal,
  },
  {
    slug: "12b-daftar-proyek-tim-extreme",
    title: "Daftar Proyek dan Penugasan Tim (Ekstrem)",
    buildSpec: buildFixtureProjectsMasterExtreme,
  },
  {
    slug: "12c-daftar-proyek-tim-minimum",
    title: "Daftar Proyek dan Penugasan Tim (Minimum)",
    buildSpec: buildFixtureProjectsMasterMinimum,
  },
  {
    slug: "13-daftar-payment-approval",
    title: "Daftar Persetujuan Pembayaran & Pencairan Dana (Normal)",
    buildSpec: buildFixturePaymentApprovalListNormal,
  },
  {
    slug: "13b-daftar-payment-approval-extreme",
    title: "Daftar Persetujuan Pembayaran & Pencairan Dana (Ekstrem)",
    buildSpec: buildFixturePaymentApprovalListExtreme,
  },
  {
    slug: "13c-daftar-payment-approval-minimum",
    title: "Daftar Persetujuan Pembayaran & Pencairan Dana (Minimum)",
    buildSpec: buildFixturePaymentApprovalListMinimum,
  },
  {
    slug: "14-backup-jurnal",
    title: "Cadangan Buku Jurnal Akuntansi Altcycles (Normal)",
    buildSpec: buildFixtureBackupJurnalNormal,
  },
  {
    slug: "14b-backup-jurnal-extreme",
    title: "Cadangan Buku Jurnal Akuntansi Altcycles (Ekstrem)",
    buildSpec: buildFixtureBackupJurnalExtreme,
  },
  {
    slug: "14c-backup-jurnal-minimum",
    title: "Cadangan Buku Jurnal Akuntansi Altcycles (Minimum)",
    buildSpec: buildFixtureBackupJurnalMinimum,
  },
  {
    slug: "15-laporan-budgeting",
    title: "Laporan Anggaran vs Realisasi Proyek (Normal)",
    buildSpec: buildFixtureBudgetingReportNormal,
  },
  {
    slug: "15b-laporan-budgeting-extreme",
    title: "Laporan Anggaran vs Realisasi Proyek (Ekstrem)",
    buildSpec: buildFixtureBudgetingReportExtreme,
  },
  {
    slug: "15c-laporan-budgeting-minimum",
    title: "Laporan Anggaran vs Realisasi Proyek (Minimum)",
    buildSpec: buildFixtureBudgetingReportMinimum,
  },
  {
    slug: "16-daftar-invoice",
    title: "Daftar Invoice Penagihan & Piutang (Normal)",
    buildSpec: buildFixtureInvoicesListNormal,
  },
  {
    slug: "16b-daftar-invoice-extreme",
    title: "Daftar Invoice Penagihan & Piutang (Ekstrem)",
    buildSpec: buildFixtureInvoicesListExtreme,
  },
  {
    slug: "16c-daftar-invoice-minimum",
    title: "Daftar Invoice Penagihan & Piutang (Minimum)",
    buildSpec: buildFixtureInvoicesListMinimum,
  },
  {
    slug: "17-daftar-klien",
    title: "Daftar Master Pelanggan/Klien (Normal)",
    buildSpec: buildFixtureCustomersMasterNormal,
  },
  {
    slug: "17b-daftar-klien-extreme",
    title: "Daftar Master Pelanggan/Klien (Ekstrem)",
    buildSpec: buildFixtureCustomersMasterExtreme,
  },
  {
    slug: "17c-daftar-klien-minimum",
    title: "Daftar Master Pelanggan/Klien (Minimum)",
    buildSpec: buildFixtureCustomersMasterMinimum,
  },
  {
    slug: "18-daftar-vendor",
    title: "Daftar Master Vendor Pemasok (Normal)",
    buildSpec: buildFixtureVendorsMasterNormal,
  },
  {
    slug: "18b-daftar-vendor-extreme",
    title: "Daftar Master Vendor Pemasok (Ekstrem)",
    buildSpec: buildFixtureVendorsMasterExtreme,
  },
  {
    slug: "18c-daftar-vendor-minimum",
    title: "Daftar Master Vendor Pemasok (Minimum)",
    buildSpec: buildFixtureVendorsMasterMinimum,
  },
];

/**
 * 7 Fixture Dokumen Daftar & Laporan Master Versi Normal (untuk render-check 7 dokumen utama)
 */
export const SEVEN_REPORT_NORMAL_FIXTURES: BaselineFixtureEntry[] = [
  REPORT_LIST_FIXTURES[0]!,
  REPORT_LIST_FIXTURES[3]!,
  REPORT_LIST_FIXTURES[6]!,
  REPORT_LIST_FIXTURES[9]!,
  REPORT_LIST_FIXTURES[12]!,
  REPORT_LIST_FIXTURES[15]!,
  REPORT_LIST_FIXTURES[18]!,
];

/**
 * 19. JURNAL UMUM — Normal, Ekstrem, Minimum
 */
export function buildFixtureJurnalUmumNormal(): PdfDocumentSpec {
  return buildJournalsPdfSpec({
    company: FIXTURE_COMPANY,
    isAdjusting: false,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    docDate: "2026-11-16",
    rows: [
      {
        date: "01/11/2026",
        description: "Kas Kecil",
        ref: "1-1101",
        debit: 2_000_600,
        credit: 0,
      },
      {
        date: "",
        description: "   Piutang Usaha - TIM Travel RMM",
        ref: "1-1202",
        debit: 0,
        credit: 2_000_600,
      },
      {
        date: "",
        description: "   (Penerimaan pembayaran Invoice INV/ALT/2026/11/002)",
        ref: "",
        debit: 0,
        credit: 0,
      },
      {
        date: "12/11/2026",
        description: "Kas di Bank - Bank Jago",
        ref: "1-1102",
        debit: 2_000_000,
        credit: 0,
      },
      {
        date: "",
        description: "   Pendapatan Diterima di Muka - Development",
        ref: "2-1402",
        debit: 0,
        credit: 2_000_000,
      },
      {
        date: "",
        description: "   (Penerimaan termin 1 dari PT RMM berupa uang muka development 40%. Belum diakui pendapatan karena pekerjaan belum selesai.)",
        ref: "",
        debit: 0,
        credit: 0,
      },
    ],
    totalDebit: 4_000_600,
    totalCredit: 4_000_600,
  });
}

export function buildFixtureJurnalUmumExtreme(): PdfDocumentSpec {
  const rows: Array<{ date: string; description: string; ref: string; debit: number; credit: number }> = [];
  for (let i = 0; i < 15; i++) {
    rows.push({
      date: "15/11/2026",
      description: "Kas di Bank - Bank Jago",
      ref: "1-1102",
      debit: 15_500_000,
      credit: 0,
    });
    rows.push({
      date: "",
      description: "   Pendapatan Jasa Web & Optimasi",
      ref: "4-1101",
      debit: 0,
      credit: 15_500_000,
    });
    rows.push({
      date: "",
      description: `   (Transaksi operasional sistem modul ke-${i + 1} dengan rincian biaya komprehensif berulang)`,
      ref: "",
      debit: 0,
      credit: 0,
    });
  }

  return buildJournalsPdfSpec({
    company: FIXTURE_COMPANY,
    isAdjusting: false,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    rows,
    totalDebit: 15 * 15_500_000,
    totalCredit: 15 * 15_500_000,
  });
}

export function buildFixtureJurnalUmumMinimum(): PdfDocumentSpec {
  return buildJournalsPdfSpec({
    company: FIXTURE_COMPANY,
    isAdjusting: false,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    rows: [],
    totalDebit: 0,
    totalCredit: 0,
  });
}

/**
 * 20. JURNAL PENYESUAIAN & KOREKSI — Normal, Ekstrem, Minimum
 */
export function buildFixtureJurnalAjpNormal(): PdfDocumentSpec {
  return buildJournalsPdfSpec({
    company: FIXTURE_COMPANY,
    isAdjusting: true,
    periodLabel: "Semua Periode s.d. 16/11/2026",
    docDate: "2026-11-16",
    rows: [
      {
        date: "15/11/2026",
        description: "Pendapatan Diterima di Muka",
        ref: "2-1401",
        debit: 2_000_600,
        credit: 0,
      },
      {
        date: "",
        description: "Piutang Belum Ditagih",
        ref: "1-1210",
        debit: 4_999_400,
        credit: 0,
      },
      {
        date: "",
        description: "   Pendapatan Jasa Web",
        ref: "4-1101",
        debit: 0,
        credit: 7_000_000,
      },
      {
        date: "",
        description: "   (Pengakuan pendapatan progres 100% dan akrual sisa termin proyek TIMTravel)",
        ref: "",
        debit: 0,
        credit: 0,
      },
    ],
    totalDebit: 7_000_000,
    totalCredit: 7_000_000,
  });
}

export function buildFixtureJurnalAjpExtreme(): PdfDocumentSpec {
  const rows: Array<{ date: string; description: string; ref: string; debit: number; credit: number }> = [];
  for (let i = 0; i < 15; i++) {
    rows.push({
      date: "31/12/2026",
      description: "Beban Cloud & Server",
      ref: "5-1101",
      debit: 5_250_000,
      credit: 0,
    });
    rows.push({
      date: "",
      description: "   Beban Dibayar di Muka",
      ref: "1-1402",
      debit: 0,
      credit: 5_250_000,
    });
    rows.push({
      date: "",
      description: `   (Amortisasi beban server hosting cloud multi-tenant periode bulan ke-${i + 1})`,
      ref: "",
      debit: 0,
      credit: 0,
    });
  }

  return buildJournalsPdfSpec({
    company: FIXTURE_COMPANY,
    isAdjusting: true,
    periodLabel: "01/01/2026 s.d. 31/12/2026",
    rows,
    totalDebit: 15 * 5_250_000,
    totalCredit: 15 * 5_250_000,
  });
}

export function buildFixtureJurnalAjpMinimum(): PdfDocumentSpec {
  return buildJournalsPdfSpec({
    company: FIXTURE_COMPANY,
    isAdjusting: true,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    rows: [],
    totalDebit: 0,
    totalCredit: 0,
  });
}

/**
 * 21. BUKU BESAR (GENERAL LEDGER) — Normal, Ekstrem, Minimum
 */
export function buildFixtureBukuBesarNormal(): PdfDocumentSpec {
  return buildGeneralLedgerPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 31/01/2027",
    docDate: "2026-11-16",
    isAllAccounts: true,
    accounts: [
      {
        code: "1-1101",
        name: "Kas Kecil",
        type: "Aset",
        normalBalance: "Debit",
        endingBalance: 2_000_600,
        rows: [
          {
            date: "01/11/2026",
            description: "Dana masuk Invoice INV/ALT/2026/11/002",
            ref: "JRN/012",
            debit: 2_000_600,
            credit: 0,
            runningBalance: 2_000_600,
          },
        ],
      },
      {
        code: "1-1102",
        name: "Kas di Bank - Bank Jago",
        type: "Aset",
        normalBalance: "Debit",
        endingBalance: 2_000_000,
        rows: [
          {
            date: "12/11/2026",
            description: "Penerimaan termin 1 dari PT RMM berupa uang muka development 40%",
            ref: "JRN/006",
            debit: 2_000_000,
            credit: 0,
            runningBalance: 2_000_000,
          },
        ],
      },
      {
        code: "4-1101",
        name: "Pendapatan Jasa Pengembangan Website",
        type: "Pendapatan",
        normalBalance: "Kredit",
        endingBalance: 7_000_000,
        rows: [
          {
            date: "15/11/2026",
            description: "Pendapatan jasa akrual proyek PRJ/ALT/2026/001",
            ref: "JRN/010",
            debit: 0,
            credit: 7_000_000,
            runningBalance: 7_000_000,
          },
        ],
      },
    ],
  });
}

export function buildFixtureBukuBesarExtreme(): PdfDocumentSpec {
  const accounts = Array.from({ length: 6 }, (_, accIdx) => {
    const accRows = Array.from({ length: 8 }, (_, rIdx) => ({
      date: "15/11/2026",
      description: `Rincian mutasi transaksi akun ke-${accIdx + 1} entri baris ke-${rIdx + 1}`,
      ref: `JRN/${String(accIdx * 10 + rIdx + 1).padStart(3, "0")}`,
      debit: rIdx % 2 === 0 ? 5_000_000 : 0,
      credit: rIdx % 2 === 1 ? 2_000_000 : 0,
      runningBalance: (rIdx + 1) * 3_000_000,
    }));
    return {
      code: `1-120${accIdx + 1}`,
      name: `Akun Mutasi Operasional Portofolio ${accIdx + 1}`,
      type: "Aset",
      normalBalance: "Debit",
      endingBalance: 24_000_000,
      rows: accRows,
    };
  });

  return buildGeneralLedgerPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/01/2026 s.d. 31/12/2026",
    isAllAccounts: true,
    accounts,
  });
}

export function buildFixtureBukuBesarMinimum(): PdfDocumentSpec {
  return buildGeneralLedgerPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    isAllAccounts: true,
    accounts: [
      {
        code: "1-1101",
        name: "Kas Kecil",
        type: "Aset",
        normalBalance: "Debit",
        endingBalance: 0,
        rows: [],
      },
    ],
  });
}

/**
 * 22. NERACA SALDO (TRIAL BALANCE) — Normal, Ekstrem, Minimum
 */
export function buildFixtureNeracaSaldoNormal(): PdfDocumentSpec {
  return buildTrialBalancePdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 31/01/2027",
    docDate: "2026-11-16",
    isAdjusted: true,
    isBalanced: true,
    rows: [
      { code: "1-1101", name: "Kas Kecil", debit: 2_000_600, credit: 0 },
      { code: "1-1102", name: "Kas di Bank - Bank Jago", debit: 6_369_589, credit: 0 },
      { code: "1-1210", name: "Piutang Belum Ditagih", debit: 4_999_400, credit: 0 },
      { code: "1-1402", name: "Beban Dibayar di Muka - Server", debit: 2_001_623, credit: 0 },
      { code: "2-1402", name: "Pendapatan Diterima di Muka - Development", debit: 0, credit: 2_000_000 },
      { code: "2-1403", name: "Pendapatan Diterima di Muka - Hosting", debit: 0, credit: 1_769_864 },
      { code: "4-1101", name: "Pendapatan Jasa Pengembangan Website", debit: 0, credit: 12_000_000 },
      { code: "4-1201", name: "Pendapatan Pemeliharaan & Dukungan Teknis", debit: 0, credit: 230_136 },
      { code: "5-1101", name: "Beban Cloud, Hosting, & Domain Proyek", debit: 644_097, credit: 0 },
      { code: "7-1101", name: "Pendapatan Bunga Bank", debit: 0, credit: 19_135 },
      { code: "7-2101", name: "Beban Pajak Final atas Bunga", debit: 3_826, credit: 0 },
    ],
    sumDebit: 16_019_135,
    sumCredit: 16_019_135,
  });
}

export function buildFixtureNeracaSaldoExtreme(): PdfDocumentSpec {
  const rows = Array.from({ length: 35 }, (_, i) => ({
    code: `${1 + Math.floor(i / 10)}-${1100 + i}`,
    name: `Akun Pembukuan Terintegrasi Ke-${i + 1}`,
    debit: i % 2 === 0 ? 50_000_000 : 0,
    credit: i % 2 === 1 ? 50_000_000 : 0,
  }));

  return buildTrialBalancePdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/01/2026 s.d. 31/12/2026",
    rows,
    sumDebit: 18 * 50_000_000,
    sumCredit: 17 * 50_000_000,
    isBalanced: false,
  });
}

export function buildFixtureNeracaSaldoMinimum(): PdfDocumentSpec {
  return buildTrialBalancePdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    rows: [],
    sumDebit: 0,
    sumCredit: 0,
  });
}

/**
 * 23. LAPORAN LABA RUGI BASIS AKRUAL — Normal, Ekstrem, Minimum
 */
export function buildFixtureLabaRugiNormal(): PdfDocumentSpec {
  return buildIncomeStatementPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 31/01/2027",
    docDate: "2026-11-16",
    revenueRows: [
      { label: "Pendapatan Jasa Pengembangan Website", amount: 7_000_000 },
    ],
    totalRevenue: 7_000_000,
    grossProfit: 7_000_000,
    netIncome: 7_000_000,
  });
}

export function buildFixtureLabaRugiExtreme(): PdfDocumentSpec {
  const rev = Array.from({ length: 12 }, (_, i) => ({
    label: `Pendapatan Kontrak Pengembangan Modul ${i + 1}`,
    amount: 100_000_000,
  }));
  const opex = Array.from({ length: 14 }, (_, i) => ({
    label: `Beban Operasional & Infrastruktur Server ${i + 1}`,
    amount: 25_000_000,
  }));
  return buildIncomeStatementPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/01/2026 s.d. 31/12/2026",
    revenueRows: rev,
    totalRevenue: 1_200_000_000,
    opexRows: opex,
    totalOpex: 350_000_000,
    grossProfit: 1_200_000_000,
    netIncome: 850_000_000,
  });
}

export function buildFixtureLabaRugiMinimum(): PdfDocumentSpec {
  return buildIncomeStatementPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    revenueRows: [],
    totalRevenue: 0,
    grossProfit: 0,
    netIncome: 0,
  });
}

/**
 * 24. LAPORAN PERUBAHAN EKUITAS — Normal, Ekstrem, Minimum
 */
export function buildFixturePerubahanEkuitasNormal(): PdfDocumentSpec {
  return buildRetainedEarningsPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 31/01/2027",
    docDate: "2026-11-16",
    rows: [
      { label: "Saldo Laba Ditahan Awal Periode", amount: 50_000_000 },
      { label: "Laba (Rugi) Bersih Periode Berjalan", amount: 7_000_000 },
      { label: "Dividen / Penarikan Modal Pemilik (Prive)", amount: 0 },
    ],
    endingRetainedEarnings: 57_000_000,
  });
}

export function buildFixturePerubahanEkuitasExtreme(): PdfDocumentSpec {
  return buildRetainedEarningsPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/01/2026 s.d. 31/12/2026",
    rows: [
      { label: "Modal Saham Ditempatkan dan Disetor Penuh", amount: 500_000_000 },
      { label: "Tambahan Modal Disetor (Agio Saham)", amount: 150_000_000 },
      { label: "Saldo Laba Ditahan Awal Tahun Buku", amount: 250_000_000 },
      { label: "Laba Bersih Komprehensif Berjalan", amount: 850_000_000 },
      { label: "Distribusi Dividen Tunai Pemegang Saham", amount: -200_000_000 },
    ],
    endingRetainedEarnings: 1_550_000_000,
  });
}

export function buildFixturePerubahanEkuitasMinimum(): PdfDocumentSpec {
  return buildRetainedEarningsPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    rows: [],
    endingRetainedEarnings: 0,
  });
}

/**
 * 25. LAPORAN POSISI KEUANGAN (NERACA) — Normal, Ekstrem, Minimum
 */
export function buildFixturePosisiKeuanganNormal(): PdfDocumentSpec {
  return buildBalanceSheetPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "Per 31 Januari 2027",
    docDate: "2026-11-16",
    isBalanced: true,
    currentAssetRows: [
      { label: "Kas dan Setara Kas", amount: 8_370_189 },
      { label: "Piutang Usaha", amount: 4_999_400 },
    ],
    totalCurrentAssets: 13_369_589,
    nonCurrentAssetRows: [
      { label: "Beban Server Dibayar di Muka", amount: 2_001_623 },
    ],
    totalNonCurrentAssets: 2_001_623,
    totalAssets: 15_371_212,
    currentLiabRows: [
      { label: "Pendapatan Diterima di Muka", amount: 3_769_864 },
    ],
    totalCurrentLiabilities: 3_769_864,
    nonCurrentLiabRows: [],
    totalNonCurrentLiabilities: 0,
    totalLiabilities: 3_769_864,
    equityRows: [
      { label: "Modal Pemilik / Disetor", amount: 4_601_348 },
      { label: "Laba Bersih Berjalan", amount: 7_000_000 },
    ],
    totalEquity: 11_601_348,
    totalLiabilitiesAndEquity: 15_371_212,
  });
}

export function buildFixturePosisiKeuanganExtreme(): PdfDocumentSpec {
  const assets = Array.from({ length: 15 }, (_, i) => ({
    label: `Aset Lancar Operasional Cabang ${i + 1}`,
    amount: 50_000_000,
  }));
  const liabs = Array.from({ length: 10 }, (_, i) => ({
    label: `Kewajiban Jangka Pendek Vendor ${i + 1}`,
    amount: 35_000_000,
  }));
  return buildBalanceSheetPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "Per 31 Desember 2026",
    currentAssetRows: assets,
    totalCurrentAssets: 750_000_000,
    nonCurrentAssetRows: [{ label: "Aset Tetap & Peralatan IT", amount: 250_000_000 }],
    totalNonCurrentAssets: 250_000_000,
    totalAssets: 1_000_000_000,
    currentLiabRows: liabs,
    totalCurrentLiabilities: 350_000_000,
    nonCurrentLiabRows: [],
    totalNonCurrentLiabilities: 0,
    totalLiabilities: 350_000_000,
    equityRows: [{ label: "Modal Saham & Saldo Laba", amount: 650_000_000 }],
    totalEquity: 650_000_000,
    totalLiabilitiesAndEquity: 1_000_000_000,
  });
}

export function buildFixturePosisiKeuanganMinimum(): PdfDocumentSpec {
  return buildBalanceSheetPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "Per 30 November 2026",
    currentAssetRows: [],
    totalCurrentAssets: 0,
    nonCurrentAssetRows: [],
    totalNonCurrentAssets: 0,
    totalAssets: 0,
    currentLiabRows: [],
    totalCurrentLiabilities: 0,
    nonCurrentLiabRows: [],
    totalNonCurrentLiabilities: 0,
    totalLiabilities: 0,
    equityRows: [],
    totalEquity: 0,
    totalLiabilitiesAndEquity: 0,
  });
}

/**
 * 26. LAPORAN ARUS KAS METODE LANGSUNG — Normal, Ekstrem, Minimum
 */
export function buildFixtureArusKasNormal(): PdfDocumentSpec {
  return buildCashFlowPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 31/01/2027",
    docDate: "2026-11-16",
    operatingRows: [
      { label: "Penerimaan Kas dari Pelanggan", amount: 4_000_600 },
      { label: "Pembayaran Kas untuk Beban Cloud & Server", amount: -644_097 },
    ],
    netOperating: 3_356_503,
    netCashChange: 3_356_503,
    beginningCash: 5_013_686,
    endingCash: 8_370_189,
  });
}

export function buildFixtureArusKasExtreme(): PdfDocumentSpec {
  const ops = Array.from({ length: 12 }, (_, i) => ({
    label: `Penerimaan Pembayaran Termin Proyek Kontrak ${i + 1}`,
    amount: 85_000_000,
  }));
  return buildCashFlowPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/01/2026 s.d. 31/12/2026",
    operatingRows: ops,
    netOperating: 1_020_000_000,
    investingRows: [{ label: "Pembelian Server & Perangkat Komputasi", amount: -150_000_000 }],
    netInvesting: -150_000_000,
    netCashChange: 870_000_000,
    beginningCash: 130_000_000,
    endingCash: 1_000_000_000,
  });
}

export function buildFixtureArusKasMinimum(): PdfDocumentSpec {
  return buildCashFlowPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    operatingRows: [],
    netOperating: 0,
    netCashChange: 0,
    beginningCash: 0,
    endingCash: 0,
  });
}

/**
 * 27. LAPORAN KEUANGAN LENGKAP — Normal, Ekstrem, Minimum
 */
export function buildFixtureLaporanLengkapNormal(): PdfDocumentSpec {
  return buildCompleteFinancialStatementsPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 31/01/2027",
    docDate: "2026-11-16",
    incomeStatementRows: [
      ["Pendapatan Jasa Web", formatDocRupiah(7_000_000)],
      ["Total Pendapatan", formatDocRupiah(7_000_000)],
      ["Laba Bersih Periode", formatDocRupiah(7_000_000)],
    ],
    retainedEarningsRows: [
      ["Saldo Laba Awal", formatDocRupiah(50_000_000)],
      ["Laba Bersih", formatDocRupiah(7_000_000)],
      ["Saldo Laba Akhir", formatDocRupiah(57_000_000)],
    ],
    balanceSheetRows: [
      ["Total Aset Lancar", formatDocRupiah(13_369_589)],
      ["Total Liabilitas", formatDocRupiah(3_769_864)],
      ["Total Ekuitas", formatDocRupiah(11_601_348)],
    ],
    cashFlowRows: [
      ["Arus Kas Bersih Operasi", formatDocRupiah(3_356_503)],
      ["Saldo Kas Akhir", formatDocRupiah(8_370_189)],
    ],
  });
}

export function buildFixtureLaporanLengkapExtreme(): PdfDocumentSpec {
  const rows10 = Array.from({ length: 10 }, (_, i) => [
    `Rincian Pos Komponen Laporan Ke-${i + 1}`,
    formatDocRupiah((i + 1) * 25_000_000),
  ]);
  return buildCompleteFinancialStatementsPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/01/2026 s.d. 31/12/2026",
    incomeStatementRows: rows10,
    retainedEarningsRows: rows10,
    balanceSheetRows: rows10,
    cashFlowRows: rows10,
  });
}

export function buildFixtureLaporanLengkapMinimum(): PdfDocumentSpec {
  return buildCompleteFinancialStatementsPdfSpec({
    company: FIXTURE_COMPANY,
    periodLabel: "01/11/2026 s.d. 30/11/2026",
    incomeStatementRows: [["-", "-"]],
    retainedEarningsRows: [["-", "-"]],
    balanceSheetRows: [["-", "-"]],
    cashFlowRows: [["-", "-"]],
  });
}

/**
 * Daftar Seluruh Fixture Dokumen Akuntansi & Laporan (Normal, Ekstrem, Minimum)
 */
export const ACCOUNTING_REPORT_FIXTURES: BaselineFixtureEntry[] = [
  { slug: "19-jurnal-umum", title: "Buku Jurnal Umum (Normal)", buildSpec: buildFixtureJurnalUmumNormal },
  { slug: "19b-jurnal-umum-extreme", title: "Buku Jurnal Umum (Ekstrem)", buildSpec: buildFixtureJurnalUmumExtreme },
  { slug: "19c-jurnal-umum-minimum", title: "Buku Jurnal Umum (Minimum)", buildSpec: buildFixtureJurnalUmumMinimum },
  { slug: "20-jurnal-penyesuaian", title: "Jurnal Penyesuaian & Koreksi (Normal)", buildSpec: buildFixtureJurnalAjpNormal },
  { slug: "20b-jurnal-penyesuaian-extreme", title: "Jurnal Penyesuaian & Koreksi (Ekstrem)", buildSpec: buildFixtureJurnalAjpExtreme },
  { slug: "20c-jurnal-penyesuaian-minimum", title: "Jurnal Penyesuaian & Koreksi (Minimum)", buildSpec: buildFixtureJurnalAjpMinimum },
  { slug: "21-buku-besar", title: "Buku Besar / General Ledger (Normal)", buildSpec: buildFixtureBukuBesarNormal },
  { slug: "21b-buku-besar-extreme", title: "Buku Besar / General Ledger (Ekstrem)", buildSpec: buildFixtureBukuBesarExtreme },
  { slug: "21c-buku-besar-minimum", title: "Buku Besar / General Ledger (Minimum)", buildSpec: buildFixtureBukuBesarMinimum },
  { slug: "22-neraca-saldo", title: "Neraca Saldo / Trial Balance (Normal)", buildSpec: buildFixtureNeracaSaldoNormal },
  { slug: "22b-neraca-saldo-extreme", title: "Neraca Saldo / Trial Balance (Ekstrem)", buildSpec: buildFixtureNeracaSaldoExtreme },
  { slug: "22c-neraca-saldo-minimum", title: "Neraca Saldo / Trial Balance (Minimum)", buildSpec: buildFixtureNeracaSaldoMinimum },
  { slug: "23-laporan-laba-rugi", title: "Laporan Laba Rugi Basis Akrual (Normal)", buildSpec: buildFixtureLabaRugiNormal },
  { slug: "23b-laporan-laba-rugi-extreme", title: "Laporan Laba Rugi Basis Akrual (Ekstrem)", buildSpec: buildFixtureLabaRugiExtreme },
  { slug: "23c-laporan-laba-rugi-minimum", title: "Laporan Laba Rugi Basis Akrual (Minimum)", buildSpec: buildFixtureLabaRugiMinimum },
  { slug: "24-laporan-perubahan-ekuitas", title: "Laporan Perubahan Ekuitas (Normal)", buildSpec: buildFixturePerubahanEkuitasNormal },
  { slug: "24b-laporan-perubahan-ekuitas-extreme", title: "Laporan Perubahan Ekuitas (Ekstrem)", buildSpec: buildFixturePerubahanEkuitasExtreme },
  { slug: "24c-laporan-perubahan-ekuitas-minimum", title: "Laporan Perubahan Ekuitas (Minimum)", buildSpec: buildFixturePerubahanEkuitasMinimum },
  { slug: "25-laporan-posisi-keuangan", title: "Laporan Posisi Keuangan / Neraca (Normal)", buildSpec: buildFixturePosisiKeuanganNormal },
  { slug: "25b-laporan-posisi-keuangan-extreme", title: "Laporan Posisi Keuangan / Neraca (Ekstrem)", buildSpec: buildFixturePosisiKeuanganExtreme },
  { slug: "25c-laporan-posisi-keuangan-minimum", title: "Laporan Posisi Keuangan / Neraca (Minimum)", buildSpec: buildFixturePosisiKeuanganMinimum },
  { slug: "26-laporan-arus-kas", title: "Laporan Arus Kas Metode Langsung (Normal)", buildSpec: buildFixtureArusKasNormal },
  { slug: "26b-laporan-arus-kas-extreme", title: "Laporan Arus Kas Metode Langsung (Ekstrem)", buildSpec: buildFixtureArusKasExtreme },
  { slug: "26c-laporan-arus-kas-minimum", title: "Laporan Arus Kas Metode Langsung (Minimum)", buildSpec: buildFixtureArusKasMinimum },
  { slug: "27-laporan-keuangan-lengkap", title: "Laporan Keuangan Lengkap (Normal)", buildSpec: buildFixtureLaporanLengkapNormal },
  { slug: "27b-laporan-keuangan-lengkap-extreme", title: "Laporan Keuangan Lengkap (Ekstrem)", buildSpec: buildFixtureLaporanLengkapExtreme },
  { slug: "27c-laporan-keuangan-lengkap-minimum", title: "Laporan Keuangan Lengkap (Minimum)", buildSpec: buildFixtureLaporanLengkapMinimum },
];

/**
 * 9 Fixture Dokumen Akuntansi Versi Normal (untuk render-check 9 dokumen utama)
 */
export const NINE_ACCOUNTING_NORMAL_FIXTURES: BaselineFixtureEntry[] = [
  ACCOUNTING_REPORT_FIXTURES[0]!,
  ACCOUNTING_REPORT_FIXTURES[3]!,
  ACCOUNTING_REPORT_FIXTURES[6]!,
  ACCOUNTING_REPORT_FIXTURES[9]!,
  ACCOUNTING_REPORT_FIXTURES[12]!,
  ACCOUNTING_REPORT_FIXTURES[15]!,
  ACCOUNTING_REPORT_FIXTURES[18]!,
  ACCOUNTING_REPORT_FIXTURES[21]!,
  ACCOUNTING_REPORT_FIXTURES[24]!,
];

