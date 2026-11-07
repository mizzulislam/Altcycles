-- =============================================================================
-- Migrasi 0002: Identitas Pengguna, Konfigurasi Sistem, Penomoran, & Audit Trail
-- =============================================================================

-- 1. Tabel Profil Pengguna Internal (1:1 dengan auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
  email TEXT NOT NULL UNIQUE CHECK (position('@' IN email) > 1),
  role public.user_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fungsi bantu utilitas updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fungsi bantu keamanan berbasis peran (hanya mengembalikan peran bila pengguna aktif)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
  );
$$;

-- Sinkronisasi otomatis saat akun auth.users dibuat
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role := 'user';
  v_name TEXT;
BEGIN
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data ? 'role' THEN
    v_role := (NEW.raw_user_meta_data ->> 'role')::public.user_role;
  END IF;
  v_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, full_name, email, role, is_active)
  VALUES (NEW.id, v_name, NEW.email, v_role, true)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 2. Profil Perusahaan & Pengaturan Pajak (Singleton id = 1)
-- Hard Rule 3 & BR-22: Altvira belum PKP -> pkp_enabled default FALSE
CREATE TABLE public.company_profile (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Altvira Technology',
  legal_entity_name TEXT NOT NULL DEFAULT 'PT Representasi Mitra Mandiri',
  address TEXT NOT NULL DEFAULT '[Alamat Kantor Altvira]',
  email TEXT NOT NULL DEFAULT 'finance@altvira.id',
  phone TEXT NOT NULL DEFAULT '[Nomor Telepon Altvira]',
  logo_storage_path TEXT,
  bank_name TEXT NOT NULL DEFAULT '[Nama Bank]',
  bank_account_number TEXT NOT NULL DEFAULT '[Nomor Rekening]',
  bank_account_holder TEXT NOT NULL DEFAULT 'PT Representasi Mitra Mandiri',
  signer_name TEXT NOT NULL DEFAULT 'Muhammad Izzul Islam',
  signer_title TEXT NOT NULL DEFAULT 'Project Manager',
  pkp_enabled BOOLEAN NOT NULL DEFAULT false,
  ppn_rate NUMERIC(5,2) NOT NULL DEFAULT 11.00 CHECK (ppn_rate >= 0 AND ppn_rate <= 100),
  pph_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_company_profile_updated_at
BEFORE UPDATE ON public.company_profile
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Konfigurasi Penomoran Dokumen & Pencacah Atomik (BR-6 & Lampiran A.0)
CREATE TABLE public.doc_sequences (
  doc_type public.doc_type_code PRIMARY KEY,
  label TEXT NOT NULL,
  prefix_pattern TEXT NOT NULL CHECK (position('{{urut}}' IN prefix_pattern) > 0),
  padding_digits INT NOT NULL DEFAULT 3 CHECK (padding_digits BETWEEN 2 AND 6),
  reset_period TEXT NOT NULL DEFAULT 'monthly' CHECK (reset_period IN ('monthly', 'yearly', 'never')),
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_doc_sequences_updated_at
BEFORE UPDATE ON public.doc_sequences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.doc_sequence_counters (
  doc_type public.doc_type_code NOT NULL REFERENCES public.doc_sequences(doc_type) ON DELETE RESTRICT,
  period_key TEXT NOT NULL,
  last_number INT NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (doc_type, period_key)
);

-- Fungsi pembuat nomor dokumen berurutan, unik, & bebas kondisi balapan (BR-6)
CREATE OR REPLACE FUNCTION public.next_doc_number(
  p_doc_type public.doc_type_code,
  p_doc_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq public.doc_sequences%ROWTYPE;
  v_year TEXT := to_char(p_doc_date, 'YYYY');
  v_month TEXT := to_char(p_doc_date, 'MM');
  v_period_key TEXT;
  v_next INT;
  v_formatted TEXT;
BEGIN
  IF NOT public.is_active_user() AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Akses ditolak: hanya pengguna aktif yang dapat menerbitkan nomor dokumen.';
  END IF;

  SELECT * INTO v_seq
  FROM public.doc_sequences
  WHERE doc_type = p_doc_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Konfigurasi penomoran untuk tipe dokumen % belum diatur.', p_doc_type;
  END IF;

  IF v_seq.reset_period = 'monthly' THEN
    v_period_key := v_year || '-' || v_month;
  ELSIF v_seq.reset_period = 'yearly' THEN
    v_period_key := v_year;
  ELSE
    v_period_key := 'GLOBAL';
  END IF;

  INSERT INTO public.doc_sequence_counters (doc_type, period_key, last_number, updated_at)
  VALUES (p_doc_type, v_period_key, 1, now())
  ON CONFLICT (doc_type, period_key)
  DO UPDATE SET
    last_number = public.doc_sequence_counters.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next;

  v_formatted := v_seq.prefix_pattern;
  v_formatted := replace(v_formatted, '{{tahun}}', v_year);
  v_formatted := replace(v_formatted, '{{bulan}}', v_month);
  v_formatted := replace(v_formatted, '{{urut}}', lpad(v_next::TEXT, v_seq.padding_digits, '0'));

  RETURN v_formatted;
END;
$$;

-- Fungsi pembuat nomor PO Klien berkode acak 6 karakter non-ambigu (Lampiran A.0 & BR-18)
CREATE OR REPLACE FUNCTION public.generate_client_po_number(
  p_doc_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code TEXT := '';
  v_idx INT;
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    v_idx := floor(random() * length(v_alphabet))::INT + 1;
    v_code := v_code || substr(v_alphabet, v_idx, 1);
  END LOOP;

  RETURN 'PO-' || to_char(p_doc_date, 'YYYYMM') || '-' || v_code;
END;
$$;

-- 4. Konfigurasi Template Dokumen & Placeholder [kurung siku] (FR-DT1..3, UC-31)
CREATE TABLE public.doc_templates (
  doc_type public.doc_type_code PRIMARY KEY,
  title TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  default_placeholders JSONB NOT NULL DEFAULT '{}'::JSONB,
  footer_notes TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_doc_templates_updated_at
BEFORE UPDATE ON public.doc_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Tabel Audit Trail Abadi (FR-LA2, UC-32, UC-41)
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  actor_role TEXT,
  action public.audit_action NOT NULL,
  entity_name TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_name, entity_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Proteksi tingkat DB: Audit trail tidak dapat diubah atau dihapus oleh siapa pun
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit trail bersifat abadi (immutable) dan tidak dapat diubah atau dihapus.';
END;
$$;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Trigger generik pencatat Audit Trail otomatis
CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role TEXT;
  v_entity_id TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT role::TEXT INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
  ELSE
    v_actor_role := current_user;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_entity_id := COALESCE(to_jsonb(NEW) ->> 'id', to_jsonb(NEW) ->> 'doc_type', 'unknown');
    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
    VALUES (v_actor_id, v_actor_role, 'INSERT', TG_TABLE_NAME, v_entity_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
      v_entity_id := COALESCE(to_jsonb(NEW) ->> 'id', to_jsonb(NEW) ->> 'doc_type', 'unknown');
      INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
      VALUES (v_actor_id, v_actor_role, 'UPDATE', TG_TABLE_NAME, v_entity_id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_entity_id := COALESCE(to_jsonb(OLD) ->> 'id', to_jsonb(OLD) ->> 'doc_type', 'unknown');
    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
    VALUES (v_actor_id, v_actor_role, 'DELETE', TG_TABLE_NAME, v_entity_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_company_profile
AFTER INSERT OR UPDATE OR DELETE ON public.company_profile
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_doc_sequences
AFTER INSERT OR UPDATE OR DELETE ON public.doc_sequences
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_doc_templates
AFTER INSERT OR UPDATE OR DELETE ON public.doc_templates
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

