-- =============================================================================
-- Altcycles — Langkah 6: Konfigurasi Penomoran Dokumen & Switch Reset Periode
-- (Memenuhi Resolusi Konflik 2 & Rekomendasi Standar Dokumen Altvira)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_all_doc_sequences_reset_period(
  p_reset_period TEXT,
  p_apply_standard_2027 BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'super_admin' AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Hanya Super Admin yang berwenang mengubah kebijakan penomoran.';
  END IF;

  IF p_reset_period NOT IN ('monthly', 'yearly', 'never') THEN
    RAISE EXCEPTION 'Periode reset tidak valid: %', p_reset_period;
  END IF;

  IF p_apply_standard_2027 THEN
    UPDATE public.doc_sequences
    SET reset_period = p_reset_period,
        padding_digits = 4,
        prefix_pattern = CASE 
          WHEN doc_type = 'PRJ' THEN 'ALT/PRJ/{{tahun}}/{{urut}}'
          ELSE 'ALT/' || doc_type || '/{{tahun}}/{{bulan}}/{{urut}}'
        END,
        updated_by = auth.uid(),
        updated_at = now();
  ELSE
    UPDATE public.doc_sequences
    SET reset_period = p_reset_period,
        updated_by = auth.uid(),
        updated_at = now();
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_all_doc_sequences_reset_period IS 
'Mengubah kebijakan periode reset penomoran dokumen (monthly/yearly) secara massal dari portal Super Admin tanpa hardcode.';
