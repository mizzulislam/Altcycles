-- =============================================================================
-- Migrasi 0005: Fase 2 Transaksi Internal
-- PO Pembelian Vendor, Payment Approval 1-Level, Lampiran Bukti, & Notifikasi
-- =============================================================================

CREATE TYPE public.po_status AS ENUM (
  'draft',
  'issued',
  'completed',
  'cancelled'
);

CREATE TYPE public.payment_request_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'paid'
);

CREATE TYPE public.attachment_entity_type AS ENUM (
  'payment_request_proof',
  'payment_transfer_proof',
  'project_document',
  'client_po',
  'bakp_signed',
  'uat_signed',
  'bast_signed'
);

-- 1. Purchase Order Pembelian Internal ke Vendor (FR-PO1..FR-PO6, BR-6, BR-7)
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(40) NOT NULL UNIQUE CHECK (length(trim(po_number)) > 0),
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  subtotal BIGINT NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status public.po_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  budget_warning_acknowledged BOOLEAN NOT NULL DEFAULT false,
  issued_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_po_total_match CHECK (total_amount = subtotal + tax_amount),
  CONSTRAINT chk_po_issued_positive CHECK (status = 'draft' OR total_amount > 0)
);

CREATE INDEX idx_po_project ON public.purchase_orders (project_id);
CREATE INDEX idx_po_vendor ON public.purchase_orders (vendor_id);
CREATE INDEX idx_po_created_by ON public.purchase_orders (created_by);

CREATE TRIGGER trg_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_no INT NOT NULL CHECK (line_no >= 1),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(30) NOT NULL DEFAULT 'Unit',
  unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
  line_total BIGINT NOT NULL CHECK (line_total >= 0),
  UNIQUE (po_id, line_no)
);

CREATE TABLE public.purchase_order_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  from_status public.po_status,
  to_status public.po_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BR-7: Dokumen PO yang sudah diterbitkan tidak dapat diubah isinya; hanya boleh selesai atau dibatalkan
CREATE OR REPLACE FUNCTION public.enforce_po_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'PO % yang sudah diterbitkan tidak dapat dihapus; gunakan pembatalan dokumen (BR-7).', OLD.po_number;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'PO % berstatus % sudah terkunci dan tidak dapat diubah lagi (BR-7).', OLD.po_number, OLD.status;
  END IF;

  IF OLD.status = 'issued' THEN
    IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.po_date IS DISTINCT FROM OLD.po_date
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
      RAISE EXCEPTION 'PO % yang sudah diterbitkan tidak dapat diubah rincian nilainya; batalkan lalu terbitkan PO baru (BR-7).', OLD.po_number;
    END IF;
    IF NEW.status = 'draft' THEN
      RAISE EXCEPTION 'PO yang sudah diterbitkan tidak dapat dikembalikan menjadi Draft.';
    END IF;
  END IF;

  IF NEW.status = 'issued' AND OLD.status = 'draft' THEN
    NEW.issued_at := COALESCE(NEW.issued_at, now());
  ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_po_immutability
BEFORE UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_po_immutability();

CREATE OR REPLACE FUNCTION public.enforce_po_items_draft_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.po_status;
  v_po_id UUID := COALESCE(NEW.po_id, OLD.po_id);
BEGIN
  SELECT status INTO v_status FROM public.purchase_orders WHERE id = v_po_id;
  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Item PO tidak dapat diubah setelah PO diterbitkan (BR-7).';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_po_items_draft_only
BEFORE INSERT OR UPDATE OR DELETE ON public.po_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_po_items_draft_only();

CREATE OR REPLACE FUNCTION public.log_po_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.purchase_order_status_logs (po_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.purchase_order_status_logs (po_id, from_status, to_status, changed_by, reason)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.cancel_reason);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_po_status_change
AFTER INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.log_po_status_change();

-- 2. Lampiran Berkas dengan Batas Ukuran <= 5 MB & Tipe Aman (FR-LA4)
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.attachment_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  mime_type TEXT NOT NULL CHECK (
    mime_type IN (
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ),
  file_size_bytes INT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_entity ON public.attachments (entity_type, entity_id);

-- 3. Notifikasi dalam Aplikasi & Log Ekspor (FR-PA6, UC-03, UC-29, UC-39)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_path TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

CREATE TABLE public.export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  report_type TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('PDF', 'EXCEL')),
  period_filter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Payment Approval Satu Level (FR-PA1..FR-PA7, BR-4, BR-5)
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(40) NOT NULL UNIQUE CHECK (length(trim(request_number)) > 0),
  revision_no INT NOT NULL DEFAULT 0 CHECK (revision_no >= 0),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL CHECK (length(trim(purpose)) > 0),
  recipient_name TEXT NOT NULL CHECK (length(trim(recipient_name)) > 0),
  recipient_bank_info TEXT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  expense_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  status public.payment_request_status NOT NULL DEFAULT 'draft',
  budget_warning_acknowledged BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  approver_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decided_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_date DATE,
  source_cash_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  accrual_journal_id UUID,
  payment_journal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- BR-4: Pemisahan tugas ketat di level database
  CONSTRAINT chk_payment_sod CHECK (requester_id IS DISTINCT FROM approver_id),
  -- BR-5: Penolakan wajib menyertakan alasan
  CONSTRAINT chk_payment_rejection_reason CHECK (
    status <> 'rejected' OR length(trim(coalesce(rejection_reason, ''))) >= 3
  )
);

