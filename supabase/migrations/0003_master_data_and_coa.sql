-- =============================================================================
-- Migrasi 0003: Master Data, Bagan Akun (COA SAK), Periode, Vendor, Pelanggan, Proyek
-- =============================================================================

-- 1. Bagan Akun / Chart of Accounts (FR-M1, UC-24, BR-19)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE CHECK (length(trim(code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  account_type public.account_type NOT NULL,
  normal_balance public.normal_balance NOT NULL,
  parent_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  system_tag public.account_system_tag NOT NULL DEFAULT 'none',
  cash_flow_category public.cash_flow_category NOT NULL DEFAULT 'operating',
  is_postable BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  used_in_journal_count INT NOT NULL DEFAULT 0 CHECK (used_in_journal_count >= 0),
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_type ON public.accounts (account_type);
CREATE INDEX idx_accounts_system_tag ON public.accounts (system_tag);

CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aturan BR-19: Akun yang sudah dipakai di jurnal tidak boleh dihapus, hanya dinonaktifkan
CREATE OR REPLACE FUNCTION public.prevent_used_account_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.used_in_journal_count > 0 THEN
    RAISE EXCEPTION 'Akun % (%) sudah digunakan dalam jurnal dan tidak boleh dihapus; silakan nonaktifkan akun tersebut (BR-19).', OLD.code, OLD.name;
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounts child WHERE child.parent_id = OLD.id) THEN
    RAISE EXCEPTION 'Akun induk % (%) masih memiliki sub-akun dan tidak boleh dihapus.', OLD.code, OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_used_account_deletion
BEFORE DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.prevent_used_account_deletion();

-- 2. Periode Akuntansi (FR-M5, BR-3)
CREATE TABLE public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.period_status NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id),
  reopened_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES public.profiles(id),
  reopen_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_periods_year_month UNIQUE (year, month),
  CONSTRAINT chk_periods_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER trg_periods_updated_at
BEFORE UPDATE ON public.periods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC Penutupan & Pembukaan Kembali Periode oleh Admin (BR-3: tercatat di Audit Trail)
CREATE OR REPLACE FUNCTION public.close_accounting_period(p_period_id UUID)
RETURNS public.periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.periods%ROWTYPE;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin yang berwenang menutup periode akuntansi.';
  END IF;

  SELECT * INTO v_period FROM public.periods WHERE id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode akuntansi tidak ditemukan.';
  END IF;
  IF v_period.status = 'closed' THEN
    RAISE EXCEPTION 'Periode % sudah berstatus tertutup.', v_period.name;
  END IF;

  UPDATE public.periods
  SET status = 'closed',
      closed_at = now(),
      closed_by = auth.uid()
  WHERE id = p_period_id
  RETURNING * INTO v_period;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
  VALUES (
    auth.uid(),
    'admin',
    'CLOSE_PERIOD',
    'periods',
    p_period_id::TEXT,
    jsonb_build_object('status', 'open'),
    to_jsonb(v_period)
  );

  RETURN v_period;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_accounting_period(
  p_period_id UUID,
  p_reason TEXT
)
RETURNS public.periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.periods%ROWTYPE;
  v_old JSONB;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin yang berwenang membuka kembali periode tertutup (BR-3).';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Alasan pembukaan kembali periode wajib diisi minimal 5 karakter.';
  END IF;

  SELECT * INTO v_period FROM public.periods WHERE id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode akuntansi tidak ditemukan.';
  END IF;
  IF v_period.status = 'open' THEN
    RAISE EXCEPTION 'Periode % sudah berstatus terbuka.', v_period.name;
  END IF;

  v_old := to_jsonb(v_period);

  UPDATE public.periods
  SET status = 'open',
      reopened_at = now(),
      reopened_by = auth.uid(),
      reopen_reason = trim(p_reason)
  WHERE id = p_period_id
  RETURNING * INTO v_period;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
  VALUES (
    auth.uid(),
    'admin',
    'REOPEN_PERIOD',
    'periods',
    p_period_id::TEXT,
    v_old,
    to_jsonb(v_period)
  );

  RETURN v_period;
END;
$$;

-- 3. Master Vendor (FR-M3)
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE CHECK (length(trim(code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  npwp TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Master Pelanggan / Klien (FR-M3)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE CHECK (length(trim(code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  company_name TEXT,
  contact_person TEXT,
  contact_title TEXT,
  email TEXT,
  phone TEXT,
  npwp TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Master Proyek & Anggota Tim Proyek (FR-M2, BR-11, BR-13)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE CHECK (length(trim(code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  project_category public.project_category NOT NULL DEFAULT 'client',
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  status public.project_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  target_end_date DATE,
  completed_date DATE,
  contract_value BIGINT NOT NULL DEFAULT 0 CHECK (contract_value >= 0),
  term_count INT NOT NULL DEFAULT 1 CHECK (term_count >= 1),
  revenue_method public.revenue_recognition_method NOT NULL DEFAULT 'single_term_deferral',
  spk_number TEXT,
  has_posted_journal BOOLEAN NOT NULL DEFAULT false,
  is_eliminated BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_project_dates CHECK (target_end_date IS NULL OR start_date IS NULL OR target_end_date >= start_date)
);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BR-13: Metode pengakuan otomatis dipilih menurut jumlah termin pada saat pembuatan,
-- dan tidak boleh diubah setelah jurnal pertama proyek diposting.
CREATE OR REPLACE FUNCTION public.enforce_project_revenue_method()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.term_count = 1 THEN
      NEW.revenue_method := 'single_term_deferral';
    ELSIF NEW.term_count = 2 THEN
      NEW.revenue_method := 'two_term_accrual';
    ELSE
      NEW.revenue_method := 'progress_billing';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.has_posted_journal = true AND (
      NEW.revenue_method IS DISTINCT FROM OLD.revenue_method
      OR NEW.contract_value IS DISTINCT FROM OLD.contract_value
    ) THEN
      RAISE EXCEPTION 'Metode pengakuan pendapatan dan nilai kontrak tidak dapat diubah setelah proyek memiliki jurnal terposting (BR-13).';
    END IF;

    -- Jika term_count berubah sebelum ada jurnal dan revenue_method tidak diubah manual bersamaan, sesuaikan default
    IF OLD.has_posted_journal = false
       AND NEW.term_count IS DISTINCT FROM OLD.term_count
       AND NEW.revenue_method = OLD.revenue_method THEN
      IF NEW.term_count = 1 THEN
        NEW.revenue_method := 'single_term_deferral';
      ELSIF NEW.term_count = 2 THEN
        NEW.revenue_method := 'two_term_accrual';
      ELSE
        NEW.revenue_method := 'progress_billing';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_revenue_method
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_project_revenue_method();

CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  member_role TEXT NOT NULL DEFAULT 'Anggota Tim',
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_user() AND EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
  );
$$;

-- Pasang trigger Audit Trail ke seluruh tabel master Fase 1
CREATE TRIGGER trg_audit_accounts
AFTER INSERT OR UPDATE OR DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_periods
AFTER INSERT OR UPDATE OR DELETE ON public.periods
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_vendors
AFTER INSERT OR UPDATE OR DELETE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_customers
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_projects
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_project_members
AFTER INSERT OR UPDATE OR DELETE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

