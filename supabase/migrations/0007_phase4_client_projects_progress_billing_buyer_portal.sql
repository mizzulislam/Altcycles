-- =============================================================================
-- Migrasi 0007: Fase 4 Proyek Klien, Portal Pembeli, Dokumen Lampiran A,
-- Invoice & Kuitansi, Mesin Progress Billing (1, 2, >=3 Termin), & Bagi Hasil
-- =============================================================================

CREATE TYPE public.quotation_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired'
);

CREATE TYPE public.client_po_status AS ENUM (
  'pending_verification',
  'verified',
  'rejected'
);

CREATE TYPE public.milestone_status AS ENUM (
  'planned',
  'in_progress',
  'bakp_approved',
  'invoiced',
  'paid'
);

CREATE TYPE public.bakp_status AS ENUM (
  'draft',
  'approved_by_client'
);

CREATE TYPE public.uat_conclusion AS ENUM (
  'pending',
  'accepted',
  'accepted_with_notes',
  'rejected'
);

CREATE TYPE public.bast_status AS ENUM (
  'draft',
  'signed'
);

CREATE TYPE public.invoice_kind AS ENUM (
  'down_payment',
  'milestone',
  'final_settlement'
);

CREATE TYPE public.invoice_doc_status AS ENUM (
  'draft',
  'issued',
  'cancelled'
);

CREATE TYPE public.invoice_payment_status AS ENUM (
  'unpaid',
  'partial',
  'paid',
  'cancelled'
);

CREATE TYPE public.profit_sharing_status AS ENUM (
  'draft_simulation',
  'finalized'
);

-- 1. Quotation / Penawaran Harga (UC-12, FR-PK2, Lampiran A.1)
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number VARCHAR(40) NOT NULL UNIQUE CHECK (length(trim(quotation_number)) > 0),
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_title TEXT NOT NULL CHECK (length(trim(project_title)) > 0),
  client_need_summary TEXT,
  estimated_weeks INT NOT NULL DEFAULT 4 CHECK (estimated_weeks >= 1),
  revision_limit INT NOT NULL DEFAULT 2 CHECK (revision_limit >= 0),
  total_amount BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status public.quotation_status NOT NULL DEFAULT 'draft',
  terms_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  line_no INT NOT NULL CHECK (line_no >= 1),
  feature_name TEXT NOT NULL CHECK (length(trim(feature_name)) > 0),
  description TEXT,
  cost_amount BIGINT NOT NULL CHECK (cost_amount >= 0),
  UNIQUE (quotation_id, line_no)
);

-- 2. PO Klien & Log Akses Portal Pembeli (UC-14, UC-34..36, FR-PB1..9, BR-18, BR-23)
CREATE TABLE public.client_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(30) NOT NULL UNIQUE CHECK (po_number ~ '^PO-[0-9]{6}-[A-HJ-NP-Z2-9]{6}$'),
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT,
  quotation_reference TEXT,
  client_name TEXT NOT NULL CHECK (length(trim(client_name)) > 0),
  client_company TEXT,
  client_email TEXT NOT NULL CHECK (position('@' IN client_email) > 1),
  client_phone TEXT,
  items_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  po_value BIGINT NOT NULL CHECK (po_value > 0),
  status public.client_po_status NOT NULL DEFAULT 'pending_verification',
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  rejection_note TEXT,
  attachment_path TEXT,
  submitted_ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_po_project ON public.client_purchase_orders (project_id);

CREATE TABLE public.po_access_logs (
  id BIGSERIAL PRIMARY KEY,
  po_number_attempted VARCHAR(50) NOT NULL,
  ip_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submit_po', 'lookup_portal', 'download_document')),
  was_found BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_access_logs_rate ON public.po_access_logs (ip_hash, created_at DESC);

-- 3. Dokumen Proyek SoW & SPK (UC-13, FR-PK3, Lampiran A.2 & A.3)
CREATE TABLE public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('SOW', 'SPK', 'OTHER')),
  doc_number VARCHAR(40) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  content_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_signed BOOLEAN NOT NULL DEFAULT false,
  signed_storage_path TEXT,
  visible_to_buyer BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Termin Pembayaran Proyek (UC-15, FR-PK5, BR-17: Total harus 100%)
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sequence_no INT NOT NULL CHECK (sequence_no >= 1),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  is_down_payment BOOLEAN NOT NULL DEFAULT false,
  is_final_settlement BOOLEAN NOT NULL DEFAULT false,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount BIGINT NOT NULL CHECK (amount > 0),
  achievement_criteria TEXT,
  status public.milestone_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, sequence_no)
);

-- RPC Penyimpanan Termin Sekaligus: Menegakkan Total Persentase Tepat 100% (BR-17)
CREATE OR REPLACE FUNCTION public.save_project_milestones(
  p_project_id UUID,
  p_milestones JSONB
)
RETURNS SETOF public.milestones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_total_pct NUMERIC(7,2) := 0;
  v_total_amt BIGINT := 0;
  v_count INT := 0;
  v_item JSONB;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang mengatur termin proyek.';
  END IF;

  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyek tidak ditemukan.';
  END IF;

  IF v_project.has_posted_journal THEN
    RAISE EXCEPTION 'Jadwal termin tidak dapat disusun ulang setelah proyek memiliki jurnal terposting.';
  END IF;

  SELECT
    COUNT(*),
    COALESCE(SUM((elem ->> 'percentage')::NUMERIC(5,2)), 0),
    COALESCE(SUM((elem ->> 'amount')::BIGINT), 0)
  INTO v_count, v_total_pct, v_total_amt
  FROM jsonb_array_elements(p_milestones) AS elem;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Minimal harus ada 1 termin pembayaran.';
  END IF;

  IF v_total_pct <> 100.00 THEN
    RAISE EXCEPTION 'Total persentase termin per proyek harus tepat 100%% (saat ini: %%%) (BR-17).', v_total_pct;
  END IF;

  IF v_project.contract_value > 0 AND v_total_amt <> v_project.contract_value THEN
    RAISE EXCEPTION 'Total nilai termin (Rp%) harus sama dengan nilai kontrak proyek (Rp%).',
      v_total_amt, v_project.contract_value;
  END IF;

  DELETE FROM public.milestones WHERE project_id = p_project_id;

  v_count := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_milestones)
  LOOP
    v_count := v_count + 1;
    INSERT INTO public.milestones (
      project_id,
      sequence_no,
      name,
      is_down_payment,
      is_final_settlement,
      percentage,
      amount,
      achievement_criteria,
      status
    )
    VALUES (
      p_project_id,
      v_count,
      v_item ->> 'name',
      COALESCE((v_item ->> 'is_down_payment')::BOOLEAN, false),
      COALESCE((v_item ->> 'is_final_settlement')::BOOLEAN, false),
      (v_item ->> 'percentage')::NUMERIC(5,2),
      (v_item ->> 'amount')::BIGINT,
      v_item ->> 'achievement_criteria',
      'planned'
    );
  END LOOP;

  -- Perbarui term_count pada proyek agar trigger memilih revenue_method otomatis (BR-13)
  UPDATE public.projects
  SET term_count = v_count
  WHERE id = p_project_id;

  RETURN QUERY
  SELECT * FROM public.milestones WHERE project_id = p_project_id ORDER BY sequence_no;
END;
$$;

