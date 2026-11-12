-- =============================================================================
-- Altcycles — Tahap 3: Pemisahan PPN Keluaran Faktur PKP & Guard verify_client_po
-- =============================================================================

-- 1. Pisahkan kredit PPN Keluaran saat menerbitkan invoice PKP (AUD-03)
CREATE OR REPLACE FUNCTION public.issue_sales_invoice(
  p_invoice_id UUID,
  p_direct_cash_account_id UUID DEFAULT NULL
)
RETURNS public.sales_invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.sales_invoices%ROWTYPE;
  v_proj public.projects%ROWTYPE;
  v_cust_name TEXT;
  v_debit_acc_id UUID;
  v_credit_acc_id UUID;
  v_ppn_acc_id UUID;
  v_lines JSONB;
  v_jrn_id UUID;
  v_payment_id UUID;
  v_kw_no TEXT;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang menerbitkan invoice.';
  END IF;

  SELECT * INTO v_inv FROM public.sales_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan.';
  END IF;
  IF v_inv.doc_status <> 'draft' THEN
    RAISE EXCEPTION 'Invoice % sudah pernah diterbitkan.', v_inv.invoice_number;
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = v_inv.project_id;
  SELECT name INTO v_cust_name FROM public.customers WHERE id = v_inv.customer_id;

  IF p_direct_cash_account_id IS NOT NULL THEN
    v_debit_acc_id := p_direct_cash_account_id;
  ELSE
    SELECT id INTO v_debit_acc_id
    FROM public.accounts
    WHERE system_tag = 'accounts_receivable' AND is_active = true
    ORDER BY code LIMIT 1;
  END IF;

  IF v_proj.revenue_method = 'progress_billing' THEN
    SELECT id INTO v_credit_acc_id
    FROM public.accounts
    WHERE system_tag = 'contract_billings' AND is_active = true
    ORDER BY code LIMIT 1;
  ELSIF v_proj.revenue_method = 'two_term_accrual' AND v_inv.invoice_kind = 'final_settlement' THEN
    SELECT id INTO v_credit_acc_id
    FROM public.accounts
    WHERE system_tag = 'service_revenue' AND is_active = true
    ORDER BY code LIMIT 1;
  ELSE
    SELECT id INTO v_credit_acc_id
    FROM public.accounts
    WHERE system_tag = 'unearned_revenue' AND is_active = true
    ORDER BY code LIMIT 1;
  END IF;

  IF COALESCE(v_inv.ppn_amount, 0) > 0 THEN
    SELECT id INTO v_ppn_acc_id
    FROM public.accounts
    WHERE is_active = true
      AND is_postable = true
      AND (code = '2-1501' OR lower(name) LIKE '%ppn keluaran%')
    ORDER BY CASE WHEN code = '2-1501' THEN 0 ELSE 1 END, code
    LIMIT 1;

    IF v_ppn_acc_id IS NULL THEN
      RAISE EXCEPTION 'Akun Utang PPN Keluaran (2-1501) belum aktif di Bagan Akun.';
    END IF;

    v_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', v_debit_acc_id,
        'project_id', v_proj.id,
        'description', 'Tagihan ' || v_inv.invoice_number,
        'debit', v_inv.total_amount,
        'credit', 0
      ),
      jsonb_build_object(
        'account_id', v_credit_acc_id,
        'project_id', v_proj.id,
        'description', 'Penagihan termin ' || v_inv.invoice_number,
        'debit', 0,
        'credit', v_inv.subtotal_amount
      ),
      jsonb_build_object(
        'account_id', v_ppn_acc_id,
        'project_id', v_proj.id,
        'description', 'PPN Keluaran ' || v_inv.invoice_number,
        'debit', 0,
        'credit', v_inv.ppn_amount
      )
    );
  ELSE
    v_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', v_debit_acc_id,
        'project_id', v_proj.id,
        'description', 'Tagihan ' || v_inv.invoice_number,
        'debit', v_inv.total_amount,
        'credit', 0
      ),
      jsonb_build_object(
        'account_id', v_credit_acc_id,
        'project_id', v_proj.id,
        'description', 'Penagihan termin ' || v_inv.invoice_number,
        'debit', 0,
        'credit', v_inv.total_amount
      )
    );
  END IF;

  v_jrn_id := public.create_and_post_journal(
    v_inv.invoice_date,
    'auto_invoice',
    'Penagihan Invoice ' || v_inv.invoice_number || ' — ' || v_proj.name,
    v_lines,
    v_proj.id,
    'sales_invoice',
    v_inv.id,
    NULL,
    false
  );

  IF p_direct_cash_account_id IS NOT NULL THEN
    UPDATE public.sales_invoices
    SET doc_status = 'issued',
        paid_amount = v_inv.total_amount,
        payment_status = 'paid',
        journal_id = v_jrn_id
    WHERE id = p_invoice_id
    RETURNING * INTO v_inv;

    INSERT INTO public.invoice_payments (
      invoice_id, payment_date, amount, destination_account_id, payment_method, journal_id, recorded_by
    )
    VALUES (
      v_inv.id, v_inv.invoice_date, v_inv.total_amount, p_direct_cash_account_id, 'Transfer Bank', v_jrn_id, auth.uid()
    )
    RETURNING id INTO v_payment_id;

    v_kw_no := public.next_doc_number('KW', v_inv.invoice_date);
    INSERT INTO public.receipts (
      receipt_number, receipt_date, invoice_id, invoice_payment_id, amount, received_from
    )
    VALUES (
      v_kw_no, v_inv.invoice_date, v_inv.id, v_payment_id, v_inv.total_amount, v_cust_name
    );

    IF v_inv.milestone_id IS NOT NULL THEN
      UPDATE public.milestones SET status = 'paid' WHERE id = v_inv.milestone_id;
    END IF;
  ELSE
    UPDATE public.sales_invoices
    SET doc_status = 'issued',
        payment_status = 'unpaid',
        journal_id = v_jrn_id
    WHERE id = p_invoice_id
    RETURNING * INTO v_inv;

    IF v_inv.milestone_id IS NOT NULL THEN
      UPDATE public.milestones SET status = 'invoiced' WHERE id = v_inv.milestone_id;
    END IF;
  END IF;

  PERFORM public.try_eliminate_progress_billing_project(v_proj.id, v_inv.invoice_date);
  RETURN v_inv;
