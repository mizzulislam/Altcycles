-- =============================================================================
-- Migrasi 0023: Penambahan Status Pernikahan & Jumlah Tanggungan (PTKP & PPh 21)
--               pada public.profiles
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_marital_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_marital_status
      CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'widowed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_dependents_count'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_dependents_count
      CHECK (dependents_count IS NULL OR (dependents_count >= 0 AND dependents_count <= 3));
  END IF;
END $$;

-- Perbarui RPC update_my_profile untuk mendukung marital_status & dependents_count
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
  p_signature_storage_path TEXT DEFAULT NULL,
  p_marital_status TEXT DEFAULT NULL,
  p_dependents_count INTEGER DEFAULT NULL
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
  v_marital_status TEXT;
  v_dependents_count INTEGER;
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

  v_marital_status := CASE
    WHEN p_marital_status IS NULL THEN COALESCE(v_old_profile.marital_status, 'single')
    WHEN lower(trim(p_marital_status)) IN ('single', 'married', 'widowed') THEN lower(trim(p_marital_status))
    ELSE 'single'
  END;

  v_dependents_count := CASE
    WHEN p_dependents_count IS NULL THEN COALESCE(v_old_profile.dependents_count, 0)
    WHEN p_dependents_count < 0 THEN 0
    WHEN p_dependents_count > 3 THEN 3
    ELSE p_dependents_count
  END;

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
      marital_status = v_marital_status,
      dependents_count = v_dependents_count,
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
      'phone_number', v_old_profile.phone_number,
      'job_title', v_old_profile.job_title,
      'npwp', public.mask_sensitive_string(v_old_profile.npwp, 4),
      'bank_name', v_old_profile.bank_name,
      'bank_account_number', public.mask_sensitive_string(v_old_profile.bank_account_number, 4),
      'bank_account_holder', v_old_profile.bank_account_holder,
      'has_signature', (v_old_profile.signature_storage_path IS NOT NULL),
      'marital_status', v_old_profile.marital_status,
      'dependents_count', v_old_profile.dependents_count
    ),
    jsonb_build_object(
      'full_name', v_profile.full_name,
      'username', v_profile.username,
      'phone_number', v_profile.phone_number,
      'job_title', v_profile.job_title,
      'npwp', public.mask_sensitive_string(v_profile.npwp, 4),
      'bank_name', v_profile.bank_name,
      'bank_account_number', public.mask_sensitive_string(v_profile.bank_account_number, 4),
      'bank_account_holder', v_profile.bank_account_holder,
      'has_signature', (v_profile.signature_storage_path IS NOT NULL),
      'marital_status', v_profile.marital_status,
      'dependents_count', v_profile.dependents_count
    )
  );

  RETURN v_profile;
END;
$$;
