-- =============================================================================
-- Migrasi 0006: Fase 3 Akuntansi Basis Akrual, Budgeting, & Penutupan Periode
-- Menegakkan keseimbangan jurnal, immutability jurnal terposting, kunci periode,
-- jurnal otomatis pengadaan, anggaran vs realisasi, & penutupan buku di level DB
-- =============================================================================

CREATE TYPE public.journal_type AS ENUM (
  'general',
  'auto_expense',
  'auto_payment',
  'auto_invoice',
  'auto_receipt',
  'adjustment',
  'progress_billing',
  'elimination',
  'reversing',
  'closing',
  'correction',
  'profit_sharing'
);

CREATE TYPE public.journal_status AS ENUM (
  'draft',
  'posted'
);

CREATE TYPE public.budget_status AS ENUM (
  'draft',
  'active',
  'superseded'
);

-- 1. Tabel Jurnal Header & Baris Ayat Jurnal (FR-AK1..FR-AK6, BR-1..BR-3)
CREATE TABLE public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_number VARCHAR(40) NOT NULL UNIQUE CHECK (length(trim(journal_number)) > 0),
  journal_date DATE NOT NULL,
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
  journal_type public.journal_type NOT NULL DEFAULT 'general',
  source_type TEXT,
  source_id UUID,
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT,
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  status public.journal_status NOT NULL DEFAULT 'draft',
  reference_journal_id UUID REFERENCES public.journals(id) ON DELETE RESTRICT,
  auto_reverse_next_period BOOLEAN NOT NULL DEFAULT false,
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journals_period ON public.journals (period_id, journal_date);
CREATE INDEX idx_journals_project ON public.journals (project_id);
CREATE INDEX idx_journals_status ON public.journals (status);

CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  line_no INT NOT NULL CHECK (line_no >= 1),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT,
  description TEXT,
  debit BIGINT NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit BIGINT NOT NULL DEFAULT 0 CHECK (credit >= 0),
  CONSTRAINT chk_journal_line_single_side CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  ),
  UNIQUE (journal_id, line_no)
);

CREATE INDEX idx_journal_lines_account ON public.journal_lines (account_id);
CREATE INDEX idx_journal_lines_project ON public.journal_lines (project_id);

