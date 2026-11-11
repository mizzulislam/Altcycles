import type {
  AccountRow,
  AttachmentRow,
  AuditLogRow,
  BudgetLineRow,
  BudgetRow,
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  CustomerRow,
  DocSequenceCounterRow,
  DocSequenceRow,
  DocTemplateRow,
  HandoverReportRow,
  JournalLineRow,
  JournalRow,
  MilestoneRow,
  NotificationRow,
  PaymentRequestRow,
  PeriodRow,
  PoItemRow,
  ProfileRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProfitSharingSchemeRow,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectMemberRow,
  ProjectProgressRow,
  ProjectRow,
  PurchaseOrderRow,
  QuotationItemRow,
  QuotationRow,
  ReceiptRow,
  SalesInvoiceRow,
  UatChecklistRow,
  UatItemRow,
  VendorRow,
} from "@/types/database.types";

const NOW = "2026-11-07T09:00:00.000Z";

export const DEMO_PROFILES: ProfileRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    full_name: "Muhammad Izzul Islam",
    email: "superadmin@altvira.id",
    role: "super_admin",
    roles: ["super_admin", "admin", "user"],
    username: "izzulislam",
    avatar_url: null,
    phone_number: "081234567890",
    job_title: "Chief Technology Officer / Super Admin",
    bio: "Pengembang sistem dan administrator utama Altcycles ERP Keuangan Altvira.",
    is_active: true,
    last_login_at: NOW,
    created_by: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    full_name: "Nadia Putri (Bendahara)",
    email: "admin@altvira.id",
    role: "admin",
    roles: ["admin", "user"],
    username: "nadiaputri",
    avatar_url: null,
    phone_number: "081298765432",
    job_title: "Finance & Accounting Lead",
    bio: "Mengelola akuntansi, penagihan invoice, dan persetujuan pengeluaran Altvira.",
    is_active: true,
    last_login_at: NOW,
    created_by: "00000000-0000-0000-0000-000000000001",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    full_name: "Fajar Nugroho (Engineer)",
    email: "user@altvira.id",
    role: "user",
    roles: ["user"],
    username: "fajarnugroho",
    avatar_url: null,
    phone_number: "081345678901",
    job_title: "Lead Frontend Engineer",
    bio: "Spesialis arsitektur antarmuka web dan implementasi UI/UX Altcycles.",
    is_active: true,
    last_login_at: NOW,
    created_by: "00000000-0000-0000-0000-000000000001",
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_COMPANY: CompanyProfileRow = {
  id: 1,
  company_name: "Altvira Technology",
  legal_entity_name: "PT Representasi Mitra Mandiri",
  tagline: "ADAPT TODAY, INNOVATE TOMORROW",
  address: "Area Pandu Raya Villa Citra Bantarjati, Jl. Flamboyan II No.F2/12, RT.05/RW.04, Tegal Gundil, Kec. Bogor Utara, Kota Bogor, Jawa Barat 16152",
  email: "altvira.tech@gmail.com",
  phone: "0895417311976",
  signing_city: "Bogor",
  logo_storage_path: null,
  bank_name: "Bank Jago",
  bank_account_number: "103289122849",
  bank_account_holder: "Muhammad Izzul Islam",
  signer_name: "Muhammad Izzul Islam",
  signer_title: "Project Manager",
  tax_id_number: null,
  signer_signature_path: null,
  signer_paraf_path: null,
  social_links_json: [
    { platform: "Instagram", username: "@altvira.tech" },
    { platform: "LinkedIn", username: "altvira-technology" },
    { platform: "TikTok", username: "@altvira.tech" },
  ],
  pkp_enabled: false,
  ppn_rate: 11,
  pph_enabled: false,
  journal_lock_enabled: true,
  auto_closing_enabled: false,
  updated_by: null,
  created_at: NOW,
  updated_at: NOW,
};

