import type { UserRole } from "@/types/database.types";

export type ShortcutGroup = "general" | "navigation" | "quick_action";
export type ShortcutItemType = "page" | "tab" | "action";
export type ShortcutModule =
  | "dashboard"
  | "finance"
  | "accounting"
  | "projects"
  | "master"
  | "system"
  | "general";

export interface NavigationShortcutItem {
  id: string;
  type: ShortcutItemType;
  titleKey: string;
  fallbackTitle: string;
  module: ShortcutModule;
  moduleLabelKey: string;
  fallbackModuleLabel: string;
  iconName: string;
  route?: string;
  tabKey?: string;
  actionId?: string;
  allowedRoles: UserRole[];
  defaultKeys: string[];
  isLocked?: boolean;
  group: ShortcutGroup;
  aliases: {
    id: string[];
    en: string[];
  };
}

export const NAVIGATION_SHORTCUTS_REGISTRY: NavigationShortcutItem[] = [
  // ==========================================
  // 1. UMUM & SISTEM (GENERAL)
  // ==========================================
  {
    id: "general_open_command_palette",
    type: "action",
    titleKey: "common:search.open_palette",
    fallbackTitle: "Buka Command Palette",
    module: "general",
    moduleLabelKey: "common:search.modules.general",
    fallbackModuleLabel: "Umum",
    iconName: "Search",
    actionId: "open_command_palette",
    allowedRoles: ["super_admin", "admin", "user"],
    defaultKeys: ["/"],
    isLocked: true,
    group: "general",
    aliases: {
      id: ["cari", "pencarian", "palette", "menu cepat", "perintah"],
      en: ["search", "find", "command palette", "quick menu", "lookup"],
    },
  },
  {
    id: "general_close_active_modal",
    type: "action",
    titleKey: "common:action.close",
    fallbackTitle: "Tutup Modal / Panel Aktif",
    module: "general",
    moduleLabelKey: "common:search.modules.general",
    fallbackModuleLabel: "Umum",
    iconName: "X",
    actionId: "close_modal",
    allowedRoles: ["super_admin", "admin", "user"],
    defaultKeys: ["escape"],
    isLocked: true,
    group: "general",
    aliases: {
      id: ["tutup", "batal", "keluar"],
      en: ["close", "exit", "escape", "cancel"],
    },
  },
  {
    id: "action_open_shortcuts",
    type: "action",
    titleKey: "common:search.show_all_shortcuts",
    fallbackTitle: "Tampilkan semua pintasan keyboard",
    module: "general",
    moduleLabelKey: "common:search.modules.general",
    fallbackModuleLabel: "Umum",
    iconName: "Keyboard",
    actionId: "open_shortcuts_panel",
    allowedRoles: ["super_admin", "admin", "user"],
    defaultKeys: ["?"],
    isLocked: false,
    group: "general",
    aliases: {
      id: ["pintasan keyboard", "shortcut", "tombol cepat", "panduan tombol", "hotkey"],
      en: ["keyboard shortcuts", "shortcuts", "hotkeys", "keybindings", "quick keys"],
    },
  },

  // ==========================================
  // 2. NAVIGASI SUPER ADMIN
  // ==========================================
  {
    id: "nav_super_dashboard",
    type: "page",
    titleKey: "common:nav.dashboard_system",
    fallbackTitle: "Dashboard Sistem",
    module: "system",
    moduleLabelKey: "common:search.modules.system",
    fallbackModuleLabel: "Sistem Super Admin",
    iconName: "LayoutDashboard",
    route: "/super-admin/dashboard",
    allowedRoles: ["super_admin"],
    defaultKeys: ["g", "d"],
    group: "navigation",
    aliases: {
      id: ["dashboard sistem", "beranda super admin", "monitoring sistem", "status server"],
      en: ["system dashboard", "super admin home", "system monitoring", "server status"],
    },
  },
  {
    id: "nav_super_company_profile",
    type: "page",
    titleKey: "common:nav.company_profile",
    fallbackTitle: "Profil Perusahaan",
    module: "system",
    moduleLabelKey: "common:search.modules.system",
    fallbackModuleLabel: "Sistem Super Admin",
    iconName: "Building2",
    route: "/super-admin/profil-perusahaan",
    allowedRoles: ["super_admin"],
    defaultKeys: ["g", "c"],
    group: "navigation",
    aliases: {
      id: ["profil perusahaan", "altvira", "legalitas", "npwp", "alamat perusahaan", "ttd", "paraf"],
      en: ["company profile", "corporate details", "legal identity", "tax id", "signature", "initials"],
    },
  },
  {
    id: "nav_super_admin_settings",
    type: "page",
    titleKey: "common:nav.admin_settings",
    fallbackTitle: "Administrasi & Penomoran",
    module: "system",
    moduleLabelKey: "common:search.modules.system",
    fallbackModuleLabel: "Sistem Super Admin",
    iconName: "Settings",
    route: "/super-admin/administrasi",
    allowedRoles: ["super_admin"],
    defaultKeys: ["g", "s"],
    group: "navigation",
    aliases: {
      id: ["administrasi", "penomoran dokumen", "format nomor surat", "nomor invoice", "nomor po"],
      en: ["administration", "document numbering", "sequence numbering", "numbering format"],
    },
  },
  {
    id: "nav_super_users",
    type: "page",
    titleKey: "common:nav.users_management",
    fallbackTitle: "Pengguna & Peran",
    module: "system",
    moduleLabelKey: "common:search.modules.system",
    fallbackModuleLabel: "Sistem Super Admin",
    iconName: "Users",
    route: "/super-admin/pengguna",
    allowedRoles: ["super_admin"],
    defaultKeys: ["g", "u"],
    group: "navigation",
    aliases: {
      id: ["pengguna", "manajemen akun", "peran pengguna", "tambah user", "hak akses"],
      en: ["users", "roles", "user management", "team accounts", "access rights", "permissions"],
    },
  },
  {
    id: "nav_super_accounting_controls",
    type: "page",
    titleKey: "common:nav.accounting_controls",
    fallbackTitle: "Pengaturan & Kontrol Akuntansi",
    module: "system",
    moduleLabelKey: "common:search.modules.system",
    fallbackModuleLabel: "Sistem Super Admin",
    iconName: "BookOpen",
    route: "/super-admin/master-tinjau",
    allowedRoles: ["super_admin"],
    defaultKeys: ["g", "a"],
    group: "navigation",
    aliases: {
      id: ["kontrol akuntansi", "tinjau master", "kebijakan pembukuan", "kunci periode"],
      en: ["accounting controls", "master review", "bookkeeping policy", "period lock"],
    },
  },
  {
    id: "nav_super_audit_trail",
    type: "page",
    titleKey: "common:nav.audit_trail",
    fallbackTitle: "Audit Trail",
    module: "system",
    moduleLabelKey: "common:search.modules.system",
    fallbackModuleLabel: "Sistem Super Admin",
    iconName: "ShieldAlert",
    route: "/super-admin/audit-trail",
    allowedRoles: ["super_admin"],
    defaultKeys: ["g", "t"],
    group: "navigation",
    aliases: {
      id: ["audit trail", "log aktivitas", "rekam jejak", "riwayat perubahan", "audit log"],
      en: ["audit trail", "activity log", "change history", "system audit", "security log"],
    },
  },
  {
    id: "nav_super_login_media",
    type: "page",
    titleKey: "common:nav.login_media",
    fallbackTitle: "Media & Banner Login",
    module: "system",
    moduleLabelKey: "common:search.modules.system",
    fallbackModuleLabel: "Sistem Super Admin",
    iconName: "Image",
    route: "/super-admin/media-login",
    allowedRoles: ["super_admin"],
    defaultKeys: ["g", "l"],
    group: "navigation",
    aliases: {
      id: ["media login", "banner login", "gambar latar", "carousel login", "branding portal"],
      en: ["login media", "login banners", "background images", "portal branding"],
    },
  },
  {
    id: "nav_super_shortcuts",
    type: "page",
    titleKey: "common:nav.keyboard_shortcuts",
    fallbackTitle: "Pintasan Keyboard",
    module: "system",
    moduleLabelKey: "common:search.modules.system",
    fallbackModuleLabel: "Sistem Super Admin",
    iconName: "Keyboard",
    route: "/super-admin/pintasan-keyboard",
    allowedRoles: ["super_admin"],
    defaultKeys: ["g", "k"],
    group: "navigation",
    aliases: {
      id: ["atur pintasan", "konfigurasi keyboard", "shortcut management", "ganti hotkey"],
      en: ["keyboard shortcuts settings", "shortcuts management", "remap keys"],
    },
  },

  // ==========================================
  // 3. NAVIGASI ADMIN / BENDAHARA
  // ==========================================
  {
    id: "nav_admin_dashboard",
    type: "page",
    titleKey: "common:nav.dashboard",
    fallbackTitle: "Dashboard Keuangan",
    module: "dashboard",
    moduleLabelKey: "common:search.modules.dashboard",
    fallbackModuleLabel: "Dashboard",
    iconName: "LayoutDashboard",
    route: "/admin/dashboard",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "d"],
    group: "navigation",
    aliases: {
      id: ["dashboard keuangan", "ringkasan kas", "arus kas", "kpi keuangan", "beranda bendahara"],
      en: ["financial dashboard", "cash flow", "financial summary", "treasury home"],
    },
  },
  {
    id: "nav_admin_approvals",
    type: "page",
    titleKey: "common:nav.approvals",
    fallbackTitle: "Persetujuan Pembayaran",
    module: "finance",
    moduleLabelKey: "common:search.modules.operations",
    fallbackModuleLabel: "Operasional & PO",
    iconName: "HandCoins",
    route: "/admin/persetujuan",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "s"],
    group: "navigation",
    aliases: {
      id: ["persetujuan pembayaran", "approval kas", "verifikasi pengajuan", "disetujui", "tolak pengajuan"],
      en: ["payment approvals", "cash approval", "payment requests review", "approve", "reject"],
    },
  },
  {
    id: "nav_admin_po",
    type: "page",
    titleKey: "common:nav.vendor_po",
    fallbackTitle: "PO Pembelian Vendor",
    module: "finance",
    moduleLabelKey: "common:search.modules.operations",
    fallbackModuleLabel: "Operasional & PO",
    iconName: "ShoppingCart",
    route: "/admin/po-internal",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "p"],
    group: "navigation",
    aliases: {
      id: ["po pembelian vendor", "purchase order", "pesanan pembelian", "po internal", "vendor po"],
      en: ["vendor purchase orders", "purchase order", "internal po", "procurement"],
    },
  },
  {
    id: "nav_admin_budget",
    type: "page",
    titleKey: "common:nav.project_budget",
    fallbackTitle: "Budgeting Proyek",
    module: "finance",
    moduleLabelKey: "common:search.modules.operations",
    fallbackModuleLabel: "Operasional & PO",
    iconName: "Wallet",
    route: "/admin/anggaran",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "b"],
    group: "navigation",
    aliases: {
      id: ["budgeting proyek", "anggaran biaya", "realisasi anggaran", "alokasi dana", "rancangan biaya"],
      en: ["project budgeting", "cost allocation", "budget vs actual", "budget planning"],
    },
  },
  {
    id: "nav_admin_projects",
    type: "page",
    titleKey: "common:nav.client_projects",
    fallbackTitle: "Proyek Klien & Termin",
    module: "projects",
    moduleLabelKey: "common:search.modules.projects",
    fallbackModuleLabel: "Proyek & Pendapatan",
    iconName: "FolderKanban",
    route: "/admin/proyek",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "r"],
    group: "navigation",
    aliases: {
      id: ["proyek klien", "termin proyek", "nilai kontrak", "pekerjaan klien", "milestone"],
      en: ["client projects", "milestones", "project contracts", "client jobs"],
    },
  },
  {
    id: "nav_admin_invoicing",
    type: "page",
    titleKey: "common:nav.invoicing",
    fallbackTitle: "Invoice & Penagihan",
    module: "projects",
    moduleLabelKey: "common:search.modules.projects",
    fallbackModuleLabel: "Proyek & Pendapatan",
    iconName: "ReceiptText",
    route: "/admin/penagihan",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "i"],
    group: "navigation",
    aliases: {
      id: ["invoice penagihan", "tagihan klien", "piutang usaha", "faktur penjualan", "pelunasan"],
      en: ["invoicing and billing", "client invoices", "accounts receivable", "bills", "sales invoice"],
    },
  },
  {
    id: "nav_admin_profit_sharing",
    type: "page",
    titleKey: "common:nav.profit_sharing",
    fallbackTitle: "Bagi Hasil Proyek",
    module: "projects",
    moduleLabelKey: "common:search.modules.projects",
    fallbackModuleLabel: "Proyek & Pendapatan",
    iconName: "Coins",
    route: "/admin/bagi-hasil",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "h"],
    group: "navigation",
    aliases: {
      id: ["bagi hasil proyek", "alokasi pemodal", "profit sharing", "pembagian keuntungan", "klaim bagi hasil"],
      en: ["profit sharing", "investor allocation", "profit distribution", "dividend"],
    },
  },
  {
    id: "nav_admin_accounting",
    type: "page",
    titleKey: "common:nav.accounting",
    fallbackTitle: "Akuntansi & Laporan",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "Scale",
    route: "/admin/akuntansi",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "a"],
    group: "navigation",
    aliases: {
      id: ["akuntansi", "laporan keuangan", "pembukuan", "jurnal", "buku besar", "neraca"],
      en: ["accounting and reports", "financial reports", "bookkeeping", "ledger", "balance sheet"],
    },
  },
  {
    id: "nav_admin_master",
    type: "page",
    titleKey: "common:nav.parties",
    fallbackTitle: "Master Vendor & Klien",
    module: "master",
    moduleLabelKey: "common:search.modules.master",
    fallbackModuleLabel: "Master Data",
    iconName: "ClipboardList",
    route: "/admin/master",
    allowedRoles: ["admin"],
    defaultKeys: ["g", "m"],
    group: "navigation",
    aliases: {
      id: ["master vendor klien", "rekanan", "pihak ketiga", "daftar klien", "daftar vendor"],
      en: ["vendor and client master", "third parties", "client list", "vendor list"],
    },
  },

  // ==========================================
  // 4. SUB-TAB AKUNTANSI & LAPORAN (ADMIN)
  // ==========================================
  {
    id: "tab_accounting_journal",
    type: "tab",
    titleKey: "accounting:tab_journal",
    fallbackTitle: "Jurnal Umum",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "BookOpen",
    route: "/admin/akuntansi?tab=jurnal",
    tabKey: "jurnal",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["jurnal umum", "buku harian", "catat transaksi", "debit kredit", "riwayat jurnal"],
      en: ["general journal", "daily journal", "journal entries", "debit credit"],
    },
  },
  {
    id: "tab_accounting_ledger",
    type: "tab",
    titleKey: "accounting:tab_ledger",
    fallbackTitle: "Buku Besar",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "FileSpreadsheet",
    route: "/admin/akuntansi?tab=buku-besar",
    tabKey: "buku-besar",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["buku besar", "ledger", "mutasi akun", "kartu akun", "saldo per akun"],
      en: ["general ledger", "account ledger", "account activity", "ledger cards"],
    },
  },
  {
    id: "tab_accounting_trial_balance",
    type: "tab",
    titleKey: "accounting:tab_trial_balance",
    fallbackTitle: "Neraca Saldo",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "Scale",
    route: "/admin/akuntansi?tab=neraca-saldo",
    tabKey: "neraca-saldo",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["neraca saldo", "trial balance", "keseimbangan debit kredit", "neraca lajur"],
      en: ["trial balance", "debit credit balance", "worksheet balance"],
    },
  },
  {
    id: "tab_accounting_adjustments",
    type: "tab",
    titleKey: "accounting:tab_adjustments",
    fallbackTitle: "Jurnal Penyesuaian",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "FileSignature",
    route: "/admin/akuntansi?tab=penyesuaian",
    tabKey: "penyesuaian",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["jurnal penyesuaian", "adjusting entries", "penyusutan", "akrual", "deferral"],
      en: ["adjusting journal", "adjusting entries", "depreciation", "accruals", "deferrals"],
    },
  },
  {
    id: "tab_accounting_reports",
    type: "tab",
    titleKey: "accounting:tab_reports",
    fallbackTitle: "Laporan Keuangan",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "BarChart3",
    route: "/admin/akuntansi?tab=laporan",
    tabKey: "laporan",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["laporan keuangan", "laba rugi", "neraca", "arus kas", "perubahan ekuitas", "financial statements"],
      en: ["financial reports", "income statement", "balance sheet", "cash flow statement", "equity"],
    },
  },
  {
    id: "tab_accounting_closing",
    type: "tab",
    titleKey: "accounting:tab_closing",
    fallbackTitle: "Tutup Buku",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "Lock",
    route: "/admin/akuntansi?tab=tutup-buku",
    tabKey: "tutup-buku",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["tutup buku", "closing book", "tutup periode", "laba ditahan", "akhir tahun"],
      en: ["period closing", "closing entries", "year end closing", "retained earnings"],
    },
  },
  {
    id: "tab_accounting_coa",
    type: "tab",
    titleKey: "accounting:tab_coa",
    fallbackTitle: "Bagan Akun (CoA)",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "ListTree",
    route: "/admin/akuntansi?tab=coa",
    tabKey: "coa",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["bagan akun", "chart of accounts", "coa", "nomor akun", "daftar kode akun", "struktur rekening"],
      en: ["chart of accounts", "coa", "account codes", "account list", "account tree"],
    },
  },
  {
    id: "tab_accounting_periods",
    type: "tab",
    titleKey: "accounting:tab_period",
    fallbackTitle: "Periode Akuntansi",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "Calendar",
    route: "/admin/akuntansi?tab=periode",
    tabKey: "periode",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["periode akuntansi", "buka periode", "kunci bulan", "kalender pembukuan", "bulan buku"],
      en: ["accounting periods", "open period", "close period", "bookkeeping month"],
    },
  },

  // ==========================================
  // 5. SUB-TAB MASTER DATA (ADMIN)
  // ==========================================
  {
    id: "tab_master_clients",
    type: "tab",
    titleKey: "master:tab_clients",
    fallbackTitle: "Master Klien",
    module: "master",
    moduleLabelKey: "common:search.modules.master",
    fallbackModuleLabel: "Master Data",
    iconName: "Users",
    route: "/admin/master?tab=klien",
    tabKey: "klien",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["master klien", "data customer", "pelanggan", "instansi klien", "daftar pembeli"],
      en: ["client master", "customer data", "clients list", "client contacts"],
    },
  },
  {
    id: "tab_master_vendors",
    type: "tab",
    titleKey: "master:tab_vendors",
    fallbackTitle: "Master Vendor",
    module: "master",
    moduleLabelKey: "common:search.modules.master",
    fallbackModuleLabel: "Master Data",
    iconName: "Building",
    route: "/admin/master?tab=vendor",
    tabKey: "vendor",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["master vendor", "data supplier", "penyedia jasa", "daftar pemasok", "vendor list"],
      en: ["vendor master", "supplier data", "suppliers list", "vendor contacts"],
    },
  },
  {
    id: "tab_master_categories",
    type: "tab",
    titleKey: "master:tab_categories",
    fallbackTitle: "Kategori Biaya & Beban",
    module: "master",
    moduleLabelKey: "common:search.modules.master",
    fallbackModuleLabel: "Master Data",
    iconName: "Tag",
    route: "/admin/master?tab=kategori",
    tabKey: "kategori",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["kategori biaya", "beban operasional", "klasifikasi pengeluaran", "expense category"],
      en: ["expense categories", "cost category", "spending classification"],
    },
  },
  {
    id: "tab_master_taxes",
    type: "tab",
    titleKey: "master:tab_taxes",
    fallbackTitle: "Konfigurasi Pajak (PPN/PPh)",
    module: "master",
    moduleLabelKey: "common:search.modules.master",
    fallbackModuleLabel: "Master Data",
    iconName: "Receipt",
    route: "/admin/master?tab=pajak",
    tabKey: "pajak",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["konfigurasi pajak", "ppn 11", "pph 23", "pph 21", "tarif pajak", "tax rate"],
      en: ["tax configuration", "vat", "withholding tax", "income tax rates"],
    },
  },
  {
    id: "tab_master_banks",
    type: "tab",
    titleKey: "master:tab_banks",
    fallbackTitle: "Rekening Bank Perusahaan",
    module: "master",
    moduleLabelKey: "common:search.modules.master",
    fallbackModuleLabel: "Master Data",
    iconName: "CreditCard",
    route: "/admin/master?tab=bank",
    tabKey: "bank",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "navigation",
    aliases: {
      id: ["rekening bank", "bank jago", "bca", "mandiri", "nomor rekening", "tujuan transfer"],
      en: ["bank accounts", "company bank", "bank details", "account numbers"],
    },
  },

  // ==========================================
  // 6. NAVIGASI USER / ANGGOTA TIM
  // ==========================================
  {
    id: "nav_user_dashboard",
    type: "page",
    titleKey: "common:nav.user_dashboard",
    fallbackTitle: "Dashboard & Bagi Hasil",
    module: "dashboard",
    moduleLabelKey: "common:search.modules.dashboard",
    fallbackModuleLabel: "Dashboard",
    iconName: "LayoutDashboard",
    route: "/user/dashboard",
    allowedRoles: ["user"],
    defaultKeys: ["g", "d"],
    group: "navigation",
    aliases: {
      id: ["dashboard karyawan", "beranda tim", "bagi hasil saya", "klaim saya"],
      en: ["team dashboard", "my dashboard", "my profit sharing", "my claims"],
    },
  },
  {
    id: "nav_user_po",
    type: "page",
    titleKey: "common:nav.my_po",
    fallbackTitle: "PO Pembelian Saya",
    module: "finance",
    moduleLabelKey: "common:search.modules.operations",
    fallbackModuleLabel: "Operasional & PO",
    iconName: "ShoppingCart",
    route: "/user/po",
    allowedRoles: ["user"],
    defaultKeys: ["g", "p"],
    group: "navigation",
    aliases: {
      id: ["po pembelian saya", "po tim", "pengajuan pembelian barang", "pesanan saya"],
      en: ["my purchase orders", "my po", "procurement requests"],
    },
  },
  {
    id: "nav_user_payments",
    type: "page",
    titleKey: "common:nav.my_payments",
    fallbackTitle: "Pengajuan Pembayaran",
    module: "finance",
    moduleLabelKey: "common:search.modules.operations",
    fallbackModuleLabel: "Operasional & PO",
    iconName: "HandCoins",
    route: "/user/pembayaran",
    allowedRoles: ["user"],
    defaultKeys: ["g", "s"],
    group: "navigation",
    aliases: {
      id: ["pengajuan pembayaran", "reimbursement", "klaim dana", "permintaan bayar"],
      en: ["payment requests", "reimbursements", "expense claims"],
    },
  },
  {
    id: "nav_user_budget",
    type: "page",
    titleKey: "common:nav.my_budget",
    fallbackTitle: "Anggaran Proyek Saya",
    module: "finance",
    moduleLabelKey: "common:search.modules.operations",
    fallbackModuleLabel: "Operasional & PO",
    iconName: "Wallet",
    route: "/user/anggaran",
    allowedRoles: ["user"],
    defaultKeys: ["g", "b"],
    group: "navigation",
    aliases: {
      id: ["anggaran proyek saya", "plafon anggaran tim", "budget proyek"],
      en: ["my project budget", "team budget", "budget limit"],
    },
  },

  // ==========================================
  // 7. AKSI CEPAT (QUICK ACTIONS)
  // ==========================================
  {
    id: "action_record_transaction",
    type: "action",
    titleKey: "accounting:record_transaction",
    fallbackTitle: "Catat Transaksi Jurnal",
    module: "accounting",
    moduleLabelKey: "common:search.modules.accounting",
    fallbackModuleLabel: "Akuntansi & Laporan",
    iconName: "PlusCircle",
    route: "/admin/akuntansi?action=catat-transaksi",
    actionId: "record_transaction",
    allowedRoles: ["admin"],
    defaultKeys: ["mod", "shift", "j"],
    group: "quick_action",
    aliases: {
      id: ["catat transaksi", "tambah jurnal", "posting jurnal", "input transaksi baru", "buat jurnal"],
      en: ["record transaction", "new journal entry", "add transaction", "post journal"],
    },
  },
  {
    id: "action_create_po",
    type: "action",
    titleKey: "common:search.actions.create_po",
    fallbackTitle: "Buat PO Pembelian Baru",
    module: "finance",
    moduleLabelKey: "common:search.modules.operations",
    fallbackModuleLabel: "Operasional & PO",
    iconName: "PlusCircle",
    route: "/admin/po-internal?action=create-po",
    actionId: "create_po",
    allowedRoles: ["admin", "user"],
    defaultKeys: ["mod", "shift", "p"],
    group: "quick_action",
    aliases: {
      id: ["buat po", "tambah po", "order pembelian", "beli barang vendor", "pengajuan po baru"],
      en: ["create po", "new purchase order", "add purchase order", "vendor order"],
    },
  },
  {
    id: "action_create_invoice",
    type: "action",
    titleKey: "common:search.actions.create_invoice",
    fallbackTitle: "Buat Tagihan / Invoice Baru",
    module: "projects",
    moduleLabelKey: "common:search.modules.projects",
    fallbackModuleLabel: "Proyek & Pendapatan",
    iconName: "PlusCircle",
    route: "/admin/penagihan?action=create-invoice",
    actionId: "create_invoice",
    allowedRoles: ["admin"],
    defaultKeys: [],
    group: "quick_action",
    aliases: {
      id: ["buat invoice", "tambah tagihan", "tagih klien", "faktur baru", "buat invoice termin"],
      en: ["create invoice", "new invoice", "bill client", "new billing invoice"],
    },
  },
];

