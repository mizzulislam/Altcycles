import * as React from "react";
import i18n, { type TOptions } from "i18next";
import { initReactI18next, useTranslation as useI18nextTranslation } from "react-i18next";
import { toast } from "sonner";
import commonId from "@/locales/id/common.json";
import commonEn from "@/locales/en/common.json";
import projectsId from "@/locales/id/projects.json";
import projectsEn from "@/locales/en/projects.json";
import invoicingId from "@/locales/id/invoicing.json";
import invoicingEn from "@/locales/en/invoicing.json";
import accountingId from "@/locales/id/accounting.json";
import accountingEn from "@/locales/en/accounting.json";
import poId from "@/locales/id/po.json";
import poEn from "@/locales/en/po.json";
import approvalsId from "@/locales/id/approvals.json";
import approvalsEn from "@/locales/en/approvals.json";
import budgetingId from "@/locales/id/budgeting.json";
import budgetingEn from "@/locales/en/budgeting.json";
import profitSharingId from "@/locales/id/profit_sharing.json";
import profitSharingEn from "@/locales/en/profit_sharing.json";
import dashboardId from "@/locales/id/dashboard.json";
import dashboardEn from "@/locales/en/dashboard.json";
import partiesId from "@/locales/id/parties.json";
import partiesEn from "@/locales/en/parties.json";
import settingsId from "@/locales/id/settings.json";
import settingsEn from "@/locales/en/settings.json";

export type Language = "id" | "en";

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, optionsOrFallback?: string | TOptions, fallback?: string) => string;
}

export const STORAGE_KEY = "altcycles_language";

export function getActiveLanguage(): Language {
  if (typeof window === "undefined") return "id";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    return saved === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

// Inisialisasi i18next Engine terpusat dengan namespaces modular
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      id: {
        common: commonId,
        projects: projectsId,
        invoicing: invoicingId,
        accounting: accountingId,
        po: poId,
        approvals: approvalsId,
        budgeting: budgetingId,
        profit_sharing: profitSharingId,
        dashboard: dashboardId,
        parties: partiesId,
        settings: settingsId,
      },
      en: {
        common: commonEn,
        projects: projectsEn,
        invoicing: invoicingEn,
        accounting: accountingEn,
        po: poEn,
        approvals: approvalsEn,
        budgeting: budgetingEn,
        profit_sharing: profitSharingEn,
        dashboard: dashboardEn,
        parties: partiesEn,
        settings: settingsEn,
      },
    },
    lng: getActiveLanguage(),
    fallbackLng: "id",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });
}