-- Trigger 1: Penguncian Periode, Immutability Jurnal Terposting, & Validasi Keseimbangan (BR-1, BR-2, BR-3)
CREATE OR REPLACE FUNCTION public.enforce_journal_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.periods%ROWTYPE;
  v_line_count INT;
  v_sum_debit BIGINT;
  v_sum_credit BIGINT;
  v_invalid_account TEXT;
  v_proj_method public.revenue_recognition_method;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'posted' THEN
      RAISE EXCEPTION 'Jurnal % yang sudah diposting tidak dapat dihapus; lakukan koreksi dengan jurnal koreksi/penyesuaian (BR-2).', OLD.journal_number;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'posted' THEN
      RAISE EXCEPTION 'Jurnal baru harus dibuat berstatus draft terlebih dahulu agar baris debit/kredit dapat divalidasi sebelum posting (BR-1).';
    END IF;
  END IF;

  -- Jika jurnal sudah diposting sebelumnya, tolak segala perubahan kecuali penanda internal is_reversed
  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    IF current_setting('app.allow_mark_reversed', true) = 'on'
       AND OLD.is_reversed = false
       AND NEW.is_reversed = true
       AND NEW.journal_number = OLD.journal_number
       AND NEW.journal_date = OLD.journal_date
       AND NEW.period_id = OLD.period_id
       AND NEW.description = OLD.description
       AND NEW.status = OLD.status THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Jurnal % yang sudah diposting bersifat permanen dan tidak dapat diubah; gunakan jurnal koreksi/penyesuaian (BR-2).', OLD.journal_number;
  END IF;

  -- Validasi periode sesuai tanggal jurnal & tolak jika periode sudah ditutup (BR-3)
  SELECT * INTO v_period
  FROM public.periods
  WHERE year = EXTRACT(YEAR FROM NEW.journal_date)::INT
    AND month = EXTRACT(MONTH FROM NEW.journal_date)::INT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode akuntansi untuk tanggal % belum dibuka.', NEW.journal_date;
  END IF;

  NEW.period_id := v_period.id;

  IF v_period.status = 'closed' THEN
    RAISE EXCEPTION 'Periode % sudah ditutup dan menolak transaksi baru (BR-3).', v_period.name;
  END IF;

  -- FR-AK12 & Prompt: Jurnal pembalik hanya diizinkan pada penyesuaian akrual (tidak untuk proyek 1 termin atau >= 3 termin)
  IF NEW.auto_reverse_next_period = true THEN
    IF NEW.journal_type NOT IN ('adjustment', 'general') THEN
      RAISE EXCEPTION 'Opsi jurnal pembalik hanya berlaku untuk jurnal penyesuaian akrual.';
    END IF;
    IF NEW.project_id IS NOT NULL THEN
      SELECT revenue_method INTO v_proj_method FROM public.projects WHERE id = NEW.project_id;
      IF v_proj_method IN ('single_term_deferral', 'progress_billing') THEN
        RAISE EXCEPTION 'Jurnal pembalik tidak digunakan pada proyek 1 termin atau progress billing >= 3 termin (FR-AK12).';
      END IF;
    END IF;
  END IF;

  -- Saat transisi draft -> posted: periksa keseimbangan debit = kredit (BR-1)
  IF TG_OP = 'UPDATE' AND OLD.status = 'draft' AND NEW.status = 'posted' THEN
    SELECT count(*), COALESCE(sum(debit), 0), COALESCE(sum(credit), 0)
    INTO v_line_count, v_sum_debit, v_sum_credit
    FROM public.journal_lines
    WHERE journal_id = NEW.id;

    IF v_line_count < 2 THEN
      RAISE EXCEPTION 'Jurnal % minimal harus memiliki 2 baris ayat jurnal (BR-1).', NEW.journal_number;
    END IF;

    IF v_sum_debit <= 0 OR v_sum_debit <> v_sum_credit THEN
      RAISE EXCEPTION 'Jurnal % tidak seimbang: total debit (%) tidak sama dengan total kredit (%) (BR-1).',
        NEW.journal_number, v_sum_debit, v_sum_credit;
    END IF;

    SELECT a.code || ' - ' || a.name INTO v_invalid_account
    FROM public.journal_lines jl
    JOIN public.accounts a ON a.id = jl.account_id
    WHERE jl.journal_id = NEW.id
      AND (a.is_active = false OR a.is_postable = false)
    LIMIT 1;

    IF v_invalid_account IS NOT NULL THEN
      RAISE EXCEPTION 'Akun % berstatus nonaktif atau merupakan akun induk dan tidak dapat diposting.', v_invalid_account;
    END IF;

    NEW.posted_at := COALESCE(NEW.posted_at, now());
    NEW.posted_by := COALESCE(NEW.posted_by, auth.uid());

    -- Tandai akun telah digunakan di jurnal (BR-19)
    UPDATE public.accounts a
    SET used_in_journal_count = a.used_in_journal_count + 1
    WHERE a.id IN (
      SELECT DISTINCT jl.account_id
      FROM public.journal_lines jl
      WHERE jl.journal_id = NEW.id
    );

    -- Tandai proyek sudah memiliki jurnal terposting agar metode pengakuan terkunci (BR-13)
    UPDATE public.projects p
    SET has_posted_journal = true
    WHERE p.id = NEW.project_id
       OR p.id IN (
         SELECT DISTINCT jl.project_id
         FROM public.journal_lines jl
         WHERE jl.journal_id = NEW.id AND jl.project_id IS NOT NULL
       );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_journal_rules