/**
 * Mengambil seluruh entri yang diperbolehkan untuk role tertentu
 */
export function getShortcutsForRole(role: UserRole): NavigationShortcutItem[] {
  return NAVIGATION_SHORTCUTS_REGISTRY.filter((item) => item.allowedRoles.includes(role));
}

/**
 * Daftar ID fallback halaman bawaan bila riwayat kunjungan pengguna masih kosong
 */
export function getDefaultFrequentFallback(role: UserRole): string[] {
  switch (role) {
    case "super_admin":
      return [
        "nav_super_dashboard",
        "nav_super_users",
        "nav_super_company_profile",
        "nav_super_audit_trail",
        "nav_super_admin_settings",
      ];
    case "admin":
      return [
        "nav_admin_dashboard",
        "nav_admin_accounting",
        "nav_admin_invoicing",
        "nav_admin_projects",
        "nav_admin_approvals",
      ];
    case "user":
      return [
        "nav_user_dashboard",
        "nav_user_po",
        "nav_user_payments",
        "nav_user_budget",
      ];
  }
}

/**
 * Pencarian toleran (fuzzy / substring) melintasi judul, tab, dan alias ID serta EN
 */
export function searchRegistry(
  query: string,
  role: UserRole,
  t?: (key: string, fallback?: string) => string,
  useEffective: boolean = true,
): NavigationShortcutItem[] {
  const allowedItems = useEffective ? getEffectiveShortcuts(role) : getShortcutsForRole(role);
  const cleanQuery = query.trim().toLowerCase();

  if (!cleanQuery) {
    return allowedItems;
  }

  return allowedItems.filter((item) => {
    // 1. Cek judul i18n atau fallback
    const resolvedTitle = t ? t(item.titleKey, item.fallbackTitle) : item.fallbackTitle;
    if (resolvedTitle.toLowerCase().includes(cleanQuery)) {
      return true;
    }
    if (item.fallbackTitle.toLowerCase().includes(cleanQuery)) {
      return true;
    }

    // 2. Cek label modul
    const resolvedModule = t ? t(item.moduleLabelKey, item.fallbackModuleLabel) : item.fallbackModuleLabel;
    if (resolvedModule.toLowerCase().includes(cleanQuery)) {
      return true;
    }

    // 3. Cek rute atau tab
    if (item.route?.toLowerCase().includes(cleanQuery)) {
      return true;
    }
    if (item.tabKey?.toLowerCase().includes(cleanQuery)) {
      return true;
    }

    // 4. Cek alias Indonesia
    if (item.aliases.id.some((alias) => alias.toLowerCase().includes(cleanQuery))) {
      return true;
    }

    // 5. Cek alias English
    if (item.aliases.en.some((alias) => alias.toLowerCase().includes(cleanQuery))) {
      return true;
    }

    return false;
  });
}

