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
  // Akun Header Grup Utama
  "1-0000": { id: "ASET", en: "ASSETS" },
  "2-0000": { id: "LIABILITAS", en: "LIABILITIES" },
  "3-0000": { id: "EKUITAS", en: "EQUITY" },
  "4-0000": { id: "PENDAPATAN USAHA", en: "OPERATING REVENUE" },
  "5-0000": { id: "BEBAN LANGSUNG PROYEK", en: "PROJECT DIRECT EXPENSES" },
  "6-0000": { id: "BEBAN OPERASIONAL BERSAMA", en: "SHARED OPERATING EXPENSES" },

  // Aset Lancar (1-1xxx) & Tidak Lancar (1-2xxx)
  "1-1101": { id: "Kas Kecil", en: "Petty Cash" },
  "1-1102": { id: "Kas di Bank - Bank Jago", en: "Cash in Bank - Bank Jago" },
  "1-1201": { id: "Piutang Usaha", en: "Accounts Receivable" },
  "1-1202": { id: "Piutang Usaha - TIM Travel RMM", en: "Accounts Receivable - TIM Travel RMM" },
  "1-1203": { id: "Piutang Usaha - PT. RMM", en: "Accounts Receivable - PT. RMM" },
  "1-1210": { id: "Piutang Belum Ditagih", en: "Unbilled Receivables" },
  "1-1300": { id: "Jasa dalam Proses", en: "Work in Progress (WIP)" },
  "1-1310": { id: "Penagihan atas Kontrak", en: "Billings on Contracts" },
  "1-1401": { id: "Beban Dibayar di Muka", en: "Prepaid Expenses" },
  "1-2101": { id: "Peralatan & Perangkat Keras", en: "Equipment & Hardware" },
  "1-2102": { id: "Akumulasi Penyusutan Peralatan", en: "Accumulated Depreciation - Equipment" },

  // Liabilitas (2-1xxx)
  "2-1101": { id: "Utang Usaha Vendor", en: "Accounts Payable - Vendors" },
  "2-1201": { id: "Beban yang Masih Harus Dibayar", en: "Accrued Expenses Payable" },
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
  "4-1201": { id: "Pendapatan Pemeliharaan & Dukungan Teknis", en: "Maintenance & Technical Support Revenue" },

  // Beban Pokok & Beban Proyek (5-1xxx)
  "5-1101": { id: "Beban Cloud, Hosting, & Domain Proyek", en: "Project Cloud, Hosting & Domain Expense" },
  "5-1201": { id: "Beban Tenaga Ahli & Subkontraktor Proyek", en: "Project Subcontractor & Expert Expense" },
  "5-1301": { id: "Beban Lisensi & API Pihak Ketiga Proyek", en: "Project Third-Party License & API Expense" },
  "5-1401": { id: "Beban Bagi Hasil Proyek", en: "Project Profit Sharing Expense" },

  // Beban Operasional Umum (6-1xxx & 7-1xxx)
  "6-1101": { id: "Beban Langganan Alat Kerja Bersama", en: "Shared Tools Subscription Expense" },
  "6-1201": { id: "Beban Internet, Listrik, & Utilitas Kantor", en: "Office Internet, Electricity & Utilities Expense" },
  "6-1301": { id: "Beban Administrasi & Umum", en: "General & Administrative Expense" },
  "6-1401": { id: "Beban Penyusutan Peralatan", en: "Equipment Depreciation Expense" },
  "7-2101": { id: "Beban Pajak Final atas Bunga", en: "Final Tax on Interest Expense" },
};

/**
 * Pemetaan Deskripsi Akun CoA Standar Bilingual
 */