BEFORE INSERT OR UPDATE OR DELETE ON public.journals
FOR EACH ROW EXECUTE FUNCTION public.enforce_journal_rules();

-- Trigger 2: Melarang modifikasi baris jurnal pada jurnal yang sudah terposting (BR-2)
CREATE OR REPLACE FUNCTION public.enforce_journal_lines_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.journal_status;
  v_jid UUID := COALESCE(NEW.journal_id, OLD.journal_id);
BEGIN
  SELECT status INTO v_status FROM public.journals WHERE id = v_jid;
  IF v_status = 'posted' THEN
    RAISE EXCEPTION 'Baris ayat pada jurnal yang sudah diposting tidak dapat ditambah, diubah, atau dihapus (BR-2).';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_journal_lines_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION public.enforce_journal_lines_immutability();

-- Perbarui juga trigger hapus akun agar mengecek tabel journal_lines secara eksplisit
CREATE OR REPLACE FUNCTION public.prevent_used_account_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.used_in_journal_count > 0
     OR EXISTS (SELECT 1 FROM public.journal_lines jl WHERE jl.account_id = OLD.id) THEN
    RAISE EXCEPTION 'Akun % (%) sudah digunakan dalam jurnal dan tidak boleh dihapus; silakan nonaktifkan akun tersebut (BR-19).', OLD.code, OLD.name;
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounts child WHERE child.parent_id = OLD.id) THEN
    RAISE EXCEPTION 'Akun induk % (%) masih memiliki sub-akun dan tidak boleh dihapus.', OLD.code, OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