END;
$$;

-- 2. Kunci guard status pending_verification & catat audit_logs pada approve/reject verify_client_po (AUD-06)
CREATE OR REPLACE FUNCTION public.verify_client_po(
  p_client_po_id UUID,
  p_project_id UUID,
  p_approve BOOLEAN,
  p_rejection_note TEXT DEFAULT NULL
)
RETURNS public.client_purchase_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpo public.client_purchase_orders%ROWTYPE;
  v_old_cpo JSONB;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berwenang memverifikasi PO klien.';
  END IF;

  SELECT * INTO v_cpo
  FROM public.client_purchase_orders
  WHERE id = p_client_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO klien tidak ditemukan.';
  END IF;

  IF v_cpo.status <> 'pending_verification' THEN
    RAISE EXCEPTION 'PO klien % sudah diproses dengan status %.', v_cpo.po_number, v_cpo.status;
  END IF;

  v_old_cpo := to_jsonb(v_cpo);

  IF p_approve THEN
    IF p_project_id IS NULL THEN
      RAISE EXCEPTION 'Pilih proyek klien yang tertaut sebelum memverifikasi PO.';
    END IF;
    UPDATE public.client_purchase_orders
    SET status = 'verified',
        project_id = p_project_id,
        verified_by = auth.uid(),
        verified_at = now(),
        rejection_note = NULL,
        updated_at = now()
    WHERE id = p_client_po_id
    RETURNING * INTO v_cpo;
  ELSE
    UPDATE public.client_purchase_orders
    SET status = 'rejected',
        verified_by = auth.uid(),
        verified_at = now(),
        rejection_note = p_rejection_note,
        updated_at = now()
    WHERE id = p_client_po_id
    RETURNING * INTO v_cpo;
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_name, entity_id, old_data, new_data)
  VALUES (auth.uid(), 'admin', 'VERIFY_PO', 'client_purchase_orders', p_client_po_id::TEXT, v_old_cpo, to_jsonb(v_cpo));

  RETURN v_cpo;
END;
$$;

