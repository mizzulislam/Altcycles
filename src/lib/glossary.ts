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
  "7-0000": { id: "PENDAPATAN & BEBAN LAIN-LAIN", en: "OTHER INCOME & EXPENSES" },

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
  "1-1402": { id: "Beban Dibayar di Muka - Server", en: "Prepaid Expenses - Server" },
  "1-2101": { id: "Peralatan & Perangkat Keras", en: "Equipment & Hardware" },
  "1-2102": { id: "Akumulasi Penyusutan Peralatan", en: "Accumulated Depreciation - Equipment" },

  // Liabilitas (2-1xxx)
  "2-1101": { id: "Utang Usaha Vendor", en: "Accounts Payable - Vendors" },
  "2-1201": { id: "Beban yang Masih Harus Dibayar", en: "Accrued Expenses Payable" },
  "2-1301": { id: "Utang Bagi Hasil Proyek", en: "Project Profit Sharing Payable" },
  "2-1401": { id: "Pendapatan Diterima di Muka", en: "Unearned Revenue" },
  "2-1402": { id: "Pendapatan Diterima di Muka - Development", en: "Unearned Revenue - Development" },
  "2-1403": { id: "Pendapatan Diterima di Muka - Hosting", en: "Unearned Revenue - Hosting" },
  "2-1501": { id: "Utang PPN Keluaran", en: "VAT Payable" },

  // Ekuitas (3-1xxx)
  "3-1101": { id: "Modal Disetor", en: "Paid-in Capital" },
  "3-1201": { id: "Laba Ditahan", en: "Retained Earnings" },
  "3-1301": { id: "Ikhtisar Laba Rugi", en: "Income Summary" },
  "3-1401": { id: "Prive Pemilik", en: "Owner's Drawings" },

  // Pendapatan (4-1xxx)
  "4-1101": { id: "Pendapatan Jasa Pengembangan Perangkat Lunak", en: "Software Development Service Revenue" },
  "4-1102": { id: "Pendapatan Jasa Pengembangan Website", en: "Website Development Service Revenue" },
  "4-1103": { id: "Pendapatan Jasa Hosting & Domain", en: "Hosting & Domain Service Revenue" },
  "4-1201": { id: "Pendapatan Pemeliharaan & Dukungan Teknis", en: "Maintenance & Technical Support Revenue" },

  // Beban Pokok & Beban Proyek (5-1xxx)
  "5-1101": { id: "Beban Cloud, Hosting, & Domain Proyek", en: "Project Cloud, Hosting & Domain Expense" },
  "5-1201": { id: "Beban Tenaga Ahli & Subkontraktor Proyek", en: "Project Subcontractor & Expert Expense" },
  "5-1301": { id: "Beban Lisensi & API Pihak Ketiga Proyek", en: "Project Third-Party License & API Expense" },
  "5-1401": { id: "Beban Bagi Hasil Proyek", en: "Project Profit Sharing Expense" },

  // Beban Operasional Umum (6-1xxx) & Lain-lain (7-xxxx)
  "6-1101": { id: "Beban Langganan Alat Kerja Bersama", en: "Shared Tools Subscription Expense" },
  "6-1201": { id: "Beban Internet, Listrik, & Utilitas Kantor", en: "Office Internet, Electricity & Utilities Expense" },
  "6-1301": { id: "Beban Administrasi & Umum", en: "General & Administrative Expense" },
  "6-1401": { id: "Beban Penyusutan Peralatan", en: "Equipment Depreciation Expense" },
  "7-1101": { id: "Pendapatan Bunga Bank", en: "Bank Interest Income" },
  "7-2101": { id: "Beban Pajak Final atas Bunga", en: "Final Tax on Interest Expense" },
  "7-2201": { id: "Beban Pajak Final Usaha", en: "Final Business Income Tax Expense" },
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
  "7-0000": { id: "Pendapatan dan beban non-operasional lainnya", en: "Other non-operating income and expenses" },
  "1-1101": { id: "Kas tunai operasional kecil", en: "Small operational cash on hand" },
  "1-1102": { id: "Rekening bank utama penerimaan klien & pembayaran vendor", en: "Primary bank account for client receipts & vendor payments" },
  "1-1201": { id: "Tagihan invoice termin/pelunasan yang belum dibayar klien", en: "Milestone/settlement invoices uncollected from clients" },
  "1-1202": { id: "Tagihan invoice termin/pelunasan yang belum dibayar klien", en: "Milestone/settlement invoices uncollected from clients" },
  "1-1203": { id: "Tagihan invoice termin/pelunasan yang belum dibayar klien", en: "Milestone/settlement invoices uncollected from clients" },
  "1-1210": { id: "Piutang akrual akhir periode untuk proyek 2 termin lintas tahun", en: "Period-end accrued receivable for cross-year multi-milestone projects" },
  "1-1300": { id: "Akun aset kontrak Progress Billing: akumulasi pendapatan dari progres penyelesaian", en: "Progress Billing contract asset: accumulated revenue from completion progress" },
  "1-1310": { id: "Akun kontra-aset Progress Billing (saldo kredit): akumulasi nilai termin yang ditagih", en: "Progress Billing contra-asset (credit balance): accumulated billed milestone value" },
  "1-1401": { id: "Sewa atau langganan tahunan dibayar di muka", en: "Prepaid annual rent or software subscriptions" },
  "1-1402": { id: "Sewa server atau infrastruktur cloud tahunan dibayar di muka", en: "Prepaid annual server or cloud infrastructure subscription" },
  "1-2101": { id: "Laptop, server lokal, dan inventaris kerja", en: "Laptops, local servers, and working office inventory" },
  "1-2102": { id: "Kontra-aset penyusutan perangkat keras", en: "Contra-asset for hardware equipment depreciation" },
  "2-1101": { id: "Kewajiban atas pengajuan pembayaran/tagihan vendor yang telah disetujui", en: "Obligation for approved vendor payment requests/invoices" },
  "2-1201": { id: "Beban akrual akhir periode yang belum dibayar", en: "Period-end accrued expenses not yet paid" },
  "2-1301": { id: "Kewajiban pembagian laba kotor proyek yang telah difinalisasi", en: "Finalized project gross profit sharing liability" },
  "2-1401": { id: "Uang muka / pembayaran klien sebelum jasa diselesaikan (skenario 1 & 2 termin)", en: "Client down payment / advances before service delivery (1 & 2 milestone scenarios)" },
  "2-1402": { id: "Uang muka pengembangan perangkat lunak sebelum jasa diselesaikan", en: "Client down payment for software development before service delivery" },
  "2-1403": { id: "Uang muka layanan hosting & domain yang diakui proporsional per periode", en: "Unearned hosting & domain revenue recognized proportionally over the service period" },
  "2-1501": { id: "Dinonaktifkan secara default karena Altvira belum PKP (BR-22)", en: "Disabled by default as Altvira is not yet PKP VAT-registered (BR-22)" },
  "3-1101": { id: "Modal awal entitas", en: "Initial equity capital of entity" },
  "3-1201": { id: "Akumulasi laba bersih periode-periode tertutup", en: "Accumulated net income from closed accounting periods" },
  "3-1301": { id: "Akun perantara penutupan periode", en: "Clearing account for period closing" },
  "3-1401": { id: "Penarikan modal / distribusi laba kepada pemilik", en: "Owner capital withdrawals / dividend distributions" },
  "4-1101": { id: "Pendapatan utama proyek software house Altvira", en: "Primary software development project revenue for Altvira" },
  "4-1102": { id: "Pendapatan jasa pengembangan website dan aplikasi web klien", en: "Website and web application development service revenue" },
  "4-1103": { id: "Pendapatan layanan pengelolaan hosting, server, dan domain klien", en: "Client hosting, server, and domain management service revenue" },
  "4-1201": { id: "Pendapatan kontrak dukungan pasca-garansi", en: "Post-warranty maintenance & technical support revenue" },
  "5-1101": { id: "Biaya server, domain, dan layanan cloud khusus proyek tertentu", en: "Server, domain, and cloud hosting expenses specific to projects" },
  "5-1201": { id: "Biaya tenaga lepas atau spesialis yang terkait langsung dengan satu proyek", en: "Direct subcontractor or external specialist expenses for projects" },
  "5-1301": { id: "Biaya aset font, plugin, atau komponen khusus proyek", en: "Third-party asset licenses, fonts, plugins, and API expenses" },
  "5-1401": { id: "Beban pembagian laba kotor proyek", en: "Project gross profit distribution expense" },
  "6-1101": { id: "Biaya repositori, desain kolaboratif, & produktivitas bersama", en: "Shared tools, code repository, and collaborative design subscriptions" },
  "6-1201": { id: "Biaya operasional rutin kantor bersama", en: "Office electricity, high-speed internet, and shared utilities" },
  "6-1301": { id: "Alat tulis, meterai, pengiriman dokumen, & biaya bank", en: "Office supplies, postage, duty stamps, and administrative bank fees" },
  "6-1401": { id: "Penyusutan bulanan perangkat keras", en: "Monthly depreciation expense for hardware equipment" },
  "7-1101": { id: "Pendapatan bunga rekening bank operasional perusahaan", en: "Interest income earned on company operational bank accounts" },
  "7-2101": { id: "Potongan pajak final atas pendapatan bunga rekening bank", en: "Final withholding tax expense on bank interest income" },
  "7-2201": { id: "Beban pajak penghasilan final atas peredaran usaha", en: "Final business income tax expense on gross revenue" },
};

