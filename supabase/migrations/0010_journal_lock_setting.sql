-- Migration 0010: Opsi Kunci Immutabilitas Jurnal Akuntansi (BR-2 Toggle)
-- Memungkinkan Super Admin / Admin menonaktifkan penguncian jurnal untuk keperluan testing transaksi

ALTER TABLE public.company_profile 
ADD COLUMN IF NOT EXISTS journal_lock_enabled BOOLEAN NOT NULL DEFAULT true;

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
  v_journal_lock BOOLEAN := true;
BEGIN
  -- Cek status penguncian jurnal dari profil perusahaan
  SELECT COALESCE(journal_lock_enabled, true) INTO v_journal_lock FROM public.company_profile LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'posted' AND v_journal_lock THEN
      RAISE EXCEPTION 'Jurnal % yang sudah diposting tidak dapat dihapus; lakukan koreksi dengan jurnal koreksi/penyesuaian (BR-2). Aktifkan mode pengujian pada Pengaturan Sistem untuk menghapus/mengedit.', OLD.journal_number;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'posted' AND v_journal_lock THEN
      RAISE EXCEPTION 'Jurnal baru harus dibuat berstatus draft terlebih dahulu agar baris debit/kredit dapat divalidasi sebelum posting (BR-1).';
    END IF;
  END IF;

  -- Jika jurnal sudah diposting sebelumnya, tolak segala perubahan kecuali penanda internal is_reversed atau jika lock dinonaktifkan
  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    IF NOT v_journal_lock THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
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
    RAISE EXCEPTION 'Jurnal % yang sudah diposting bersifat permanen dan tidak dapat diubah; gunakan jurnal koreksi/penyesuaian (BR-2). Nonaktifkan Kunci Jurnal di Pengaturan Sistem jika ingin mengubah jurnal testing.', OLD.journal_number;
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

CREATE OR REPLACE FUNCTION public.enforce_journal_lines_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.journal_status;
  v_jid UUID := COALESCE(NEW.journal_id, OLD.journal_id);
  v_journal_lock BOOLEAN := true;
BEGIN
  SELECT COALESCE(journal_lock_enabled, true) INTO v_journal_lock FROM public.company_profile LIMIT 1;
  IF NOT v_journal_lock THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT status INTO v_status FROM public.journals WHERE id = v_jid;
  IF v_status = 'posted' THEN
    RAISE EXCEPTION 'Baris ayat pada jurnal yang sudah diposting tidak dapat ditambah, diubah, atau dihapus (BR-2). Nonaktifkan Kunci Jurnal di Pengaturan Sistem untuk mode testing.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_journal_lock_status(p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Hanya Super Admin atau Admin yang dapat mengubah status kunci jurnal.';
  END IF;

  UPDATE public.company_profile
  SET journal_lock_enabled = p_enabled,
      updated_at = now()
  WHERE id = 1;

  RETURN p_enabled;
END;
$$;