export const COA_DESCRIPTION_MAP: Record<string, { id: string; en: string }> = {
  "1-0000": { id: "Kelompok Utama Aset", en: "Main Asset Group" },
  "2-0000": { id: "Kelompok Utama Liabilitas", en: "Main Liability Group" },
  "3-0000": { id: "Kelompok Utama Ekuitas", en: "Main Equity Group" },
  "4-0000": { id: "Kelompok Utama Pendapatan", en: "Main Revenue Group" },
  "5-0000": { id: "Biaya langsung pengerjaan proyek klien", en: "Direct cost for client project execution" },
  "6-0000": { id: "Biaya bersama yang dialokasikan proporsional ke proyek", en: "Shared costs proportionally allocated to projects" },
  "1-1101": { id: "Kas tunai operasional kecil", en: "Small operational cash on hand" },
  "1-1102": { id: "Rekening bank utama penerimaan klien & pembayaran vendor", en: "Primary bank account for client receipts & vendor payments" },
  "1-1201": { id: "Tagihan invoice termin/pelunasan yang belum dibayar klien", en: "Milestone/settlement invoices uncollected from clients" },
  "1-1202": { id: "Tagihan invoice termin/pelunasan yang belum dibayar klien", en: "Milestone/settlement invoices uncollected from clients" },
  "1-1203": { id: "Tagihan invoice termin/pelunasan yang belum dibayar klien", en: "Milestone/settlement invoices uncollected from clients" },
  "1-1210": { id: "Piutang akrual akhir periode untuk proyek 2 termin lintas tahun", en: "Period-end accrued receivable for cross-year multi-milestone projects" },
  "1-1300": { id: "Akun aset kontrak Progress Billing: akumulasi pendapatan dari progres penyelesaian", en: "Progress Billing contract asset: accumulated revenue from completion progress" },
  "1-1310": { id: "Akun kontra-aset Progress Billing (saldo kredit): akumulasi nilai termin yang ditagih", en: "Progress Billing contra-asset (credit balance): accumulated billed milestone value" },
  "1-1401": { id: "Sewa atau langganan tahunan dibayar di muka", en: "Prepaid annual rent or software subscriptions" },
  "1-2101": { id: "Laptop, server lokal, dan inventaris kerja", en: "Laptops, local servers, and working office inventory" },
  "1-2102": { id: "Kontra-aset penyusutan perangkat keras", en: "Contra-asset for hardware equipment depreciation" },
  "2-1101": { id: "Kewajiban atas pengajuan pembayaran/tagihan vendor yang telah disetujui", en: "Obligation for approved vendor payment requests/invoices" },
  "2-1201": { id: "Beban akrual akhir periode yang belum dibayar", en: "Period-end accrued expenses not yet paid" },
  "2-1301": { id: "Kewajiban pembagian laba kotor proyek yang telah difinalisasi", en: "Finalized project gross profit sharing liability" },
  "2-1401": { id: "Uang muka / pembayaran klien sebelum jasa diselesaikan (skenario 1 & 2 termin)", en: "Client down payment / advances before service delivery (1 & 2 milestone scenarios)" },
  "2-1402": { id: "Uang muka / pembayaran klien sebelum jasa diselesaikan (skenario 1 & 2 termin)", en: "Client down payment / advances before service delivery (1 & 2 milestone scenarios)" },
  "2-1501": { id: "Dinonaktifkan secara default karena Altvira belum PKP (BR-22)", en: "Disabled by default as Altvira is not yet PKP VAT-registered (BR-22)" },
  "3-1101": { id: "Modal awal entitas", en: "Initial equity capital of entity" },
  "3-1201": { id: "Akumulasi laba bersih periode-periode tertutup", en: "Accumulated net income from closed accounting periods" },
  "3-1301": { id: "Akun perantara penutupan periode", en: "Clearing account for period closing" },
  "4-1101": { id: "Pendapatan utama proyek software house Altvira", en: "Primary software development project revenue for Altvira" },
  "4-1201": { id: "Pendapatan kontrak dukungan pasca-garansi", en: "Post-warranty maintenance & technical support revenue" },
  "5-1101": { id: "Biaya server, domain, dan layanan cloud khusus proyek tertentu", en: "Server, domain, and cloud hosting expenses specific to projects" },
  "5-1201": { id: "Biaya tenaga lepas atau spesialis yang terkait langsung dengan satu proyek", en: "Direct subcontractor or external specialist expenses for projects" },
  "5-1301": { id: "Biaya aset font, plugin, atau komponen khusus proyek", en: "Third-party asset licenses, fonts, plugins, and API expenses" },
  "5-1401": { id: "Beban pembagian laba kotor proyek", en: "Project gross profit distribution expense" },
  "6-1101": { id: "Biaya repositori, desain kolaboratif, & produktivitas bersama", en: "Shared tools, code repository, and collaborative design subscriptions" },
  "6-1201": { id: "Biaya operasional rutin kantor bersama", en: "Office electricity, high-speed internet, and shared utilities" },
  "6-1301": { id: "Alat tulis, meterai, pengiriman dokumen, & biaya bank", en: "Office supplies, postage, duty stamps, and administrative bank fees" },
  "6-1401": { id: "Penyusutan bulanan perangkat keras", en: "Monthly depreciation expense for hardware equipment" },
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
  if (lang === "id") return account.name;

  // Fallback translasi pola nama akun untuk akun dengan imbuhan dinamis
  let res = account.name;
  res = res.replace(/Kas Kecil Operasional/gi, "Operational Petty Cash");
  res = res.replace(/Kas Kecil/gi, "Petty Cash");
  res = res.replace(/Kas di Bank/gi, "Cash in Bank");
  res = res.replace(/Bank Operasional Utama Altvira/gi, "Main Operational Bank - Altvira");
  res = res.replace(/Piutang Usaha/gi, "Accounts Receivable");
  res = res.replace(/Piutang Belum Ditagih/gi, "Unbilled Receivables");
  res = res.replace(/Pendapatan Diterima di Muka/gi, "Unearned Revenue");
  res = res.replace(/Utang Usaha/gi, "Accounts Payable");
  res = res.replace(/Modal Disetor/gi, "Paid-in Capital");
  res = res.replace(/Laba Ditahan/gi, "Retained Earnings");
  res = res.replace(/ASET/g, "ASSETS");
  res = res.replace(/LIABILITAS/g, "LIABILITIES");
  res = res.replace(/EKUITAS/g, "EQUITY");
  res = res.replace(/PENDAPATAN USAHA/g, "OPERATING REVENUE");
  res = res.replace(/BEBAN LANGSUNG PROYEK/g, "PROJECT DIRECT EXPENSES");
  res = res.replace(/BEBAN OPERASIONAL BERSAMA/g, "SHARED OPERATING EXPENSES");
  return res;
}

