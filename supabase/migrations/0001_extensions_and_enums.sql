-- =============================================================================
-- Migrasi 0001: Tipe Enum Inti (Fase 1 Fondasi)
-- Sistem Administrasi Keuangan dan Akuntansi Altcycles (Altvira)
-- =============================================================================

CREATE TYPE public.user_role AS ENUM (
  'user',
  'admin',
  'super_admin'
);

CREATE TYPE public.doc_type_code AS ENUM (
  'QT',    -- Quotation: QT/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'SOW',   -- Scope of Work: SOW/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'SPK',   -- Surat Perjanjian Kerja Sama: SPK/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'BAKP',  -- Berita Acara Kemajuan Pekerjaan: BAKP/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'INV',   -- Invoice: INV/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'KW',    -- Kuitansi: KW/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'UAT',   -- User Acceptance Testing: UAT/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'BAST',  -- Berita Acara Serah Terima: BAST/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'POP',   -- PO Pembelian Internal ke Vendor: POP/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'PA',    -- Payment Approval: PA/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'JRN',   -- Jurnal Akuntansi: JRN/ALT/{{tahun}}/{{bulan}}/{{urut}}
  'PRJ'    -- Kode Proyek: PRJ/ALT/{{tahun}}/{{urut}}
);

CREATE TYPE public.audit_action AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE',
  'CLOSE_PERIOD',
  'REOPEN_PERIOD',
  'VERIFY_PO',
  'FINALIZE_SHARING'
);

CREATE TYPE public.account_type AS ENUM (
  'asset',
  'contra_asset',
  'liability',
  'equity',
  'revenue',
  'expense'
);

CREATE TYPE public.normal_balance AS ENUM (
  'debit',
  'credit'
);

CREATE TYPE public.account_system_tag AS ENUM (
  'none',
  'cash_bank',
  'accounts_receivable',
  'unbilled_receivable',
  'work_in_progress',
  'contract_billings',
  'accounts_payable',
  'unearned_revenue',
  'profit_sharing_payable',
  'retained_earnings',
  'income_summary',
  'service_revenue',
  'profit_sharing_expense',
  'shared_expense'
);

CREATE TYPE public.cash_flow_category AS ENUM (
  'operating',
  'investing',
  'financing',
  'cash_equivalent'
);

CREATE TYPE public.period_status AS ENUM (
  'open',
  'closed'
);

CREATE TYPE public.project_category AS ENUM (
  'client',
  'internal'
);

CREATE TYPE public.project_status AS ENUM (
  'draft',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

CREATE TYPE public.revenue_recognition_method AS ENUM (
  'single_term_deferral',
  'two_term_accrual',
  'progress_billing'
);

