-- =============================================================================
-- Migrasi 0010: Penghapusan Akun Aman Berintegritas & Manajemen Peran Multi-Role
-- =============================================================================

-- 1. RPC Penghapusan Akun Internal Aman (Hard Delete dengan Validasi Transaksi Keuangan)
CREATE OR REPLACE FUNCTION public.delete_internal_user(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_profile public.profiles%ROWTYPE;
  v_target_profile public.profiles%ROWTYPE;
  v_sa_count INT;
  v_tx_count INT;
BEGIN
  -- A. Validasi Otorisasi Pemanggil adalah Super Admin aktif
  SELECT * INTO v_caller_profile
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;

  IF NOT FOUND OR (v_caller_profile.role IS DISTINCT FROM 'super_admin' AND NOT ('super_admin' = ANY(v_caller_profile.roles))) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang berhak menghapus akun pengguna.';
  END IF;

  -- B. Larangan menghapus akun sendiri
  IF auth.uid() = p_target_user_id THEN
    RAISE EXCEPTION 'Anda tidak dapat menghapus akun Anda sendiri.';
  END IF;

  -- C. Verifikasi keberadaan profil target
  SELECT * INTO v_target_profile FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan atau telah dihapus.';
  END IF;

  -- D. Larangan menghapus Super Admin terakhir di sistem
  IF ('super_admin' = ANY(v_target_profile.roles) OR v_target_profile.role = 'super_admin') THEN
    SELECT count(*) INTO v_sa_count
    FROM public.profiles
    WHERE ('super_admin' = ANY(roles) OR role = 'super_admin')
      AND is_active = true
      AND id <> p_target_user_id;
    IF v_sa_count < 1 THEN
      RAISE EXCEPTION 'Tidak dapat menghapus Super Admin terakhir pada sistem.';
    END IF;
  END IF;

  -- E. Pemeriksaan Keterkaitan Data Transaksi Keuangan (Integritas Pembukuan Altvira)
  -- 1) Purchase Orders Vendor
  SELECT count(*) INTO v_tx_count FROM public.purchase_orders
  WHERE created_by = p_target_user_id;
  IF v_tx_count > 0 THEN
    RAISE EXCEPTION 'Pengguna tidak dapat dihapus permanen karena tercatat dalam dokumen PO Pembelian. Gunakan fitur Nonaktifkan untuk mencabut akses.';
  END IF;

  -- 2) Pengajuan Pembayaran
  SELECT count(*) INTO v_tx_count FROM public.payment_requests
  WHERE requester_id = p_target_user_id OR approver_id = p_target_user_id;
  IF v_tx_count > 0 THEN
    RAISE EXCEPTION 'Pengguna tidak dapat dihapus permanen karena tercatat dalam pengajuan pembayaran. Gunakan fitur Nonaktifkan untuk mencabut akses.';
  END IF;

  -- 3) Jurnal Umum & Koreksi
  SELECT count(*) INTO v_tx_count FROM public.journals
  WHERE created_by = p_target_user_id OR posted_by = p_target_user_id;
  IF v_tx_count > 0 THEN
    RAISE EXCEPTION 'Pengguna tidak dapat dihapus permanen karena tercatat dalam ayat jurnal akuntansi. Gunakan fitur Nonaktifkan untuk mencabut akses.';
  END IF;

  -- 4) Invoice Penagihan Klien
  SELECT count(*) INTO v_tx_count FROM public.sales_invoices
  WHERE created_by = p_target_user_id;
  IF v_tx_count > 0 THEN
    RAISE EXCEPTION 'Pengguna tidak dapat dihapus permanen karena tercatat dalam penerbitan invoice penagihan klien. Gunakan fitur Nonaktifkan untuk mencabut akses.';
  END IF;

  -- 5) Anggota Tim Proyek & Pembuat Proyek
  SELECT count(*) INTO v_tx_count FROM public.project_members WHERE user_id = p_target_user_id;
  IF v_tx_count > 0 THEN
    RAISE EXCEPTION 'Pengguna masih terdaftar sebagai anggota dalam proyek aktif. Harap hapus penugasan proyek terlebih dahulu atau pilih Nonaktifkan.';
  END IF;

  SELECT count(*) INTO v_tx_count FROM public.projects WHERE created_by = p_target_user_id;
  IF v_tx_count > 0 THEN
    RAISE EXCEPTION 'Pengguna tidak dapat dihapus permanen karena tercatat sebagai pembuat data proyek. Gunakan fitur Nonaktifkan untuk mencabut akses.';
  END IF;

  -- Bersihkan referensi metadata non-transaksi
  UPDATE public.profiles SET created_by = NULL WHERE created_by = p_target_user_id;
  UPDATE public.company_profile SET updated_by = NULL WHERE updated_by = p_target_user_id;
  UPDATE public.doc_sequences SET updated_by = NULL WHERE updated_by = p_target_user_id;
  UPDATE public.doc_templates SET updated_by = NULL WHERE updated_by = p_target_user_id;
  DELETE FROM public.export_logs WHERE user_id = p_target_user_id;

  -- F. Catat Penghapusan ke Audit Trail
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    entity_name,
    entity_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    'super_admin',
    'DELETE',
    'profiles',
    p_target_user_id::TEXT,
    to_jsonb(v_target_profile),
    jsonb_build_object(
      'event', 'USER_DELETED',
      'deleted_user_email', v_target_profile.email,
      'deleted_user_name', v_target_profile.full_name
    )
  );

  -- G. Eksekusi Hapus dari public.profiles dan auth.users
  DELETE FROM public.profiles WHERE id = p_target_user_id;
  BEGIN
    DELETE FROM auth.users WHERE id = p_target_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_internal_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_internal_user(UUID) TO authenticated, service_role;