/**
 * Kunci penyimpanan lokal untuk override pintasan kustom oleh Super Admin
 */
export const SHORTCUT_OVERRIDES_KEY = "altcycles_shortcut_overrides_v1";

export type ShortcutOverridesMap = Record<string, string[]>;

/**
 * Daftar kombinasi tombol yang dilindungi oleh peramban web dan sistem operasi.
 * Kombinasi ini DILARANG dijadikan shortcut agar fungsi native browser (Ctrl+C, Ctrl+T, Ctrl+W, dll)
 * tidak pernah terinterupsi.
 */
export const BROWSER_RESERVED_COMBOS = new Set([
  // Clipboard & basic editing
  "mod+c",
  "ctrl+c",
  "mod+v",
  "ctrl+v",
  "mod+x",
  "ctrl+x",
  "mod+a",
  "ctrl+a",
  "mod+z",
  "ctrl+z",
  "mod+y",
  "ctrl+y",
  "mod+shift+z",
  "ctrl+shift+z",
  // Tabs & Windows
  "mod+t",
  "ctrl+t",
  "mod+w",
  "ctrl+w",
  "mod+n",
  "ctrl+n",
  "mod+shift+n",
  "ctrl+shift+n",
  "mod+shift+t",
  "ctrl+shift+t",
  "mod+tab",
  "ctrl+tab",
  "mod+shift+tab",
  "ctrl+shift+tab",
  // Page Navigation & Browser Functions
  "mod+r",
  "ctrl+r",
  "ctrl+f5",
  "f5",
  "mod+f",
  "ctrl+f",
  "mod+g",
  "ctrl+g",
  "mod+p",
  "ctrl+p",
  "mod+s",
  "ctrl+s",
  "mod+h",
  "ctrl+h",
  "mod+j",
  "ctrl+j",
  "mod+d",
  "ctrl+d",
  "mod+l",
  "ctrl+l",
  "mod+u",
  "ctrl+u",
  "mod+q",
  "ctrl+q",
  "escape",
  // DevTools
  "f12",
  "f11",
  "mod+shift+i",
  "ctrl+shift+i",
  "mod+shift+j",
  "ctrl+shift+j",
  "mod+shift+c",
  "ctrl+shift+c",
]);

