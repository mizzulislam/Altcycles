-- Tambah kolom NPWP / NIK perusahaan atau penandatangan resmi
ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS tax_id_number TEXT;