CREATE INDEX idx_payment_requests_requester ON public.payment_requests (requester_id);
CREATE INDEX idx_payment_requests_status ON public.payment_requests (status);
CREATE INDEX idx_payment_requests_project ON public.payment_requests (project_id);

CREATE TRIGGER trg_payment_requests_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Proteksi status Payment Request agar pengaju hanya bisa mengubah saat Draft / Ditolak
CREATE OR REPLACE FUNCTION public.enforce_payment_request_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Pengajuan pembayaran % yang sudah diajukan tidak dapat dihapus.', OLD.request_number;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.status IN ('approved', 'rejected') AND NEW.approver_id = NEW.requester_id THEN
    RAISE EXCEPTION 'Pelanggaran pemisahan tugas: pengaju tidak boleh menyetujui atau menolak pengajuannya sendiri (BR-4).';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_payment_request_guard
BEFORE UPDATE OR DELETE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_request_guard();

-- RPC Pengajuan / Pengajuan Ulang Payment Request (memeriksa wajib lampiran & mengirim notifikasi ke Admin)
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

  -- Kirim notifikasi ke seluruh Admin aktif (FR-PA6)
  INSERT INTO public.notifications (user_id, title, message, link_path)
  SELECT p.id,
         'Pengajuan Pembayaran Baru: ' || v_req.request_number,
         'Pengajuan sebesar Rp' || v_req.amount::TEXT || ' untuk ' || v_req.purpose || ' menunggu persetujuan.',
         '/admin/persetujuan'
  FROM public.profiles p
  WHERE p.role = 'admin' AND p.is_active = true AND p.id <> v_req.requester_id;

  RETURN v_req;
END;
$$;

-- Trigger Audit Trail untuk tabel Fase 2
CREATE TRIGGER trg_audit_purchase_orders
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_payment_requests
AFTER INSERT OR UPDATE OR DELETE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

-- =============================================================================
-- Kebijakan RLS Fase 2
-- =============================================================================
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders FORCE ROW LEVEL SECURITY;

ALTER TABLE public.po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.purchase_order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_status_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.purchase_orders, public.po_items, public.purchase_order_status_logs,
  public.attachments, public.notifications, public.export_logs, public.payment_requests FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders, public.po_items,
  public.purchase_order_status_logs, public.attachments, public.notifications,
  public.export_logs, public.payment_requests TO authenticated;

-- Purchase Orders: User hanya miliknya & proyek yang diikuti; Admin semua; Super Admin ditolak
CREATE POLICY po_select_policy ON public.purchase_orders
FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'admin'
  OR (public.current_user_role() = 'user' AND created_by = auth.uid())
);

CREATE POLICY po_insert_policy ON public.purchase_orders
FOR INSERT TO authenticated
WITH CHECK (
  (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'user' AND public.is_project_member(project_id))
  )
  AND created_by = auth.uid()
);

CREATE POLICY po_update_policy ON public.purchase_orders
FOR UPDATE TO authenticated
USING (
  public.current_user_role() = 'admin'
  OR (public.current_user_role() = 'user' AND created_by = auth.uid() AND status IN ('draft', 'issued'))
)
WITH CHECK (
  public.current_user_role() = 'admin'
  OR (public.current_user_role() = 'user' AND created_by = auth.uid())
);

CREATE POLICY po_delete_draft_policy ON public.purchase_orders
FOR DELETE TO authenticated
USING (
  status = 'draft'
  AND (public.current_user_role() = 'admin' OR created_by = auth.uid())
);

CREATE POLICY po_items_policy ON public.po_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_items.po_id
      AND (public.current_user_role() = 'admin' OR po.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_items.po_id
      AND (public.current_user_role() = 'admin' OR po.created_by = auth.uid())
  )
);

CREATE POLICY po_status_logs_select_policy ON public.purchase_order_status_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_status_logs.po_id
      AND (public.current_user_role() = 'admin' OR po.created_by = auth.uid())
  )
);

-- Payment Requests: User hanya miliknya; Admin melihat semua & memproses via RPC
CREATE POLICY payment_requests_select_policy ON public.payment_requests
FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'admin'
  OR (public.current_user_role() = 'user' AND requester_id = auth.uid())
);

CREATE POLICY payment_requests_insert_policy ON public.payment_requests
FOR INSERT TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  AND status = 'draft'
  AND (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'user' AND public.is_project_member(project_id))
  )
);

CREATE POLICY payment_requests_update_requester ON public.payment_requests
FOR UPDATE TO authenticated
USING (
  requester_id = auth.uid() AND status IN ('draft', 'rejected')
)
WITH CHECK (
  requester_id = auth.uid() AND status IN ('draft', 'rejected')
);

CREATE POLICY payment_requests_delete_draft ON public.payment_requests
FOR DELETE TO authenticated
USING (requester_id = auth.uid() AND status = 'draft');

-- Attachments
CREATE POLICY attachments_select_internal ON public.attachments
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY attachments_insert_internal ON public.attachments
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND uploaded_by = auth.uid());

-- Notifications: hanya penerima yang dapat melihat & menandai sudah dibaca
CREATE POLICY notifications_own_policy ON public.notifications
FOR ALL TO authenticated
USING (user_id = auth.uid() AND public.is_active_user())
WITH CHECK (user_id = auth.uid() AND public.is_active_user());

-- Export Logs
CREATE POLICY export_logs_admin_policy ON public.export_logs
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin' AND user_id = auth.uid());

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