-- Fungsi Atomik: Buat & Posting Jurnal dalam Satu Transaksi
CREATE OR REPLACE FUNCTION public.create_and_post_journal(
  p_journal_date DATE,
  p_journal_type public.journal_type,
  p_description TEXT,
  p_lines JSONB,
  p_project_id UUID DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_reference_journal_id UUID DEFAULT NULL,
  p_auto_reverse_next_period BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id UUID;
  v_jrn_number TEXT;
  v_journal_id UUID;
  v_item JSONB;
  v_idx INT := 0;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin'
     AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin yang berwenang memposting jurnal akuntansi.';
  END IF;

  SELECT id INTO v_period_id
  FROM public.periods
  WHERE year = EXTRACT(YEAR FROM p_journal_date)::INT
    AND month = EXTRACT(MONTH FROM p_journal_date)::INT;

  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'Periode akuntansi untuk tanggal % belum dibuka.', p_journal_date;
  END IF;

  v_jrn_number := public.next_doc_number('JRN', p_journal_date);

  INSERT INTO public.journals (
    journal_number,
    journal_date,
    period_id,
    journal_type,
    source_type,
    source_id,
    project_id,
    description,
    status,
    reference_journal_id,
    auto_reverse_next_period,
    created_by
  )
  VALUES (
    v_jrn_number,
    p_journal_date,
    v_period_id,
    p_journal_type,
    p_source_type,
    p_source_id,
    p_project_id,
    p_description,
    'draft',
    p_reference_journal_id,
    p_auto_reverse_next_period,
    auth.uid()
  )
  RETURNING id INTO v_journal_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.journal_lines (
      journal_id,
      line_no,
      account_id,
      project_id,
      description,
      debit,
      credit
    )
    VALUES (
      v_journal_id,
      v_idx,
      (v_item ->> 'account_id')::UUID,
      COALESCE(NULLIF(v_item ->> 'project_id', '')::UUID, p_project_id),
      v_item ->> 'description',
      COALESCE((v_item ->> 'debit')::BIGINT, 0),
      COALESCE((v_item ->> 'credit')::BIGINT, 0)
    );
  END LOOP;

  UPDATE public.journals
  SET status = 'posted'
  WHERE id = v_journal_id;

  RETURN v_journal_id;
END;
$$;

-- RPC Koreksi Kesalahan melalui Jurnal Koreksi/Penyesuaian (BR-2 & Prompt)
CREATE OR REPLACE FUNCTION public.create_correction_journal(
  p_original_journal_id UUID,
  p_correction_date DATE,
  p_reason TEXT,
  p_lines JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orig public.journals%ROWTYPE;
  v_lines JSONB;
  v_new_id UUID;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang membuat jurnal koreksi.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Alasan koreksi jurnal wajib diisi minimal 5 karakter.';
  END IF;

  SELECT * INTO v_orig FROM public.journals WHERE id = p_original_journal_id;
  IF NOT FOUND OR v_orig.status <> 'posted' THEN
    RAISE EXCEPTION 'Jurnal asal tidak ditemukan atau belum diposting.';
  END IF;

  IF p_lines IS NULL THEN
    -- Default: membalik ayat salah dari jurnal asal sebagai dasar koreksi
    SELECT jsonb_agg(
      jsonb_build_object(
        'account_id', jl.account_id,
        'project_id', jl.project_id,
        'description', 'Koreksi atas ' || v_orig.journal_number || ': ' || COALESCE(jl.description, ''),
        'debit', jl.credit,
        'credit', jl.debit
      )
      ORDER BY jl.line_no
    )
    INTO v_lines
    FROM public.journal_lines jl
    WHERE jl.journal_id = p_original_journal_id;
  ELSE
    v_lines := p_lines;
  END IF;

  v_new_id := public.create_and_post_journal(
    p_correction_date,
    'correction',
    'Jurnal Koreksi atas ' || v_orig.journal_number || ' — ' || trim(p_reason),
    v_lines,
    v_orig.project_id,
    'journal_correction',
    v_orig.id,
    v_orig.id,
    false
  );

  RETURN v_new_id;
END;
$$;

-- RPC Pembuatan Jurnal Pembalik Opsional Awal Periode (khusus akrual yang ditandai Admin)
CREATE OR REPLACE FUNCTION public.generate_optional_reversing_entries(
  p_source_period_id UUID,
  p_reversing_date DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jrn RECORD;
  v_lines JSONB;
  v_count INT := 0;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang menjalankan jurnal pembalik.';
  END IF;

  PERFORM set_config('app.allow_mark_reversed', 'on', true);

  FOR v_jrn IN
    SELECT *
    FROM public.journals
    WHERE period_id = p_source_period_id
      AND status = 'posted'
      AND auto_reverse_next_period = true
      AND is_reversed = false
    ORDER BY journal_date, created_at
  LOOP
    SELECT jsonb_agg(
      jsonb_build_object(
        'account_id', jl.account_id,
        'project_id', jl.project_id,
        'description', 'Jurnal Pembalik atas ' || v_jrn.journal_number,
        'debit', jl.credit,
        'credit', jl.debit
      )
      ORDER BY jl.line_no
    )
    INTO v_lines
    FROM public.journal_lines jl
    WHERE jl.journal_id = v_jrn.id;

    PERFORM public.create_and_post_journal(
      p_reversing_date,
      'reversing',
      'Jurnal Pembalik Awal Periode atas ' || v_jrn.journal_number,
      v_lines,
      v_jrn.project_id,
      'reversing_entry',
      v_jrn.id,
      v_jrn.id,
      false
    );

    UPDATE public.journals SET is_reversed = true WHERE id = v_jrn.id;
    v_count := v_count + 1;
  END LOOP;

  PERFORM set_config('app.allow_mark_reversed', 'off', true);
  RETURN v_count;
END;
$$;

-- RPC Penutupan Buku & Penguncian Periode (FR-AK5, UC-26, Bagian 7.1)
-- Menutup seluruh saldo Pendapatan & Beban periode tersebut ke Laba Ditahan lalu mengunci periode.
CREATE OR REPLACE FUNCTION public.run_period_closing(
  p_period_id UUID,
  p_closing_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.periods%ROWTYPE;
  v_retained_id UUID;
  v_date DATE;
  v_lines JSONB := '[]'::JSONB;
  v_rec RECORD;
  v_net_profit BIGINT := 0;
  v_closing_jrn_id UUID := NULL;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang menjalankan penutupan periode.';
  END IF;

  SELECT * INTO v_period FROM public.periods WHERE id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode tidak ditemukan.';
  END IF;
  IF v_period.status = 'closed' THEN
    RAISE EXCEPTION 'Periode % sudah berstatus tertutup.', v_period.name;
  END IF;

  v_date := COALESCE(p_closing_date, v_period.end_date);

  SELECT id INTO v_retained_id
  FROM public.accounts
  WHERE system_tag = 'retained_earnings' AND is_active = true
  ORDER BY code
  LIMIT 1;

  IF v_retained_id IS NULL THEN
    RAISE EXCEPTION 'Akun Laba Ditahan (system_tag = retained_earnings) tidak ditemukan.';
  END IF;

  -- Kumpulkan saldo neto tiap akun nominal (revenue & expense) pada periode ini
  FOR v_rec IN
    SELECT
      a.id AS account_id,
      a.account_type,
      COALESCE(SUM(jl.debit), 0)::BIGINT AS total_debit,
      COALESCE(SUM(jl.credit), 0)::BIGINT AS total_credit
    FROM public.journal_lines jl
    JOIN public.journals j ON j.id = jl.journal_id
    JOIN public.accounts a ON a.id = jl.account_id
    WHERE j.period_id = p_period_id
      AND j.status = 'posted'
      AND j.journal_type <> 'closing'
      AND a.account_type IN ('revenue', 'expense')
    GROUP BY a.id, a.account_type
  LOOP
    IF v_rec.account_type = 'revenue' THEN
      IF v_rec.total_credit > v_rec.total_debit THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_rec.account_id,
            'description', 'Penutupan akun pendapatan ' || v_period.name,
            'debit', v_rec.total_credit - v_rec.total_debit,
            'credit', 0
          )
        );
        v_net_profit := v_net_profit + (v_rec.total_credit - v_rec.total_debit);
      ELSIF v_rec.total_debit > v_rec.total_credit THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_rec.account_id,
            'description', 'Penutupan akun pendapatan ' || v_period.name,
            'debit', 0,
            'credit', v_rec.total_debit - v_rec.total_credit
          )
        );
        v_net_profit := v_net_profit - (v_rec.total_debit - v_rec.total_credit);
      END IF;
    ELSIF v_rec.account_type = 'expense' THEN
      IF v_rec.total_debit > v_rec.total_credit THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_rec.account_id,
            'description', 'Penutupan akun beban ' || v_period.name,
            'debit', 0,
            'credit', v_rec.total_debit - v_rec.total_credit
          )
        );
        v_net_profit := v_net_profit - (v_rec.total_debit - v_rec.total_credit);
      ELSIF v_rec.total_credit > v_rec.total_debit THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_rec.account_id,
            'description', 'Penutupan akun beban ' || v_period.name,
            'debit', v_rec.total_credit - v_rec.total_debit,
            'credit', 0
          )
        );
        v_net_profit := v_net_profit + (v_rec.total_credit - v_rec.total_debit);
      END IF;
    END IF;
  END LOOP;

  IF jsonb_array_length(v_lines) > 0 THEN
    IF v_net_profit > 0 THEN
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object(
          'account_id', v_retained_id,
          'description', 'Transfer laba bersih ke Laba Ditahan ' || v_period.name,
          'debit', 0,
          'credit', v_net_profit
        )
      );
    ELSIF v_net_profit < 0 THEN
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object(
          'account_id', v_retained_id,
          'description', 'Transfer rugi bersih ke Laba Ditahan ' || v_period.name,
          'debit', abs(v_net_profit),
          'credit', 0
        )
      );
    END IF;

    v_closing_jrn_id := public.create_and_post_journal(
      v_date,
      'closing',
      'Jurnal Penutup Periode ' || v_period.name,
      v_lines,
      NULL,
      'period_closing',
      p_period_id,
      NULL,
      false
    );
  END IF;

  PERFORM public.close_accounting_period(p_period_id);
  RETURN v_closing_jrn_id;