function normalizeCoaCodeKey(code?: string | null): string {
  if (!code) return "";
  const trimmed = code.trim().replace(/[\s._]+/g, "-");
  if (/^\d{5}$/.test(trimmed)) {
    return `${trimmed[0]}-${trimmed.slice(1)}`;
  }
  return trimmed;
}

/**
 * Mengembalikan nama akun yang sesuai dengan bahasa aktif.
 * Kode akun (code) tetap utuh, hanya nama deskripsinya yang disesuaikan.
 */
export function getLocalizedAccountName(
  account: { code?: string | null; name: string } | null | undefined,
  lang: "id" | "en",
): string {
  if (!account) return "";
  const code = normalizeCoaCodeKey(account.code);
  if (code && COA_NAME_MAP[code]) {
    const mapped = COA_NAME_MAP[code];
    // Jika nama tersimpan memiliki sufiks spesifik setelah " - " yang belum tercakup di COA_NAME_MAP
    // (contoh: sub-akun bank atau klien baru), pertahankan sufiksnya dan terjemahkan prefiksnya.
    const rawName = (account.name ?? "").trim();
    if (
      rawName.includes(" - ") &&
      !mapped.id.includes(" - ") &&
      rawName.toLowerCase() !== mapped.id.toLowerCase() &&
      rawName.toLowerCase() !== mapped.en.toLowerCase()
    ) {
      const [, ...rest] = rawName.split(" - ");
      const suffix = rest.join(" - ").trim();
      const base = lang === "en" ? mapped.en : mapped.id;
      return suffix ? `${base} - ${suffix}` : base;
    }
    return lang === "en" ? mapped.en : mapped.id;
  }

  let res = account.name;
  if (lang === "id") {
    // Jika akun kustom disimpan dalam bahasa Inggris namun mode aktif ID, terjemahkan pola standar ke ID
    res = res.replace(/^Prepaid Expenses\b/i, "Beban Dibayar di Muka");
    res = res.replace(/^Unearned Revenue\b/i, "Pendapatan Diterima di Muka");
    res = res.replace(/^Accounts Receivable\b/i, "Piutang Usaha");
    res = res.replace(/^Accounts Payable\b/i, "Utang Usaha");
    res = res.replace(/^Cash in Bank\b/i, "Kas di Bank");
    res = res.replace(/^Petty Cash\b/i, "Kas Kecil");
    return res;
  }

  // Fallback translasi pola nama akun untuk akun dengan imbuhan dinamis pada mode EN
  res = res.replace(/Kas Kecil Operasional/gi, "Operational Petty Cash");
  res = res.replace(/Kas Kecil/gi, "Petty Cash");
  res = res.replace(/Kas di Bank/gi, "Cash in Bank");
  res = res.replace(/Bank Operasional Utama Altvira/gi, "Main Operational Bank - Altvira");
  res = res.replace(/Piutang Usaha Klien/gi, "Accounts Receivable - Clients");
  res = res.replace(/Piutang Usaha/gi, "Accounts Receivable");
  res = res.replace(/Piutang Belum Ditagih(?:\s*\(Accrued Revenue\))?/gi, "Unbilled Receivables");
  res = res.replace(/Jasa dalam Proses/gi, "Work in Progress (WIP)");
  res = res.replace(/Penagihan atas Kontrak/gi, "Billings on Contracts");
  res = res.replace(/Beban Dibayar di Muka/gi, "Prepaid Expenses");
  res = res.replace(/Peralatan & Perangkat Keras/gi, "Equipment & Hardware");
  res = res.replace(/Akumulasi Penyusutan Peralatan/gi, "Accumulated Depreciation - Equipment");
  res = res.replace(/Pendapatan Diterima di Muka/gi, "Unearned Revenue");
  res = res.replace(/Utang Usaha Vendor/gi, "Accounts Payable - Vendors");
  res = res.replace(/Utang Usaha/gi, "Accounts Payable");
  res = res.replace(/Beban yang Masih Harus Dibayar/gi, "Accrued Expenses Payable");
  res = res.replace(/Utang Bagi Hasil Proyek/gi, "Project Profit Sharing Payable");
  res = res.replace(/Utang PPN Keluaran/gi, "VAT Payable");
  res = res.replace(/Modal Disetor/gi, "Paid-in Capital");
  res = res.replace(/Laba Ditahan/gi, "Retained Earnings");
  res = res.replace(/Ikhtisar Laba Rugi/gi, "Income Summary");
  res = res.replace(/Prive Pemilik/gi, "Owner's Drawings");
  res = res.replace(/Pendapatan Jasa Pengembangan Perangkat Lunak/gi, "Software Development Service Revenue");
  res = res.replace(/Pendapatan Jasa Pengembangan Website/gi, "Website Development Service Revenue");
  res = res.replace(/Pendapatan Jasa Pengembangan/gi, "Development Service Revenue");
  res = res.replace(/Pendapatan Jasa Hosting & Domain/gi, "Hosting & Domain Service Revenue");
  res = res.replace(/Pendapatan Pemeliharaan & Dukungan Teknis/gi, "Maintenance & Technical Support Revenue");
  res = res.replace(/Pendapatan Bunga Bank/gi, "Bank Interest Income");
  res = res.replace(/Beban Cloud, Hosting, & Domain Proyek/gi, "Project Cloud, Hosting & Domain Expense");
  res = res.replace(/Beban Tenaga Ahli & Subkontraktor Proyek/gi, "Project Subcontractor & Expert Expense");
  res = res.replace(/Beban Lisensi & API Pihak Ketiga Proyek/gi, "Project Third-Party License & API Expense");
  res = res.replace(/Beban Bagi Hasil Proyek/gi, "Project Profit Sharing Expense");
  res = res.replace(/Beban Langganan Alat Kerja Bersama/gi, "Shared Tools Subscription Expense");
  res = res.replace(/Beban Internet, Listrik, & Utilitas Kantor/gi, "Office Internet, Electricity & Utilities Expense");
  res = res.replace(/Beban Administrasi & Umum/gi, "General & Administrative Expense");
  res = res.replace(/Beban Penyusutan Peralatan/gi, "Equipment Depreciation Expense");
  res = res.replace(/Beban Pajak Final atas Bunga/gi, "Final Tax on Interest Expense");
  res = res.replace(/Beban Pajak Final Usaha/gi, "Final Business Income Tax Expense");
  res = res.replace(/Beban Pajak Final/gi, "Final Tax Expense");
  res = res.replace(/PENDAPATAN & BEBAN LAIN-LAIN/g, "OTHER INCOME & EXPENSES");
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
  const normCode = normalizeCoaCodeKey(code);
  if (normCode && COA_DESCRIPTION_MAP[normCode]) {
    return lang === "en" ? COA_DESCRIPTION_MAP[normCode].en : COA_DESCRIPTION_MAP[normCode].id;
  }
  if (!description) return "";
  if (lang === "id") return description;

  let res = description;
  res = res.replace(/Kelompok Utama Aset/gi, "Main Asset Group");
  res = res.replace(/Kelompok Utama Liabilitas/gi, "Main Liability Group");
  res = res.replace(/Kelompok Utama Ekuitas/gi, "Main Equity Group");
  res = res.replace(/Kelompok Utama Pendapatan/gi, "Main Revenue Group");
  res = res.replace(/Kas tunai operasional kecil/gi, "Small operational cash on hand");
  res = res.replace(/Kas tunai operasional/gi, "Operational cash on hand");
  res = res.replace(/Rekening bank utama penerimaan klien & pembayaran vendor/gi, "Primary bank account for client receipts & vendor payments");
  res = res.replace(/Rekening bank utama/gi, "Primary operational bank account");
  res = res.replace(/tagihan invoice termin\/pelunasan yang belum dibayar klien/gi, "milestone/settlement invoices uncollected from clients");
  res = res.replace(/tagihan invoice termin\/pelunasan yang belum/gi, "milestone/settlement invoices uncollected");
  res = res.replace(/Piutang tagihan invoice/gi, "Accounts receivable from client invoices");
  res = res.replace(/Piutang akrual akhir periode untuk proyek 2 termin lintas tahun/gi, "Period-end accrued receivable for cross-year multi-milestone projects");
  res = res.replace(/Piutang akrual proyek 2 termin lintas tahun/gi, "Accrued receivable for cross-year 2-milestone projects");
  res = res.replace(/Piutang akrual akhir periode untuk proyek 2/gi, "Period-end accrued receivable for project 2");
  return res;
}