/**
 * Mengembalikan deskripsi akun yang sesuai dengan bahasa aktif.
 */
export function getLocalizedAccountDescription(
  code: string | null | undefined,
  description: string | null | undefined,
  lang: "id" | "en",
): string {
  if (code && COA_DESCRIPTION_MAP[code]) {
    return lang === "en" ? COA_DESCRIPTION_MAP[code].en : COA_DESCRIPTION_MAP[code].id;
  }
  if (!description) return "";
  if (lang === "id") return description;

  let res = description;
  res = res.replace(/Kelompok Utama Aset/gi, "Main Asset Group");
  res = res.replace(/Kelompok Utama Liabilitas/gi, "Main Liability Group");
  res = res.replace(/Kelompok Utama Ekuitas/gi, "Main Equity Group");
  res = res.replace(/Kelompok Utama Pendapatan/gi, "Main Revenue Group");
  res = res.replace(/Kas tunai operasional kecil/gi, "Small operational cash on hand");
  res = res.replace(/Rekening bank utama penerimaan klien & pembayaran vendor/gi, "Primary bank account for client receipts & vendor payments");
  res = res.replace(/tagihan invoice termin\/pelunasan yang belum dibayar klien/gi, "milestone/settlement invoices uncollected from clients");
  res = res.replace(/tagihan invoice termin\/pelunasan yang belum/gi, "milestone/settlement invoices uncollected");
  res = res.replace(/Piutang akrual akhir periode untuk proyek 2 termin lintas tahun/gi, "Period-end accrued receivable for cross-year multi-milestone projects");
  res = res.replace(/Piutang akrual akhir periode untuk proyek 2/gi, "Period-end accrued receivable for project 2");
  return res;
}

/**
 * Menerjemahkan kategori arus kas
 */
export function getLocalizedCashFlowCategory(
  cat: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!cat) return "-";
  const normalized = cat.toLowerCase().trim();
  if (normalized === "cash_equivalent") {
    return lang === "en" ? "Cash & Cash Equivalent" : "Setara Kas";
  }
  if (normalized === "operating") {
    return lang === "en" ? "Operating Activities" : "Aktivitas Operasi";
  }
  if (normalized === "investing") {
    return lang === "en" ? "Investing Activities" : "Aktivitas Investasi";
  }
  if (normalized === "financing") {
    return lang === "en" ? "Financing Activities" : "Aktivitas Pendanaan";
  }
  return cat;
}

/**
 * Menerjemahkan tipe akun CoA
 */
export function getLocalizedAccountType(
  type: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!type) return "-";
  const normalized = type.toLowerCase().trim();
  const map: Record<string, { id: string; en: string }> = {
    asset: { id: "Aset", en: "Asset" },
    contra_asset: { id: "Kontra-Aset", en: "Contra-Asset" },
    liability: { id: "Liabilitas", en: "Liability" },
    equity: { id: "Ekuitas", en: "Equity" },
    revenue: { id: "Pendapatan", en: "Revenue" },
    expense: { id: "Beban", en: "Expense" },
  };
  if (map[normalized]) {
    return lang === "en" ? map[normalized].en : map[normalized].id;
  }
  return type;
}

/**
 * Menerjemahkan metode pengakuan pendapatan
 */