END;
$$;

-- 2. RPC Persetujuan & Pencatatan Pembayaran Payment Approval + Jurnal Otomatis (FR-PA3..5, FR-AK1, BR-4)
CREATE OR REPLACE FUNCTION public.decide_payment_request(
  p_request_id UUID,
  p_decision TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_accounting_date DATE DEFAULT CURRENT_DATE
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.payment_requests%ROWTYPE;
  v_payable_acc_id UUID;
  v_jrn_id UUID;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin yang dapat memproses Payment Approval (FR-PA3).';
  END IF;

  SELECT * INTO v_req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengajuan pembayaran tidak ditemukan.';
  END IF;

  IF v_req.status <> 'submitted' THEN
    RAISE EXCEPTION 'Hanya pengajuan berstatus Diajukan yang dapat diputuskan.';
  END IF;

  -- BR-4: Pengaju tidak boleh menyetujui/menolak pengajuannya sendiri
  IF v_req.requester_id = auth.uid() THEN
    RAISE EXCEPTION 'Pelanggaran pemisahan tugas: pengaju tidak boleh menyetujui pengajuannya sendiri (BR-4).';
  END IF;

  IF p_decision = 'reject' THEN
    IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) < 3 THEN
      RAISE EXCEPTION 'Alasan penolakan wajib diisi (BR-5).';
    END IF;

    UPDATE public.payment_requests
    SET status = 'rejected',
        approver_id = auth.uid(),
        decided_at = now(),
        rejection_reason = trim(p_rejection_reason)
    WHERE id = p_request_id
    RETURNING * INTO v_req;

    INSERT INTO public.notifications (user_id, title, message, link_path)
    VALUES (
      v_req.requester_id,
      'Pengajuan Ditolak: ' || v_req.request_number,
      'Alasan penolakan: ' || trim(p_rejection_reason),
      '/user/pembayaran'
    );

    RETURN v_req;
  ELSIF p_decision = 'approve' THEN
    SELECT id INTO v_payable_acc_id
    FROM public.accounts
    WHERE system_tag = 'accounts_payable' AND is_active = true
    ORDER BY code
    LIMIT 1;

    IF v_payable_acc_id IS NULL THEN
      RAISE EXCEPTION 'Akun Utang Usaha (accounts_payable) belum diatur atau nonaktif.';
    END IF;

    -- Jurnal Akrual Beban saat pengajuan disetujui (BR-12, FR-AK1)
    v_jrn_id := public.create_and_post_journal(
      p_accounting_date,
      'auto_expense',
      'Pengakuan beban atas persetujuan ' || v_req.request_number || ' — ' || v_req.purpose,
      jsonb_build_array(
        jsonb_build_object(
          'account_id', v_req.expense_account_id,
          'project_id', v_req.project_id,
          'description', v_req.purpose,
          'debit', v_req.amount,
          'credit', 0
        ),
        jsonb_build_object(
          'account_id', v_payable_acc_id,
          'project_id', v_req.project_id,
          'description', 'Utang kepada ' || v_req.recipient_name,
          'debit', 0,
          'credit', v_req.amount
        )
      ),
      v_req.project_id,
      'payment_request_approval',
      v_req.id,
      NULL,
      false
    );

    UPDATE public.payment_requests
    SET status = 'approved',
        approver_id = auth.uid(),
        decided_at = now(),
        rejection_reason = NULL,
        accrual_journal_id = v_jrn_id
    WHERE id = p_request_id
    RETURNING * INTO v_req;

    INSERT INTO public.notifications (user_id, title, message, link_path)
    VALUES (
      v_req.requester_id,
      'Pengajuan Disetujui: ' || v_req.request_number,
      'Pengajuan Anda telah disetujui Admin dan menunggu pencairan pembayaran.',
      '/user/pembayaran'
    );

    RETURN v_req;
  ELSE
    RAISE EXCEPTION 'Keputusan harus bernilai approve atau reject.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_payment_disbursement(
  p_request_id UUID,
  p_paid_date DATE,
  p_source_cash_account_id UUID
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.payment_requests%ROWTYPE;
  v_payable_acc_id UUID;
  v_jrn_id UUID;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang mencatat realisasi pembayaran (FR-PA5).';
  END IF;

  SELECT * INTO v_req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengajuan pembayaran tidak ditemukan.';
  END IF;

  IF v_req.status <> 'approved' THEN
    RAISE EXCEPTION 'Hanya pengajuan berstatus Disetujui yang dapat dicatat pembayarannya.';
  END IF;

  SELECT id INTO v_payable_acc_id
  FROM public.accounts
  WHERE system_tag = 'accounts_payable' AND is_active = true
  ORDER BY code
  LIMIT 1;

  v_jrn_id := public.create_and_post_journal(
    p_paid_date,
    'auto_payment',
    'Pembayaran atas ' || v_req.request_number || ' kepada ' || v_req.recipient_name,
    jsonb_build_array(
      jsonb_build_object(
        'account_id', v_payable_acc_id,
        'project_id', v_req.project_id,
        'description', 'Pelunasan utang ' || v_req.request_number,
        'debit', v_req.amount,
        'credit', 0
      ),
      jsonb_build_object(
        'account_id', p_source_cash_account_id,
        'project_id', v_req.project_id,
        'description', 'Transfer ke ' || v_req.recipient_name,
        'debit', 0,
        'credit', v_req.amount
      )
    ),
    v_req.project_id,
    'payment_request_disbursement',
    v_req.id,
    NULL,
    false
  );

  UPDATE public.payment_requests
  SET status = 'paid',
      paid_date = p_paid_date,
      source_cash_account_id = p_source_cash_account_id,
      payment_journal_id = v_jrn_id
  WHERE id = p_request_id
  RETURNING * INTO v_req;

  IF v_req.po_id IS NOT NULL THEN
    UPDATE public.purchase_orders
    SET status = 'completed'
    WHERE id = v_req.po_id AND status = 'issued';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, link_path)
  VALUES (
    v_req.requester_id,
    'Pembayaran Selesai: ' || v_req.request_number,
    'Dana untuk ' || v_req.purpose || ' telah dicatat dibayar pada ' || p_paid_date::TEXT || '.',
    '/user/pembayaran'
  );

  RETURN v_req;
