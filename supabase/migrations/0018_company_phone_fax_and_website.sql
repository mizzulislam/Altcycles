-- =============================================================================
-- Migrasi 0018: Tambahan Kolom Telepon/Fax & Website Resmi di Profil Perusahaan
-- =============================================================================

ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS telephone_fax TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT DEFAULT 'www.altvira.id';