/**
 * Mengambil map override kustom pintasan keyboard dari storage
 */
export function getShortcutOverrides(): ShortcutOverridesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SHORTCUT_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const cleanMap: ShortcutOverridesMap = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (
        Array.isArray(val) &&
        val.every((item) => typeof item === "string" && item.trim().length > 0)
      ) {
        cleanMap[key] = val.map((s) => s.toLowerCase().trim());
      }
    }
    return cleanMap;
  } catch {
    return {};
  }
}

/**
 * Menyimpan override kustom pintasan keyboard untuk entri tertentu
 */
export function saveShortcutOverride(id: string, newKeys: string[]): boolean {
  const target = NAVIGATION_SHORTCUTS_REGISTRY.find((it) => it.id === id);
  if (!target || target.isLocked) {
    return false;
  }

  // Tolak kombinasi tombol yang dilindungi peramban
  const normalizedKey = newKeys.map((k) => k.toLowerCase().trim()).join("+");
  if (BROWSER_RESERVED_COMBOS.has(normalizedKey)) {
    return false;
  }

  // Tolak huruf 'g' tunggal tanpa huruf kedua (agar tidak membajak sekuens)
  if (newKeys.length === 1 && newKeys[0]?.toLowerCase().trim() === "g") {
    return false;
  }

  const overrides = getShortcutOverrides();
  overrides[id] = newKeys.map((k) => k.toLowerCase().trim());

  try {
    localStorage.setItem(SHORTCUT_OVERRIDES_KEY, JSON.stringify(overrides));
    // Trigger custom event agar seluruh listener aktif memperbarui binding secara real-time
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("altcycles:shortcuts-updated"));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Mengembalikan satu pintasan ke pengaturan tombol bawaan
 */
export function resetShortcutOverride(id: string): void {
  const overrides = getShortcutOverrides();
  delete overrides[id];
  try {
    localStorage.setItem(SHORTCUT_OVERRIDES_KEY, JSON.stringify(overrides));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("altcycles:shortcuts-updated"));
    }
  } catch {
    // Abaikan
  }
}