-- 2. RPC Pembaruan Hak Peran Multi-Role dari Super Admin
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
  v_target_profile public.profiles%ROWTYPE;
  v_sa_count INT;
  v_new_active_role public.user_role;
  v_old_roles public.user_role[];
BEGIN
  -- A. Validasi Otorisasi Pemanggil adalah Super Admin
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
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

  -- E. Larangan mencabut hak Super Admin terakhir di sistem
  IF ('super_admin' = ANY(v_old_roles) OR v_target_profile.role = 'super_admin') AND NOT ('super_admin' = ANY(p_roles)) THEN
    SELECT count(*) INTO v_sa_count
    FROM public.profiles
    WHERE ('super_admin' = ANY(roles) OR role = 'super_admin')
      AND is_active = true
      AND id <> p_target_user_id;
    IF v_sa_count < 1 THEN
      RAISE EXCEPTION 'Tidak dapat mencabut hak Super Admin terakhir pada sistem.';
    END IF;
  END IF;

  -- F. Penentuan Peran Aktif Otomatis
  IF p_primary_role IS NOT NULL AND (p_primary_role = ANY(p_roles)) THEN
    v_new_active_role := p_primary_role;
  ELSIF (v_target_profile.role = ANY(p_roles)) THEN
    v_new_active_role := v_target_profile.role;
  ELSE
    v_new_active_role := p_roles[1];
  END IF;

  -- G. Mutasi public.profiles
  UPDATE public.profiles
  SET roles = p_roles,
      role = v_new_active_role,
      updated_at = now()
  WHERE id = p_target_user_id
  RETURNING * INTO v_target_profile;

  -- H. Pencatatan Perubahan Peran ke Audit Trail
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    entity_name,
    entity_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    'super_admin',
    'UPDATE',
    'profiles',
    p_target_user_id::TEXT,
    jsonb_build_object(
      'event', 'USER_ROLES_UPDATED',
      'previous_roles', v_old_roles,
      'previous_active_role', v_target_profile.role
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

REVOKE EXECUTE ON FUNCTION public.update_user_roles(UUID, public.user_role[], public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_roles(UUID, public.user_role[], public.user_role) TO authenticated, service_role;