export const DEMO_SEQUENCES: DocSequenceRow[] = [
  { doc_type: "QT", label: "Quotation (Penawaran Harga)", prefix_pattern: "QT/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "SOW", label: "Scope of Work (Proposal Teknis)", prefix_pattern: "SOW/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "SPK", label: "Surat Perjanjian Kerja Sama", prefix_pattern: "SPK/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "BAKP", label: "Berita Acara Kemajuan Pekerjaan", prefix_pattern: "BAKP/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "INV", label: "Invoice Penagihan Klien", prefix_pattern: "INV/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "KW", label: "Kuitansi Pembayaran", prefix_pattern: "KW/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "UAT", label: "User Acceptance Testing", prefix_pattern: "UAT/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "BAST", label: "Berita Acara Serah Terima", prefix_pattern: "BAST/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "POP", label: "PO Pembelian Vendor Internal", prefix_pattern: "POP/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "PA", label: "Payment Approval", prefix_pattern: "PA/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "JRN", label: "Jurnal Akuntansi", prefix_pattern: "JRN/ALT/{{tahun}}/{{bulan}}/{{urut}}", padding_digits: 3, reset_period: "monthly", updated_by: null, updated_at: NOW },
  { doc_type: "PRJ", label: "Kode Proyek", prefix_pattern: "PRJ/ALT/{{tahun}}/{{urut}}", padding_digits: 3, reset_period: "yearly", updated_by: null, updated_at: NOW },
];

export const DEMO_COUNTERS: DocSequenceCounterRow[] = [
  { doc_type: "PRJ", period_key: "2026", last_number: 1, updated_at: NOW },
  { doc_type: "POP", period_key: "2026-11", last_number: 1, updated_at: NOW },
  { doc_type: "PA", period_key: "2026-11", last_number: 1, updated_at: NOW },
  { doc_type: "QT", period_key: "2026-11", last_number: 1, updated_at: NOW },
  { doc_type: "INV", period_key: "2026-11", last_number: 1, updated_at: NOW },
  { doc_type: "KW", period_key: "2026-11", last_number: 1, updated_at: NOW },
  { doc_type: "JRN", period_key: "2026-11", last_number: 1, updated_at: NOW },
];

export const DEMO_TEMPLATES: DocTemplateRow[] = [
  {
    doc_type: "QT",
    title: "Quotation (Penawaran Harga)",
    version: 1,
    default_placeholders: { masa_berlaku_hari: 14, batas_revisi_per_tahap: 2 },
    footer_notes: "Tidak dikenakan PPN karena Altvira belum PKP.",
    updated_by: null,
    updated_at: NOW,
  },
  {
    doc_type: "SOW",
    title: "Scope of Work (Proposal Teknis)",
    version: 1,
    default_placeholders: { batas_revisi_per_tahap: 2, masa_garansi_hari: 30 },
    footer_notes: "Perubahan di luar lingkup diproses melalui change request berbiaya.",
    updated_by: null,
    updated_at: NOW,
  },
  {
    doc_type: "SPK",
    title: "Surat Perjanjian Kerja Sama",
    version: 1,
    default_placeholders: {
      batas_umpan_balik_hari_kerja: 5,
      denda_per_hari_persen: 0.1,
      denda_maksimal_persen: 5,
      masa_garansi_hari: 30,
    },
    footer_notes: "Draf kerangka perjanjian — wajib ditinjau pihak hukum kontrak.",
    updated_by: null,
    updated_at: NOW,
  },
  {
    doc_type: "BAKP",
    title: "Berita Acara Kemajuan Pekerjaan",
    version: 1,
    default_placeholders: {},
    footer_notes: "Persentase penyelesaian pada BAKP menjadi dasar pengakuan pendapatan.",
    updated_by: null,
    updated_at: NOW,
  },
  {
    doc_type: "INV",
    title: "Invoice Penagihan",
    version: 1,
    default_placeholders: { jatuh_tempo_hari: 7 },
    footer_notes: "Harga tidak dikenakan PPN karena Altvira belum PKP.",
    updated_by: null,
    updated_at: NOW,
  },
  {
    doc_type: "KW",
    title: "Kuitansi Bukti Pembayaran",
    version: 1,
    default_placeholders: { catatan_meterai: "Bea meterai dikenakan sesuai ketentuan berlaku" },
    footer_notes: "Kuitansi sah diterbitkan setelah dana tercatat masuk.",
    updated_by: null,
    updated_at: NOW,
  },
  {
    doc_type: "UAT",
    title: "User Acceptance Testing",
    version: 1,
    default_placeholders: { lingkungan_uji_default: "https://staging.altvira.id" },
    footer_notes: "Pengujian dilakukan bersama perwakilan klien sebelum BAST.",
    updated_by: null,
    updated_at: NOW,
  },
  {
    doc_type: "BAST",
    title: "Berita Acara Serah Terima",
    version: 1,
    default_placeholders: { masa_garansi_hari: 30 },
    footer_notes: "Invoice pelunasan dapat ditagih setelah BAST ditandatangani.",
    updated_by: null,
    updated_at: NOW,
  },
  {
    doc_type: "POP",
    title: "Purchase Order Pembelian Internal",
    version: 1,
    default_placeholders: { syarat_pembayaran: "Sesuai kesepakatan tagihan vendor" },
    footer_notes: "Harap cantumkan nomor PO ini pada setiap tagihan vendor.",
    updated_by: null,
    updated_at: NOW,
  },
];

