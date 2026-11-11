-- Memastikan penghapusan baris pada public.journals tidak gagal akibat ON DELETE RESTRICT
-- dari referensi opsional (nullable) pada modul progres proyek, faktur, pembayaran, bagi hasil,
-- dan referensi jurnal pembalik/koreksi, serta mencegah orphan header tanpa journal_lines.

ALTER TABLE public.journals
  DROP CONSTRAINT IF EXISTS journals_reference_journal_id_fkey,
  ADD CONSTRAINT journals_reference_journal_id_fkey
    FOREIGN KEY (reference_journal_id) REFERENCES public.journals(id) ON DELETE SET NULL;

ALTER TABLE public.project_progress
  DROP CONSTRAINT IF EXISTS project_progress_adjustment_journal_id_fkey,
  ADD CONSTRAINT project_progress_adjustment_journal_id_fkey
    FOREIGN KEY (adjustment_journal_id) REFERENCES public.journals(id) ON DELETE SET NULL;

ALTER TABLE public.sales_invoices
  DROP CONSTRAINT IF EXISTS sales_invoices_journal_id_fkey,
  ADD CONSTRAINT sales_invoices_journal_id_fkey
    FOREIGN KEY (journal_id) REFERENCES public.journals(id) ON DELETE SET NULL;

ALTER TABLE public.invoice_payments
  DROP CONSTRAINT IF EXISTS invoice_payments_journal_id_fkey,
  ADD CONSTRAINT invoice_payments_journal_id_fkey
    FOREIGN KEY (journal_id) REFERENCES public.journals(id) ON DELETE SET NULL;

ALTER TABLE public.profit_sharing_results
  DROP CONSTRAINT IF EXISTS profit_sharing_results_journal_id_fkey,
  ADD CONSTRAINT profit_sharing_results_journal_id_fkey
    FOREIGN KEY (journal_id) REFERENCES public.journals(id) ON DELETE SET NULL;