/**
 * Pemetaan Tag Sistem Akun (AccountSystemTag) Bilingual
 */
export const SYSTEM_TAG_MAP: Record<string, { id: string; en: string }> = {
  none: { id: "Tanpa Tag Otomasi", en: "No Automation Tag" },
  cash_bank: { id: "Kas & Bank", en: "Cash & Bank" },
  accounts_receivable: { id: "Piutang Usaha", en: "Accounts Receivable" },
  unbilled_receivable: { id: "Piutang Belum Ditagih", en: "Unbilled Receivable" },
  work_in_progress: { id: "Jasa dalam Proses (WIP)", en: "Work in Progress (WIP)" },
  contract_billings: { id: "Penagihan atas Kontrak", en: "Contract Billings" },
  accounts_payable: { id: "Utang Usaha Vendor", en: "Accounts Payable" },
  unearned_revenue: { id: "Pendapatan Diterima di Muka", en: "Unearned Revenue" },
  profit_sharing_payable: { id: "Utang Bagi Hasil", en: "Profit Sharing Payable" },
  retained_earnings: { id: "Laba Ditahan", en: "Retained Earnings" },
  income_summary: { id: "Ikhtisar Laba Rugi", en: "Income Summary" },
  service_revenue: { id: "Pendapatan Jasa Utama", en: "Primary Service Revenue" },
  profit_sharing_expense: { id: "Beban Bagi Hasil", en: "Profit Sharing Expense" },
  shared_expense: { id: "Beban Operasional Bersama", en: "Shared Operating Expense" },
};