-- 5. BAKP, UAT, & BAST (UC-16..18, FR-PK6..8, Lampiran A.4, A.7, A.8)
CREATE TABLE public.progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bakp_number VARCHAR(40) NOT NULL UNIQUE,
  bakp_date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL UNIQUE REFERENCES public.milestones(id) ON DELETE RESTRICT,
  cumulative_percentage NUMERIC(5,2) NOT NULL CHECK (cumulative_percentage >= 0 AND cumulative_percentage <= 100),
  billable_amount BIGINT NOT NULL CHECK (billable_amount > 0),
  deliverables_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  findings_notes TEXT,
  status public.bakp_status NOT NULL DEFAULT 'draft',
  signed_storage_path TEXT,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.uat_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uat_number VARCHAR(40) NOT NULL UNIQUE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  staging_url TEXT,
  client_tester_name TEXT NOT NULL,
  altvira_companion_name TEXT NOT NULL,
  conclusion public.uat_conclusion NOT NULL DEFAULT 'pending',
  signed_storage_path TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.uat_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uat_id UUID NOT NULL REFERENCES public.uat_checklists(id) ON DELETE CASCADE,
  line_no INT NOT NULL CHECK (line_no >= 1),
  feature_name TEXT NOT NULL,
  test_scenario TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'pass', 'fail')),
  notes TEXT,
  UNIQUE (uat_id, line_no)
);

CREATE TABLE public.handover_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bast_number VARCHAR(40) NOT NULL UNIQUE,
  bast_date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  uat_id UUID NOT NULL REFERENCES public.uat_checklists(id) ON DELETE RESTRICT,
  handover_items_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  warranty_days INT NOT NULL DEFAULT 30 CHECK (warranty_days >= 0),
  status public.bast_status NOT NULL DEFAULT 'draft',
  signed_storage_path TEXT,
  signed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FR-PK8: BAST hanya dapat dibuat/ditandatangani bila UAT sudah lulus (accepted / accepted_with_notes)
CREATE OR REPLACE FUNCTION public.enforce_bast_requires_passed_uat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_conclusion public.uat_conclusion;
BEGIN
  SELECT conclusion INTO v_conclusion FROM public.uat_checklists WHERE id = NEW.uat_id;
  IF v_conclusion NOT IN ('accepted', 'accepted_with_notes') THEN
    RAISE EXCEPTION 'BAST tidak dapat diterbitkan sebelum UAT dinyatakan Diterima (FR-PK8).';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_bast_requires_passed_uat
BEFORE INSERT OR UPDATE ON public.handover_reports
FOR EACH ROW EXECUTE FUNCTION public.enforce_bast_requires_passed_uat();

-- 6. Progres Penyelesaian Proyek per Periode (UC-25, FR-PK9, BR-21)
CREATE TABLE public.project_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
  progress_date DATE NOT NULL,
  bakp_id UUID REFERENCES public.progress_reports(id) ON DELETE SET NULL,
  cumulative_percentage NUMERIC(5,2) NOT NULL CHECK (cumulative_percentage >= 0 AND cumulative_percentage <= 100),
  cumulative_recognized_revenue BIGINT NOT NULL CHECK (cumulative_recognized_revenue >= 0),
  period_recognized_revenue BIGINT NOT NULL CHECK (period_recognized_revenue >= 0),
  adjustment_journal_id UUID REFERENCES public.journals(id) ON DELETE RESTRICT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, period_id)
);

-- BR-21: Persentase penyelesaian tidak boleh turun dan tidak boleh melebihi 100%
CREATE OR REPLACE FUNCTION public.enforce_monotonic_project_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_max NUMERIC(5,2);
BEGIN
  SELECT COALESCE(MAX(pp.cumulative_percentage), 0)
  INTO v_prev_max
  FROM public.project_progress pp
  WHERE pp.project_id = NEW.project_id
    AND pp.id IS DISTINCT FROM NEW.id
    AND pp.progress_date <= NEW.progress_date;

  IF NEW.cumulative_percentage < v_prev_max THEN
    RAISE EXCEPTION 'Persentase penyelesaian proyek (%) tidak boleh turun di bawah progres sebelumnya (%) (BR-21).',
      NEW.cumulative_percentage, v_prev_max;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_monotonic_project_progress
BEFORE INSERT OR UPDATE ON public.project_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_monotonic_project_progress();

-- 7. Sales Invoices, Pembayaran Klien, & Kuitansi (UC-19..21, FR-FJ1..7, BR-7, BR-14..16, BR-22, BR-23)
CREATE TABLE public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE RESTRICT,
  client_po_id UUID NOT NULL REFERENCES public.client_purchase_orders(id) ON DELETE RESTRICT,
  bakp_id UUID REFERENCES public.progress_reports(id) ON DELETE RESTRICT,
  bast_id UUID REFERENCES public.handover_reports(id) ON DELETE RESTRICT,
  invoice_kind public.invoice_kind NOT NULL,
  subtotal_amount BIGINT NOT NULL CHECK (subtotal_amount > 0),
  ppn_amount BIGINT NOT NULL DEFAULT 0 CHECK (ppn_amount >= 0),
  total_amount BIGINT NOT NULL CHECK (total_amount = subtotal_amount + ppn_amount),
  paid_amount BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= total_amount),
  doc_status public.invoice_doc_status NOT NULL DEFAULT 'draft',
  payment_status public.invoice_payment_status NOT NULL DEFAULT 'unpaid',
  journal_id UUID REFERENCES public.journals(id) ON DELETE RESTRICT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_invoice_due_date CHECK (due_date >= invoice_date)
);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  percentage NUMERIC(5,2),
  amount BIGINT NOT NULL CHECK (amount > 0)
);