export function getLocalizedRevenueMethod(
  method: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!method) return "-";
  if (method === "single_term_deferral") {
    return lang === "en"
      ? "Single Term (Unearned Revenue Deferral)"
      : "Satu Termin (Deferral Pendapatan Diterima di Muka)";
  }
  if (method === "two_term_accrual") {
    return lang === "en"
      ? "Two Terms (Year-End Accrual + Optional Reversing)"
      : "Dua Termin (Akrual Akhir Tahun + Pembalik Opsional)";
  }
  if (method === "progress_billing") {
    return lang === "en"
      ? "Progress Billing (≥ 3 Terms: In-Progress Services & Contract Billing)"
      : "Progress Billing (≥ 3 Termin: Jasa dalam Proses & Penagihan Kontrak)";
  }
  return method;
}

/**
 * Menerjemahkan saldo normal
 */
export function getLocalizedNormalBalance(
  balance: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!balance) return "-";
  const normalized = balance.toLowerCase().trim();
  if (normalized === "debit") return "Debit";
  if (normalized === "credit") return lang === "en" ? "Credit" : "Kredit";
  return balance;
}

/**
 * Menerjemahkan nama periode bulanan ("November 2026", "Agustus 2026")
 */
export function getLocalizedPeriodName(
  name: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!name) return "";
  if (lang === "id") return name;

  const monthMap: Record<string, string> = {
    Januari: "January",
    Februari: "February",
    Maret: "March",
    April: "April",
    Mei: "May",
    Juni: "June",
    Juli: "July",
    Agustus: "August",
    September: "September",
    Oktober: "October",
    November: "November",
    Desember: "December",
  };

  let res = name;
  for (const [idMonth, enMonth] of Object.entries(monthMap)) {
    res = res.replace(new RegExp(`\\b${idMonth}\\b`, "g"), enMonth);
  }
  return res;
}

/**
 * Menerjemahkan status periode
 */
export function getLocalizedPeriodStatus(
  status: string | null | undefined,
  lang: "id" | "en",
): string {
  if (status === "open") return lang === "en" ? "Open Period" : "Periode Terbuka";
  if (status === "closed") return lang === "en" ? "Closed Period" : "Periode Ditutup";
  return status ?? "";
}

/**
 * Menerjemahkan tanggal jurnal ke format lokal
 */
export function formatJournalDateI18n(
  val: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!val) return "-";
  const monthsId = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const monthsEn = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const parts = val.split("-");
  const y = parts[0];
  const mStr = parts[1];
  const d = parts[2];
  if (y && mStr && d) {
    const monthIdx = parseInt(mStr, 10) - 1;
    const m = lang === "en" ? (monthsEn[monthIdx] ?? mStr) : (monthsId[monthIdx] ?? mStr);
    return `${d}/${m}/${y}`;
  }
  return val;
}

/**
 * Menerjemahkan teks dinamis umum / data input saat mode English aktif
 */
export function translateDynamicText(
  text: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!text) return "";
  if (lang === "id") return text;

  let res = text;
  const directMap: Record<string, string> = {
    "Proyek": "Project",
    "Lunas": "Paid",
    "Direncanakan": "Planned",
    "Terkirim": "Sent",
    "Terverifikasi": "Verified",
    "Ditandatangani": "Signed",
    "Aktif": "Active",
    "Nonaktif": "Inactive",
    "Header": "Header",
    "Ya": "Yes",
    "Tidak": "No",
    "Semua Tipe Akun": "All Account Types",
    "Keterangan cakupan penawaran solusi atau layanan...": "Scope of solution or service offering...",
    "Belum ada pencatatan progres penyelesaian": "No completion progress recorded yet",
    "Catat progres pada akhir periode buku untuk mengakui pendapatan akrual sesuai capaian proyek.": "Record progress at the end of accounting period to recognize accrual revenue based on project completion.",
    "Jadwal Termin Penagihan (Total 100%)": "Milestone Payment Schedule (Total 100%)",
    "Atur porsi dan jadwal termin penagihan hingga tepat 100%.": "Configure milestone payment portion and schedule up to exactly 100%.",
    "Pengakuan Pendapatan & Persentase Penyelesaian Akhir Periode": "Revenue Recognition & Period-End Completion Percentage",
    "Catat progres kumulatif akhir periode untuk pengakuan pendapatan otomatis.": "Record cumulative period-end progress for automated revenue recognition.",
    "Atur Ulang Termin": "Reset Milestones",
    "Catat Progres Penyelesaian": "Record Completion Progress",
    "Tanggal Pengakuan": "Recognition Date",
    "Progres Kumulatif": "Cumulative Progress",
    "Pendapatan Periode Ini": "Current Period Revenue",
    "Pendapatan Kumulatif": "Cumulative Revenue",
    "Nama Termin": "Milestone Name",
    "Porsi (%)": "Portion (%)",
    "Nominal": "Amount",
    "Kriteria Pencapaian": "Achievement Criteria",
  };

  if (directMap[res]) return directMap[res];
  return res;
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