/**
 * Menerjemahkan nilai enum system_tag akun CoA menjadi label yang bersih di kedua bahasa.
 */
export function getLocalizedSystemTag(
  tag: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!tag || tag === "none") return "-";
  const normalized = tag.toLowerCase().trim();
  if (SYSTEM_TAG_MAP[normalized]) {
    return lang === "en" ? SYSTEM_TAG_MAP[normalized].en : SYSTEM_TAG_MAP[normalized].id;
  }
  return tag;
}

/**
 * Pemetaan Jenis Jurnal (JournalType) Bilingual
 */
export const JOURNAL_TYPE_MAP: Record<string, { id: string; en: string }> = {
  general: { id: "Jurnal Umum", en: "General Journal" },
  adjustment: { id: "Jurnal Penyesuaian", en: "Adjusting Entry" },
  correction: { id: "Jurnal Koreksi", en: "Correction Entry" },
  closing: { id: "Jurnal Penutup", en: "Closing Entry" },
  reversing: { id: "Jurnal Pembalik", en: "Reversing Entry" },
  auto_invoice: { id: "Otomatis: Invoice", en: "Auto: Invoice" },
  auto_receipt: { id: "Otomatis: Penerimaan Kas", en: "Auto: Cash Receipt" },
  auto_expense: { id: "Otomatis: Beban PA", en: "Auto: PA Expense" },
  auto_payment: { id: "Otomatis: Pelunasan PA", en: "Auto: PA Settlement" },
  progress_billing: { id: "Progress Billing", en: "Progress Billing" },
  elimination: { id: "Eliminasi Selesai 100%", en: "100% Completion Elimination" },
  profit_sharing: { id: "Bagi Hasil Proyek", en: "Project Profit Sharing" },
  auto_profit_sharing: { id: "Otomatis Bagi Hasil", en: "Auto Profit Sharing" },
};

