-- =============================================================================
-- Migrasi 0008: Integrasi Supabase Cloud (Auth Trigger Grants, Storage Bucket,
--               & Pencatatan Login Aman lintas Peran)
-- Kompatibel dengan Supabase Cloud (PostgreSQL 15+) maupun PGlite pengujian lokal.
-- =============================================================================

-- 1. Pastikan peran internal GoTrue (supabase_auth_admin) tetap memiliki izin
--    menjalankan fungsi trigger handle_new_auth_user() setelah REVOKE EXECUTE
--    dari PUBLIC pada Migrasi 0007.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO supabase_auth_admin';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin';
  END IF;
END
$$;

-- 2. RPC pencatatan waktu login terakhir yang aman untuk semua peran aktif
--    (User, Admin, Super Admin) tanpa membuka hak UPDATE langsung ke public.profiles.
CREATE OR REPLACE FUNCTION public.touch_last_login()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    UPDATE public.profiles
    SET last_login_at = now()
    WHERE id = auth.uid()
      AND is_active = true;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.touch_last_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_login() TO authenticated, service_role;

-- 3. Provisioning Bucket Privat Supabase Storage `altcycles-files` (batas 5 MB, FR-LA4)
--    beserta kebijakan RLS pada `storage.objects` apabila skema `storage` tersedia.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'altcycles-files',
      'altcycles-files',
      false,
      5242880,
      ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    )
    ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

    -- Hapus kebijakan lama jika migrasi dijalankan ulang secara idempoten
    DROP POLICY IF EXISTS altcycles_storage_select_internal ON storage.objects;
    DROP POLICY IF EXISTS altcycles_storage_insert_internal ON storage.objects;
    DROP POLICY IF EXISTS altcycles_storage_update_admin ON storage.objects;
    DROP POLICY IF EXISTS altcycles_storage_delete_admin ON storage.objects;

    -- Pengguna internal aktif dapat mengunduh / membuat Signed URL berkas lampiran
    CREATE POLICY altcycles_storage_select_internal ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'altcycles-files'
      AND public.is_active_user()
    );

    -- Pengguna internal aktif dapat mengunggah bukti pengajuan pembayaran & dokumen resmi
    CREATE POLICY altcycles_storage_insert_internal ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'altcycles-files'
      AND public.is_active_user()
    );

    -- Admin & Super Admin dapat memperbarui / mengganti aset (seperti logo atau revisi dokumen)
    CREATE POLICY altcycles_storage_update_admin ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'altcycles-files'
      AND public.current_user_role() IN ('admin', 'super_admin')
    )
    WITH CHECK (
      bucket_id = 'altcycles-files'
      AND public.current_user_role() IN ('admin', 'super_admin')
    );

    CREATE POLICY altcycles_storage_delete_admin ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'altcycles-files'
      AND public.current_user_role() IN ('admin', 'super_admin')
    );
  END IF;
END
$$;

