-- =============================================================================
-- Migrasi 0016: Media Banner / Flyer / Konten Medsos untuk Halaman Login
-- Dapat dibaca secara publik (anon) khusus item aktif untuk panel kiri /login,
-- sedangkan manajemen penuh (CRUD) hanya diizinkan untuk Super Admin.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.login_media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT NOT NULL DEFAULT 'banner' CHECK (category IN ('banner', 'flyer', 'medsos')),
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INT NOT NULL DEFAULT 1 CHECK (display_order >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_media_active_order
  ON public.login_media_items (is_active, display_order, created_at DESC);

DROP TRIGGER IF EXISTS trg_login_media_items_updated_at ON public.login_media_items;
CREATE TRIGGER trg_login_media_items_updated_at
BEFORE UPDATE ON public.login_media_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_login_media_items ON public.login_media_items;
CREATE TRIGGER trg_audit_login_media_items
AFTER INSERT OR UPDATE OR DELETE ON public.login_media_items
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

ALTER TABLE public.login_media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_media_items FORCE ROW LEVEL SECURITY;

GRANT SELECT ON public.login_media_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.login_media_items TO authenticated;

DROP POLICY IF EXISTS login_media_public_select ON public.login_media_items;
CREATE POLICY login_media_public_select ON public.login_media_items
FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS login_media_super_admin_select ON public.login_media_items;
CREATE POLICY login_media_super_admin_select ON public.login_media_items
FOR SELECT TO authenticated
USING (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS login_media_super_admin_insert ON public.login_media_items;
CREATE POLICY login_media_super_admin_insert ON public.login_media_items
FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS login_media_super_admin_update ON public.login_media_items;
CREATE POLICY login_media_super_admin_update ON public.login_media_items
FOR UPDATE TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS login_media_super_admin_delete ON public.login_media_items;
CREATE POLICY login_media_super_admin_delete ON public.login_media_items
FOR DELETE TO authenticated
USING (public.current_user_role() = 'super_admin');

