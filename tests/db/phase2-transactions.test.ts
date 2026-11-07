import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  createMigratedTestDb,
  runAsAuthenticated,
  TEST_ACTORS,
} from "./setup-pglite";

describe("Fase 2 Transaksi Internal: PO Pembelian & Payment Approval 1-Level", () => {
  let db: PGlite;
  let assignedProjectId: string;
  let vendorId: string;
  let expenseAccountId: string;
  let bankAccountId: string;

  beforeAll(async () => {
    db = await createMigratedTestDb();
    const prj = await db.query<{ id: string }>(
      "SELECT id FROM public.projects WHERE code = 'PRJ/ALT/2026/001'",
    );
    assignedProjectId = prj.rows[0]!.id;

    const vnd = await db.query<{ id: string }>(
      "SELECT id FROM public.vendors WHERE code = 'VND-001'",
    );
    vendorId = vnd.rows[0]!.id;

    const exp = await db.query<{ id: string }>(
      "SELECT id FROM public.accounts WHERE code = '5-1101'",
    );
    expenseAccountId = exp.rows[0]!.id;

    const bank = await db.query<{ id: string }>(
      "SELECT id FROM public.accounts WHERE code = '1-1102'",
    );
    bankAccountId = bank.rows[0]!.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("menerbitkan PO internal berurutan, mengunci rincian setelah diterbitkan (BR-7), & mengisolasi RLS antar User", async () => {
    // User yang tidak ditugaskan ke proyek ditolak membuat PO pada proyek tersebut
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.userOtherId, async (tx) => {
        await tx.query(
          `INSERT INTO public.purchase_orders (po_number, po_date, vendor_id, project_id, subtotal, total_amount, created_by)
           VALUES ('POP/ALT/2026/11/999', DATE '2026-11-05', $1, $2, 1000000, 1000000, $3)`,
          [vendorId, assignedProjectId, TEST_ACTORS.userOtherId],
        );
      }),
    ).rejects.toThrow();

    // User anggota proyek menerbitkan PO dengan nomor otomatis POP/ALT/2026/11/001
    const poId = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) => {
        const numRes = await tx.query<{ num: string }>(
          "SELECT public.next_doc_number('POP', DATE '2026-11-05') AS num",
        );
        expect(numRes.rows[0]?.num).toBe("POP/ALT/2026/11/001");

        const ins = await tx.query<{ id: string }>(
          `INSERT INTO public.purchase_orders (po_number, po_date, vendor_id, project_id, subtotal, tax_amount, total_amount, status, created_by)
           VALUES ($1, DATE '2026-11-05', $2, $3, 4500000, 0, 4500000, 'draft', $4)
           RETURNING id`,
          [
            numRes.rows[0]!.num,
            vendorId,
            assignedProjectId,
            TEST_ACTORS.userAssignedId,
          ],
        );
        const createdId = ins.rows[0]!.id;

        await tx.query(
          `INSERT INTO public.po_items (po_id, line_no, description, quantity, unit, unit_price, line_total)
           VALUES ($1, 1, 'Sewa VPS Staging & Produksi 3 Bulan', 3, 'Bulan', 1500000, 4500000)`,
          [createdId],
        );

        await tx.query(
          `UPDATE public.purchase_orders SET status = 'issued' WHERE id = $1`,
          [createdId],
        );

        return createdId;
      },
    );

    // User lain tidak dapat membaca PO milik userAssignedId
    const otherUserView = await runAsAuthenticated(
      db,
      TEST_ACTORS.userOtherId,
      async (tx) => tx.query("SELECT id FROM public.purchase_orders"),
    );
    expect(otherUserView.rows).toHaveLength(0);

    // BR-7: PO yang sudah diterbitkan tidak boleh diubah nilai/vendornya dan tidak boleh dihapus
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.userAssignedId, async (tx) => {
        await tx.query(
          "UPDATE public.purchase_orders SET subtotal = 9000000, total_amount = 9000000 WHERE id = $1",
          [poId],
        );
      }),
    ).rejects.toThrow(/BR-7/);

    // RLS menolak penghapusan PO berstatus issued (0 baris terhapus), dan trigger level DB juga menolak (BR-7)
    const delAttempt = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) =>
        tx.query("DELETE FROM public.purchase_orders WHERE id = $1 RETURNING id", [
          poId,
        ]),
    );
    expect(delAttempt.rows).toHaveLength(0);

    await expect(
      db.query("DELETE FROM public.purchase_orders WHERE id = $1", [poId]),
    ).rejects.toThrow(/BR-7/);

    // Item PO juga terkunci setelah diterbitkan
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "UPDATE public.po_items SET unit_price = 2000000 WHERE po_id = $1",
          [poId],
        );
      }),
    ).rejects.toThrow(/BR-7/);
  });

  it("menegakkan wajib lampiran, alasan penolakan (BR-5), pemisahan tugas (BR-4), & jurnal otomatis Payment Approval", async () => {
    // 1. User membuat draf pengajuan pembayaran
    const reqId = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) => {
        const paNo = await tx.query<{ num: string }>(
          "SELECT public.next_doc_number('PA', DATE '2026-11-10') AS num",
        );
        const ins = await tx.query<{ id: string }>(
          `INSERT INTO public.payment_requests (
             request_number, requester_id, purpose, recipient_name, recipient_bank_info,
             amount, project_id, expense_account_id
           )
           VALUES ($1, $2, 'Pembayaran Cloud Server Staging', 'PT Awan Nusantara Cloud', 'Mandiri 1240098765432', 4500000, $3, $4)
           RETURNING id`,
          [
            paNo.rows[0]!.num,
            TEST_ACTORS.userAssignedId,
            assignedProjectId,
            expenseAccountId,
          ],
        );
        return ins.rows[0]!.id;
      },
    );

    // 2. Gagal diajukan sebelum ada lampiran bukti tagihan
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.userAssignedId, async (tx) => {
        await tx.query("SELECT public.submit_payment_request($1)", [reqId]);
      }),
    ).rejects.toThrow(/minimal 1 berkas/);

    // 3. Lampirkan bukti PDF (validasi batas ukuran <= 5MB di DB) lalu ajukan
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.userAssignedId, async (tx) => {
        await tx.query(
          `INSERT INTO public.attachments (entity_type, entity_id, file_name, mime_type, file_size_bytes, storage_path, uploaded_by)
           VALUES ('payment_request_proof', $1, 'terlalu-besar.pdf', 'application/pdf', 6000000, 'proofs/big.pdf', $2)`,
          [reqId, TEST_ACTORS.userAssignedId],
        );
      }),
    ).rejects.toThrow();

    await runAsAuthenticated(db, TEST_ACTORS.userAssignedId, async (tx) => {
      await tx.query(
        `INSERT INTO public.attachments (entity_type, entity_id, file_name, mime_type, file_size_bytes, storage_path, uploaded_by)
         VALUES ('payment_request_proof', $1, 'invoice-awan.pdf', 'application/pdf', 245000, 'proofs/invoice-awan.pdf', $2)`,
        [reqId, TEST_ACTORS.userAssignedId],
      );
      await tx.query("SELECT public.submit_payment_request($1)", [reqId]);
    });

    // 4. Super Admin TIDAK BOLEH memproses persetujuan pembayaran (FR-PA3 & Matriks Peran)
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
        await tx.query(
          "SELECT public.decide_payment_request($1, 'approve', NULL, DATE '2026-11-11')",
          [reqId],
        );
      }),
    ).rejects.toThrow(/hanya Admin/);

    // 5. BR-5: Admin menolak tanpa alasan -> ditolak oleh DB; menolak dengan alasan -> sah
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "SELECT public.decide_payment_request($1, 'reject', '  ', DATE '2026-11-11')",
          [reqId],
        );
      }),
    ).rejects.toThrow(/BR-5/);

    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query(
        "SELECT public.decide_payment_request($1, 'reject', 'Mohon cantumkan nomor rekening lengkap vendor', DATE '2026-11-11')",
        [reqId],
      );
    });

    // 6. User memperbaiki & mengajukan ulang -> revision_no naik menjadi 1
    const resubmitted = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) => {
        await tx.query(
          "UPDATE public.payment_requests SET recipient_bank_info = 'Bank Mandiri 1240098765432 a.n. PT Awan Nusantara Cloud' WHERE id = $1",
          [reqId],
        );
        const res = await tx.query<{ revision_no: number; status: string }>(
          "SELECT revision_no, status::text FROM public.submit_payment_request($1)",
          [reqId],
        );
        return res.rows[0]!;
      },
    );
    expect(resubmitted.revision_no).toBe(1);
    expect(resubmitted.status).toBe("submitted");

    // 7. Admin menyetujui -> otomatis memposting Jurnal Akrual Beban (D Beban / K Utang Usaha)
    const approved = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const res = await tx.query<{
          status: string;
          accrual_journal_id: string;
        }>(
          "SELECT status::text, accrual_journal_id FROM public.decide_payment_request($1, 'approve', NULL, DATE '2026-11-12')",
          [reqId],
        );
        return res.rows[0]!;
      },
    );
    expect(approved.status).toBe("approved");
    expect(approved.accrual_journal_id).toBeTruthy();

    // 8. Admin mencatat realisasi pembayaran -> otomatis memposting Jurnal Pelunasan (D Utang / K Bank)
    const paid = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const res = await tx.query<{ status: string; payment_journal_id: string }>(
          "SELECT status::text, payment_journal_id FROM public.record_payment_disbursement($1, DATE '2026-11-13', $2)",
          [reqId, bankAccountId],
        );
        return res.rows[0]!;
      },
    );
    expect(paid.status).toBe("paid");
    expect(paid.payment_journal_id).toBeTruthy();

    // 9. BR-4: Bahkan Admin pun TIDAK BISA menyetujui pengajuan yang dibuat oleh dirinya sendiri!
    const selfAdminReqId = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const paNo = await tx.query<{ num: string }>(
          "SELECT public.next_doc_number('PA', DATE '2026-11-14') AS num",
        );
        const ins = await tx.query<{ id: string }>(
          `INSERT INTO public.payment_requests (
             request_number, requester_id, purpose, recipient_name, amount, project_id, expense_account_id
           )
           VALUES ($1, $2, 'Pengajuan Sendiri Admin', 'Vendor Uji', 500000, $3, $4)
           RETURNING id`,
          [
            paNo.rows[0]!.num,
            TEST_ACTORS.adminId,
            assignedProjectId,
            expenseAccountId,
          ],
        );
        await tx.query(
          `INSERT INTO public.attachments (entity_type, entity_id, file_name, mime_type, file_size_bytes, storage_path, uploaded_by)
           VALUES ('payment_request_proof', $1, 'nota.pdf', 'application/pdf', 12000, 'proofs/nota.pdf', $2)`,
          [ins.rows[0]!.id, TEST_ACTORS.adminId],
        );
        await tx.query("SELECT public.submit_payment_request($1)", [
          ins.rows[0]!.id,
        ]);
        return ins.rows[0]!.id;
      },
    );

    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "SELECT public.decide_payment_request($1, 'approve', NULL, DATE '2026-11-14')",
          [selfAdminReqId],
        );
      }),
    ).rejects.toThrow(/BR-4/);
  });
});