export function getLocalizedJournalType(
  type: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!type) return "-";
  const normalized = type.toLowerCase().trim();
  if (JOURNAL_TYPE_MAP[normalized]) {
    return lang === "en" ? JOURNAL_TYPE_MAP[normalized].en : JOURNAL_TYPE_MAP[normalized].id;
  }
  return type;
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
 * Menerjemahkan nama periode bulanan ("November 2026", "Agustus 2026", "Semua Periode", dll.)
 */
export function getLocalizedPeriodName(
  name: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!name) return "";
  if (lang === "id") return name;

  const exactMap: Record<string, string> = {
    "Semua Periode": "All Periods",
    "Bulan Ini": "This Month",
    "Bulan Lalu": "Last Month",
    "Tahun Ini": "This Year",
  };
  if (exactMap[name.trim()]) {
    return exactMap[name.trim()]!;
  }

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
    Agu: "Aug",
    Okt: "Oct",
    Des: "Dec",
  };

  let res = name;
  res = res.replace(/\bSemua Periode\b/gi, "All Periods");
  res = res.replace(/\bTahun\s+(\d{4})\b/gi, "Year $1");
  res = res.replace(/\bPer\s+/g, "As of ");
  res = res.replace(/\bs\.d\.\s*/gi, "to ");
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
    "Paket / Modul": "Package / Module",
    "Paket": "Package",
    "Bulan": "Month",
    "Tahun": "Year",
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

  // 1. Pola penerimaan termin uang muka (dengan atau tanpa kalimat kedua)
  translated = translated.replace(
    /Penerimaan termin (\d+) dari (.*?) berupa uang muka development (\d+)%\.?\s*Belum diakui(?:\s+sebagai)?\s+pendapatan karena pekerjaan belum selesai\.?/gi,
    "Receipt of milestone $1 from $2 as development down payment ($3%). Not yet recognized as revenue as work is in progress.",
  );
  translated = translated.replace(
    /Penerimaan termin (\d+) dari (.*?) berupa uang muka (.*?)(?:\.|$)/gi,
    (_m, term, client, tail) => {
      const enTail = String(tail)
        .replace(/dan pembayaran penuh hosting 1 tahun/gi, "and full 1-year hosting payment")
        .replace(/dan pembayaran penuh/gi, "and full payment")
        .replace(/pembayaran penuh/gi, "full payment")
        .replace(/(\d+)\s+tahun/gi, "$1-year")
        .replace(/(\d+)\s+bulan/gi, "$1-month");
      return `Receipt of milestone ${term} from ${client} as advance payment for ${enTail}`;
    },
  );
  translated = translated.replace(
    /Penerimaan Termin (\d+) \(DP ([\d.,]+)%\) — (INV\/[\w/-]+)/gi,
    "Milestone $1 Receipt (DP $2%) — $3",
  );
  translated = translated.replace(
    /Penerimaan kas Termin (\d+) \(DP\) (INV\/[\w/-]+)/gi,
    "Milestone $1 (DP) Cash Receipt $2",
  );
  translated = translated.replace(
    /Penagihan atas Kontrak Termin (\d+) \(DP\)/gi,
    "Contract Billing for Milestone $1 (DP)",
  );
  translated = translated.replace(
    /Penerimaan termin (\d+)\s+dari\s+([^\s,.;]+(?:\s+[^\s,.;]+){0,4})/gi,
    "Receipt of milestone $1 from $2",
  );

  // 2. Pola pengakuan pendapatan hosting / sewa proporsional
  translated = translated.replace(
    /Pengakuan pendapatan hosting selama (\d+) hari \((.*?)\)(?:\s+dari\s+(.*))?/gi,
    (_m, days, range, tail) => {
      const enRange = getLocalizedPeriodName(String(range), "en");
      if (tail) {
        let enTail = String(tail)
          .replace(/total kontrak/gi, "total contract")
          .replace(/hari/gi, "days")
          .replace(/tahun/gi, "year");
        return `Hosting revenue recognition for ${days} days (${enRange}) from ${enTail}`;
      }
      return `Hosting revenue recognition for ${days} days (${enRange})`;
    },
  );

  // 3. Pola pembebanan biaya server tahunan / beban dibayar di muka
  translated = translated.replace(
    /Pembebanan biaya server tahunan untuk (\d+) hari yang sudah terpakai(?:\s*\((.*?)\))?(.*)/gi,
    (_m, days, range, tail) => {
      const enRange = range ? ` (${getLocalizedPeriodName(String(range), "en")})` : "";
      const enTail = tail
        ? String(tail)
            .replace(/dari total/gi, "of total")
            .replace(/hari/gi, "days")
        : "";
      return `Annual server cost allocation for ${days} used days${enRange}${enTail}`;
    },
  );

  // 4. Pola pengakuan pendapatan progres
  translated = translated.replace(
    /Pengakuan pendapatan progres ([\d.,]+)% — (.*)/gi,
    "Revenue recognition at progress $1% — $2",
  );

  // 5. Pola dana masuk & penagihan invoice
  translated = translated.replace(
    /^Dana masuk Invoice (INV\/[\w/-]+)(.*)/gi,
    "Cash receipt for Invoice $1$2",
  );
  translated = translated.replace(
    /^Dana masuk\b/gi,
    "Cash receipt",
  );
  translated = translated.replace(
    /Penagihan Invoice (INV\/[\w/-]+) — (.*)/gi,
    "Invoice Billing $1 — $2",
  );
  translated = translated.replace(
    /Penagihan Invoice (INV\/[\w/-]+)/gi,
    "Invoice Billing $1",
  );
  translated = translated.replace(
    /Penerimaan pembayaran Invoice (INV\/[\w/-]+)(?:\s+dari\s+(.*))?/gi,
    (_m, inv, client) =>
      client
        ? `Payment receipt for Invoice ${inv} from ${client}`
        : `Payment receipt for Invoice ${inv}`,
  );

  // 6. Pola pembayaran PO / pencairan dana / bagi hasil
  translated = translated.replace(
    /Pencairan dana pengajuan (PA\/[\w/-]+) — (.*)/gi,
    "Fund disbursement for request $1 — $2",
  );
  translated = translated.replace(
    /Persetujuan pengajuan pembayaran (PA\/[\w/-]+) — (.*)/gi,
    "Payment request approval $1 — $2",
  );
  translated = translated.replace(
    /Finalisasi bagi hasil proyek (PRJ\/[\w/-]+)/gi,
    "Project profit sharing finalization $1",
  );

  // 7. Pola jurnal penutup, pembalik, dan koreksi
  translated = translated.replace(
    /Jurnal Penutup Manual Akhir Periode/gi,
    "Period-End Manual Closing Entry",
  );
  translated = translated.replace(
    /Jurnal Penutup Periode (.*)/gi,
    (_m, per) => `Period Closing Entry — ${getLocalizedPeriodName(String(per), "en")}`,
  );
  translated = translated.replace(
    /Penutupan akun pendapatan (.*)/gi,
    (_m, per) => `Closing of revenue account — ${getLocalizedPeriodName(String(per), "en")}`,
  );
  translated = translated.replace(
    /Penutupan akun beban (.*)/gi,
    (_m, per) => `Closing of expense account — ${getLocalizedPeriodName(String(per), "en")}`,
  );
  translated = translated.replace(
    /Transfer laba bersih ke Laba Ditahan (.*)/gi,
    (_m, per) => `Net income transfer to Retained Earnings — ${getLocalizedPeriodName(String(per), "en")}`,
  );
  translated = translated.replace(
    /Transfer rugi bersih ke Laba Ditahan (.*)/gi,
    (_m, per) => `Net loss transfer to Retained Earnings — ${getLocalizedPeriodName(String(per), "en")}`,
  );
  translated = translated.replace(
    /Jurnal Pembalik Otomatis Awal Periode/gi,
    "Period-Start Automated Reversing Entry",
  );
  translated = translated.replace(
    /Jurnal Pembalik Awal Periode atas (JRN\/[\w/-]+)/gi,
    "Period-Start Reversing Entry for $1",
  );
  translated = translated.replace(
    /Jurnal Pembalik atas (JRN\/[\w/-]+)/gi,
    "Reversing Entry for $1",
  );
  translated = translated.replace(
    /Jurnal Koreksi atas (JRN\/[\w/-]+) — (.*)/gi,
    "Correction Entry for $1 — $2",
  );
  translated = translated.replace(
    /Koreksi atas (JRN\/[\w/-]+)/gi,
    "Correction for $1",
  );

  // 8. Normalisasi singkatan bulan dan "s.d." yang tersisa di dalam tanda kurung tanggal
  translated = translated
    .replace(/\bs\.d\.\s*/gi, "to ")
    .replace(/\bMei\b/g, "May")
    .replace(/\bAgu\b/g, "Aug")
    .replace(/\bOkt\b/g, "Oct")
    .replace(/\bDes\b/g, "Dec")
    .replace(/\bJanuari\b/g, "January")
    .replace(/\bFebruari\b/g, "February")
    .replace(/\bMaret\b/g, "March")
    .replace(/\bJuni\b/g, "June")
    .replace(/\bJuli\b/g, "July")
    .replace(/\bAgustus\b/g, "August")
    .replace(/\bOktober\b/g, "October")
    .replace(/\bDesember\b/g, "December");

  return translated;
}

