import * as React from "react";
import { toast } from "sonner";

export type Language = "id" | "en";

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_KEY = "altcycles_language";

const DICTIONARY: Record<Language, Record<string, string>> = {
  id: {
    // Navigasi & Shell Header
    "nav.home": "Beranda",
    "nav.dashboard": "Dashboard Keuangan",
    "nav.dashboard_system": "Dashboard Sistem",
    "nav.approvals": "Persetujuan Pembayaran",
    "nav.vendor_po": "PO Pembelian Vendor",
    "nav.project_budget": "Budgeting Proyek",
    "nav.client_projects": "Proyek Klien & Termin",
    "nav.invoicing": "Invoice & Penagihan",
    "nav.profit_sharing": "Bagi Hasil Proyek",
    "nav.accounting": "Akuntansi & Laporan",
    "nav.parties": "Master Vendor & Klien",
    "nav.my_po": "PO Pembelian Saya",
    "nav.my_payments": "Pengajuan Pembayaran",
    "nav.company_profile": "Profil Perusahaan (Altvira)",
    "nav.admin_settings": "Administrasi & Penomoran",
    "nav.users_management": "Pengguna & Peran",
    "nav.accounting_controls": "Pengaturan & Kontrol Akuntansi",
    "nav.audit_trail": "Audit Trail",
    "nav.login_media": "Media & Banner Login",

    // Header & Role
    "header.notifications": "Notifikasi sistem",
    "header.theme": "Ganti mode tema",
    "header.language": "Pilihan Bahasa (Language)",
    "header.active_mode": "Mode Aktif",
    "header.role_switch": "Ganti peran aktif sistem",
    "role.super_admin": "Super Admin",
    "role.admin": "Bendahara",
    "role.user": "Anggota Tim",

    // Aksi Umum
    "action.save": "Simpan Perubahan",
    "action.cancel": "Batal",
    "action.add": "Tambah Data",
    "action.edit": "Ubah",
    "action.delete": "Hapus",
    "action.search": "Cari data...",
    "action.filter": "Saring",
    "action.download": "Unduh / Ekspor",
    "action.export": "Ekspor Dokumen",
    "action.close": "Tutup",
    "action.confirm": "Konfirmasi",

    // Dashboard Keuangan & Akuntansi (admin-dashboard)
    "dashboard.title": "Dasbor Keuangan & Akuntansi",
    "dashboard.subtitle": "Pantau likuiditas kas, kinerja laba rugi, piutang, dan aktivitas jurnal perusahaan.",
    "dashboard.kpi.ending_cash": "Kas & Bank Terkini",
    "dashboard.kpi.open_periods": "periode buku aktif terbuka",
    "dashboard.kpi.all_periods_closed": "Seluruh periode buku ditutup",
    "dashboard.kpi.pending_approvals": "Antrean Pembayaran",
    "dashboard.kpi.submissions": "Pengajuan",
    "dashboard.kpi.ready_disbursements": "siap dicairkan ke rekening",
    "dashboard.kpi.awaiting_verification": "menunggu verifikasi Anda",
    "dashboard.kpi.all_processed": "Semua pengajuan telah diproses",
    "dashboard.kpi.outstanding_receivables": "Piutang Belum Tertagih",
    "dashboard.kpi.invoices_awaiting_payment": "invoice menunggu pelunasan",
    "dashboard.kpi.client_pos_need_verification": "PO klien perlu verifikasi",
    "dashboard.kpi.all_receivables_managed": "Seluruh tagihan klien terkelola",
    "dashboard.kpi.contract_commitments": "Komitmen Kontrak",
    "dashboard.kpi.accumulated_from": "Akumulasi dari",
    "dashboard.kpi.client_projects": "proyek klien",

    // Pintasan Cepat Modul Keuangan
    "dashboard.shortcuts.title": "Pintasan Cepat Modul Keuangan",
    "dashboard.shortcuts.subtitle": "Akses langsung ke menu operasional, penagihan, dan pelaporan utama.",
    "dashboard.shortcuts.master_link": "Master Vendor & Klien",
    "dashboard.shortcuts.fund_approval": "Persetujuan Dana",
    "dashboard.shortcuts.fund_approval_desc": "Verifikasi & cairkan",
    "dashboard.shortcuts.projects_milestones": "Proyek & Termin",
    "dashboard.shortcuts.projects_milestones_desc": "SPK, BAKP, & UAT",
    "dashboard.shortcuts.invoices_receivables": "Invoice & Piutang",
    "dashboard.shortcuts.invoices_receivables_desc": "Tagihan & kuitansi",
    "dashboard.shortcuts.journals_gl": "Jurnal & Buku Besar",
    "dashboard.shortcuts.journals_gl_desc": "Catat transaksi keuangan",
    "dashboard.shortcuts.financial_reports": "Laporan Keuangan",
    "dashboard.shortcuts.financial_reports_desc": "Laba Rugi & Neraca",
    "dashboard.shortcuts.vendor_po": "PO Vendor",
    "dashboard.shortcuts.vendor_po_desc": "Pengadaan internal",
    "dashboard.shortcuts.project_budget": "Budgeting Proyek",
    "dashboard.shortcuts.project_budget_desc": "Pagu & realisasi",
    "dashboard.shortcuts.profit_sharing": "Bagi Hasil & Master",
    "dashboard.shortcuts.profit_sharing_desc": "Distribusi tim",

    // Grafik
    "dashboard.charts.trends_title": "Tren Pendapatan, Beban, & Arus Kas",
    "dashboard.charts.trends_subtitle": "Perbandingan pergerakan keuangan bulanan berdasarkan jurnal terposting.",
    "dashboard.charts.composition_title": "Komposisi Keuangan",
    "dashboard.charts.composition_subtitle": "Distribusi akun keuangan dan struktur kas perusahaan.",

    // Notifikasi Toast
    "lang.switched_id": "Bahasa sistem berhasil diubah ke Bahasa Indonesia.",
    "lang.switched_en": "System language switched to English.",
  },
  en: {
    // Navigasi & Shell Header
    "nav.home": "Home",
    "nav.dashboard": "Financial Dashboard",
    "nav.dashboard_system": "System Dashboard",
    "nav.approvals": "Payment Approvals",
    "nav.vendor_po": "Vendor Purchase Orders",
    "nav.project_budget": "Project Budgeting",
    "nav.client_projects": "Client Projects & Milestones",
    "nav.invoicing": "Invoicing & Billing",
    "nav.profit_sharing": "Project Profit Sharing",
    "nav.accounting": "Accounting & Reports",
    "nav.parties": "Vendors & Clients Master",
    "nav.my_po": "My Purchase Orders",
    "nav.my_payments": "Payment Requests",
    "nav.company_profile": "Company Profile (Altvira)",
    "nav.admin_settings": "Administration & Numbering",
    "nav.users_management": "Users & Roles",
    "nav.accounting_controls": "Accounting Controls & Setup",
    "nav.audit_trail": "Audit Trail",
    "nav.login_media": "Login Media & Banners",

    // Header & Role
    "header.notifications": "System Notifications",
    "header.theme": "Toggle theme mode",
    "header.language": "Language Options",
    "header.active_mode": "Active Mode",
    "header.role_switch": "Switch active system role",
    "role.super_admin": "Super Admin",
    "role.admin": "Treasurer",
    "role.user": "Team Member",

    // Aksi Umum
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.add": "Add Record",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.search": "Search records...",
    "action.filter": "Filter",
    "action.download": "Download / Export",
    "action.export": "Export Document",
    "action.close": "Close",
    "action.confirm": "Confirm",

    // Dashboard Keuangan & Akuntansi (admin-dashboard)
    "dashboard.title": "Financial & Accounting Dashboard",
    "dashboard.subtitle": "Monitor cash liquidity, profit & loss performance, receivables, and company journals.",
    "dashboard.kpi.ending_cash": "Cash & Bank Balance",
    "dashboard.kpi.open_periods": "active accounting periods open",
    "dashboard.kpi.all_periods_closed": "All accounting periods closed",
    "dashboard.kpi.pending_approvals": "Payment Approvals Queue",
    "dashboard.kpi.submissions": "Submissions",
    "dashboard.kpi.ready_disbursements": "ready for bank disbursement",
    "dashboard.kpi.awaiting_verification": "awaiting your verification",
    "dashboard.kpi.all_processed": "All submissions processed",
    "dashboard.kpi.outstanding_receivables": "Outstanding Receivables",
    "dashboard.kpi.invoices_awaiting_payment": "invoices awaiting settlement",
    "dashboard.kpi.client_pos_need_verification": "client POs need verification",
    "dashboard.kpi.all_receivables_managed": "All client billings managed",
    "dashboard.kpi.contract_commitments": "Contract Commitments",
    "dashboard.kpi.accumulated_from": "Accumulated from",
    "dashboard.kpi.client_projects": "client projects",

    // Pintasan Cepat Modul Keuangan
    "dashboard.shortcuts.title": "Quick Financial Shortcuts",
    "dashboard.shortcuts.subtitle": "Direct access to key operational, billing, and reporting modules.",
    "dashboard.shortcuts.master_link": "Vendors & Clients Master",
    "dashboard.shortcuts.fund_approval": "Fund Approvals",
    "dashboard.shortcuts.fund_approval_desc": "Verify & disburse",
    "dashboard.shortcuts.projects_milestones": "Projects & Milestones",
    "dashboard.shortcuts.projects_milestones_desc": "Contracts, BAKP & UAT",
    "dashboard.shortcuts.invoices_receivables": "Invoices & Receivables",
    "dashboard.shortcuts.invoices_receivables_desc": "Billing & receipts",
    "dashboard.shortcuts.journals_gl": "Journals & General Ledger",
    "dashboard.shortcuts.journals_gl_desc": "Record financial transactions",
    "dashboard.shortcuts.financial_reports": "Financial Reports",
    "dashboard.shortcuts.financial_reports_desc": "Income statement & balance sheet",
    "dashboard.shortcuts.vendor_po": "Vendor PO",
    "dashboard.shortcuts.vendor_po_desc": "Internal procurement",
    "dashboard.shortcuts.project_budget": "Project Budgeting",
    "dashboard.shortcuts.project_budget_desc": "Ceiling & realization",
    "dashboard.shortcuts.profit_sharing": "Profit Sharing & Master",
    "dashboard.shortcuts.profit_sharing_desc": "Team distribution",

    // Grafik
    "dashboard.charts.trends_title": "Revenue, Expense, & Cash Flow Trends",
    "dashboard.charts.trends_subtitle": "Monthly financial movements based on posted journals.",
    "dashboard.charts.composition_title": "Financial Composition",
    "dashboard.charts.composition_subtitle": "Distribution of financial accounts and cash structure.",

    // Notifikasi Toast
    "lang.switched_id": "Bahasa sistem berhasil diubah ke Bahasa Indonesia.",
    "lang.switched_en": "System language switched to English.",
  },
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(() => {
    if (typeof window === "undefined") return "id";
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    return saved === "id" || saved === "en" ? saved : "id";
  });

  const setLanguage = React.useCallback((nextLang: Language) => {
    setLanguageState(nextLang);
    try {
      localStorage.setItem(STORAGE_KEY, nextLang);
      document.documentElement.setAttribute("lang", nextLang);
    } catch {
      // Abaikan jika storage tidak tersedia
    }
    const message =
      nextLang === "id"
        ? DICTIONARY.id["lang.switched_id"]
        : DICTIONARY.en["lang.switched_en"];
    toast.success(message, { duration: 2500 });
  }, []);

  const toggleLanguage = React.useCallback(() => {
    const nextLang: Language = language === "id" ? "en" : "id";
    setLanguage(nextLang);
  }, [language, setLanguage]);

  React.useEffect(() => {
    try {
      document.documentElement.setAttribute("lang", language);
    } catch {
      // Abaikan
    }
  }, [language]);

  const t = React.useCallback(
    (key: string, fallback?: string): string => {
      const dict = DICTIONARY[language];
      const val = dict ? dict[key] : undefined;
      if (typeof val === "string") {
        return val;
      }
      return fallback !== undefined ? fallback : key;
    },
    [language],
  );

  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    return {
      language: "id",
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (_key: string, fallback?: string) => fallback ?? _key,
    };
  }
  return ctx;
}