export const DICTIONARY: Record<Language, Record<string, string>> = {
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
    "nav.user_dashboard": "Dashboard & Bagi Hasil",
    "nav.my_po": "PO Pembelian Saya",
    "nav.my_payments": "Pengajuan Pembayaran",
    "nav.my_budget": "Anggaran Proyek Saya",
    "nav.company_profile": "Profil Perusahaan (Altvira)",
    "nav.admin_settings": "Administrasi & Penomoran",
    "nav.users_management": "Pengguna & Peran",
    "nav.accounting_controls": "Pengaturan & Kontrol Akuntansi",
    "nav.audit_trail": "Audit Trail",
    "nav.login_media": "Media & Banner Login",

    // Shell & Branding
    "app.tagline": "ERP Keuangan",
    "sidebar.open": "Buka sidebar",
    "sidebar.close": "Tutup sidebar",

    // Nav Groups
    "nav.group.operations": "Operasional & PO",
    "nav.group.projects": "Proyek & Pendapatan",

    // Header & User Menu
    "header.notifications": "Notifikasi sistem",
    "header.theme": "Ganti mode tema",
    "header.language": "Pilihan Bahasa (Language)",
    "header.active_mode": "Mode Aktif",
    "header.role_switch": "Ganti peran aktif sistem",
    "header.switching_mode": "Mengganti Mode Operasi...",
    "header.open_nav": "Buka menu navigasi",
    "role.super_admin": "Super Admin",
    "role.admin": "Bendahara",
    "role.user": "Anggota Tim",
    "user.my_profile": "Profil Saya",
    "user.profile_settings": "Pengaturan Profil",
    "user.logout": "Keluar dari Sesi",

    // Autentikasi & Halaman Login / Buat Akun
    "auth.signin_tab": "Masuk",
    "auth.signup_tab": "Buat Akun",
    "auth.signin_title": "Masuk ke Sistem",
    "auth.signin_subtitle": "Silakan masukkan username dan kata sandi Anda",
    "auth.signup_title": "Buat Akun Baru",
    "auth.signup_subtitle": "Daftarkan akun internal Altvira untuk mengakses portal kerja",
    "auth.full_name": "Nama Lengkap",
    "auth.full_name_placeholder": "Nama lengkap Anda",
    "auth.username": "Username",
    "auth.username_placeholder_signin": "nama@altvira.id atau username",
    "auth.username_placeholder_signup": "contoh: izzul atau nama@altvira.id",
    "auth.password": "Kata Sandi",
    "auth.forgot_password": "Lupa kata sandi?",
    "auth.password_placeholder_signin": "Masukkan kata sandi",
    "auth.password_placeholder_signup": "Minimal 6 karakter",
    "auth.confirm_password": "Konfirmasi Kata Sandi",
    "auth.confirm_password_placeholder": "Ulangi kata sandi",
    "auth.password_strength": "Kekuatan Kata Sandi:",
    "auth.strength_strong": "Kuat",
    "auth.strength_medium": "Sedang",
    "auth.strength_weak": "Lemah",
    "auth.password_criteria": "Ketentuan Kata Sandi:",
    "auth.criteria_min_length": "Minimal 8 karakter",
    "auth.criteria_upper": "Huruf kapital (A-Z)",
    "auth.criteria_lower": "Huruf kecil (a-z)",
    "auth.criteria_number": "Angka (0-9)",
    "auth.criteria_symbol": "Simbol khusus (!@#$%^&* dll)",
    "auth.signin_button": "Masuk ke Sistem",
    "auth.signup_button": "Buat Akun Sekarang",
    "auth.or_continue_with": "atau lanjutkan dengan",
    "auth.signin_google": "Masuk dengan Google",
    "auth.no_account": "Belum memiliki akun internal?",
    "auth.signup_here": "Buat Akun di sini",
    "auth.has_account": "Sudah memiliki akun terdaftar?",
    "auth.signin_here": "Masuk ke Sistem",
    "auth.buyer_portal_info": "Klien / Pembeli Proyek Altvira tidak memerlukan akun login:",
    "auth.buyer_portal_link": "Buka Portal Pembeli (Akses via Nomor PO)",
    "auth.demo_mode_title": "Mode Pratinjau Lokal Aktif",
    "auth.demo_mode_desc": "Pilih akun contoh untuk menguji masing-masing portal peran:",

    // Aksi Umum & Tombol
    "action.save": "Simpan Perubahan",
    "action.cancel": "Batal",
    "action.add": "Tambah Data",
    "action.edit": "Edit",
    "action.delete": "Hapus",
    "action.delete_selected": "Hapus Pilihan",
    "action.search": "Cari data...",
    "action.filter": "Saring",
    "action.download": "Unduh / Ekspor",
    "action.export": "Ekspor Dokumen",
    "action.close": "Tutup",
    "action.confirm": "Konfirmasi",
    "action.refresh": "Muat Ulang",
    "action.view": "Lihat",
    "action.details": "Rincian",
    "action.back": "Kembali",

    // Status Umum
    "status.all": "Semua Status",
    "status.active": "Aktif",
    "status.draft": "Draf",
    "status.on_hold": "Ditunda",
    "status.completed": "Selesai",
    "status.cancelled": "Dibatalkan",
    "status.pending": "Menunggu",
    "status.verified": "Terverifikasi",
    "status.paid": "Lunas",
    "status.unpaid": "Belum Lunas",

    // Kolom Tabel Umum
    "table.code": "Kode",
    "table.name": "Nama",
    "table.period": "Periode",
    "table.status": "Status",
    "table.actions": "Aksi",
    "table.category": "Kategori",
    "table.description": "Deskripsi",
    "table.date": "Tanggal",
    "table.amount": "Nominal",
    "table.unit": "Satuan",
    "table.contact": "Kontak",

    // Dashboard Keuangan (admin-dashboard)
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

    // Pintasan Dashboard
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
    "dashboard:charts.legend": "Keterangan",
    "dashboard.charts.trends_title": "Tren Pendapatan, Beban, & Arus Kas",
    "dashboard.charts.trends_subtitle": "Perbandingan pergerakan keuangan bulanan berdasarkan jurnal terposting.",
    "dashboard.charts.composition_title": "Komposisi Keuangan",
    "dashboard.charts.composition_subtitle": "Proporsi struktur keuangan dan likuiditas kas.",

    // Modul Proyek (projects-page)
    "projects.title": "Master Proyek & Penugasan Tim",
    "projects.subtitle": "Pantau proyek klien, penagihan termin, penugasan tim internal, dan metode pengakuan pendapatan.",
    "projects.card_title": "Daftar Proyek Altvira",
    "projects.card_desc": "Induk referensi PO pembelian, anggaran, termin penagihan, dan bagi hasil.",
    "projects.add_button": "Tambah Proyek",
    "projects.search_placeholder": "Cari kode atau nama proyek...",
    "projects.col_code": "Kode",
    "projects.col_name": "Nama Proyek",
    "projects.col_period": "Periode",
    "projects.col_contract_val": "Nilai Kontrak",
    "projects.col_milestones": "Termin",
    "projects.col_team": "Anggota Tim",
    "projects.col_status": "Status",
    "projects.col_actions": "Aksi",
    "projects.members_count": "Anggota",
    "projects.milestones_count": "Termin",
    "projects.empty_title": "Belum Ada Proyek",
    "projects.empty_desc": "Daftar proyek masih kosong. Tambahkan proyek baru untuk memulai siklus pengadaan dan penagihan.",

    // Modul Master Parties (Vendor, Pelanggan, Produk)
    "parties.title": "Master Data Vendor & Pelanggan",
    "parties.subtitle": "Kelola direktori mitra vendor pengadaan, basis data pelanggan resmi, serta katalog produk dan layanan profesional perusahaan.",
    "parties.tab_vendors": "Vendor",
    "parties.tab_customers": "Pelanggan / Klien",
    "parties.tab_products": "Produk / Layanan",
    "parties.vendor_title": "Daftar Vendor Pemasok",
    "parties.vendor_desc": "Vendor bukan pengguna sistem dan tidak memiliki akun login.",
    "parties.add_vendor": "Tambah Vendor",
    "parties.customer_title": "Daftar Pelanggan / Klien Resmi",
    "parties.customer_desc": "Basis data pelanggan untuk penerbitan penawaran harga, SPK, invoice penagihan, dan kuitansi.",
    "parties.add_customer": "Tambah Pelanggan",
    "parties.services_title": "Katalog Produk & Layanan Altvira",
    "parties.services_desc": "Daftar penawaran solusi teknologi, produk digital, dan paket layanan profesional Altvira.",
    "parties.add_service": "Tambah Layanan / Produk",
    "parties.col_vendor_name": "Nama Vendor",
    "parties.col_customer_name": "Nama Pelanggan",
    "parties.col_service_name": "Nama Layanan / Produk",
    "parties.col_contact": "PIC & Kontak",
    "parties.col_bank": "Rekening Bank",
    "parties.col_company_pic": "Perusahaan & PIC",
    "parties.col_category": "Kategori",
    "parties.col_desc": "Deskripsi",
    "parties.col_unit": "Satuan",
    "parties.col_base_rate": "Tarif Dasar",
    "parties.no_vendor": "Belum Ada Data Vendor",
    "parties.no_vendor_desc": "Daftar vendor pemasok masih kosong. Tambahkan vendor baru untuk kebutuhan PO Pembelian internal.",
    "parties.no_customer": "Belum Ada Data Pelanggan",
    "parties.no_customer_desc": "Daftar pelanggan / klien masih kosong. Tambahkan pelanggan untuk penerbitan proyek dan invoice resmi.",
    "parties.no_service": "Belum Ada Data Produk / Layanan",
    "parties.no_service_desc": "Katalog produk dan layanan Altvira masih kosong. Tambahkan paket atau penawaran baru untuk referensi transaksi & SPK proyek.",

    // Modul Invoice & Penagihan
    "invoicing.title": "Invoice & Penagihan Klien",
    "invoicing.subtitle": "Kelola penagihan uang muka, termin milestone, pelunasan final, serta penerbitan kuitansi ber-e-Meterai.",
    "invoicing.page_title": "Invoice Penagihan, Umur Piutang, & Kuitansi",
    "invoicing.page_desc": "Kelola invoice termin proyek, umur piutang, dan kuitansi resmi.",
    "invoicing.issue_invoice": "Terbitkan Invoice",
    "invoicing.tab_invoices": "Daftar Invoice",
    "invoicing.tab_aging": "Umur Piutang / Jatuh Tempo",
    "invoicing.tab_receipts": "Kuitansi Pembayaran",
    "invoicing.card_title": "Daftar Tagihan & Piutang Proyek",
    "invoicing.add_invoice": "Terbitkan Invoice",

    // Modul Persetujuan Pembayaran
    "approvals.title": "Persetujuan Pembayaran Dana",
    "approvals.subtitle": "Verifikasi dan persetujuan pencairan dana operasional PO pembelian serta klaim tim.",
    "approvals.page_title": "Persetujuan Pembayaran 1-Level & Pencairan Dana",
    "approvals.page_desc": "Verifikasi permohonan dana, persetujuan pengajuan, dan pencairan kas tim.",

    // Modul PO Internal
    "procurement.title": "Seluruh Purchase Order Pembelian Vendor",
    "procurement.my_title": "Purchase Order Pembelian Saya",
    "procurement.subtitle": "Kelola penerbitan, persetujuan status, dan dokumen purchase order vendor.",
    "procurement.my_subtitle": "Buat dan pantau pesanan pembelian pengadaan barang atau jasa proyek.",
    "procurement.create_po": "Buat PO Vendor",

    // Modul Akuntansi & Laporan
    "accounting.title": "Siklus Akuntansi & Laporan Keuangan",
    "accounting.subtitle": "Kelola bagan akun (CoA), jurnal umum, buku besar, penutupan periode, dan laporan keuangan komprehensif.",
    "accounting.tab_coa": "Setup Akuntansi",
    "accounting.tab_journals": "Jurnal Umum",
    "accounting.tab_ledger": "Buku Besar",
    "accounting.tab_trial_balance": "Neraca Saldo",
    "accounting.tab_adjusting": "Jurnal Penyesuaian",
    "accounting.tab_reports": "Laporan Keuangan",
    "accounting.tab_periods": "Tutup Buku",
    "accounting.filter_all_periods": "Semua Periode",
    "accounting.filter_this_month": "Bulan Ini",
    "accounting.filter_last_month": "Bulan Lalu",
    "accounting.filter_this_year": "Tahun Ini",
    "accounting.filter_custom": "Rentang Kustom",
    "accounting.filter_quick_preset": "Preset Waktu Cepat",
    "accounting.filter_custom_range": "Kustom Rentang Tanggal",
    "accounting.journal_history": "Riwayat Jurnal Umum",
    "accounting.journal_history_adj": "Riwayat Jurnal Penyesuaian & Koreksi",
    "accounting.journal_history_desc": "Daftar historis seluruh transaksi akuntansi keuangan secara kronologis.",
    "accounting.journal_history_adj_desc": "Kelola penyesuaian akrual, amortisasi, dan penerbitan jurnal koreksi transaksi dengan jejak audit.",
    "accounting.record_transaction": "Catat Transaksi",
    "accounting.record_adjusting": "Catat Jurnal Penyesuaian",
    "accounting.daily_journal_book": "Buku Jurnal Harian",
    "accounting.adj_journal_book": "Buku Jurnal Penyesuaian (AJP)",
    "accounting.order_label": "Urutan:",
    "accounting.order_newest": "Terbaru",
    "accounting.order_oldest": "Terlama",
    "accounting.th_account": "Akun",
    "accounting.th_date": "Tanggal",
    "accounting.th_description": "Deskripsi",
    "accounting.th_ref": "Ref",
    "accounting.th_debit": "Debit",
    "accounting.th_credit": "Kredit",
    "accounting.th_actions": "Aksi",
    "accounting.no_general_journal": "Belum ada transaksi jurnal umum pada periode ini",
    "accounting.no_adj_journal": "Belum ada Ayat Jurnal Penyesuaian (AJP)",
    "accounting.loading_journals": "Memuat buku jurnal...",
    "accounting.no_adj_desc": "Gunakan tombol 'Catat Jurnal Penyesuaian' untuk menambahkan penyesuaian beban akrual, amortisasi, atau pengakuan pendapatan sewa/jasa di muka.",
    "accounting.no_gen_desc": "Gunakan tombol 'Catat Transaksi' atau sesuaikan saringan periode dan proyek.",
    "accounting.filter_modal_title": "Saring Data Akuntansi & Periode",
    "accounting.accounting_assumptions": "Penerapan Asumsi Akuntansi Keuangan",
    "accounting.assumption_periodicity": "Periodisitas (Periodicity)",
    "accounting.assumption_periodicity_desc": "Membagi aktivitas ekonomi entitas ke dalam periode waktu bulanan/tahunan untuk penyajian laporan yang tepat waktu dan relevan.",
    "accounting.assumption_deferral": "Penangguhan (Deferral)",
    "accounting.assumption_deferral_desc": "Pendapatan diterima dimuka dicatat sebagai kewajiban dan direalisasikan bertahap menjadi pendapatan pada periode manfaat.",
    "accounting.assumption_accrual": "Asas Akrual (Accrual Basis)",
    "accounting.assumption_accrual_desc": "Mencatat pengaruh transaksi pada periode terjadinya, bukan sekadar saat kas diterima atau dikeluarkan, guna mencerminkan posisi keuangan yang andal.",
    "accounting.assumption_depreciation": "Depresiasi (Depreciation)",
    "accounting.assumption_depreciation_desc": "Mengalokasikan harga perolehan aset tetap secara berkala ke Beban Penyusutan berpasangan dengan Akumulasi Penyusutan.",

    // Laporan Keuangan Sub-Tab & Header
    "reports.accrual_title": "Laporan Keuangan Akrual",
    "reports.accrual_subtitle": "Sajikan laporan posisi keuangan, laba rugi, arus kas, dan neraca saldo berbasis akrual.",
    "reports.title": "Laporan Keuangan",
    "reports.subtitle": "Laporan Laba/Rugi, Perubahan Ekuitas, Neraca, dan Arus Kas.",
    "reports.tab_income": "Laba Rugi",
    "reports.tab_equity": "Perubahan Ekuitas",
    "reports.tab_balance": "Neraca",
    "reports.tab_cashflow": "Arus Kas",

    // Form Modal Jurnal & Koreksi
    "journal.modal_create_title": "Buat & Posting Jurnal Baru",
    "journal.modal_create_adj_title": "Buat & Posting Jurnal Penyesuaian (AJP)",
    "journal.modal_edit_title": "Edit Transaksi Jurnal",
    "journal.date": "Tanggal Jurnal",
    "journal.type": "Jenis Jurnal",
    "journal.type_general": "Jurnal Umum",
    "journal.type_adjustment": "Jurnal Penyesuaian (AJP)",
    "journal.description": "Keterangan",
    "journal.desc_placeholder": "Contoh: Penyesuaian beban sewa kantor bersama bulan berjalan",
    "journal.auto_reverse": "Tandai untuk Jurnal Pembalik Awal Periode Berikutnya (Opsional)",
    "journal.auto_reverse_desc": "Diterapkan otomatis pada saat proses Tutup Buku periode berjalan.",
    "journal.debit_side": "Sisi Debit",
    "journal.credit_side": "Sisi Kredit",
    "journal.add_account": "Tambah Akun",
    "journal.debit_account": "Akun Debit",
    "journal.credit_account": "Akun Kredit",
    "journal.select_debit": "-- Pilih Akun Debit --",
    "journal.select_credit": "-- Pilih Akun Kredit --",
    "journal.total_debit": "Total Debit",
    "journal.total_credit": "Total Kredit",
    "journal.empty_amount": "NOMINAL KOSONG",
    "journal.unbalanced": "TIDAK SEIMBANG",
    "journal.balanced": "SEIMBANG",
    "journal.difference": "SELISIH",
    "journal.btn_post": "Rekam Transaksi",
    "journal.correction_title": "Buat Jurnal Koreksi atas",
    "journal.correction_date": "Tanggal Jurnal Koreksi",
    "journal.correction_reason": "Alasan Koreksi (Minimal 5 Karakter)",
    "journal.correction_reason_placeholder": "Contoh: Koreksi salah pilih akun beban pada pencatatan sebelumnya...",
    "journal.btn_post_correction": "Posting Jurnal Koreksi",
    "journal.detail_title": "Detail Transaksi Jurnal",
    "journal.number": "Nomor Jurnal",
    "journal.accounts_list": "Daftar Akun & Mutasi:",
    "journal.account_and_desc": "Akun & Keterangan",
    "journal.total": "Total",
    "journal.btn_edit": "Ubah Transaksi",

    // Master Produk & Layanan, Pelanggan, Vendor
    "products.modal_add_title": "Tambah Layanan / Produk",
    "products.modal_edit_title": "Ubah Produk / Layanan",
    "products.code": "Kode Layanan",
    "products.category": "Kategori",
    "products.name": "Nama Layanan / Produk",
    "products.name_placeholder": "e.g. Pengembangan Portal Web Perusahaan",
    "products.unit": "Satuan",
    "products.unit_placeholder": "Proyek / Paket / Bulan",
    "products.price": "Tarif / Harga Dasar (IDR)",
    "products.description": "Deskripsi Ringkas",
    "products.desc_placeholder": "Keterangan cakupan penawaran solusi atau layanan...",
    "products.status_active": "Status Layanan Aktif",
    "products.btn_save": "Simpan Layanan / Produk",
    "products.toast_saved": "Data produk/layanan berhasil disimpan.",
    "customers.modal_add_title": "Tambah Pelanggan Baru",
    "customers.modal_edit_title": "Ubah Data Pelanggan",
    "customers.code": "Kode Pelanggan",
    "customers.name": "Nama Klien / Instansi",
    "customers.company_name": "Nama Perusahaan",
    "customers.pic": "PIC / Pejabat",
    "customers.pic_title": "Jabatan PIC",
    "customers.email": "Email",
    "customers.phone": "Telepon",
    "customers.address": "Alamat Lengkap",
    "customers.logo": "Logo Klien",
    "customers.signature": "TTD Klien",
    "customers.paraf": "Paraf Klien",
    "customers.status_active": "Status Pelanggan Aktif",
    "customers.btn_save": "Simpan Pelanggan",
    "vendors.modal_add_title": "Tambah Vendor Baru",
    "vendors.modal_edit_title": "Ubah Data Vendor",
    "vendors.code": "Kode Vendor",
    "vendors.name": "Nama Vendor / Penyedia",
    "vendors.company_name": "Nama Perusahaan",
    "vendors.pic": "Nama Kontak / PIC",
    "vendors.email": "Email",
    "vendors.phone": "Telepon",
    "vendors.bank_name": "Nama Bank",
    "vendors.account_number": "Nomor Rekening",
    "vendors.account_holder": "Atas Nama Rekening",
    "vendors.status_active": "Status Vendor Aktif",
    "vendors.btn_save": "Simpan Vendor",

    // Modul Budgeting
    "budget.title": "Budgeting & Pengendalian Anggaran Proyek",
    "budget.subtitle": "Kendalikan pagu anggaran belanja dan pantau realisasi pengeluaran proyek.",
    "budget.my_title": "Anggaran vs Realisasi Proyek Saya",
    "budget.my_subtitle": "Pantau pagu anggaran belanja dan realisasi pengeluaran proyek yang ditugaskan.",

    // Modul Bagi Hasil
    "profit_sharing.title": "Perhitungan & Finalisasi Bagi Hasil Proyek",
    "profit_sharing.subtitle": "Hitung pembagian laba bersih proyek bagi anggota tim dan finalisasi pencairan hak bagi hasil.",

    // Profil Perusahaan
    "company.page_title": "Profil Perusahaan (Altvira)",
    "company.page_desc": "Kelola identitas kop surat, logo resmi, rekening transfer, aset tanda tangan & paraf, akun sosial media footer dokumen, serta status perpajakan.",
    "company.tab_identity": "Identitas & Logo",
    "company.tab_accounts": "Rekening & TTD",
    "company.tab_social": "Sosial Media Footer",
    "company.tab_tax": "Status Perpajakan",

    // Super Admin Portal
    "super_admin.dashboard_title": "Dasbor Pengelola Sistem",
    "super_admin.dashboard_desc": "Pantau kesehatan sistem, aktivitas pengguna internal, dan konfigurasi master aplikasi.",
    "super_admin.kpi_users": "Pengguna Internal",
    "super_admin.kpi_users_sub": "Akses peran aktif dan terverifikasi",
    "super_admin.kpi_tax": "Status Perpajakan",
    "super_admin.pkp_active": "PKP Aktif",
    "super_admin.non_pkp": "Non-PKP",
    "super_admin.vat_rate": "Tarif PPN",
    "super_admin.vat_applied": "berlaku pada invoice",
    "super_admin.vat_none": "Faktur diterbitkan tanpa PPN",
    "super_admin.kpi_coa": "Bagan Akun Keuangan",
    "super_admin.accounts": "Akun",
    "super_admin.sak_standard": "Standar Akuntansi Keuangan",
    "super_admin.kpi_audit": "Jejak Audit Terbaru",
    "super_admin.logs": "Log",
    "super_admin.audit_saved": "Rekaman audit aktivitas tersimpan",
    "super_admin.company_profile_title": "Profil Perusahaan & Legalitas",
    "super_admin.users_title": "Manajemen Pengguna & Hak Akses",
    "super_admin.audit_title": "Audit Trail & Riwayat Perubahan",

    // User Portal
    "user_portal.dashboard_title": "Dasbor Anggota Tim",
    "user_portal.welcome": "Selamat datang",
    "user_portal.dashboard_desc": "Pantau penugasan proyek, pembayaran, dan hak bagi hasil Anda.",
    "user_portal.submit_payment": "Ajukan Pembayaran",
    "user_portal.kpi_projects": "Proyek Ditugaskan",
    "user_portal.kpi_projects_sub": "Terdaftar sebagai pelaksana proyek",
    "user_portal.kpi_projects_empty": "Belum ada penugasan aktif",
    "user_portal.projects_count": "Proyek",
    "user_portal.kpi_po": "PO Pembelian Vendor",
    "user_portal.kpi_po_sub": "Dokumen pengadaan barang/jasa",
    "user_portal.kpi_po_empty": "Belum ada PO pembelian tercatat",
    "user_portal.documents": "Dokumen",
    "user_portal.kpi_claims": "Pengajuan Pembayaran",
    "user_portal.submissions": "Pengajuan",
    "user_portal.pending_approval": "menunggu persetujuan Admin",
    "user_portal.approved_waiting": "disetujui menunggu transfer",
    "user_portal.all_processed": "Semua pengajuan telah diproses",
    "user_portal.kpi_sharing": "Hak Bagi Hasil",
    "user_portal.kpi_sharing_sub": "Akumulasi komitmen hak pelaksana proyek",
    "user_portal.from": "Dari",
    "user_portal.projects_completed": "proyek diselesaikan",
    "user_portal.my_po_title": "PO Pembelian Saya",
    "user_portal.my_payments_title": "Pengajuan Pembayaran Saya",

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
    "nav.user_dashboard": "Dashboard & Profit Sharing",
    "nav.my_po": "My Purchase Orders",
    "nav.my_payments": "Payment Requests",
    "nav.my_budget": "My Project Budget",
    "nav.company_profile": "Company Profile (Altvira)",
    "nav.admin_settings": "Administration & Numbering",
    "nav.users_management": "Users & Roles",
    "nav.accounting_controls": "Accounting Controls & Setup",
    "nav.audit_trail": "Audit Trail",
    "nav.login_media": "Login Media & Banners",

    // Shell & Branding
    "app.tagline": "Financial ERP",
    "sidebar.open": "Open sidebar",
    "sidebar.close": "Close sidebar",

    // Nav Groups
    "nav.group.operations": "Operations & PO",
    "nav.group.projects": "Projects & Revenue",

    // Header & User Menu
    "header.notifications": "System Notifications",
    "header.theme": "Toggle theme mode",
    "header.language": "Language Options",
    "header.active_mode": "Active Mode",
    "header.role_switch": "Switch active system role",
    "header.switching_mode": "Switching Operating Mode...",
    "header.open_nav": "Open navigation menu",
    "role.super_admin": "Super Admin",
    "role.admin": "Treasurer",
    "role.user": "Team Member",
    "user.my_profile": "My Profile",
    "user.profile_settings": "Profile Settings",
    "user.logout": "Sign Out",

    // Authentication & Sign In / Sign Up
    "auth.signin_tab": "Sign In",
    "auth.signup_tab": "Create Account",
    "auth.signin_title": "Sign In to System",
    "auth.signin_subtitle": "Please enter your username and password",
    "auth.signup_title": "Create New Account",
    "auth.signup_subtitle": "Register an internal Altvira account to access the workspace",
    "auth.full_name": "Full Name",
    "auth.full_name_placeholder": "Your full name",
    "auth.username": "Username",
    "auth.username_placeholder_signin": "name@altvira.id or username",
    "auth.username_placeholder_signup": "e.g.: izzul or name@altvira.id",
    "auth.password": "Password",
    "auth.forgot_password": "Forgot password?",
    "auth.password_placeholder_signin": "Enter password",
    "auth.password_placeholder_signup": "Minimum 6 characters",
    "auth.confirm_password": "Confirm Password",
    "auth.confirm_password_placeholder": "Repeat password",
    "auth.password_strength": "Password Strength:",
    "auth.strength_strong": "Strong",
    "auth.strength_medium": "Medium",
    "auth.strength_weak": "Weak",
    "auth.password_criteria": "Password Requirements:",
    "auth.criteria_min_length": "At least 8 characters",
    "auth.criteria_upper": "Uppercase letter (A-Z)",
    "auth.criteria_lower": "Lowercase letter (a-z)",
    "auth.criteria_number": "Number (0-9)",
    "auth.criteria_symbol": "Special characters (!@#$%^&* etc)",
    "auth.signin_button": "Sign In to System",
    "auth.signup_button": "Create Account Now",
    "auth.or_continue_with": "or continue with",
    "auth.signin_google": "Sign In with Google",
    "auth.no_account": "Don't have an internal account?",
    "auth.signup_here": "Register here",
    "auth.has_account": "Already have an account?",
    "auth.signin_here": "Sign in here",
    "auth.buyer_portal_info": "Altvira clients / project buyers do not require a login account:",
    "auth.buyer_portal_link": "Open Buyer Portal (Access via PO Number)",
    "auth.demo_mode_title": "Local Preview Mode Active",
    "auth.demo_mode_desc": "Select a demo account to test each role portal:",

    // Aksi Umum & Tombol
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.add": "Add Record",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.delete_selected": "Delete Selected",
    "action.search": "Search records...",
    "action.filter": "Filter",
    "action.download": "Download / Export",
    "action.export": "Export Document",
    "action.close": "Close",
    "action.confirm": "Confirm",
    "action.refresh": "Refresh",
    "action.view": "View",
    "action.details": "Details",
    "action.back": "Back",

    // Status Umum
    "status.all": "All Statuses",
    "status.active": "Active",
    "status.draft": "Draft",
    "status.on_hold": "On Hold",
    "status.completed": "Completed",
    "status.cancelled": "Cancelled",
    "status.pending": "Pending",
    "status.verified": "Verified",
    "status.paid": "Paid",
    "status.unpaid": "Unpaid",

    // Kolom Tabel Umum
    "table.code": "Code",
    "table.name": "Name",
    "table.period": "Period",
    "table.status": "Status",
    "table.actions": "Actions",
    "table.category": "Category",
    "table.description": "Description",
    "table.date": "Date",
    "table.amount": "Amount",
    "table.unit": "Unit",
    "table.contact": "Contact",

    // Dashboard Keuangan (admin-dashboard)
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

    // Pintasan Dashboard
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
    "dashboard:charts.legend": "Legend",
    "dashboard.charts.trends_title": "Revenue, Expense, & Cash Flow Trends",
    "dashboard.charts.trends_subtitle": "Monthly financial movements based on posted journals.",
    "dashboard.charts.composition_title": "Financial Composition",
    "dashboard.charts.composition_subtitle": "Distribution of financial accounts and cash structure.",

    // Modul Proyek (projects-page)
    "projects.title": "Projects Master & Team Assignments",
    "projects.subtitle": "Monitor client projects, milestone billings, internal team assignments, and revenue recognition methods.",
    "projects.card_title": "Altvira Projects List",
    "projects.card_desc": "Master reference for purchase orders, budgets, milestone billings, and profit sharing.",
    "projects.add_button": "Add Project",
    "projects.search_placeholder": "Search project code or name...",
    "projects.col_code": "Code",
    "projects.col_name": "Project Name",
    "projects.col_period": "Period",
    "projects.col_contract_val": "Contract Value",
    "projects.col_milestones": "Milestones",
    "projects.col_team": "Team Members",
    "projects.col_status": "Status",
    "projects.col_actions": "Actions",
    "projects.members_count": "Members",
    "projects.milestones_count": "Milestones",
    "projects.empty_title": "No Projects Found",
    "projects.empty_desc": "Projects directory is currently empty. Add a new project to start procurement and invoicing cycles.",

    // Modul Master Parties (Vendor, Pelanggan, Produk)
    "parties.title": "Vendors & Clients Master Data",
    "parties.subtitle": "Manage procurement vendor directory, official client database, and company digital products & services catalog.",
    "parties.tab_vendors": "Vendors",
    "parties.tab_customers": "Clients / Customers",
    "parties.tab_products": "Products / Services",
    "parties.vendor_title": "Suppliers & Vendors Directory",
    "parties.vendor_desc": "Vendors are not system users and do not possess login accounts.",
    "parties.add_vendor": "Add Vendor",
    "parties.customer_title": "Official Clients & Customers Directory",
    "parties.customer_desc": "Customer database for quotation issuance, charters, invoices, and official receipts.",
    "parties.add_customer": "Add Client",
    "parties.services_title": "Altvira Products & Services Catalog",
    "parties.services_desc": "Directory of technology solutions, digital products, and professional service packages.",
    "parties.add_service": "Add Service / Product",
    "parties.col_vendor_name": "Vendor Name",
    "parties.col_customer_name": "Customer Name",
    "parties.col_service_name": "Service / Product Name",
    "parties.col_contact": "PIC & Contact",
    "parties.col_bank": "Bank Account",
    "parties.col_company_pic": "Company & PIC",
    "parties.col_category": "Category",
    "parties.col_desc": "Description",
    "parties.col_unit": "Unit",
    "parties.col_base_rate": "Base Rate",
    "parties.no_vendor": "No Vendors Found",
    "parties.no_vendor_desc": "Suppliers directory is currently empty. Add a new vendor for internal procurement purchase orders.",
    "parties.no_customer": "No Customers Found",
    "parties.no_customer_desc": "Client and customer directory is currently empty. Add a customer to issue projects and official invoices.",
    "parties.no_service": "No Products / Services Found",
    "parties.no_service_desc": "Altvira product and service catalog is currently empty. Add a new package or offer for project charters.",

    // Modul Invoice & Penagihan
    "invoicing.title": "Invoices & Client Billing",
    "invoicing.subtitle": "Manage down payment billing, milestone progress invoices, final settlements, and e-Meterai receipts.",
    "invoicing.page_title": "Invoicing, Accounts Receivable Aging, & Receipts",
    "invoicing.page_desc": "Manage project milestone invoices, receivables aging, and official payment receipts.",
    "invoicing.issue_invoice": "Issue Invoice",
    "invoicing.tab_invoices": "Invoices List",
    "invoicing.tab_aging": "AR Aging / Due Dates",
    "invoicing.tab_receipts": "Payment Receipts",
    "invoicing.card_title": "Project Invoices & Receivables",
    "invoicing.add_invoice": "Issue Invoice",

    // Modul Persetujuan Pembayaran
    "approvals.title": "Payment Approvals & Disbursements",
    "approvals.subtitle": "Verify and approve operational disbursements for vendor POs and internal team expense claims.",
    "approvals.page_title": "1-Level Payment Approvals & Cash Disbursements",
    "approvals.page_desc": "Verify payment claims, manage authorisations, and disburse operational team funds.",

    // Modul PO Internal
    "procurement.title": "All Vendor Purchase Orders",
    "procurement.my_title": "My Purchase Orders",
    "procurement.subtitle": "Manage issuance, status approvals, and vendor purchase order documents.",
    "procurement.my_subtitle": "Create and track purchase orders for project goods or services procurement.",
    "procurement.create_po": "Create Vendor PO",

    // Modul Akuntansi & Laporan
    "accounting.title": "Accounting Cycle & Financial Reports",
    "accounting.subtitle": "Manage chart of accounts (CoA), journals, general ledger, period closing, and comprehensive financial statements.",
    "accounting.tab_coa": "Accounting Setup",
    "accounting.tab_journals": "General Journal",
    "accounting.tab_ledger": "General Ledger",
    "accounting.tab_trial_balance": "Trial Balance",
    "accounting.tab_adjusting": "Adjusting Entries",
    "accounting.tab_reports": "Financial Reports",
    "accounting.tab_periods": "Period Closing",
    "accounting.filter_all_periods": "All Periods",
    "accounting.filter_this_month": "This Month",
    "accounting.filter_last_month": "Last Month",
    "accounting.filter_this_year": "This Year",
    "accounting.filter_custom": "Custom Range",
    "accounting.filter_quick_preset": "Quick Time Presets",
    "accounting.filter_custom_range": "Custom Date Range",
    "accounting.journal_history": "General Journal History",
    "accounting.journal_history_adj": "Adjusting & Correction Journal History",
    "accounting.journal_history_desc": "Chronological historical list of all financial accounting transactions.",
    "accounting.journal_history_adj_desc": "Manage accrual adjustments, amortization, and transaction correction journals with an audit trail.",
    "accounting.record_transaction": "Record Transaction",
    "accounting.record_adjusting": "Record Adjusting Entry",
    "accounting.daily_journal_book": "Daily Journal Book",
    "accounting.adj_journal_book": "Adjusting Journal Book (AJP)",
    "accounting.order_label": "Order:",
    "accounting.order_newest": "Newest",
    "accounting.order_oldest": "Oldest",
    "accounting.th_account": "Account",
    "accounting.th_date": "Date",
    "accounting.th_description": "Description",
    "accounting.th_ref": "Ref",
    "accounting.th_debit": "Debit",
    "accounting.th_credit": "Credit",
    "accounting.th_actions": "Actions",
    "accounting.no_general_journal": "No general journal transactions in this period",
    "accounting.no_adj_journal": "No Adjusting Journal Entries (AJP)",
    "accounting.loading_journals": "Loading journal entries...",
    "accounting.no_adj_desc": "Use 'Record Adjusting Entry' to add accrual adjustments, amortization, or deferred revenue recognition.",
    "accounting.no_gen_desc": "Use 'Record Transaction' or adjust period and project filters.",
    "accounting.filter_modal_title": "Filter Accounting Data & Period",
    "accounting.accounting_assumptions": "Financial Accounting Assumptions Application",
    "accounting.assumption_periodicity": "Periodicity",
    "accounting.assumption_periodicity_desc": "Divides economic activities into monthly/annual periods for timely and relevant reporting.",
    "accounting.assumption_deferral": "Deferral",
    "accounting.assumption_deferral_desc": "Unearned revenue is recorded as a liability and recognized as revenue over periods of benefit.",
    "accounting.assumption_accrual": "Accrual Basis",
    "accounting.assumption_accrual_desc": "Records the impact of transactions when they occur, rather than when cash is received or paid.",
    "accounting.assumption_depreciation": "Depreciation",
    "accounting.assumption_depreciation_desc": "Periodically allocates fixed asset acquisition cost to Depreciation Expense against Accumulated Depreciation.",

    // Financial Reports Sub-Tab & Header
    "reports.accrual_title": "Accrual Financial Statements",
    "reports.accrual_subtitle": "Present financial position, profit & loss, cash flows, and accrual trial balance.",
    "reports.title": "Financial Reports",
    "reports.subtitle": "Income Statement, Statement of Changes in Equity, Balance Sheet, and Cash Flows.",
    "reports.tab_income": "Income Statement",
    "reports.tab_equity": "Changes in Equity",
    "reports.tab_balance": "Balance Sheet",
    "reports.tab_cashflow": "Cash Flows",

    // Form Modal Jurnal & Koreksi
    "journal.modal_create_title": "Create & Post New Journal",
    "journal.modal_create_adj_title": "Create & Post Adjusting Journal (AJP)",
    "journal.modal_edit_title": "Edit Journal Transaction",
    "journal.date": "Journal Date",
    "journal.type": "Journal Type",
    "journal.type_general": "General Journal",
    "journal.type_adjustment": "Adjusting Journal (AJP)",
    "journal.description": "Description",
    "journal.desc_placeholder": "Example: Current month co-working office rent expense adjustment",
    "journal.auto_reverse": "Mark for Reversing Entry at Start of Next Period (Optional)",
    "journal.auto_reverse_desc": "Applied automatically during current period closing process.",
    "journal.debit_side": "Debit Side",
    "journal.credit_side": "Credit Side",
    "journal.add_account": "Add Account",
    "journal.debit_account": "Debit Account",
    "journal.credit_account": "Credit Account",
    "journal.select_debit": "-- Select Debit Account --",
    "journal.select_credit": "-- Select Credit Account --",
    "journal.total_debit": "Total Debit",
    "journal.total_credit": "Total Credit",
    "journal.empty_amount": "EMPTY AMOUNT",
    "journal.unbalanced": "UNBALANCED",
    "journal.balanced": "BALANCED",
    "journal.difference": "DIFF",
    "journal.btn_post": "Record Transaction",
    "journal.correction_title": "Create Correction Journal for",
    "journal.correction_date": "Correction Journal Date",
    "journal.correction_reason": "Correction Reason (Min. 5 Characters)",
    "journal.correction_reason_placeholder": "Example: Correction of wrong expense account selection in previous entry...",
    "journal.btn_post_correction": "Post Correction Journal",
    "journal.detail_title": "Journal Transaction Details",
    "journal.number": "Journal Number",
    "journal.accounts_list": "Account List & Postings:",
    "journal.account_and_desc": "Account & Description",
    "journal.total": "Total",
    "journal.btn_edit": "Edit Transaction",

    // Master Produk & Layanan, Pelanggan, Vendor
    "products.modal_add_title": "Add Product / Service",
    "products.modal_edit_title": "Edit Product / Service",
    "products.code": "Service Code",
    "products.category": "Category",
    "products.name": "Product / Service Name",
    "products.name_placeholder": "e.g. Enterprise Web Portal Development",
    "products.unit": "Unit",
    "products.unit_placeholder": "Project / Package / Month",
    "products.price": "Base Rate / Price (IDR)",
    "products.description": "Brief Description",
    "products.desc_placeholder": "Scope description of the solution or service offering...",
    "products.status_active": "Active Service Status",
    "products.btn_save": "Save Product / Service",
    "products.toast_saved": "Product/service data saved successfully.",
    "customers.modal_add_title": "Add New Customer",
    "customers.modal_edit_title": "Edit Customer Data",
    "customers.code": "Customer Code",
    "customers.name": "Client / Institution Name",
    "customers.company_name": "Company Name",
    "customers.pic": "Contact Person / Officer",
    "customers.pic_title": "PIC Position / Title",
    "customers.email": "Email",
    "customers.phone": "Phone",
    "customers.address": "Full Address",
    "customers.logo": "Client Logo",
    "customers.signature": "Client Signature",
    "customers.paraf": "Client Initials",
    "customers.status_active": "Active Customer Status",
    "customers.btn_save": "Save Customer",
    "vendors.modal_add_title": "Add New Vendor",
    "vendors.modal_edit_title": "Edit Vendor Data",
    "vendors.code": "Vendor Code",
    "vendors.name": "Vendor / Supplier Name",
    "vendors.company_name": "Company Name",
    "vendors.pic": "Contact Name / PIC",
    "vendors.email": "Email",
    "vendors.phone": "Phone",
    "vendors.bank_name": "Bank Name",
    "vendors.account_number": "Account Number",
    "vendors.account_holder": "Account Holder Name",
    "vendors.status_active": "Active Vendor Status",
    "vendors.btn_save": "Save Vendor",

    // Modul Budgeting
    "budget.title": "Project Budgeting & Controls",
    "budget.subtitle": "Control expense budget ceilings and monitor project cash disbursements.",
    "budget.my_title": "My Assigned Projects Budget vs Realization",
    "budget.my_subtitle": "Track allocated expense ceilings and real cash outlays across assigned projects.",

    // Modul Bagi Hasil
    "profit_sharing.title": "Project Profit Sharing Calculations & Finalization",
    "profit_sharing.subtitle": "Calculate net profit distributions for team members and finalize profit payout disbursements.",

    // Profil Perusahaan
    "company.page_title": "Company Profile (Altvira)",
    "company.page_desc": "Manage letterhead identity, official logo, bank accounts, digital signatures, footer social media links, and taxation status.",
    "company.tab_identity": "Identity & Logo",
    "company.tab_accounts": "Bank Accounts & Signatures",
    "company.tab_social": "Footer Social Media",
    "company.tab_tax": "Taxation Status",

    // Super Admin Portal
    "super_admin.dashboard_title": "System Administrator Dashboard",
    "super_admin.dashboard_desc": "Monitor system health, internal user activity, and core master configurations.",
    "super_admin.kpi_users": "Internal Users",
    "super_admin.kpi_users_sub": "Active and verified role access",
    "super_admin.kpi_tax": "Taxation Status",
    "super_admin.pkp_active": "VAT-Registered (PKP)",
    "super_admin.non_pkp": "Non-VAT",
    "super_admin.vat_rate": "VAT Rate",
    "super_admin.vat_applied": "applied to invoices",
    "super_admin.vat_none": "Invoices issued without VAT",
    "super_admin.kpi_coa": "Financial Chart of Accounts",
    "super_admin.accounts": "Accounts",
    "super_admin.sak_standard": "Financial Accounting Standards",
    "super_admin.kpi_audit": "Recent Audit Trail",
    "super_admin.logs": "Logs",
    "super_admin.audit_saved": "Activity audit records logged",
    "super_admin.company_profile_title": "Company Profile & Legal Entity",
    "super_admin.users_title": "Users Management & Access Roles",
    "super_admin.audit_title": "Audit Trail & Historical Logs",

    // User Portal
    "user_portal.dashboard_title": "Team Member Dashboard",
    "user_portal.welcome": "Welcome",
    "user_portal.dashboard_desc": "Monitor your project assignments, payments, and profit sharing entitlements.",
    "user_portal.submit_payment": "Request Payment",
    "user_portal.kpi_projects": "Assigned Projects",
    "user_portal.kpi_projects_sub": "Registered as project member",
    "user_portal.kpi_projects_empty": "No active assignments yet",
    "user_portal.projects_count": "Projects",
    "user_portal.kpi_po": "Vendor Purchase Orders",
    "user_portal.kpi_po_sub": "Goods/services procurement docs",
    "user_portal.kpi_po_empty": "No purchase orders recorded",
    "user_portal.documents": "Documents",
    "user_portal.kpi_claims": "Payment Requests",
    "user_portal.submissions": "Submissions",
    "user_portal.pending_approval": "awaiting Admin approval",
    "user_portal.approved_waiting": "approved awaiting transfer",
    "user_portal.all_processed": "All submissions processed",
    "user_portal.kpi_sharing": "Profit Sharing Rights",
    "user_portal.kpi_sharing_sub": "Accumulated entitlements across completed projects",
    "user_portal.from": "From",
    "user_portal.projects_completed": "completed projects",
    "user_portal.my_po_title": "My Purchase Orders",
    "user_portal.my_payments_title": "My Payment Requests",

    // Notifikasi Toast
    "lang.switched_id": "Bahasa sistem berhasil diubah ke Bahasa Indonesia.",
    "lang.switched_en": "System language switched to English.",
  },
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function resolveTranslation(
  key: string,
  language: Language,
  optionsOrFallback?: string | TOptions,
  fallback?: string,
): string {
  const opts =
    typeof optionsOrFallback === "object" && optionsOrFallback !== null
      ? optionsOrFallback
      : {};
  const explicitFallback =
    typeof optionsOrFallback === "string" ? optionsOrFallback : fallback;
  const callOpts: TOptions = { lng: language, ...opts };

  // 1. Normalisasi namespace jika key diawali nama namespace + titik (mis. "accounting.title" -> "accounting:title")
  let normalizedKey = key;
  const knownNamespaces = [
    "common",
    "projects",
    "invoicing",
    "accounting",
    "po",
    "approvals",
    "budgeting",
    "profit_sharing",
    "dashboard",
    "parties",
    "settings",
  ];
  if (!normalizedKey.includes(":")) {
    for (const ns of knownNamespaces) {
      if (normalizedKey.startsWith(`${ns}.`)) {
        normalizedKey = normalizedKey.replace(`${ns}.`, `${ns}:`);
        break;
      }
    }
  }

  // 2. Cek apakah kunci ada di i18next pada bahasa aktif
  if (i18n.exists(normalizedKey, callOpts)) {
    return i18n.t(normalizedKey, callOpts);
  }

  // 3. Fallback jika bahasa aktif bukan id dan belum ada di en: ambil dari id (bahasa dasar)
  if (language !== "id" && i18n.exists(normalizedKey, { ...callOpts, lng: "id" })) {
    if (import.meta.env.DEV) {
      console.warn(
        `[i18n] Key "${normalizedKey}" missing in "${language}", falling back to "id"`,
      );
    }
    return i18n.t(normalizedKey, { ...callOpts, lng: "id" });
  }

  // 4. Cek apakah kunci tanpa namespace ada di default namespace (common)
  if (i18n.exists(key, callOpts)) {
    return i18n.t(key, callOpts);
  }
  if (language !== "id" && i18n.exists(key, { ...callOpts, lng: "id" })) {
    return i18n.t(key, { ...callOpts, lng: "id" });
  }

  // 5. Cek kamus statis DICTIONARY (bahasa aktif lalu bahasa id)
  const dict = DICTIONARY[language];
  const dictId = DICTIONARY.id;
  const valLang = dict?.[key];
  if (typeof valLang === "string") {
    return valLang;
  }
  const valId = dictId?.[key];
  if (typeof valId === "string") {
    return valId;
  }

  // Cek juga normalizedKey di DICTIONARY
  const normValLang = dict?.[normalizedKey];
  if (typeof normValLang === "string") {
    return normValLang;
  }
  const normValId = dictId?.[normalizedKey];
  if (typeof normValId === "string") {
    return normValId;
  }

  // 6. Explicit fallback yang diberikan pemanggil (misal: t("key", "Teks Asli"))
  if (explicitFallback !== undefined) {
    return explicitFallback;
  }

  // 7. Jika benar-benar tidak ditemukan di mana pun:
  if (import.meta.env.DEV) {
    console.warn(
      `[i18n] Missing translation key: "${key}" (normalized: "${normalizedKey}")`,
    );
  }
  return key;
}

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
      void i18n.changeLanguage(nextLang);
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
      if (i18n.language !== language) {
        void i18n.changeLanguage(language);
      }
    } catch {
      // Abaikan
    }
  }, [language]);

  const t = React.useCallback(
    (key: string, optionsOrFallback?: string | TOptions, fallback?: string): string => {
      return resolveTranslation(key, language, optionsOrFallback, fallback);
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
    const lang = getActiveLanguage();
    return {
      language: lang,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: string, optionsOrFallback?: string | TOptions, fallback?: string) => {
        return resolveTranslation(key, lang, optionsOrFallback, fallback);
      },
    };
  }
  return ctx;
}

export { i18n, useI18nextTranslation };
export const useTranslation = useLanguage;
export default i18n;