export const DEMO_ACCOUNTS: AccountRow[] = [
  { id: "acc-1101", code: "1-1101", name: "Kas Kecil Operasional", account_type: "asset", normal_balance: "debit", parent_id: null, system_tag: "cash_bank", cash_flow_category: "cash_equivalent", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Kas tunai operasional", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-1102", code: "1-1102", name: "Bank Operasional Utama Altvira", account_type: "asset", normal_balance: "debit", parent_id: null, system_tag: "cash_bank", cash_flow_category: "cash_equivalent", is_postable: true, is_active: true, used_in_journal_count: 1, description: "Rekening bank utama", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-1201", code: "1-1201", name: "Piutang Usaha Klien", account_type: "asset", normal_balance: "debit", parent_id: null, system_tag: "accounts_receivable", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Piutang tagihan invoice", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-1210", code: "1-1210", name: "Piutang Belum Ditagih (Accrued Revenue)", account_type: "asset", normal_balance: "debit", parent_id: null, system_tag: "unbilled_receivable", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Piutang akrual proyek 2 termin lintas tahun", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-1300", code: "1-1300", name: "Jasa dalam Proses", account_type: "asset", normal_balance: "debit", parent_id: null, system_tag: "work_in_progress", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Akun aset kontrak Progress Billing", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-1310", code: "1-1310", name: "Penagihan atas Kontrak", account_type: "contra_asset", normal_balance: "credit", parent_id: null, system_tag: "contract_billings", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 1, description: "Akun kontra-aset Progress Billing (saldo kredit)", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-2101", code: "2-1101", name: "Utang Usaha Vendor", account_type: "liability", normal_balance: "credit", parent_id: null, system_tag: "accounts_payable", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Kewajiban tagihan vendor", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-2131", code: "2-1301", name: "Utang Bagi Hasil Proyek", account_type: "liability", normal_balance: "credit", parent_id: null, system_tag: "profit_sharing_payable", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Kewajiban bagi hasil proyek", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-2141", code: "2-1401", name: "Pendapatan Diterima di Muka", account_type: "liability", normal_balance: "credit", parent_id: null, system_tag: "unearned_revenue", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Deferral pembayaran awal klien", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-2151", code: "2-1501", name: "Utang PPN Keluaran", account_type: "liability", normal_balance: "credit", parent_id: null, system_tag: "none", cash_flow_category: "operating", is_postable: true, is_active: false, used_in_journal_count: 0, description: "Nonaktif default karena belum PKP", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-3101", code: "3-1101", name: "Modal Disetor", account_type: "equity", normal_balance: "credit", parent_id: null, system_tag: "none", cash_flow_category: "financing", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Modal disetor pemilik", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-3121", code: "3-1201", name: "Laba Ditahan", account_type: "equity", normal_balance: "credit", parent_id: null, system_tag: "retained_earnings", cash_flow_category: "financing", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Akumulasi laba bersih", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-4101", code: "4-1101", name: "Pendapatan Jasa Pengembangan Perangkat Lunak", account_type: "revenue", normal_balance: "credit", parent_id: null, system_tag: "service_revenue", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Pendapatan utama proyek klien", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-5101", code: "5-1101", name: "Beban Cloud, Hosting, & Domain Proyek", account_type: "expense", normal_balance: "debit", parent_id: null, system_tag: "none", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Biaya langsung infrastruktur proyek", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-5201", code: "5-1201", name: "Beban Tenaga Ahli & Subkontraktor Proyek", account_type: "expense", normal_balance: "debit", parent_id: null, system_tag: "none", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Biaya langsung tenaga proyek", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-5401", code: "5-1401", name: "Beban Bagi Hasil Proyek", account_type: "expense", normal_balance: "debit", parent_id: null, system_tag: "profit_sharing_expense", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Beban bagi hasil laba kotor proyek", created_by: null, created_at: NOW, updated_at: NOW },
  { id: "acc-6101", code: "6-1101", name: "Beban Langganan Alat Kerja Bersama", account_type: "expense", normal_balance: "debit", parent_id: null, system_tag: "shared_expense", cash_flow_category: "operating", is_postable: true, is_active: true, used_in_journal_count: 0, description: "Biaya operasional bersama", created_by: null, created_at: NOW, updated_at: NOW },
];