CREATE TABLE public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  destination_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  payment_method TEXT NOT NULL DEFAULT 'Transfer Bank',
  proof_storage_path TEXT,
  journal_id UUID REFERENCES public.journals(id) ON DELETE RESTRICT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(40) NOT NULL UNIQUE,
  receipt_date DATE NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE RESTRICT,
  invoice_payment_id UUID NOT NULL UNIQUE REFERENCES public.invoice_payments(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  received_from TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger Validasi Invoice (BR-7, BR-14, BR-15, BR-22, BR-23)
CREATE OR REPLACE FUNCTION public.enforce_sales_invoice_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_po_status public.client_po_status;
  v_bakp_status public.bakp_status;
  v_bast_status public.bast_status;
  v_pkp BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.doc_status <> 'draft' THEN
      RAISE EXCEPTION 'Invoice % yang sudah diterbitkan tidak dapat dihapus (BR-7).', OLD.invoice_number;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.doc_status = 'issued' THEN
    IF NEW.subtotal_amount IS DISTINCT FROM OLD.subtotal_amount
       OR NEW.ppn_amount IS DISTINCT FROM OLD.ppn_amount
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      RAISE EXCEPTION 'Invoice % yang sudah diterbitkan tidak dapat diubah nilainya; batalkan lalu terbitkan baru (BR-7).', OLD.invoice_number;
    END IF;
  END IF;

  SELECT pkp_enabled INTO v_pkp FROM public.company_profile WHERE id = 1;
  IF COALESCE(v_pkp, false) = false AND NEW.ppn_amount > 0 THEN
    RAISE EXCEPTION 'Altvira belum PKP sehingga invoice tidak boleh mengenakan PPN (BR-22).';
  END IF;

  IF NEW.doc_status = 'issued' THEN
    -- BR-23: PO Klien harus sudah diverifikasi Admin
    SELECT status INTO v_po_status FROM public.client_purchase_orders WHERE id = NEW.client_po_id;
    IF v_po_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'PO Klien belum diverifikasi Admin dan belum aktif sebagai referensi penagihan (BR-23).';
    END IF;

    -- BR-14: Invoice termin progres wajib melampirkan BAKP yang disetujui klien
    IF NEW.invoice_kind = 'milestone' THEN
      IF NEW.bakp_id IS NULL THEN
        RAISE EXCEPTION 'Invoice termin wajib melampirkan BAKP (BR-14).';
      END IF;
      SELECT status INTO v_bakp_status FROM public.progress_reports WHERE id = NEW.bakp_id;
      IF v_bakp_status IS DISTINCT FROM 'approved_by_client' THEN
        RAISE EXCEPTION 'Invoice termin hanya dapat diterbitkan setelah BAKP disetujui klien (BR-14).';
      END IF;
    END IF;

    -- BR-15: Invoice pelunasan wajib melampirkan BAST bertanda tangan
    IF NEW.invoice_kind = 'final_settlement' THEN
      IF NEW.bast_id IS NULL THEN
        RAISE EXCEPTION 'Invoice pelunasan wajib melampirkan BAST (BR-15).';
      END IF;
      SELECT status INTO v_bast_status FROM public.handover_reports WHERE id = NEW.bast_id;
      IF v_bast_status IS DISTINCT FROM 'signed' THEN
        RAISE EXCEPTION 'Invoice pelunasan hanya dapat diterbitkan setelah BAST ditandatangani (BR-15).';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_sales_invoice_rules
BEFORE INSERT OR UPDATE OR DELETE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION public.enforce_sales_invoice_rules();

-- =============================================================================
-- 8. Mesin Akuntansi Proyek: Eliminasi 100%, Penagihan, Kuitansi, & Progress Billing
-- =============================================================================

-- Fungsi internal: Memeriksa apakah proyek progress_billing telah mencapai 100% progres DAN 100% tertagih;
-- bila ya, otomatis memposting Jurnal Eliminasi (FR-AK11 & Bagian 7.1)
CREATE OR REPLACE FUNCTION public.try_eliminate_progress_billing_project(
  p_project_id UUID,
  p_elimination_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj public.projects%ROWTYPE;
  v_max_pct NUMERIC(5,2);
  v_wip_acc_id UUID;
  v_billings_acc_id UUID;
  v_wip_balance BIGINT;
  v_billings_balance BIGINT;
  v_elim_jrn_id UUID;
BEGIN
  SELECT * INTO v_proj FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND OR v_proj.revenue_method <> 'progress_billing' OR v_proj.is_eliminated = true THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(cumulative_percentage), 0) INTO v_max_pct
  FROM public.project_progress
  WHERE project_id = p_project_id;

  IF v_max_pct < 100.00 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_wip_acc_id FROM public.accounts WHERE system_tag = 'work_in_progress' LIMIT 1;
  SELECT id INTO v_billings_acc_id FROM public.accounts WHERE system_tag = 'contract_billings' LIMIT 1;

  SELECT COALESCE(SUM(jl.debit - jl.credit), 0)::BIGINT INTO v_wip_balance
  FROM public.journal_lines jl
  JOIN public.journals j ON j.id = jl.journal_id
  WHERE j.status = 'posted'
    AND jl.account_id = v_wip_acc_id
    AND COALESCE(jl.project_id, j.project_id) = p_project_id;

  SELECT COALESCE(SUM(jl.credit - jl.debit), 0)::BIGINT INTO v_billings_balance
  FROM public.journal_lines jl
  JOIN public.journals j ON j.id = jl.journal_id
  WHERE j.status = 'posted'
    AND jl.account_id = v_billings_acc_id
    AND COALESCE(jl.project_id, j.project_id) = p_project_id;

  IF v_wip_balance = v_proj.contract_value
     AND v_billings_balance = v_proj.contract_value
     AND v_proj.contract_value > 0 THEN
    v_elim_jrn_id := public.create_and_post_journal(
      p_elimination_date,
      'elimination',
      'Eliminasi Penagihan atas Kontrak & Jasa dalam Proses saat proyek selesai 100% — ' || v_proj.code,
      jsonb_build_array(
        jsonb_build_object(
          'account_id', v_billings_acc_id,
          'project_id', p_project_id,
          'description', 'Eliminasi Penagihan atas Kontrak ' || v_proj.code,
          'debit', v_proj.contract_value,
          'credit', 0
        ),
        jsonb_build_object(
          'account_id', v_wip_acc_id,
          'project_id', p_project_id,
          'description', 'Eliminasi Jasa dalam Proses ' || v_proj.code,
          'debit', 0,
          'credit', v_proj.contract_value
        )
      ),
      p_project_id,
      'project_completion_elimination',
      p_project_id,
      NULL,
      false
    );

    UPDATE public.projects
    SET is_eliminated = true,
        status = 'completed',
        completed_date = COALESCE(completed_date, p_elimination_date)
    WHERE id = p_project_id;

    RETURN v_elim_jrn_id;
  END IF;

  RETURN NULL;
END;
$$;

-- RPC Penerbitan Invoice (dan opsi pembayaran langsung tunai/transfer pada tanggal yang sama)
CREATE OR REPLACE FUNCTION public.issue_sales_invoice(
  p_invoice_id UUID,
  p_direct_cash_account_id UUID DEFAULT NULL
)
RETURNS public.sales_invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.sales_invoices%ROWTYPE;
  v_proj public.projects%ROWTYPE;
  v_cust_name TEXT;
  v_debit_acc_id UUID;
  v_credit_acc_id UUID;
  v_jrn_id UUID;
  v_payment_id UUID;
  v_kw_no TEXT;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang menerbitkan invoice.';
  END IF;

  SELECT * INTO v_inv FROM public.sales_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan.';
  END IF;
  IF v_inv.doc_status <> 'draft' THEN
    RAISE EXCEPTION 'Invoice % sudah pernah diterbitkan.', v_inv.invoice_number;
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = v_inv.project_id;
  SELECT name INTO v_cust_name FROM public.customers WHERE id = v_inv.customer_id;

  -- Tentukan akun Debit: Kas/Bank bila langsung dibayar pada saat terbit, atau Piutang Usaha bila belum masuk dana
  IF p_direct_cash_account_id IS NOT NULL THEN
    v_debit_acc_id := p_direct_cash_account_id;
  ELSE
    SELECT id INTO v_debit_acc_id
    FROM public.accounts
    WHERE system_tag = 'accounts_receivable' AND is_active = true
    ORDER BY code LIMIT 1;
  END IF;

  -- Tentukan akun Kredit menurut metode pengakuan pendapatan proyek (PRD Bagian 7.1)
  IF v_proj.revenue_method = 'progress_billing' THEN
    SELECT id INTO v_credit_acc_id
    FROM public.accounts
    WHERE system_tag = 'contract_billings' AND is_active = true
    ORDER BY code LIMIT 1;
  ELSIF v_proj.revenue_method = 'two_term_accrual' AND v_inv.invoice_kind = 'final_settlement' THEN
    SELECT id INTO v_credit_acc_id
    FROM public.accounts
    WHERE system_tag = 'service_revenue' AND is_active = true
    ORDER BY code LIMIT 1;
  ELSE
    -- Proyek 1 termin (deferral) atau DP pada proyek 2 termin
    SELECT id INTO v_credit_acc_id
    FROM public.accounts
    WHERE system_tag = 'unearned_revenue' AND is_active = true
    ORDER BY code LIMIT 1;
  END IF;

  v_jrn_id := public.create_and_post_journal(
    v_inv.invoice_date,
    'auto_invoice',
    'Penagihan Invoice ' || v_inv.invoice_number || ' — ' || v_proj.name,
    jsonb_build_array(
      jsonb_build_object(
        'account_id', v_debit_acc_id,
        'project_id', v_proj.id,
        'description', 'Tagihan ' || v_inv.invoice_number,
        'debit', v_inv.total_amount,
        'credit', 0
      ),
      jsonb_build_object(
        'account_id', v_credit_acc_id,
        'project_id', v_proj.id,
        'description', 'Penagihan termin ' || v_inv.invoice_number,
        'debit', 0,
        'credit', v_inv.total_amount
      )
    ),
    v_proj.id,
    'sales_invoice',
    v_inv.id,
    NULL,
    false
  );

  IF p_direct_cash_account_id IS NOT NULL THEN
    UPDATE public.sales_invoices
    SET doc_status = 'issued',
        paid_amount = v_inv.total_amount,
        payment_status = 'paid',
        journal_id = v_jrn_id
    WHERE id = p_invoice_id
    RETURNING * INTO v_inv;

    INSERT INTO public.invoice_payments (
      invoice_id, payment_date, amount, destination_account_id, payment_method, journal_id, recorded_by
    )
    VALUES (
      v_inv.id, v_inv.invoice_date, v_inv.total_amount, p_direct_cash_account_id, 'Transfer Bank', v_jrn_id, auth.uid()
    )
    RETURNING id INTO v_payment_id;

    v_kw_no := public.next_doc_number('KW', v_inv.invoice_date);
    INSERT INTO public.receipts (
      receipt_number, receipt_date, invoice_id, invoice_payment_id, amount, received_from
    )
    VALUES (
      v_kw_no, v_inv.invoice_date, v_inv.id, v_payment_id, v_inv.total_amount, v_cust_name
    );

    IF v_inv.milestone_id IS NOT NULL THEN
      UPDATE public.milestones SET status = 'paid' WHERE id = v_inv.milestone_id;
    END IF;
  ELSE
    UPDATE public.sales_invoices
    SET doc_status = 'issued',
        payment_status = 'unpaid',
        journal_id = v_jrn_id
    WHERE id = p_invoice_id
    RETURNING * INTO v_inv;

    IF v_inv.milestone_id IS NOT NULL THEN
      UPDATE public.milestones SET status = 'invoiced' WHERE id = v_inv.milestone_id;
    END IF;
  END IF;

  PERFORM public.try_eliminate_progress_billing_project(v_proj.id, v_inv.invoice_date);
  RETURN v_inv;
END;
$$;

-- RPC Pencatatan Pembayaran Klien atas Invoice Piutang & Penerbitan Kuitansi Otomatis (FR-FJ3, FR-FJ6, BR-16)
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  p_invoice_id UUID,
  p_payment_date DATE,
  p_amount BIGINT,
  p_destination_account_id UUID,
  p_payment_method TEXT DEFAULT 'Transfer Bank'
)
RETURNS public.receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.sales_invoices%ROWTYPE;
  v_ar_acc_id UUID;
  v_cust_name TEXT;
  v_new_paid BIGINT;
  v_new_status public.invoice_payment_status;
  v_jrn_id UUID;
  v_payment_id UUID;
  v_kw_no TEXT;
  v_receipt public.receipts%ROWTYPE;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang mencatat penerimaan pembayaran invoice.';
  END IF;

  SELECT * INTO v_inv FROM public.sales_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND OR v_inv.doc_status <> 'issued' THEN
    RAISE EXCEPTION 'Invoice belum diterbitkan atau telah dibatalkan.';
  END IF;

  IF p_amount <= 0 OR (v_inv.paid_amount + p_amount) > v_inv.total_amount THEN
    RAISE EXCEPTION 'Nominal pembayaran melebihi sisa tagihan invoice.';
  END IF;

  SELECT id INTO v_ar_acc_id
  FROM public.accounts
  WHERE system_tag = 'accounts_receivable' AND is_active = true
  ORDER BY code LIMIT 1;

  SELECT name INTO v_cust_name FROM public.customers WHERE id = v_inv.customer_id;

  v_jrn_id := public.create_and_post_journal(
    p_payment_date,
    'auto_receipt',
    'Penerimaan pembayaran Invoice ' || v_inv.invoice_number,
    jsonb_build_array(
      jsonb_build_object(
        'account_id', p_destination_account_id,
        'project_id', v_inv.project_id,
        'description', 'Dana masuk Invoice ' || v_inv.invoice_number,
        'debit', p_amount,
        'credit', 0
      ),
      jsonb_build_object(
        'account_id', v_ar_acc_id,
        'project_id', v_inv.project_id,
        'description', 'Pelunasan piutang ' || v_inv.invoice_number,
        'debit', 0,
        'credit', p_amount
      )
    ),
    v_inv.project_id,
    'invoice_payment',
    v_inv.id,
    NULL,
    false
  );

  INSERT INTO public.invoice_payments (
    invoice_id, payment_date, amount, destination_account_id, payment_method, journal_id, recorded_by
  )
  VALUES (
    v_inv.id, p_payment_date, p_amount, p_destination_account_id, p_payment_method, v_jrn_id, auth.uid()
  )
  RETURNING id INTO v_payment_id;

  v_new_paid := v_inv.paid_amount + p_amount;
  v_new_status := CASE WHEN v_new_paid >= v_inv.total_amount THEN 'paid' ELSE 'partial' END;

  UPDATE public.sales_invoices
  SET paid_amount = v_new_paid,
      payment_status = v_new_status
  WHERE id = v_inv.id;

  IF v_new_status = 'paid' AND v_inv.milestone_id IS NOT NULL THEN
    UPDATE public.milestones SET status = 'paid' WHERE id = v_inv.milestone_id;
  END IF;

  v_kw_no := public.next_doc_number('KW', p_payment_date);
  INSERT INTO public.receipts (
    receipt_number, receipt_date, invoice_id, invoice_payment_id, amount, received_from
  )
  VALUES (
    v_kw_no, p_payment_date, v_inv.id, v_payment_id, p_amount, v_cust_name
  )
  RETURNING * INTO v_receipt;

  RETURN v_receipt;