END;
$$;

-- 3. Tabel Budgeting & Fungsi Perbandingan Anggaran vs Realisasi Terposting (FR-BU1..FR-BU4, BR-8)
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.periods(id) ON DELETE RESTRICT,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  alert_threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 80.00 CHECK (alert_threshold_pct BETWEEN 1 AND 100),
  status public.budget_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_budgets_project ON public.budgets (project_id, status);

CREATE TRIGGER trg_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  allocated_amount BIGINT NOT NULL CHECK (allocated_amount >= 0),
  UNIQUE (budget_id, account_id)
);

-- Fungsi aman Anggaran vs Realisasi (BR-8: realisasi HANYA dari jurnal yang sudah diposting!)
-- Dapat dipanggil Admin (semua proyek) maupun User (khusus proyek yang ditugaskan, UC-08)
CREATE OR REPLACE FUNCTION public.get_project_budget_vs_actual(p_project_id UUID)
RETURNS TABLE (
  account_id UUID,
  account_code VARCHAR(20),
  account_name TEXT,
  allocated_amount BIGINT,
  realized_amount BIGINT,
  committed_po_amount BIGINT,
  remaining_amount BIGINT,
  absorption_pct NUMERIC(7,2),
  alert_threshold_pct NUMERIC(5,2),
  is_over_threshold BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget public.budgets%ROWTYPE;
  v_po_committed BIGINT := 0;
BEGIN
  IF public.current_user_role() <> 'admin' AND NOT public.is_project_member(p_project_id) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan anggota proyek ini.';
  END IF;

  SELECT * INTO v_budget
  FROM public.budgets b
  WHERE b.project_id = p_project_id AND b.status = 'active'
  ORDER BY b.version DESC, b.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(po.total_amount), 0)::BIGINT INTO v_po_committed
  FROM public.purchase_orders po
  WHERE po.project_id = p_project_id AND po.status = 'issued';

  RETURN QUERY
  SELECT
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    bl.allocated_amount,
    COALESCE(SUM(jl.debit - jl.credit), 0)::BIGINT AS realized_amount,
    v_po_committed AS committed_po_amount,
    (bl.allocated_amount - COALESCE(SUM(jl.debit - jl.credit), 0))::BIGINT AS remaining_amount,
    CASE
      WHEN bl.allocated_amount > 0 THEN
        ROUND((COALESCE(SUM(jl.debit - jl.credit), 0)::NUMERIC / bl.allocated_amount::NUMERIC) * 100.0, 2)
      ELSE 0.00
    END AS absorption_pct,
    v_budget.alert_threshold_pct,
    CASE
      WHEN bl.allocated_amount > 0 THEN
        ((COALESCE(SUM(jl.debit - jl.credit), 0)::NUMERIC / bl.allocated_amount::NUMERIC) * 100.0) >= v_budget.alert_threshold_pct
      ELSE false
    END AS is_over_threshold
  FROM public.budget_lines bl
  JOIN public.accounts a ON a.id = bl.account_id
  LEFT JOIN (
    public.journal_lines jl
    JOIN public.journals j ON j.id = jl.journal_id AND j.status = 'posted' AND j.journal_type <> 'closing'
  ) ON jl.account_id = bl.account_id
   AND COALESCE(jl.project_id, j.project_id) = p_project_id
   AND (v_budget.period_id IS NULL OR j.period_id = v_budget.period_id)
  WHERE bl.budget_id = v_budget.id
  GROUP BY a.id, a.code, a.name, bl.allocated_amount, v_budget.alert_threshold_pct
  ORDER BY a.code;
