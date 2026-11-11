-- =============================================================================
-- Migrasi 0014: Aset Dokumen Perusahaan (Logo, TTD, Paraf, Kota, 3 Sosial Media)
--              & Aset Pelanggan (Logo, TTD, Paraf Klien)
-- =============================================================================

ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'ADAPT TODAY, INNOVATE TOMORROW',
  ADD COLUMN IF NOT EXISTS signing_city TEXT DEFAULT 'Bogor',
  ADD COLUMN IF NOT EXISTS signer_signature_path TEXT,
  ADD COLUMN IF NOT EXISTS signer_paraf_path TEXT,
  ADD COLUMN IF NOT EXISTS social_links_json JSONB DEFAULT '[
    {"platform": "Instagram", "username": "@altvira.tech"},
    {"platform": "LinkedIn", "username": "altvira-technology"},
    {"platform": "TikTok", "username": "@altvira.tech"}
  ]'::jsonb;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS logo_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS signature_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS paraf_storage_path TEXT;