/**
 * Pemetaan Satuan Layanan/Produk Standar Bilingual (Katalog Master Data)
 */
export const SERVICE_UNIT_MAP: Record<string, { id: string; en: string }> = {
  "proyek": { id: "Proyek", en: "Project" },
  "project": { id: "Proyek", en: "Project" },
  "paket / modul": { id: "Paket / Modul", en: "Package / Module" },
  "package / module": { id: "Paket / Modul", en: "Package / Module" },
  "paket": { id: "Paket", en: "Package" },
  "package": { id: "Paket", en: "Package" },
  "modul": { id: "Modul", en: "Module" },
  "module": { id: "Modul", en: "Module" },
  "bulan": { id: "Bulan", en: "Month" },
  "month": { id: "Bulan", en: "Month" },
  "tahun": { id: "Tahun", en: "Year" },
  "year": { id: "Tahun", en: "Year" },
  "jam": { id: "Jam", en: "Hour" },
  "hour": { id: "Jam", en: "Hour" },
  "hari": { id: "Hari", en: "Day" },
  "day": { id: "Hari", en: "Day" },
  "lisensi": { id: "Lisensi", en: "License" },
  "license": { id: "Lisensi", en: "License" },
  "unit": { id: "Unit", en: "Unit" },
};

/**
 * Menerjemahkan satuan produk/layanan standar ke bahasa aktif.
 */
