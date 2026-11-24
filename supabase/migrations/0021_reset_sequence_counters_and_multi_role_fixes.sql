-- =============================================================================
-- Migrasi 0021: Perbaikan Reset Doc Sequence Counters & Multi-Role Authorization
-- 1. Berikan policy DELETE pada doc_sequence_counters & fungsi RPC reset_doc_sequence_counters()
-- 2. Perbaiki fungsi update_user_roles() & admin_delete_user() agar mengakui Super Admin
--    baik dari kolom tunggal role maupun array roles (multi-role).
-- =============================================================================

-- 1. Policy DELETE untuk doc_sequence_counters
DROP POLICY IF EXISTS doc_sequence_counters_delete_super_admin ON public.doc_sequence_counters;
CREATE POLICY doc_sequence_counters_delete_super_admin ON public.doc_sequence_counters
FOR DELETE TO authenticated
USING (
  public.current_user_role() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND ('super_admin' = ANY(roles) OR role = 'super_admin')
      AND is_active = true
  )
);

-- 2. Fungsi RPC reset_doc_sequence_counters dengan SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.reset_doc_sequence_counters(p_doc_type text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_roles public.user_role[];
  v_deleted_count int;
BEGIN
  -- Validasi pemanggil adalah Super Admin (baik role maupun multi-role roles array)
  SELECT role, roles INTO v_caller_role, v_caller_roles
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_caller_role IS DISTINCT FROM 'super_admin'
     AND NOT ('super_admin' = ANY(COALESCE(v_caller_roles, ARRAY[]::public.user_role[]))) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang berhak mereset urutan penomoran dokumen.';
  END IF;

  IF p_doc_type IS NOT NULL AND p_doc_type <> '' THEN
    DELETE FROM public.doc_sequence_counters
    WHERE doc_type = p_doc_type;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  ELSE
    DELETE FROM public.doc_sequence_counters;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;

  -- Catat ke audit trail
  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
  VALUES (
    auth.uid(),
    COALESCE(v_caller_role, 'super_admin'),
    'DELETE',
    'doc_sequence_counters',
    COALESCE(p_doc_type, 'ALL'),
    jsonb_build_object('event', 'RESET_DOC_SEQUENCE_COUNTERS', 'target', COALESCE(p_doc_type, 'ALL'), 'rows_deleted', v_deleted_count),
    jsonb_build_object('status', 'RESET_TO_INITIAL')
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', CASE
      WHEN p_doc_type IS NOT NULL AND p_doc_type <> '' THEN 'Urutan penomoran untuk dokumen ' || p_doc_type || ' berhasil di-reset ke status awal (Belum dipakai).'
      ELSE 'Seluruh urutan penomoran dokumen berhasil di-reset ke status awal (Belum dipakai).'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_doc_sequence_counters(text) TO authenticated, service_role;

-- 3. Perbaiki update_user_roles agar memeriksa multi-role array 'roles'
CREATE OR REPLACE FUNCTION public.update_user_roles(
  p_target_user_id UUID,
  p_roles public.user_role[],
  p_primary_role public.user_role DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_roles public.user_role[];
  v_target_profile public.profiles%ROWTYPE;
  v_sa_count INT;
  v_new_active_role public.user_role;
  v_old_roles public.user_role[];
  v_old_active_role public.user_role;
BEGIN
  -- A. Validasi Otorisasi Pemanggil adalah Super Admin (baik active role maupun multi-role array)
  SELECT role, roles INTO v_caller_role, v_caller_roles
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_caller_role IS DISTINCT FROM 'super_admin'
     AND NOT ('super_admin' = ANY(COALESCE(v_caller_roles, ARRAY[]::public.user_role[]))) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang berhak mengubah peran pengguna.';
  END IF;

  -- B. Larangan mengubah peran akun sendiri
  IF auth.uid() = p_target_user_id THEN
    RAISE EXCEPTION 'Anda tidak dapat mengubah peran akun Anda sendiri.';
  END IF;

  -- C. Verifikasi profil target
  SELECT * INTO v_target_profile FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan.';
  END IF;

  -- D. Minimal 1 peran wajib tercentang
  IF p_roles IS NULL OR array_length(p_roles, 1) = 0 THEN
    RAISE EXCEPTION 'Pengguna harus memiliki minimal satu peran aktif.';
  END IF;

  v_old_roles := v_target_profile.roles;
  v_old_active_role := v_target_profile.role;

  -- E. Larangan mencabut hak Super Admin terakhir di sistem
  IF ('super_admin' = ANY(v_old_roles) OR v_old_active_role = 'super_admin') AND NOT ('super_admin' = ANY(p_roles)) THEN
    SELECT count(*) INTO v_sa_count
    FROM public.profiles
    WHERE ('super_admin' = ANY(roles) OR role = 'super_admin')
      AND is_active = true
      AND id <> p_target_user_id;

    IF v_sa_count = 0 THEN
      RAISE EXCEPTION 'Tidak dapat mencabut hak Super Admin terakhir pada sistem.';
    END IF;
  END IF;

  -- F. Tentukan peran aktif baru
  IF p_primary_role IS NOT NULL AND p_primary_role = ANY(p_roles) THEN
    v_new_active_role := p_primary_role;
  ELSIF v_target_profile.role = ANY(p_roles) THEN
    v_new_active_role := v_target_profile.role;
  ELSE
    v_new_active_role := p_roles[1];
  END IF;

  -- G. Mutasi data profil target
  UPDATE public.profiles
  SET roles = p_roles,
      role = v_new_active_role,
      updated_at = now()
  WHERE id = p_target_user_id
  RETURNING * INTO v_target_profile;

  -- H. Catat audit trail
  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
  VALUES (
    auth.uid(),
    COALESCE(v_caller_role, 'super_admin'),
    'UPDATE',
    'profiles',
    p_target_user_id::text,
    jsonb_build_object(
      'event', 'USER_ROLES_UPDATED',
      'previous_roles', v_old_roles,
      'previous_active_role', v_old_active_role
    ),
    jsonb_build_object(
      'event', 'USER_ROLES_UPDATED',
      'new_roles', p_roles,
      'new_active_role', v_new_active_role
    )
  );

  RETURN v_target_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_roles(UUID, public.user_role[], public.user_role) TO authenticated, service_role;

-- 4. Perbaiki admin_delete_user agar memeriksa multi-role array 'roles'
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_target_user_id UUID,
  p_deletion_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_roles public.user_role[];
  v_target_profile public.profiles%ROWTYPE;
  v_sa_count INT;
BEGIN
  -- A. Validasi Otorisasi Pemanggil adalah Super Admin
  SELECT role, roles INTO v_caller_role, v_caller_roles
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_caller_role IS DISTINCT FROM 'super_admin'
     AND NOT ('super_admin' = ANY(COALESCE(v_caller_roles, ARRAY[]::public.user_role[]))) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang berhak menghapus akun pengguna.';
  END IF;

  -- B. Larangan menghapus akun sendiri
  IF auth.uid() = p_target_user_id THEN
    RAISE EXCEPTION 'Anda tidak dapat menghapus akun Anda sendiri.';
  END IF;

  -- C. Verifikasi profil target
  SELECT * INTO v_target_profile FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna yang akan dihapus tidak ditemukan.';
  END IF;

  -- D. Larangan menghapus Super Admin terakhir
  IF 'super_admin' = ANY(v_target_profile.roles) OR v_target_profile.role = 'super_admin' THEN
    SELECT count(*) INTO v_sa_count
    FROM public.profiles
    WHERE ('super_admin' = ANY(roles) OR role = 'super_admin')
      AND is_active = true
      AND id <> p_target_user_id;

    IF v_sa_count = 0 THEN
      RAISE EXCEPTION 'Tidak dapat menghapus Super Admin terakhir pada sistem.';
    END IF;
  END IF;

  -- E. Hapus profile & user
  DELETE FROM public.profiles WHERE id = p_target_user_id;
  DELETE FROM auth.users WHERE id = p_target_user_id;

  -- F. Audit log
  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
  VALUES (
    auth.uid(),
    COALESCE(v_caller_role, 'super_admin'),
    'DELETE',
    'profiles',
    p_target_user_id::text,
    row_to_json(v_target_profile),
    json_build_object('deletion_reason', p_deletion_reason)
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID, TEXT) TO authenticated, service_role;