/**
 * Mengembalikan seluruh pintasan ke pengaturan bawaan pabrik
 */
export function resetAllShortcutOverrides(): void {
  try {
    localStorage.removeItem(SHORTCUT_OVERRIDES_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("altcycles:shortcuts-updated"));
    }
  } catch {
    // Abaikan
  }
}

/**
 * Memeriksa apakah kombinasi tombol yang diusulkan bentrok dengan pintasan lain pada role yang sama
 */
export function checkShortcutConflict(
  itemId: string,
  proposedKeys: string[],
): { hasConflict: boolean; conflictingItem?: NavigationShortcutItem } {
  if (!proposedKeys || proposedKeys.length === 0) {
    return { hasConflict: false };
  }

  const targetItem = NAVIGATION_SHORTCUTS_REGISTRY.find((it) => it.id === itemId);
  if (!targetItem) return { hasConflict: false };

  const overrides = getShortcutOverrides();
  const normalizedProposed = proposedKeys.map((k) => k.toLowerCase().trim()).join("+");

  for (const item of NAVIGATION_SHORTCUTS_REGISTRY) {
    if (item.id === itemId) continue;

    // Cek irisan hak akses role
    const hasRoleOverlap = item.allowedRoles.some((r) => targetItem.allowedRoles.includes(r));
    if (!hasRoleOverlap) continue;

    const effectiveKeys = (overrides[item.id] && !item.isLocked ? overrides[item.id] : item.defaultKeys) || [];
    if (effectiveKeys.length === 0) continue;

    const normalizedItemKeys = effectiveKeys.map((k) => k.toLowerCase().trim()).join("+");
    if (normalizedItemKeys === normalizedProposed) {
      return { hasConflict: true, conflictingItem: item };
    }
  }

  return { hasConflict: false };
}