export const DEMO_PERIODS: PeriodRow[] = [
  { id: "per-2026-11", year: 2026, month: 11, name: "November 2026", start_date: "2026-11-01", end_date: "2026-11-30", status: "open", closed_at: null, closed_by: null, reopened_at: null, reopened_by: null, reopen_reason: null, created_by: null, created_at: NOW, updated_at: NOW },
  { id: "per-2026-12", year: 2026, month: 12, name: "Desember 2026", start_date: "2026-12-01", end_date: "2026-12-31", status: "open", closed_at: null, closed_by: null, reopened_at: null, reopened_by: null, reopen_reason: null, created_by: null, created_at: NOW, updated_at: NOW },
  { id: "per-2027-01", year: 2027, month: 1, name: "Januari 2027", start_date: "2027-01-01", end_date: "2027-01-31", status: "open", closed_at: null, closed_by: null, reopened_at: null, reopened_by: null, reopen_reason: null, created_by: null, created_at: NOW, updated_at: NOW },
];

export const DEMO_VENDORS: VendorRow[] = [
  { id: "vnd-001", code: "VND-001", name: "PT Awan Nusantara Cloud", contact_name: "Rizky Pratama", email: "billing@awannusantara.id", phone: "021-5550101", npwp: null, address: "Jakarta Selatan", bank_name: "Bank Mandiri", bank_account_number: "1240098765432", bank_account_holder: "PT Awan Nusantara Cloud", is_active: true, created_by: null, created_at: NOW, updated_at: NOW },
  { id: "vnd-002", code: "VND-002", name: "CV Domain & SSL Indonesia", contact_name: "Siti Rahma", email: "support@domainssl.co.id", phone: "022-4200889", npwp: null, address: "Bandung", bank_name: "BCA", bank_account_number: "4371122334", bank_account_holder: "CV Domain & SSL Indonesia", is_active: true, created_by: null, created_at: NOW, updated_at: NOW },
];

export const DEMO_CUSTOMERS: CustomerRow[] = [
  { id: "cst-001", code: "CST-001", name: "PT Sinar Niaga Digital", company_name: "PT Sinar Niaga Digital", contact_person: "Hendra Wijaya", contact_title: "Direktur Operasional", email: "hendra@sinarniaga.co.id", phone: "021-7894321", npwp: null, address: "Jl. Jend. Sudirman Kav. 45, Jakarta", is_active: true, created_by: null, created_at: NOW, updated_at: NOW },
  { id: "cst-002", code: "CST-002", name: "Koperasi Mitra Sejahtera", company_name: "Koperasi Mitra Sejahtera", contact_person: "Dewi Kartika", contact_title: "Ketua Pengurus", email: "sekretariat@mitrasejahtera.org", phone: "031-5678910", npwp: null, address: "Jl. Darmo No. 18, Surabaya", is_active: true, created_by: null, created_at: NOW, updated_at: NOW },
];

