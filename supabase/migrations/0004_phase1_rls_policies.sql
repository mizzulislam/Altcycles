-- =============================================================================
-- Migrasi 0004: Kebijakan Row Level Security (RLS) Fase 1
-- Menegakkan hak akses User, Admin, Super Admin, & isolasi total publik (anon)
-- =============================================================================

-- Aktifkan & paksa RLS di seluruh tabel Fase 1
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile FORCE ROW LEVEL SECURITY;

ALTER TABLE public.doc_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_sequences FORCE ROW LEVEL SECURITY;

ALTER TABLE public.doc_sequence_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_sequence_counters FORCE ROW LEVEL SECURITY;

ALTER TABLE public.doc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_templates FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods FORCE ROW LEVEL SECURITY;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors FORCE ROW LEVEL SECURITY;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members FORCE ROW LEVEL SECURITY;

-- Cabut hak langsung anon dari tabel internal (FR-PB6)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- -----------------------------------------------------------------------------
-- 1. PROFILES:
--    - User: hanya melihat profil dirinya sendiri
--    - Admin: melihat seluruh profil internal (untuk memilih anggota proyek & melihat pengaju)
--    - Super Admin: melihat, membuat, dan mengubah akun/peran/status aktif (FR-A3, UC-30)
-- -----------------------------------------------------------------------------
CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT TO authenticated
USING (
  (id = auth.uid() AND is_active = true)
  OR public.current_user_role() IN ('admin', 'super_admin')
);

CREATE POLICY profiles_insert_super_admin ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() = 'super_admin');

CREATE POLICY profiles_update_super_admin ON public.profiles
FOR UPDATE TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- 2. COMPANY PROFILE, DOC SEQUENCES, DOC TEMPLATES:
--    - Semua pengguna internal aktif dapat membaca company_profile & doc_templates (untuk kop & PDF)
--    - Admin & Super Admin dapat membaca doc_sequences
--    - Hanya Super Admin yang dapat mengubah konfigurasi ini (FR-M4, FR-DT3, UC-31)
-- -----------------------------------------------------------------------------
CREATE POLICY company_profile_select_internal ON public.company_profile
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY company_profile_write_super_admin ON public.company_profile
FOR ALL TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

CREATE POLICY doc_sequences_select_policy ON public.doc_sequences
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY doc_sequences_write_super_admin ON public.doc_sequences
FOR ALL TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

CREATE POLICY doc_sequence_counters_select_policy ON public.doc_sequence_counters
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY doc_templates_select_internal ON public.doc_templates
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY doc_templates_write_super_admin ON public.doc_templates
FOR ALL TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- 3. AUDIT LOGS:
--    - Hanya Super Admin yang dapat membaca Audit Trail (FR-LA2, UC-32)
--    - Tidak ada kebijakan INSERT/UPDATE/DELETE langsung dari klien (ditulis trigger SECURITY DEFINER)
-- -----------------------------------------------------------------------------
CREATE POLICY audit_logs_select_super_admin ON public.audit_logs
FOR SELECT TO authenticated
USING (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- 4. ACCOUNTS (Bagan Akun SAK):
--    - Admin: kelola penuh (SELECT, INSERT, UPDATE, DELETE selama belum dipakai) (FR-M1, UC-24)
--    - Super Admin: hanya melihat (SELECT) (FR-M1, UC-33)
--    - User: melihat akun beban aktif untuk memilih akun pada pengajuan pembayaran
-- -----------------------------------------------------------------------------
CREATE POLICY accounts_select_policy ON public.accounts
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('admin', 'super_admin')
  OR (public.current_user_role() = 'user' AND is_active = true AND account_type = 'expense')
);

CREATE POLICY accounts_manage_admin ON public.accounts
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 5. PERIODS (Periode Akuntansi):
--    - Admin: kelola penuh
--    - Super Admin & User: melihat daftar periode
-- -----------------------------------------------------------------------------
CREATE POLICY periods_select_internal ON public.periods
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY periods_manage_admin ON public.periods
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 6. VENDORS & CUSTOMERS:
--    - Admin: kelola penuh (FR-M3)
--    - Super Admin: hanya melihat (UC-33)
--    - User: hanya melihat vendor aktif (untuk membuat PO Pembelian ke vendor, UC-04)
-- -----------------------------------------------------------------------------
CREATE POLICY vendors_select_policy ON public.vendors
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('admin', 'super_admin')
  OR (public.current_user_role() = 'user' AND is_active = true)
);

CREATE POLICY vendors_manage_admin ON public.vendors
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY customers_select_policy ON public.customers
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY customers_manage_admin ON public.customers
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 7. PROJECTS & PROJECT MEMBERS:
--    - Admin: kelola penuh (FR-M2)
--    - Super Admin: hanya melihat (UC-33)
--    - User: HANYA melihat proyek yang ditugaskan kepadanya (Bagian 4 PRD)
-- -----------------------------------------------------------------------------
CREATE POLICY projects_select_policy ON public.projects
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('admin', 'super_admin')
  OR public.is_project_member(id)
);

CREATE POLICY projects_manage_admin ON public.projects
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY project_members_select_policy ON public.project_members
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('admin', 'super_admin')
  OR user_id = auth.uid()
);

CREATE POLICY project_members_manage_admin ON public.project_members
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