END;
$$;

-- RPC Input Persentase Penyelesaian & Pengakuan Pendapatan per Periode (UC-25, FR-AK9..12, BR-21)
CREATE OR REPLACE FUNCTION public.record_period_project_progress(
  p_project_id UUID,
  p_progress_date DATE,
  p_cumulative_pct NUMERIC(5,2),
  p_cumulative_revenue_override BIGINT DEFAULT NULL,
  p_enable_auto_reverse BOOLEAN DEFAULT NULL,
  p_bakp_id UUID DEFAULT NULL
)
RETURNS public.project_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj public.projects%ROWTYPE;
  v_period public.periods%ROWTYPE;
  v_prior_cum_rev BIGINT := 0;
  v_prior_max_pct NUMERIC(5,2) := 0;
  v_target_cum_rev BIGINT;
  v_delta_rev BIGINT;
  v_wip_acc_id UUID;
  v_rev_acc_id UUID;
  v_unearned_acc_id UUID;
  v_unbilled_acc_id UUID;
  v_unearned_bal BIGINT := 0;
  v_use_unearned BIGINT := 0;
  v_use_unbilled BIGINT := 0;
  v_lines JSONB := '[]'::JSONB;
  v_jrn_type public.journal_type := 'adjustment';
  v_auto_rev BOOLEAN := false;
  v_jrn_id UUID := NULL;
  v_prog public.project_progress%ROWTYPE;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang mencatat persentase penyelesaian proyek.';
  END IF;

  IF p_cumulative_pct < 0 OR p_cumulative_pct > 100 THEN
    RAISE EXCEPTION 'Persentase penyelesaian wajib berada di antara 0%% dan 100%% (BR-21).';
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyek tidak ditemukan.';
  END IF;

  SELECT * INTO v_period
  FROM public.periods
  WHERE year = EXTRACT(YEAR FROM p_progress_date)::INT
    AND month = EXTRACT(MONTH FROM p_progress_date)::INT;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode akuntansi untuk tanggal % belum dibuka.', p_progress_date;
  END IF;
  IF v_period.status = 'closed' THEN
    RAISE EXCEPTION 'Periode % sudah ditutup dan menolak transaksi baru (BR-3).', v_period.name;
  END IF;

  SELECT
    COALESCE(MAX(cumulative_percentage), 0),
    COALESCE(MAX(cumulative_recognized_revenue), 0)
  INTO v_prior_max_pct, v_prior_cum_rev
  FROM public.project_progress
  WHERE project_id = p_project_id;

  IF p_cumulative_pct < v_prior_max_pct THEN
    RAISE EXCEPTION 'Persentase penyelesaian (%) tidak boleh turun di bawah progres sebelumnya (%) (BR-21).',
      p_cumulative_pct, v_prior_max_pct;
  END IF;

  IF p_cumulative_pct = 100.00 THEN
    v_target_cum_rev := v_proj.contract_value;
  ELSIF p_cumulative_revenue_override IS NOT NULL THEN
    IF p_cumulative_revenue_override < v_prior_cum_rev OR p_cumulative_revenue_override > v_proj.contract_value THEN
      RAISE EXCEPTION 'Nilai pendapatan kumulatif tidak valid terhadap kontrak atau periode sebelumnya.';
    END IF;
    v_target_cum_rev := p_cumulative_revenue_override;
  ELSE
    v_target_cum_rev := ROUND((v_proj.contract_value::NUMERIC * p_cumulative_pct) / 100.0)::BIGINT;
  END IF;

  v_delta_rev := v_target_cum_rev - v_prior_cum_rev;

  SELECT id INTO v_rev_acc_id FROM public.accounts WHERE system_tag = 'service_revenue' AND is_active = true LIMIT 1;

  IF v_delta_rev > 0 THEN
    IF v_proj.revenue_method = 'progress_billing' THEN
      -- Skenario >= 3 Termin: D Jasa dalam Proses / K Pendapatan Jasa, tanpa jurnal pembalik
      SELECT id INTO v_wip_acc_id FROM public.accounts WHERE system_tag = 'work_in_progress' AND is_active = true LIMIT 1;
      v_jrn_type := 'progress_billing';
      v_auto_rev := false;
      v_lines := jsonb_build_array(
        jsonb_build_object(
          'account_id', v_wip_acc_id,
          'project_id', v_proj.id,
          'description', 'Pengakuan progres ' || p_cumulative_pct::TEXT || '% proyek ' || v_proj.code,
          'debit', v_delta_rev,
          'credit', 0
        ),
        jsonb_build_object(
          'account_id', v_rev_acc_id,
          'project_id', v_proj.id,
          'description', 'Pendapatan jasa progres ' || p_cumulative_pct::TEXT || '% ' || v_proj.code,
          'debit', 0,
          'credit', v_delta_rev
        )
      );
    ELSIF v_proj.revenue_method = 'single_term_deferral' THEN
      -- Skenario 1 Termin: D Pendapatan Diterima di Muka / K Pendapatan Jasa, tanpa jurnal pembalik
      SELECT id INTO v_unearned_acc_id FROM public.accounts WHERE system_tag = 'unearned_revenue' AND is_active = true LIMIT 1;
      v_jrn_type := 'adjustment';
      v_auto_rev := false;
      v_lines := jsonb_build_array(
        jsonb_build_object(
          'account_id', v_unearned_acc_id,
          'project_id', v_proj.id,
          'description', 'Penyesuaian deferral proyek ' || v_proj.code,
          'debit', v_delta_rev,
          'credit', 0
        ),
        jsonb_build_object(
          'account_id', v_rev_acc_id,
          'project_id', v_proj.id,
          'description', 'Pendapatan jasa proyek ' || v_proj.code,
          'debit', 0,
          'credit', v_delta_rev
        )
      );
    ELSE
      -- Skenario 2 Termin Lintas Tahun: amortisasi Pendapatan Diterima di Muka + selisih ke Piutang Belum Ditagih
      SELECT id INTO v_unearned_acc_id FROM public.accounts WHERE system_tag = 'unearned_revenue' AND is_active = true LIMIT 1;
      SELECT id INTO v_unbilled_acc_id FROM public.accounts WHERE system_tag = 'unbilled_receivable' AND is_active = true LIMIT 1;

      SELECT GREATEST(COALESCE(SUM(jl.credit - jl.debit), 0), 0)::BIGINT INTO v_unearned_bal
      FROM public.journal_lines jl
      JOIN public.journals j ON j.id = jl.journal_id
      WHERE j.status = 'posted'
        AND jl.account_id = v_unearned_acc_id
        AND COALESCE(jl.project_id, j.project_id) = v_proj.id;

      v_use_unearned := LEAST(v_unearned_bal, v_delta_rev);
      v_use_unbilled := v_delta_rev - v_use_unearned;

      IF v_use_unearned > 0 THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_unearned_acc_id,
            'project_id', v_proj.id,
            'description', 'Realisasi uang muka proyek ' || v_proj.code,
            'debit', v_use_unearned,
            'credit', 0
          )
        );
      END IF;
      IF v_use_unbilled > 0 THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_unbilled_acc_id,
            'project_id', v_proj.id,
            'description', 'Piutang akrual akhir periode proyek ' || v_proj.code,
            'debit', v_use_unbilled,
            'credit', 0
          )
        );
      END IF;
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object(
          'account_id', v_rev_acc_id,
          'project_id', v_proj.id,
          'description', 'Pendapatan jasa akrual proyek ' || v_proj.code,
          'debit', 0,
          'credit', v_delta_rev
        )
      );

      v_jrn_type := 'adjustment';
      -- Default true bila melahirkan piutang akrual (FR-AK12), namun dapat dikontrol Admin (Prompt)
      v_auto_rev := CASE
        WHEN v_use_unbilled > 0 THEN COALESCE(p_enable_auto_reverse, true)
        ELSE false
      END;
    END IF;

    v_jrn_id := public.create_and_post_journal(
      p_progress_date,
      v_jrn_type,
      'Pengakuan pendapatan progres ' || p_cumulative_pct::TEXT || '% — ' || v_proj.name,
      v_lines,
      v_proj.id,
      'project_progress',
      v_proj.id,
      NULL,
      v_auto_rev
    );
  END IF;

  INSERT INTO public.project_progress (
    project_id,
    period_id,
    progress_date,
    bakp_id,
    cumulative_percentage,
    cumulative_recognized_revenue,
    period_recognized_revenue,
    adjustment_journal_id,
    recorded_by
  )
  VALUES (
    v_proj.id,
    v_period.id,
    p_progress_date,
    p_bakp_id,
    p_cumulative_pct,
    v_target_cum_rev,
    v_delta_rev,
    v_jrn_id,
    auth.uid()
  )
  RETURNING * INTO v_prog;

  -- Eliminasi otomatis apabila proyek progress_billing telah mencapai 100% dan tertagih penuh
  PERFORM public.try_eliminate_progress_billing_project(v_proj.id, p_progress_date);

  RETURN v_prog;
