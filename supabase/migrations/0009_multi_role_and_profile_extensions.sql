-- =============================================================================
-- Migrasi 0009: Ekstensi Multi-Role, Profil Pengguna (Foto, Bio, Kontak),
--               dan RPC Peralihan Peran Aktif Aman dengan Audit Trail
-- =============================================================================

-- 1. Tambah kolom pendukung multi-role dan detail profil pada public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roles public.user_role[] DEFAULT '{user}',
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Migrasikan data roles awal berdasarkan peran saat ini
UPDATE public.profiles
SET roles = CASE
  WHEN role = 'super_admin' THEN ARRAY['super_admin', 'admin', 'user']::public.user_role[]
  WHEN role = 'admin' THEN ARRAY['admin', 'user']::public.user_role[]
  ELSE ARRAY['user']::public.user_role[]
END
WHERE roles IS NULL OR roles = '{}' OR roles = '{user}';

-- Set default username dari bagian depan email jika belum terisi
UPDATE public.profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

-- 3. Perbarui trigger handle_new_auth_user() agar otomatis menginisialisasi roles
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role := 'user';
  v_roles public.user_role[];
  v_name TEXT;
  v_username TEXT;
BEGIN
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data ? 'role' THEN
    v_role := (NEW.raw_user_meta_data ->> 'role')::public.user_role;
  END IF;

  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data ? 'roles' THEN
    SELECT array_agg(elem::public.user_role)
    INTO v_roles
    FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'roles') AS elem;
  ELSE
    IF v_role = 'super_admin' THEN
      v_roles := ARRAY['super_admin', 'admin', 'user']::public.user_role[];
    ELSIF v_role = 'admin' THEN
      v_roles := ARRAY['admin', 'user']::public.user_role[];
    ELSE
      v_roles := ARRAY['user']::public.user_role[];
    END IF;
  END IF;

  v_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(NEW.email, '@', 1));
  v_username := NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), '');

  INSERT INTO public.profiles (id, full_name, email, role, roles, username, is_active)
  VALUES (NEW.id, v_name, NEW.email, v_role, COALESCE(v_roles, ARRAY[v_role]), v_username, true)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      roles = EXCLUDED.roles,
      updated_at = now();

  RETURN NEW;
END;
$$;

-- 4. RPC Peralihan Peran Aktif (Switch Role)
--    Memvalidasi bahwa pengguna sah memiliki peran tersebut,
--    memperbarui kolom role sehingga public.current_user_role() langsung terefleksi pada RLS,
--    serta mencatat pergantian peran ke tabel public.audit_logs.
CREATE OR REPLACE FUNCTION public.switch_active_role(p_target_role public.user_role)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile public.profiles%ROWTYPE;
  v_old_role public.user_role;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi kedaluwarsa atau belum terautentikasi.';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna tidak ditemukan atau akun sedang nonaktif.';
  END IF;

  -- Keamanan: Periksa apakah peran target benar-benar dimiliki pengguna
  IF NOT (p_target_role = ANY(v_profile.roles)) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki wewenang untuk beralih ke peran %.', p_target_role;
  END IF;

  v_old_role := v_profile.role;

  -- Mutasi peran aktif pada tabel profiles
  UPDATE public.profiles
  SET role = p_target_role,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  -- Pencatatan Audit Trail resmi
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
    v_old_role::TEXT,
    'UPDATE',
    'profiles',
    v_user_id::TEXT,
    jsonb_build_object('event', 'ROLE_SWITCH', 'old_role', v_old_role),
    jsonb_build_object('event', 'ROLE_SWITCH', 'active_role', p_target_role)
  );

  RETURN v_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.switch_active_role(public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_active_role(public.user_role) TO authenticated, service_role;

-- 5. RPC Pembaruan Profil Mandiri Pengguna
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_full_name TEXT,
  p_username TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile public.profiles%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi kedaluwarsa atau belum terautentikasi.';
  END IF;

  IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'Nama lengkap wajib diisi.';
  END IF;

  -- Cek keunikan username jika diisi
  IF p_username IS NOT NULL AND length(trim(p_username)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(username) = lower(trim(p_username))
        AND id <> v_user_id
    ) THEN
      RAISE EXCEPTION 'Username "%" sudah digunakan oleh akun lain.', trim(p_username);
    END IF;
  END IF;

  UPDATE public.profiles
  SET full_name = trim(p_full_name),
      username = NULLIF(trim(p_username), ''),
      phone_number = NULLIF(trim(p_phone_number), ''),
      job_title = NULLIF(trim(p_job_title), ''),
      bio = NULLIF(trim(p_bio), ''),
      avatar_url = NULLIF(trim(p_avatar_url), ''),
      updated_at = now()
  WHERE id = v_user_id AND is_active = true
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