END;
$$;

-- Trigger Audit Trail Fase 3
CREATE TRIGGER trg_audit_journals
AFTER INSERT OR UPDATE OR DELETE ON public.journals
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER trg_audit_budgets
AFTER INSERT OR UPDATE OR DELETE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

-- =============================================================================
-- Kebijakan RLS Fase 3
-- =============================================================================
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals FORCE ROW LEVEL SECURITY;

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines FORCE ROW LEVEL SECURITY;

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.journals, public.journal_lines, public.budgets, public.budget_lines FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journals, public.journal_lines,
  public.budgets, public.budget_lines TO authenticated;

-- Journals & Journal Lines: HANYA Admin (User membaca realisasi anggaran lewat RPC aman, bukan jurnal mentah)
CREATE POLICY journals_admin_policy ON public.journals
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY journal_lines_admin_policy ON public.journal_lines
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

-- Budgets: Admin kelola penuh; User melihat anggaran proyek yang diikuti
CREATE POLICY budgets_select_policy ON public.budgets
FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'admin'
  OR (public.current_user_role() = 'user' AND public.is_project_member(project_id))
);

CREATE POLICY budgets_manage_admin ON public.budgets
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY budget_lines_select_policy ON public.budget_lines
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_lines.budget_id
      AND (public.current_user_role() = 'admin' OR public.is_project_member(b.project_id))
  )
);

CREATE POLICY budget_lines_manage_admin ON public.budget_lines
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