END;
$$;

-- =============================================================================
-- 9. Bagi Hasil Proyek & Alokasi Proporsional Biaya Bersama (UC-28, FR-BH1..5, BR-9, BR-10, BR-20)
-- =============================================================================
CREATE TABLE public.profit_sharing_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL CHECK (length(trim(recipient_name)) > 0),
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.shared_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  total_shared_pool BIGINT NOT NULL DEFAULT 0,
  project_revenue_basis BIGINT NOT NULL DEFAULT 0,
  allocation_ratio NUMERIC(10,6) NOT NULL DEFAULT 0,
  allocated_amount BIGINT NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_id, project_id)
);

CREATE TABLE public.profit_sharing_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE RESTRICT,
  recognized_revenue BIGINT NOT NULL DEFAULT 0,
  direct_cost BIGINT NOT NULL DEFAULT 0,
  allocated_shared_cost BIGINT NOT NULL DEFAULT 0,
  gross_profit BIGINT NOT NULL DEFAULT 0,
  status public.profit_sharing_status NOT NULL DEFAULT 'draft_simulation',
  journal_id UUID REFERENCES public.journals(id) ON DELETE RESTRICT,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profit_sharing_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES public.profit_sharing_results(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  percentage NUMERIC(5,2) NOT NULL,
  share_amount BIGINT NOT NULL
);

