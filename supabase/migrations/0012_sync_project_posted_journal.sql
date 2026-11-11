-- Sinkronisasi ulang projects.has_posted_journal saat jurnal dihapus/diubah
-- dan pembaruan RPC save_project_milestones agar cek jurnal aktual & izinkan penyusunan saat termin kosong.

UPDATE public.projects p
SET has_posted_journal = EXISTS (
  SELECT 1
  FROM public.journals j
  WHERE j.project_id = p.id
    AND j.status = 'posted'
);

CREATE OR REPLACE FUNCTION public.sync_project_posted_journal_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.project_id IS NOT NULL THEN
    UPDATE public.projects p
    SET has_posted_journal = EXISTS (
      SELECT 1
      FROM public.journals j
      WHERE j.project_id = OLD.project_id
        AND j.status = 'posted'
    )
    WHERE p.id = OLD.project_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.project_id IS NOT NULL THEN
    UPDATE public.projects p
    SET has_posted_journal = EXISTS (
      SELECT 1
      FROM public.journals j
      WHERE j.project_id = NEW.project_id
        AND j.status = 'posted'
    )
    WHERE p.id = NEW.project_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_posted_journal ON public.journals;
CREATE TRIGGER trg_sync_project_posted_journal
AFTER INSERT OR UPDATE OF project_id, status OR DELETE ON public.journals
FOR EACH ROW EXECUTE FUNCTION public.sync_project_posted_journal_flag();

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
  v_has_milestones BOOLEAN := false;
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
    SELECT 1 FROM public.milestones m
    WHERE m.project_id = p_project_id
  ) INTO v_has_milestones;

  IF v_has_posted AND v_has_milestones THEN
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

  UPDATE public.projects
  SET term_count = v_count,
      has_posted_journal = v_has_posted
  WHERE id = p_project_id;

  RETURN QUERY
  SELECT * FROM public.milestones WHERE project_id = p_project_id ORDER BY sequence_no;
END;
$$;