/**
 * Mendapatkan seluruh pintasan efektif untuk role tertentu setelah memperhitungkan override kustom
 */
export function getEffectiveShortcuts(role: UserRole): NavigationShortcutItem[] {
  const baseItems = getShortcutsForRole(role);
  const overrides = getShortcutOverrides();

  return baseItems.map((item) => {
    if (item.isLocked) {
      return item;
    }
    const override = overrides[item.id];
    if (override && Array.isArray(override) && override.length > 0) {
      return {
        ...item,
        defaultKeys: override,
      };
    }
    return item;
  });
}

/**
 * Mendeteksi apakah peramban pengguna berjalan di lingkungan Apple macOS / iOS
 */
export function isMacPlatform(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const platform = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPod|iPad/i.test(platform) || /Macintosh|Mac OS X/i.test(ua);
}

/**
 * Format kombinasi tombol untuk presentasi visual badge keyboard
 */
export function formatShortcutDisplay(
  keys: string[],
  isMac: boolean,
  lang: string = "id",
): {
  isSequence: boolean;
  parts: string[];
  sequenceThenText?: string;
} {
  if (!keys || keys.length === 0) {
    return { isSequence: false, parts: [] };
  }

  const firstKey = keys[0];
  const secondKey = keys[1];
  const isSequence = keys.length === 2 && firstKey?.toLowerCase() === "g";
  const thenText = lang.startsWith("en") ? "then" : "lalu";

  if (isSequence && firstKey && secondKey) {
    return {
      isSequence: true,
      parts: [firstKey.toUpperCase(), secondKey.toUpperCase()],
      sequenceThenText: thenText,
    };
  }

  const parts = keys.map((k) => {
    const lower = k.toLowerCase();
    if (lower === "mod") return isMac ? "⌘" : "Ctrl";
    if (lower === "ctrl" || lower === "control") return isMac ? "⌃" : "Ctrl";
    if (lower === "shift") return isMac ? "⇧" : "Shift";
    if (lower === "alt") return isMac ? "⌥" : "Alt";
    if (lower === "escape" || lower === "esc") return "Esc";
    if (lower === "enter") return isMac ? "↵" : "Enter";
    return lower.toUpperCase();
  });

  return { isSequence: false, parts };
}