export const DEMO_PROJECTS: ProjectRow[] = [
  {
    id: "prj-001",
    code: "PRJ/ALT/2026/001",
    name: "Pengembangan Sistem Portal Distribusi Sinar Niaga",
    project_category: "client",
    customer_id: "cst-001",
    status: "active",
    start_date: "2026-11-01",
    target_end_date: "2027-01-31",
    completed_date: null,
    contract_value: 120_000_000,
    term_count: 3,
    revenue_method: "progress_billing",
    spk_number: "SPK/ALT/2026/11/001",
    has_posted_journal: true,
    is_eliminated: false,
    description: "Proyek klien 3 termin (DP 25%, Progres 37,5%, Pelunasan 37,5%)",
    created_by: "00000000-0000-0000-0000-000000000002",
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_PROJECT_MEMBERS: ProjectMemberRow[] = [
  {
    project_id: "prj-001",
    user_id: "00000000-0000-0000-0000-000000000003",
    member_role: "Lead Frontend Engineer",
    assigned_by: "00000000-0000-0000-0000-000000000002",
    assigned_at: NOW,
  },
];

export const DEMO_PURCHASE_ORDERS: PurchaseOrderRow[] = [
  {
    id: "po-int-001",
    po_number: "POP/ALT/2026/11/001",
    po_date: "2026-11-05",
    vendor_id: "vnd-001",
    project_id: "prj-001",
    subtotal: 4_500_000,
    tax_amount: 0,
    total_amount: 4_500_000,
    status: "issued",
    notes: "Sewa infrastruktur VPS staging & produksi 3 bulan",
    budget_warning_acknowledged: false,
    issued_at: NOW,
    cancelled_at: null,
    cancel_reason: null,
    created_by: "00000000-0000-0000-0000-000000000003",
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_PO_ITEMS: PoItemRow[] = [
  {
    id: "poi-001",
    po_id: "po-int-001",
    line_no: 1,
    description: "Cloud Server 4 vCPU 8GB RAM (3 Bulan)",
    quantity: 3,
    unit: "Bulan",
    unit_price: 1_500_000,
    line_total: 4_500_000,
  },
];

export const DEMO_PAYMENT_REQUESTS: PaymentRequestRow[] = [
  {
    id: "pa-001",
    request_number: "PA/ALT/2026/11/001",
    revision_no: 0,
    requester_id: "00000000-0000-0000-0000-000000000003",
    purpose: "Pembayaran Cloud Server Staging & Produksi (POP/ALT/2026/11/001)",
    recipient_name: "PT Awan Nusantara Cloud",
    recipient_bank_info: "Bank Mandiri 1240098765432 a.n. PT Awan Nusantara Cloud",
    amount: 4_500_000,
    project_id: "prj-001",
    expense_account_id: "acc-5101",
    po_id: "po-int-001",
    status: "submitted",
    budget_warning_acknowledged: false,
    submitted_at: NOW,
    approver_id: null,
    decided_at: null,
    rejection_reason: null,
    paid_date: null,
    source_cash_account_id: null,
    accrual_journal_id: null,
    payment_journal_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_ATTACHMENTS: AttachmentRow[] = [
  {
    id: "att-001",
    entity_type: "payment_request_proof",
    entity_id: "pa-001",
    file_name: "invoice-awan-nusantara-nov2026.pdf",
    mime_type: "application/pdf",
    file_size_bytes: 184_320,
    storage_path: "demo/invoice-awan-nusantara-nov2026.pdf",
    uploaded_by: "00000000-0000-0000-0000-000000000003",
    created_at: NOW,
  },
];

export const DEMO_NOTIFICATIONS: NotificationRow[] = [
  {
    id: "notif-001",
    user_id: "00000000-0000-0000-0000-000000000002",
    title: "Pengajuan Pembayaran Baru: PA/ALT/2026/11/001",
    message: "Fajar Nugroho mengajukan pembayaran Rp4.500.000 untuk PT Awan Nusantara Cloud.",
    link_path: "/admin/persetujuan",
    is_read: false,
    created_at: NOW,
  },
];

export const DEMO_BUDGETS: BudgetRow[] = [
  {
    id: "bdg-001",
    project_id: "prj-001",
    period_id: null,
    version: 1,
    alert_threshold_pct: 80,
    status: "active",
    notes: "Anggaran biaya langsung pengerjaan Portal Distribusi",
    created_by: "00000000-0000-0000-0000-000000000002",
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_BUDGET_LINES: BudgetLineRow[] = [
  { id: "bdgl-001", budget_id: "bdg-001", account_id: "acc-5101", allocated_amount: 12_000_000 },
  { id: "bdgl-002", budget_id: "bdg-001", account_id: "acc-5201", allocated_amount: 25_000_000 },
];

export const DEMO_JOURNALS: JournalRow[] = [
  {
    id: "jrn-001",
    journal_number: "JRN/ALT/2026/11/001",
    journal_date: "2026-11-01",
    period_id: "per-2026-11",
    journal_type: "auto_invoice",
    source_type: "sales_invoice",
    source_id: "inv-001",
    project_id: "prj-001",
    description: "Penerimaan Termin 1 (DP 25%) — INV/ALT/2026/11/001",
    status: "posted",
    reference_journal_id: null,
    auto_reverse_next_period: false,
    is_reversed: false,
    posted_at: "2026-11-01T10:00:00.000Z",
    posted_by: "00000000-0000-0000-0000-000000000002",
    created_by: "00000000-0000-0000-0000-000000000002",
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
  },
];

export const DEMO_JOURNAL_LINES: JournalLineRow[] = [
  {
    id: "jrnl-001",
    journal_id: "jrn-001",
    line_no: 1,
    account_id: "acc-1102",
    project_id: "prj-001",
    description: "Penerimaan kas Termin 1 (DP) INV/ALT/2026/11/001",
    debit: 30_000_000,
    credit: 0,
  },
  {
    id: "jrnl-002",
    journal_id: "jrn-001",
    line_no: 2,
    account_id: "acc-1310",
    project_id: "prj-001",
    description: "Penagihan atas Kontrak Termin 1 (DP)",
    debit: 0,
    credit: 30_000_000,
  },
];

export const DEMO_QUOTATIONS: QuotationRow[] = [
  {
    id: "qt-001",
    quotation_number: "QT/ALT/2026/11/001",
    quotation_date: "2026-11-01",
    valid_until: "2026-11-15",
    customer_id: "cst-001",
    project_id: "prj-001",
    project_title: "Pengembangan Sistem Portal Distribusi Sinar Niaga",
    client_need_summary: "Aplikasi web pemesanan distributor multi-cabang & pelacakan pengiriman",
    estimated_weeks: 12,
    revision_limit: 2,
    total_amount: 120_000_000,
    status: "accepted",
    terms_json: [
      "Harga tidak dikenakan PPN karena Altvira belum PKP.",
      "Termin 1 DP 25%, Termin 2 Progres 37,5%, Termin 3 Pelunasan 37,5%.",
    ],
    created_by: "00000000-0000-0000-0000-000000000002",
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_QUOTATION_ITEMS: QuotationItemRow[] = [
  { id: "qti-001", quotation_id: "qt-001", line_no: 1, feature_name: "Modul Katalog & Pemesanan Distributor", description: "Keranjang B2B, kuota stok, & riwayat order", cost_amount: 50_000_000 },
  { id: "qti-002", quotation_id: "qt-001", line_no: 2, feature_name: "Modul Gudang, Surat Jalan, & Dashboard Analitik", description: "Pelacakan pengiriman & rekap omzet cabang", cost_amount: 70_000_000 },
];

export const DEMO_CLIENT_POS: ClientPurchaseOrderRow[] = [
  {
    id: "cpo-001",
    po_number: "PO-202611-SN8K4P",
    project_id: "prj-001",
    quotation_reference: "QT/ALT/2026/11/001",
    client_name: "Hendra Wijaya",
    client_company: "PT Sinar Niaga Digital",
    client_email: "hendra@sinarniaga.co.id",
    client_phone: "021-7894321",
    items_json: [
      { item: "Pengembangan Sistem Portal Distribusi Sinar Niaga", qty: 1, price: 120_000_000 },
    ],
    po_value: 120_000_000,
    status: "verified",
    verified_by: "00000000-0000-0000-0000-000000000002",
    verified_at: NOW,
    rejection_note: null,
    attachment_path: null,
    submitted_ip_hash: "demo",
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_PROJECT_DOCUMENTS: ProjectDocumentRow[] = [
  {
    id: "pdoc-001",
    project_id: "prj-001",
    doc_type: "SOW",
    doc_number: "SOW/ALT/2026/11/001",
    title: "Scope of Work Portal Distribusi Sinar Niaga",
    version: 1,
    content_json: { summary: "Ruang lingkup teknis, arsitektur, & jadwal 12 minggu" },
    is_signed: true,
    signed_storage_path: "demo/sow-signed.pdf",
    visible_to_buyer: true,
    uploaded_by: "00000000-0000-0000-0000-000000000002",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "pdoc-002",
    project_id: "prj-001",
    doc_type: "SPK",
    doc_number: "SPK/ALT/2026/11/001",
    title: "Surat Perjanjian Kerja Sama Pengembangan Perangkat Lunak",
    version: 1,
    content_json: { summary: "Kontrak Rp120.000.000 dalam 3 termin pembayaran" },
    is_signed: true,
    signed_storage_path: "demo/spk-signed.pdf",
    visible_to_buyer: true,
    uploaded_by: "00000000-0000-0000-0000-000000000002",
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_MILESTONES: MilestoneRow[] = [
  {
    id: "ms-001",
    project_id: "prj-001",
    sequence_no: 1,
    name: "Termin 1 — Uang Muka (DP 25%)",
    is_down_payment: true,
    is_final_settlement: false,
    percentage: 25,
    amount: 30_000_000,
    achievement_criteria: "Penandatanganan SPK & Kickoff Proyek",
    status: "paid",
    created_at: NOW,
  },
  {
    id: "ms-002",
    project_id: "prj-001",
    sequence_no: 2,
    name: "Termin 2 — Kemajuan Pekerjaan (37,5%)",
    is_down_payment: false,
    is_final_settlement: false,
    percentage: 37.5,
    amount: 45_000_000,
    achievement_criteria: "Modul Katalog & Pemesanan selesai di Staging + BAKP disetujui",
    status: "in_progress",
    created_at: NOW,
  },
  {
    id: "ms-003",
    project_id: "prj-001",
    sequence_no: 3,
    name: "Termin 3 — Pelunasan Akhir (37,5%)",
    is_down_payment: false,
    is_final_settlement: true,
    percentage: 37.5,
    amount: 45_000_000,
    achievement_criteria: "UAT diterima & BAST ditandatangani kedua belah pihak",
    status: "planned",
    created_at: NOW,
  },
];

export const DEMO_PROGRESS_REPORTS: ProgressReportRow[] = [];
export const DEMO_UAT_CHECKLISTS: UatChecklistRow[] = [];
export const DEMO_UAT_ITEMS: UatItemRow[] = [];
export const DEMO_HANDOVER_REPORTS: HandoverReportRow[] = [];
export const DEMO_PROJECT_PROGRESS: ProjectProgressRow[] = [];

export const DEMO_SALES_INVOICES: SalesInvoiceRow[] = [
  {
    id: "inv-001",
    invoice_number: "INV/ALT/2026/11/001",
    invoice_date: "2026-11-01",
    due_date: "2026-11-08",
    project_id: "prj-001",
    customer_id: "cst-001",
    milestone_id: "ms-001",
    client_po_id: "cpo-001",
    bakp_id: null,
    bast_id: null,
    invoice_kind: "down_payment",
    subtotal_amount: 30_000_000,
    ppn_amount: 0,
    total_amount: 30_000_000,
    paid_amount: 30_000_000,
    doc_status: "issued",
    payment_status: "paid",
    journal_id: "jrn-001",
    notes: "Tagihan Uang Muka (DP 25%) sesuai SPK/ALT/2026/11/001",
    created_by: "00000000-0000-0000-0000-000000000002",
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
  },
];

export const DEMO_RECEIPTS: ReceiptRow[] = [
  {
    id: "kw-001",
    receipt_number: "KW/ALT/2026/11/001",
    receipt_date: "2026-11-01",
    invoice_id: "inv-001",
    invoice_payment_id: "invpay-001",
    amount: 30_000_000,
    received_from: "PT Sinar Niaga Digital",
    created_at: "2026-11-01T10:00:00.000Z",
  },
];

export const DEMO_PROFIT_SHARING_SCHEMES: ProfitSharingSchemeRow[] = [
  {
    id: "pss-001",
    project_id: "prj-001",
    recipient_name: "Kas Pengembangan Perusahaan Altvira",
    recipient_user_id: null,
    percentage: 65,
    created_at: NOW,
  },
  {
    id: "pss-002",
    project_id: "prj-001",
    recipient_name: "Fajar Nugroho (Engineer)",
    recipient_user_id: "00000000-0000-0000-0000-000000000003",
    percentage: 35,
    created_at: NOW,
  },
];

export const DEMO_PROFIT_SHARING_RESULTS: ProfitSharingResultRow[] = [];
export const DEMO_PROFIT_SHARING_LINES: ProfitSharingLineRow[] = [];

export const DEMO_AUDIT_LOGS: AuditLogRow[] = [
  {
    id: 1,
    actor_id: "00000000-0000-0000-0000-000000000001",
    actor_role: "super_admin",
    action: "INSERT",
    entity_name: "company_profile",
    entity_id: "1",
    old_data: null,
    new_data: { company_name: "Altvira Technology", pkp_enabled: false },
    created_at: NOW,
  },
  {
    id: 2,
    actor_id: "00000000-0000-0000-0000-000000000002",
    actor_role: "admin",
    action: "VERIFY_PO",
    entity_name: "client_purchase_orders",
    entity_id: "cpo-001",
    old_data: null,
    new_data: { po_number: "PO-202611-SN8K4P", status: "verified" },
    created_at: NOW,
  },
];
