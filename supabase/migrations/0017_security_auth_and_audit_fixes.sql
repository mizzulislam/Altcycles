-- =============================================================================
-- Altcycles — Tahap 2: Pengamanan Trigger Signup, Audit Role, Journal Lock & Notifikasi Multi-Role
-- =============================================================================

-- 1. Amankan handle_new_auth_user(): selalu tetapkan peran default 'user'
--    dan abaikan metadata role/roles dari payload signup klien (AUD-02).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_username TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );
  v_username := NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), '');

  INSERT INTO public.profiles (id, full_name, email, role, roles, username, is_active)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    'user'::public.user_role,
    ARRAY['user']::public.user_role[],
    v_username,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = now();

  RETURN NEW;
END;
$$;

-- 2. Perbaiki audit trail update_user_roles(): catat previous_active_role sebelum UPDATE (AUD-07).
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
  v_old_active_role public.user_role;
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
  v_old_active_role := v_target_profile.role;

  -- E. Larangan mencabut hak Super Admin terakhir di sistem
  IF ('super_admin' = ANY(v_old_roles) OR v_old_active_role = 'super_admin') AND NOT ('super_admin' = ANY(p_roles)) THEN
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
  ELSIF (v_old_active_role = ANY(p_roles)) THEN
    v_new_active_role := v_old_active_role;
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

  -- H. Pencatatan Perubahan Peran ke Audit Trail (old_data memakai nilai sebelum mutasi)
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

REVOKE EXECUTE ON FUNCTION public.update_user_roles(UUID, public.user_role[], public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_roles(UUID, public.user_role[], public.user_role) TO authenticated, service_role;

-- 3. Batasi set_journal_lock_status() khusus Super Admin & cabut akses PUBLIC/anon (AUD-07).
CREATE OR REPLACE FUNCTION public.set_journal_lock_status(p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Hanya Super Admin yang dapat mengubah status kunci jurnal.';
  END IF;

  UPDATE public.company_profile
  SET journal_lock_enabled = p_enabled,
      updated_at = now()
  WHERE id = 1;

  RETURN p_enabled;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_journal_lock_status(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_journal_lock_status(boolean) TO authenticated, service_role;

-- 4. Perluas filter notifikasi Admin agar menjangkau pengguna multi-role berhak 'admin' (AUD-11).
CREATE OR REPLACE FUNCTION public.submit_payment_request(p_request_id UUID)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.payment_requests%ROWTYPE;
  v_proof_count INT;
  v_next_rev INT;
BEGIN
  SELECT * INTO v_req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengajuan pembayaran tidak ditemukan.';
  END IF;

  IF v_req.requester_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Hanya pembuat pengajuan yang dapat mengirim pengajuan ini.';
  END IF;

  IF v_req.status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Hanya pengajuan berstatus Draft atau Ditolak yang dapat diajukan.';
  END IF;

  SELECT count(*) INTO v_proof_count
  FROM public.attachments
  WHERE entity_type = 'payment_request_proof'
    AND entity_id = p_request_id;

  IF v_proof_count < 1 THEN
    RAISE EXCEPTION 'Pengajuan pembayaran wajib melampirkan minimal 1 berkas bukti tagihan/invoice.';
  END IF;

  v_next_rev := CASE WHEN v_req.status = 'rejected' THEN v_req.revision_no + 1 ELSE v_req.revision_no END;

  UPDATE public.payment_requests
  SET status = 'submitted',
      revision_no = v_next_rev,
      submitted_at = now(),
      approver_id = NULL,
      decided_at = NULL,
      rejection_reason = NULL
  WHERE id = p_request_id
  RETURNING * INTO v_req;

  INSERT INTO public.notifications (user_id, title, message, link_path)
  SELECT p.id,
         'Pengajuan Pembayaran Baru: ' || v_req.request_number,
         'Pengajuan sebesar Rp' || v_req.amount::TEXT || ' untuk ' || v_req.purpose || ' menunggu persetujuan.',
         '/admin/persetujuan'
  FROM public.profiles p
  WHERE (p.role = 'admin' OR 'admin' = ANY(p.roles))
    AND p.is_active = true
    AND p.id <> v_req.requester_id;

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_buyer_submit_po(
  p_client_name TEXT,
  p_client_company TEXT,
  p_client_email TEXT,
  p_client_phone TEXT,
  p_quotation_reference TEXT,
  p_po_value BIGINT,
  p_items JSONB,
  p_ip_hash TEXT DEFAULT 'local'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_submits INT;
  v_po_number TEXT;
  v_created public.client_purchase_orders%ROWTYPE;
  v_attempt INT := 0;
BEGIN
  SELECT count(*) INTO v_recent_submits
  FROM public.po_access_logs
  WHERE ip_hash = p_ip_hash
    AND action = 'submit_po'
    AND created_at > now() - interval '15 minutes';

  IF v_recent_submits >= 5 THEN
    RAISE EXCEPTION 'Batas laju pengajuan PO terlampaui. Silakan coba kembali dalam 15 menit.';
  END IF;

  IF p_po_value <= 0 OR length(trim(coalesce(p_client_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Data pengajuan PO klien tidak valid.';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_po_number := public.generate_client_po_number(CURRENT_DATE);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.client_purchase_orders WHERE po_number = v_po_number
    ) OR v_attempt > 10;
  END LOOP;

  INSERT INTO public.client_purchase_orders (
    po_number,
    quotation_reference,
    client_name,
    client_company,
    client_email,
    client_phone,
    items_json,
    po_value,
    status,
    submitted_ip_hash
  )
  VALUES (
    v_po_number,
    NULLIF(trim(p_quotation_reference), ''),
    trim(p_client_name),
    NULLIF(trim(p_client_company), ''),
    trim(p_client_email),
    NULLIF(trim(p_client_phone), ''),
    COALESCE(p_items, '[]'::JSONB),
    p_po_value,
    'pending_verification',
    p_ip_hash
  )
  RETURNING * INTO v_created;

  INSERT INTO public.po_access_logs (po_number_attempted, ip_hash, action, was_found)
  VALUES (v_po_number, p_ip_hash, 'submit_po', true);

  INSERT INTO public.notifications (user_id, title, message, link_path)
  SELECT p.id,
         'PO Klien Baru: ' || v_po_number,
         'Klien ' || v_created.client_name || ' mengajukan PO senilai Rp' || v_created.po_value::TEXT || ' (Menunggu Verifikasi).',
         '/admin/proyek'
  FROM public.profiles p
  WHERE (p.role = 'admin' OR 'admin' = ANY(p.roles))
    AND p.is_active = true;

  RETURN jsonb_build_object(
    'po_number', v_created.po_number,
    'status', v_created.status,
    'po_value', v_created.po_value,
    'created_at', v_created.created_at
  );
END;
$$;

