-- =============================================================================
-- Migrasi 0022: Skema & Keamanan 13 Item Altcycles
--               - Item 1: Master Pelanggan/Klien (NPWP, Alamat Pengiriman, Samakan Alamat)
--               - Item 2 & 4: Profil Pengguna (NPWP, Rekening Bank, TTD Digital, Masking Audit)
--               - Item 3: Penyusutan Aset Tetap (fixed_assets & fixed_asset_depreciations)
--               - Item 6 & 7: Profil Perusahaan (Telp/Fax, Website, Sosmed, & Bukti PKP Wajib)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ITEM 1: Master Pelanggan / Klien (public.customers)
-- -----------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS npwp TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_same_as_office BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_customers_npwp_digits'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT chk_customers_npwp_digits
      CHECK (
        npwp IS NULL
        OR length(trim(npwp)) = 0
        OR regexp_replace(npwp, '[^0-9]', '', 'g') ~ '^[0-9]{15,16}$'
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. ITEM 2 & 4: Data Keuangan & Tanda Tangan Pengguna (public.profiles)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS npwp TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS signature_storage_path TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_npwp_digits'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_npwp_digits
      CHECK (
        npwp IS NULL
        OR length(trim(npwp)) = 0
        OR regexp_replace(npwp, '[^0-9]', '', 'g') ~ '^[0-9]{15,16}$'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_bank_acc_digits'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_bank_acc_digits
      CHECK (
        bank_account_number IS NULL
        OR length(trim(bank_account_number)) = 0
        OR regexp_replace(bank_account_number, '[\s-]+', '', 'g') ~ '^[0-9]{5,30}$'
      );
  END IF;
END $$;

-- Helper fungsi masking data sensitif untuk audit_logs
CREATE OR REPLACE FUNCTION public.mask_sensitive_string(p_val TEXT, p_visible_tail INT DEFAULT 4)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_val IS NULL OR length(trim(p_val)) = 0 THEN
    RETURN NULL;
  END IF;
  v_clean := trim(p_val);
  IF length(v_clean) <= p_visible_tail THEN
    RETURN repeat('*', length(v_clean));
  END IF;
  RETURN repeat('*', GREATEST(4, length(v_clean) - p_visible_tail)) || right(v_clean, p_visible_tail);
END;
$$;

-- Perbarui RPC update_my_profile dengan dukungan Data Keuangan & TTD + validasi server & masking audit
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_full_name TEXT,
  p_username TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_npwp TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_bank_account_number TEXT DEFAULT NULL,
  p_bank_account_holder TEXT DEFAULT NULL,
  p_signature_storage_path TEXT DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_old_profile public.profiles%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_norm_npwp TEXT;
  v_norm_bank_acc TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi kedaluwarsa atau belum terautentikasi.';
  END IF;

  SELECT * INTO v_old_profile
  FROM public.profiles
  WHERE id = v_user_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna tidak ditemukan atau akun sedang nonaktif.';
  END IF;

  IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'Nama lengkap wajib diisi.';
  END IF;

  IF p_username IS NOT NULL AND length(trim(p_username)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(username) = lower(trim(p_username))
        AND id <> v_user_id
    ) THEN
      RAISE EXCEPTION 'Username "%" sudah digunakan oleh akun lain.', trim(p_username);
    END IF;
  END IF;

  v_norm_npwp := CASE
    WHEN p_npwp IS NULL THEN v_old_profile.npwp
    WHEN length(trim(p_npwp)) = 0 THEN NULL
    ELSE regexp_replace(trim(p_npwp), '[^0-9]', '', 'g')
  END;

  IF v_norm_npwp IS NOT NULL AND v_norm_npwp !~ '^[0-9]{15,16}$' THEN
    RAISE EXCEPTION 'NPWP wajib berisi 15 atau 16 digit angka.';
  END IF;

  v_norm_bank_acc := CASE
    WHEN p_bank_account_number IS NULL THEN v_old_profile.bank_account_number
    WHEN length(trim(p_bank_account_number)) = 0 THEN NULL
    ELSE regexp_replace(trim(p_bank_account_number), '[\s-]+', '', 'g')
  END;

  IF v_norm_bank_acc IS NOT NULL AND v_norm_bank_acc !~ '^[0-9]{5,30}$' THEN
    RAISE EXCEPTION 'Nomor rekening bank wajib berisi 5 hingga 30 digit angka.';
  END IF;

  UPDATE public.profiles
  SET full_name = trim(p_full_name),
      username = NULLIF(trim(p_username), ''),
      phone_number = NULLIF(trim(p_phone_number), ''),
      job_title = NULLIF(trim(p_job_title), ''),
      bio = NULLIF(trim(p_bio), ''),
      avatar_url = NULLIF(trim(p_avatar_url), ''),
      npwp = v_norm_npwp,
      bank_name = CASE
        WHEN p_bank_name IS NULL THEN v_old_profile.bank_name
        ELSE NULLIF(trim(p_bank_name), '')
      END,
      bank_account_number = v_norm_bank_acc,
      bank_account_holder = CASE
        WHEN p_bank_account_holder IS NULL THEN v_old_profile.bank_account_holder
        ELSE NULLIF(trim(p_bank_account_holder), '')
      END,
      signature_storage_path = CASE
        WHEN p_signature_storage_path IS NULL THEN v_old_profile.signature_storage_path
        ELSE NULLIF(trim(p_signature_storage_path), '')
      END,
      updated_at = now()
  WHERE id = v_user_id AND is_active = true
  RETURNING * INTO v_profile;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    entity_name,
    entity_id,
    old_data,
    new_data
  ) VALUES (
    v_user_id,
    v_profile.role::TEXT,
    'UPDATE',
    'profiles',
    v_user_id::TEXT,
    jsonb_build_object(
      'full_name', v_old_profile.full_name,
      'username', v_old_profile.username,
      'job_title', v_old_profile.job_title,
      'npwp', public.mask_sensitive_string(v_old_profile.npwp, 3),
      'bank_name', v_old_profile.bank_name,
      'bank_account_number', public.mask_sensitive_string(v_old_profile.bank_account_number, 4),
      'has_signature', (v_old_profile.signature_storage_path IS NOT NULL)
    ),
    jsonb_build_object(
      'full_name', v_profile.full_name,
      'username', v_profile.username,
      'job_title', v_profile.job_title,
      'npwp', public.mask_sensitive_string(v_profile.npwp, 3),
      'bank_name', v_profile.bank_name,
      'bank_account_number', public.mask_sensitive_string(v_profile.bank_account_number, 4),
      'has_signature', (v_profile.signature_storage_path IS NOT NULL)
    )
  );

  RETURN v_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. ITEM 3: Penyusutan Aset Tetap (fixed_assets & fixed_asset_depreciations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code VARCHAR(30) UNIQUE NOT NULL,
  asset_name TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  acquisition_cost BIGINT NOT NULL CHECK (acquisition_cost >= 0),
  useful_life_months INT NOT NULL CHECK (useful_life_months BETWEEN 1 AND 600),
  salvage_value BIGINT NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line')),
  asset_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  accum_depr_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  expense_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fully_depreciated', 'disposed')),
  disposed_date DATE NULL,
  notes TEXT NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_fixed_assets_salvage_le_cost CHECK (salvage_value <= acquisition_cost)
);

CREATE TABLE IF NOT EXISTS public.fixed_asset_depreciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
  journal_id UUID NULL REFERENCES public.journals(id) ON DELETE SET NULL,
  depreciation_amount BIGINT NOT NULL CHECK (depreciation_amount > 0),
  accumulated_after BIGINT NOT NULL CHECK (accumulated_after >= 0),
  book_value_after BIGINT NOT NULL CHECK (book_value_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_fixed_asset_period UNIQUE (asset_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON public.fixed_assets (status, acquisition_date);
CREATE INDEX IF NOT EXISTS idx_fixed_asset_depr_period ON public.fixed_asset_depreciations (period_id);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_asset_depreciations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fixed_assets_select_policy ON public.fixed_assets;
CREATE POLICY fixed_assets_select_policy ON public.fixed_assets
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS fixed_assets_write_policy ON public.fixed_assets;
CREATE POLICY fixed_assets_write_policy ON public.fixed_assets
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS fixed_asset_depreciations_select_policy ON public.fixed_asset_depreciations;
CREATE POLICY fixed_asset_depreciations_select_policy ON public.fixed_asset_depreciations
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS fixed_asset_depreciations_write_policy ON public.fixed_asset_depreciations;
CREATE POLICY fixed_asset_depreciations_write_policy ON public.fixed_asset_depreciations
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 4. ITEM 6 & 7: Profil Perusahaan (Sosmed, Telp/Fax, Website, & Bukti PKP)
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS telephone_fax TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS social_links_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bank_accounts_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pkp_proof_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pkp_proof_file_name TEXT,
  ADD COLUMN IF NOT EXISTS pkp_proof_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS pkp_proof_size_bytes INT;
