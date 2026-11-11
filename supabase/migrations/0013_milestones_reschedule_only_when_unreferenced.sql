-- Izinkan Atur Ulang Termin apabila termin yang ada belum direferensikan oleh BAKP (progress_reports) atau Invoice (sales_invoices),
-- meskipun proyek sudah memiliki jurnal pengakuan pendapatan periode (project_progress).

CREATE OR REPLACE FUNCTION public.save_project_milestones(p_project_id uuid, p_milestones jsonb)
RETURNS SETOF public.milestones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_total_pct NUMERIC(7,2) := 0;
  v_total_amt BIGINT := 0;
  v_count INT := 0;
  v_item JSONB;
  v_has_posted BOOLEAN := false;
  v_has_locked_milestone BOOLEAN := false;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang mengatur termin proyek.';
  END IF;

  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyek tidak ditemukan.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.journals j
    WHERE j.project_id = p_project_id AND j.status = 'posted'
  ) INTO v_has_posted;

  SELECT EXISTS (
    SELECT 1
    FROM public.milestones m
    WHERE m.project_id = p_project_id
      AND (
        EXISTS (SELECT 1 FROM public.progress_reports pr WHERE pr.milestone_id = m.id)
        OR EXISTS (SELECT 1 FROM public.sales_invoices si WHERE si.milestone_id = m.id)
      )
  ) INTO v_has_locked_milestone;

  IF v_has_locked_milestone THEN
    RAISE EXCEPTION 'Jadwal termin tidak dapat disusun ulang karena sebagian termin sudah memiliki BAKP atau Invoice terkait.';
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

  UPDATE public.projects
  SET term_count = v_count,
      has_posted_journal = v_has_posted
  WHERE id = p_project_id;

  RETURN QUERY
  SELECT * FROM public.milestones WHERE project_id = p_project_id ORDER BY sequence_no;
END;
$$;