-- RPC Simpan Skema Bagi Hasil: Menegakkan Total Persentase Tepat 100% (BR-10)
CREATE OR REPLACE FUNCTION public.save_profit_sharing_scheme(
  p_project_id UUID,
  p_schemes JSONB
)
RETURNS SETOF public.profit_sharing_schemes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_status public.profit_sharing_status;
  v_total_pct NUMERIC(7,2) := 0;
  v_item JSONB;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang mengatur skema bagi hasil.';
  END IF;

  SELECT status INTO v_existing_status FROM public.profit_sharing_results WHERE project_id = p_project_id;
  IF v_existing_status = 'finalized' THEN
    RAISE EXCEPTION 'Bagi hasil proyek ini sudah difinalisasi dan terkunci (BR-9).';
  END IF;

  SELECT COALESCE(SUM((elem ->> 'percentage')::NUMERIC(5,2)), 0)
  INTO v_total_pct
  FROM jsonb_array_elements(p_schemes) AS elem;

  IF v_total_pct <> 100.00 THEN
    RAISE EXCEPTION 'Total persentase bagi hasil per proyek harus tepat 100%% (saat ini: %%%) (BR-10).', v_total_pct;
  END IF;

  DELETE FROM public.profit_sharing_schemes WHERE project_id = p_project_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_schemes)
  LOOP
    INSERT INTO public.profit_sharing_schemes (
      project_id, recipient_name, recipient_user_id, percentage
    )
    VALUES (
      p_project_id,
      v_item ->> 'recipient_name',
      NULLIF(v_item ->> 'recipient_user_id', '')::UUID,
      (v_item ->> 'percentage')::NUMERIC(5,2)
    );
  END LOOP;

  RETURN QUERY SELECT * FROM public.profit_sharing_schemes WHERE project_id = p_project_id;
END;
$$;

-- RPC Simulasi & Finalisasi Bagi Hasil Proyek (BR-9, BR-20, FR-BH2..4)
CREATE OR REPLACE FUNCTION public.calculate_project_profit_sharing(
  p_project_id UUID,
  p_finalize BOOLEAN DEFAULT false,
  p_posting_date DATE DEFAULT CURRENT_DATE,
  p_manual_shared_cost BIGINT DEFAULT NULL
)
RETURNS public.profit_sharing_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.profit_sharing_results%ROWTYPE;
  v_proj_rev BIGINT := 0;
  v_all_client_rev BIGINT := 0;
  v_direct_cost BIGINT := 0;
  v_shared_pool BIGINT := 0;
  v_alloc_shared BIGINT := 0;
  v_gross_profit BIGINT := 0;
  v_scheme_pct NUMERIC(7,2);
  v_exp_acc_id UUID;
  v_pay_acc_id UUID;
  v_jrn_id UUID := NULL;
  v_res_id UUID;
  v_rec RECORD;
  v_share BIGINT;
  v_running_sum BIGINT := 0;
  v_count INT := 0;
  v_total_rows INT := 0;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang menghitung atau memfinalisasi bagi hasil.';
  END IF;

  SELECT * INTO v_existing FROM public.profit_sharing_results WHERE project_id = p_project_id FOR UPDATE;
  IF FOUND AND v_existing.status = 'finalized' THEN
    RAISE EXCEPTION 'Bagi hasil proyek ini sudah difinalisasi dan terkunci (BR-9).';
  END IF;

  SELECT COALESCE(SUM(percentage), 0), COUNT(*) INTO v_scheme_pct, v_total_rows
  FROM public.profit_sharing_schemes
  WHERE project_id = p_project_id;

  IF v_scheme_pct <> 100.00 OR v_total_rows < 1 THEN
    RAISE EXCEPTION 'Skema bagi hasil proyek belum lengkap 100%% (BR-10).';
  END IF;

  -- BR-9: Hitung pendapatan & biaya langsung HANYA dari jurnal yang sudah diposting (kecuali jurnal penutup)
  SELECT COALESCE(SUM(jl.credit - jl.debit), 0)::BIGINT INTO v_proj_rev
  FROM public.journal_lines jl
  JOIN public.journals j ON j.id = jl.journal_id
  JOIN public.accounts a ON a.id = jl.account_id
  WHERE j.status = 'posted'
    AND j.journal_type <> 'closing'
    AND a.account_type = 'revenue'
    AND COALESCE(jl.project_id, j.project_id) = p_project_id;

  SELECT COALESCE(SUM(jl.debit - jl.credit), 0)::BIGINT INTO v_direct_cost
  FROM public.journal_lines jl
  JOIN public.journals j ON j.id = jl.journal_id
  JOIN public.accounts a ON a.id = jl.account_id
  WHERE j.status = 'posted'
    AND j.journal_type <> 'closing'
    AND a.account_type = 'expense'
    AND a.system_tag NOT IN ('shared_expense', 'profit_sharing_expense')
    AND COALESCE(jl.project_id, j.project_id) = p_project_id;

  IF p_manual_shared_cost IS NOT NULL THEN
    v_alloc_shared := p_manual_shared_cost;
  ELSE
    -- BR-20: Alokasi proporsional biaya bersama terhadap total pendapatan seluruh proyek aktif
    SELECT COALESCE(SUM(jl.credit - jl.debit), 0)::BIGINT INTO v_all_client_rev
    FROM public.journal_lines jl
    JOIN public.journals j ON j.id = jl.journal_id
    JOIN public.accounts a ON a.id = jl.account_id
    WHERE j.status = 'posted'
      AND j.journal_type <> 'closing'
      AND a.account_type = 'revenue'
      AND COALESCE(jl.project_id, j.project_id) IS NOT NULL;

    SELECT COALESCE(SUM(jl.debit - jl.credit), 0)::BIGINT INTO v_shared_pool
    FROM public.journal_lines jl
    JOIN public.journals j ON j.id = jl.journal_id
    JOIN public.accounts a ON a.id = jl.account_id
    WHERE j.status = 'posted'
      AND j.journal_type <> 'closing'
      AND a.system_tag = 'shared_expense';

    IF v_all_client_rev > 0 AND v_shared_pool > 0 THEN
      v_alloc_shared := ROUND((v_shared_pool::NUMERIC * v_proj_rev::NUMERIC) / v_all_client_rev::NUMERIC)::BIGINT;
    ELSE
      v_alloc_shared := 0;
    END IF;
  END IF;

  v_gross_profit := v_proj_rev - v_direct_cost - v_alloc_shared;

  IF p_finalize AND v_gross_profit > 0 THEN
    SELECT id INTO v_exp_acc_id FROM public.accounts WHERE system_tag = 'profit_sharing_expense' AND is_active = true LIMIT 1;
    SELECT id INTO v_pay_acc_id FROM public.accounts WHERE system_tag = 'profit_sharing_payable' AND is_active = true LIMIT 1;

    v_jrn_id := public.create_and_post_journal(
      p_posting_date,
      'profit_sharing',
      'Finalisasi bagi hasil laba kotor proyek',
      jsonb_build_array(
        jsonb_build_object(
          'account_id', v_exp_acc_id,
          'project_id', p_project_id,
          'description', 'Beban bagi hasil laba kotor proyek',
          'debit', v_gross_profit,
          'credit', 0
        ),
        jsonb_build_object(
          'account_id', v_pay_acc_id,
          'project_id', p_project_id,
          'description', 'Utang bagi hasil proyek kepada penerima',
          'debit', 0,
          'credit', v_gross_profit
        )
      ),
      p_project_id,
      'profit_sharing',
      p_project_id,
      NULL,
      false
    );
  END IF;

  INSERT INTO public.profit_sharing_results (
    project_id,
    recognized_revenue,
    direct_cost,
    allocated_shared_cost,
    gross_profit,
    status,
    journal_id,
    finalized_at,
    finalized_by,
    updated_at
  )
  VALUES (
    p_project_id,
    v_proj_rev,
    v_direct_cost,
    v_alloc_shared,
    v_gross_profit,
    CASE WHEN p_finalize THEN 'finalized'::public.profit_sharing_status ELSE 'draft_simulation'::public.profit_sharing_status END,
    v_jrn_id,
    CASE WHEN p_finalize THEN now() ELSE NULL END,
    CASE WHEN p_finalize THEN auth.uid() ELSE NULL END,
    now()
  )
  ON CONFLICT (project_id)
  DO UPDATE SET
    recognized_revenue = EXCLUDED.recognized_revenue,
    direct_cost = EXCLUDED.direct_cost,
    allocated_shared_cost = EXCLUDED.allocated_shared_cost,
    gross_profit = EXCLUDED.gross_profit,
    status = EXCLUDED.status,
    journal_id = EXCLUDED.journal_id,
    finalized_at = EXCLUDED.finalized_at,
    finalized_by = EXCLUDED.finalized_by,
    updated_at = now()
  RETURNING id INTO v_res_id;

  DELETE FROM public.profit_sharing_lines WHERE result_id = v_res_id;

  FOR v_rec IN
    SELECT * FROM public.profit_sharing_schemes WHERE project_id = p_project_id ORDER BY created_at, id
  LOOP
    v_count := v_count + 1;
    IF v_gross_profit <= 0 THEN
      v_share := 0;
    ELSIF v_count = v_total_rows THEN
      -- Baris terakhir menampung selisih pembulatan 1 Rupiah agar total pembagian tepat sama dengan laba kotor
      v_share := v_gross_profit - v_running_sum;
    ELSE
      v_share := ROUND((v_gross_profit::NUMERIC * v_rec.percentage) / 100.0)::BIGINT;
      v_running_sum := v_running_sum + v_share;
    END IF;

    INSERT INTO public.profit_sharing_lines (
      result_id, recipient_name, recipient_user_id, percentage, share_amount
    )
    VALUES (
      v_res_id, v_rec.recipient_name, v_rec.recipient_user_id, v_rec.percentage, v_share
    );
  END LOOP;

  IF p_finalize THEN
    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
    VALUES (auth.uid(), 'admin', 'FINALIZE_SHARING', 'profit_sharing_results', v_res_id::TEXT, NULL,
      jsonb_build_object('project_id', p_project_id, 'gross_profit', v_gross_profit));
  END IF;

  SELECT * INTO v_existing FROM public.profit_sharing_results WHERE id = v_res_id;
  RETURN v_existing;
