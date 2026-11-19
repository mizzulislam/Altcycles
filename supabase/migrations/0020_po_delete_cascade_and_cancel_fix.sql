-- 0020_po_delete_cascade_and_cancel_fix.sql
-- Perbaikan constraint pembatalan PO Rp0 dan trigger cascade delete po_items

-- 1. Izinkan PO dengan status 'cancelled' tetap sah jika bernilai Rp0 (pembatalan PO draf)
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS chk_po_issued_positive;
ALTER TABLE public.purchase_orders ADD CONSTRAINT chk_po_issued_positive
  CHECK (status IN ('draft', 'cancelled') OR total_amount > 0);

-- 2. Perbaiki fungsi enforce_po_items_draft_only agar tidak melempar exception bila row induk purchase_orders sudah dihapus (CASCADE DELETE)
CREATE OR REPLACE FUNCTION public.enforce_po_items_draft_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.po_status;
  v_po_id UUID := COALESCE(NEW.po_id, OLD.po_id);
BEGIN
  SELECT status INTO v_status FROM public.purchase_orders WHERE id = v_po_id;
  -- Bila v_status IS NULL, berarti purchase_orders sudah dihapus oleh CASCADE DELETE induknya
  IF v_status IS NOT NULL AND v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Item PO tidak dapat diubah setelah PO diterbitkan (BR-7).';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