export function getLocalizedServiceUnit(
  unit: string | null | undefined,
  lang: "id" | "en",
): string {
  if (!unit) return "-";
  const normalized = unit.trim().toLowerCase().replace(/\s*\/\s*/g, " / ");
  if (SERVICE_UNIT_MAP[normalized]) {
    return lang === "en" ? SERVICE_UNIT_MAP[normalized].en : SERVICE_UNIT_MAP[normalized].id;
  }
  return unit;
}

/**
 * Pemetaan Data Bawaan (Seed) Katalog Produk & Layanan Altvira (SRV-001 s/d SRV-005).
 * Hanya menerjemahkan apabila nilai field masih identik dengan nilai seed bawaan,
 * sehingga perubahan yang diketik pengguna tetap utuh apa adanya.
 */
export const CATALOG_DEFAULT_ITEMS_MAP: Record<
  string,
  {
    category: { id: string; en: string };
    name: { id: string; en: string };
    description: { id: string; en: string };
  }
> = {
  "SRV-001": {
    category: { id: "Software Development", en: "Software Development" },
    name: {
      id: "Pengembangan Web App & Portal Perusahaan",
      en: "Enterprise Web App & Portal Development",
    },
    description: {
      id: "Arsitektur frontend modern (React/Next.js), API backend scalable, dan integrasi database performa tinggi.",
      en: "Modern frontend architecture (React/Next.js), scalable backend APIs, and high-performance database integration.",
    },
  },
  "SRV-002": {
    category: { id: "Enterprise System", en: "Enterprise System" },
    name: {
      id: "Implementasi ERP Keuangan & Akuntansi",
      en: "Financial & Accounting ERP Implementation",
    },
    description: {
      id: "Solusi otomatisasi jurnal umum, buku besar, penagihan termin (progress billing), dan pelaporan keuangan komprehensif.",
      en: "Automated solution for general journals, general ledger, milestone progress billing, and comprehensive financial reporting.",
    },
  },
  "SRV-003": {
    category: { id: "Product Design", en: "Product Design" },
    name: {
      id: "Desain UI/UX & Design System",
      en: "UI/UX Design & Design System",
    },
    description: {
      id: "Riset pengguna, wireframing, interactive prototyping Figma, dan penyeragaman token desain sistem komponen terpadu.",
      en: "User research, wireframing, interactive Figma prototyping, and unified component design system token standardization.",
    },
  },
  "SRV-004": {
    category: { id: "Cloud & DevOps", en: "Cloud & DevOps" },
    name: {
      id: "Dukungan Pemeliharaan & SLA Cloud (DevOps)",
      en: "Maintenance Support & Cloud SLA (DevOps)",
    },
    description: {
      id: "Pemantauan server 24/7, manajemen patch keamanan, cadangan data otomatis berkala, dan optimasi performa infrastruktur cloud.",
      en: "24/7 server monitoring, security patch management, automated periodic data backups, and cloud infrastructure performance optimization.",
    },
  },
  "SRV-005": {
    category: { id: "Mobile Development", en: "Mobile Development" },
    name: {
      id: "Pengembangan Aplikasi Mobile (iOS & Android)",
      en: "Mobile Application Development (iOS & Android)",
    },
    description: {
      id: "Aplikasi cross-platform responsif dan native-like dengan integrasi push notification, payment gateway, dan analitik.",
      en: "Responsive native-like cross-platform mobile applications with push notifications, payment gateway, and analytics integration.",
    },
  },
};

export function getLocalizedCatalogProduct(
  item: {
    code: string;
    category: string;
    name: string;
    unit: string;
    description: string | null | undefined;
  },
  lang: "id" | "en",
): {
  category: string;
  name: string;
  unit: string;
  description: string;
} {
  const unit = getLocalizedServiceUnit(item.unit, lang);
  const rawDesc = item.description ?? "";
  const seed = CATALOG_DEFAULT_ITEMS_MAP[item.code?.trim().toUpperCase()];
  if (!seed) {
    return {
      category: item.category,
      name: item.name,
      unit,
      description: rawDesc,
    };
  }

  const isDefaultCategory =
    item.category.trim() === seed.category.id || item.category.trim() === seed.category.en;
  const isDefaultName =
    item.name.trim() === seed.name.id || item.name.trim() === seed.name.en;
  const isDefaultDesc =
    rawDesc.trim() === seed.description.id ||
    rawDesc.trim() === seed.description.en;

  return {
    category: isDefaultCategory ? seed.category[lang] : item.category,
    name: isDefaultName ? seed.name[lang] : item.name,
    unit,
    description: isDefaultDesc ? seed.description[lang] : rawDesc,
  };
}