END;
$$;

-- =============================================================================
-- 10. Fungsi Server Portal Pembeli Tanpa Login (FR-PB1..9, BR-18)
--     Tabel tetap TERTUTUP dari anon; hanya DTO aman satu Nomor PO yang dikembalikan!
-- =============================================================================

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
  -- Pembatasan laju (Rate Limit): maks 5 pengajuan PO per IP hash dalam 15 menit (FR-PB7)
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
  WHERE p.role = 'admin' AND p.is_active = true;

  RETURN jsonb_build_object(
    'po_number', v_created.po_number,
    'status', v_created.status,
    'po_value', v_created.po_value,
    'created_at', v_created.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_buyer_lookup_po(
  p_po_number TEXT,
  p_ip_hash TEXT DEFAULT 'local'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_attempts INT;
  v_norm_po TEXT := upper(trim(coalesce(p_po_number, '')));
  v_cpo public.client_purchase_orders%ROWTYPE;
  v_proj public.projects%ROWTYPE;
  v_progress_pct NUMERIC(5,2) := 0;
  v_milestones JSONB := '[]'::JSONB;
  v_documents JSONB := '[]'::JSONB;
BEGIN
  -- Rate Limit percobaan gagal: maks 10 percobaan gagal per IP dalam 15 menit (FR-PB7)
  SELECT count(*) INTO v_failed_attempts
  FROM public.po_access_logs
  WHERE ip_hash = p_ip_hash
    AND action = 'lookup_portal'
    AND was_found = false
    AND created_at > now() - interval '15 minutes';

  IF v_failed_attempts >= 10 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'RATE_LIMITED',
      'error', 'Terlalu banyak percobaan nomor PO tidak valid. Coba kembali dalam 15 menit.'
    );
  END IF;

  SELECT * INTO v_cpo
  FROM public.client_purchase_orders
  WHERE po_number = v_norm_po;

  IF NOT FOUND THEN
    INSERT INTO public.po_access_logs (po_number_attempted, ip_hash, action, was_found)
    VALUES (left(CASE WHEN length(v_norm_po) > 0 THEN v_norm_po ELSE '(kosong)' END, 50), p_ip_hash, 'lookup_portal', false);
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'NOT_FOUND',
      'error', 'Nomor PO tidak ditemukan.'
    );
  END IF;

  INSERT INTO public.po_access_logs (po_number_attempted, ip_hash, action, was_found)
  VALUES (v_cpo.po_number, p_ip_hash, 'lookup_portal', true);

  IF v_cpo.project_id IS NOT NULL THEN
    SELECT * INTO v_proj FROM public.projects WHERE id = v_cpo.project_id;

    SELECT COALESCE(MAX(cumulative_percentage), 0) INTO v_progress_pct
    FROM public.project_progress
    WHERE project_id = v_cpo.project_id;

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'sequence_no', m.sequence_no,
          'name', m.name,
          'percentage', m.percentage,
          'amount', m.amount,
          'status', m.status,
          'achievement_criteria', m.achievement_criteria
        )
        ORDER BY m.sequence_no
      ),
      '[]'::JSONB
    )
    INTO v_milestones
    FROM public.milestones m
    WHERE m.project_id = v_cpo.project_id;

    -- Kumpulkan HANYA metadata dokumen klien (Quotation, SoW, SPK, BAKP, UAT, BAST, Invoice, Kuitansi)
    -- TIDAK PERNAH menyertakan jurnal, anggaran, biaya internal, atau margin (FR-PB8)!
    SELECT COALESCE(jsonb_agg(doc_row), '[]'::JSONB)
    INTO v_documents
    FROM (
      SELECT 'Quotation'::TEXT AS category, q.quotation_number AS doc_number, q.quotation_date::TEXT AS doc_date, q.status::TEXT AS status
      FROM public.quotations q WHERE q.project_id = v_cpo.project_id
      UNION ALL
      SELECT pd.doc_type, pd.doc_number, pd.created_at::DATE::TEXT, CASE WHEN pd.is_signed THEN 'Bertanda Tangan' ELSE 'Draf' END
      FROM public.project_documents pd WHERE pd.project_id = v_cpo.project_id AND pd.visible_to_buyer = true
      UNION ALL
      SELECT 'BAKP', b.bakp_number, b.bakp_date::TEXT, b.status::TEXT
      FROM public.progress_reports b WHERE b.project_id = v_cpo.project_id
      UNION ALL
      SELECT 'UAT', u.uat_number, u.test_date::TEXT, u.conclusion::TEXT
      FROM public.uat_checklists u WHERE u.project_id = v_cpo.project_id
      UNION ALL
      SELECT 'BAST', h.bast_number, h.bast_date::TEXT, h.status::TEXT
      FROM public.handover_reports h WHERE h.project_id = v_cpo.project_id
      UNION ALL
      SELECT 'Invoice', i.invoice_number, i.invoice_date::TEXT, i.payment_status::TEXT
      FROM public.sales_invoices i WHERE i.project_id = v_cpo.project_id AND i.client_po_id = v_cpo.id AND i.doc_status = 'issued'
      UNION ALL
      SELECT 'Kuitansi', r.receipt_number, r.receipt_date::TEXT, 'Sah'
      FROM public.receipts r
      JOIN public.sales_invoices i ON i.id = r.invoice_id
      WHERE i.project_id = v_cpo.project_id AND i.client_po_id = v_cpo.id
    ) doc_row;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'po_number', v_cpo.po_number,
      'client_name', v_cpo.client_name,
      'client_company', v_cpo.client_company,
      'po_value', v_cpo.po_value,
      'verification_status', v_cpo.status,
      'submitted_at', v_cpo.created_at,
      'project', CASE
        WHEN v_cpo.project_id IS NOT NULL THEN jsonb_build_object(
          'code', v_proj.code,
          'name', v_proj.name,
          'status', v_proj.status,
          'start_date', v_proj.start_date,
          'target_end_date', v_proj.target_end_date,
          'cumulative_progress_pct', v_progress_pct
        )
        ELSE NULL
      END,
      'milestones', v_milestones,
      'documents', v_documents
    )
  );
END;
$$;

-- RPC Admin Memverifikasi PO Klien (UC-14, FR-PK4, BR-23)
CREATE OR REPLACE FUNCTION public.verify_client_po(
  p_client_po_id UUID,
  p_project_id UUID,
  p_approve BOOLEAN,
  p_rejection_note TEXT DEFAULT NULL
)
RETURNS public.client_purchase_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpo public.client_purchase_orders%ROWTYPE;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang memverifikasi PO klien.';
  END IF;

  IF p_approve THEN
    IF p_project_id IS NULL THEN
      RAISE EXCEPTION 'Pilih proyek klien yang tertaut sebelum memverifikasi PO.';
    END IF;
    UPDATE public.client_purchase_orders
    SET status = 'verified',
        project_id = p_project_id,
        verified_by = auth.uid(),
        verified_at = now(),
        rejection_note = NULL,
        updated_at = now()
    WHERE id = p_client_po_id
    RETURNING * INTO v_cpo;

    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
    VALUES (auth.uid(), 'admin', 'VERIFY_PO', 'client_purchase_orders', p_client_po_id::TEXT, NULL, to_jsonb(v_cpo));
  ELSE
    UPDATE public.client_purchase_orders
    SET status = 'rejected',
        verified_by = auth.uid(),
        verified_at = now(),
        rejection_note = p_rejection_note,
        updated_at = now()
    WHERE id = p_client_po_id
    RETURNING * INTO v_cpo;
  END IF;

  RETURN v_cpo;
END;
$$;

-- =============================================================================
-- Kebijakan RLS Fase 4 (Tabel Tetap Tertutup Total dari anon!)
-- =============================================================================
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_purchase_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.po_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_access_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones FORCE ROW LEVEL SECURITY;
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uat_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uat_checklists FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uat_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uat_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.handover_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profit_sharing_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_sharing_schemes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cost_allocations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profit_sharing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_sharing_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profit_sharing_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_sharing_lines FORCE ROW LEVEL SECURITY;

REVOKE ALL ON
  public.quotations, public.quotation_items, public.client_purchase_orders,
  public.po_access_logs, public.project_documents, public.milestones,
  public.progress_reports, public.uat_checklists, public.uat_items,
  public.handover_reports, public.project_progress, public.sales_invoices,
  public.invoice_items, public.invoice_payments, public.receipts,
  public.profit_sharing_schemes, public.shared_cost_allocations,
  public.profit_sharing_results, public.profit_sharing_lines
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.quotations, public.quotation_items, public.client_purchase_orders,
  public.po_access_logs, public.project_documents, public.milestones,
  public.progress_reports, public.uat_checklists, public.uat_items,
  public.handover_reports, public.project_progress, public.sales_invoices,
  public.invoice_items, public.invoice_payments, public.receipts,
  public.profit_sharing_schemes, public.shared_cost_allocations,
  public.profit_sharing_results, public.profit_sharing_lines
TO authenticated;

-- Admin kelola penuh seluruh tabel proyek klien, penagihan, dan bagi hasil
CREATE POLICY quotations_admin_all ON public.quotations FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY quotation_items_admin_all ON public.quotation_items FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY client_po_admin_all ON public.client_purchase_orders FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY po_access_logs_super_admin ON public.po_access_logs FOR SELECT TO authenticated
USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY project_documents_admin_all ON public.project_documents FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY milestones_admin_all ON public.milestones FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY progress_reports_admin_all ON public.progress_reports FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY uat_checklists_admin_all ON public.uat_checklists FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY uat_items_admin_all ON public.uat_items FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY handover_reports_admin_all ON public.handover_reports FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY project_progress_admin_all ON public.project_progress FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY sales_invoices_admin_all ON public.sales_invoices FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY invoice_items_admin_all ON public.invoice_items FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY invoice_payments_admin_all ON public.invoice_payments FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY receipts_admin_all ON public.receipts FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY profit_sharing_schemes_admin_all ON public.profit_sharing_schemes FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY shared_cost_allocations_admin_all ON public.shared_cost_allocations FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY profit_sharing_results_admin_all ON public.profit_sharing_results FOR ALL TO authenticated
USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- FR-BH5: User dapat melihat ringkasan hasil & baris bagi hasil miliknya sendiri
CREATE POLICY profit_sharing_results_user_own_select ON public.profit_sharing_results
FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'user'
  AND EXISTS (
    SELECT 1 FROM public.profit_sharing_lines psl
    WHERE psl.result_id = profit_sharing_results.id
      AND psl.recipient_user_id = auth.uid()
  )
);

CREATE POLICY profit_sharing_lines_select_policy ON public.profit_sharing_lines
FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'admin'
  OR (public.current_user_role() = 'user' AND recipient_user_id = auth.uid())
);

CREATE POLICY profit_sharing_lines_admin_write ON public.profit_sharing_lines
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Cabut eksekusi fungsi internal dari PUBLIC & anon, dan batasi RPC Portal Pembeli khusus service_role (Edge Function)!
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.rpc_buyer_submit_po(TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_buyer_lookup_po(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_buyer_submit_po(TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_buyer_lookup_po(TEXT, TEXT) TO service_role;
