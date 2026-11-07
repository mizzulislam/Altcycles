import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  createMigratedTestDb,
  runAsAuthenticated,
  TEST_ACTORS,
} from "./setup-pglite";

describe("Fase 3 Mesin Akuntansi Akrual: Keseimbangan Jurnal, Immutability, Kunci Periode, & Budgeting", () => {
  let db: PGlite;
  let projectId: string;
  let cashAccId: string;
  let capitalAccId: string;
  let expenseCloudId: string;
  let novPeriodId: string;

  beforeAll(async () => {
    db = await createMigratedTestDb();
    projectId = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.projects WHERE code = 'PRJ/ALT/2026/001'",
      )
    ).rows[0]!.id;
    cashAccId = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.accounts WHERE code = '1-1102'",
      )
    ).rows[0]!.id;
    capitalAccId = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.accounts WHERE code = '3-1101'",
      )
    ).rows[0]!.id;
    expenseCloudId = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.accounts WHERE code = '5-1101'",
      )
    ).rows[0]!.id;
    novPeriodId = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.periods WHERE year = 2026 AND month = 11",
      )
    ).rows[0]!.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("menolak jurnal tidak seimbang di level PostgreSQL (BR-1)", async () => {
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          `SELECT public.create_and_post_journal(
             DATE '2026-11-02',
             'general',
             'Jurnal Tidak Seimbang',
             $1::jsonb
           )`,
          [
            JSON.stringify([
              { account_id: cashAccId, debit: 10000000, credit: 0 },
              { account_id: capitalAccId, debit: 0, credit: 9500000 },
            ]),
          ],
        );
      }),
    ).rejects.toThrow(/BR-1/);
  });

  it("menolak pengubahan/penghapusan jurnal terposting & menyediakan Jurnal Koreksi resmi (BR-2)", async () => {
    const postedJrnId = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const res = await tx.query<{ id: string }>(
          `SELECT public.create_and_post_journal(
             DATE '2026-11-03',
             'general',
             'Setoran Modal Awal',
             $1::jsonb
           ) AS id`,
          [
            JSON.stringify([
              { account_id: cashAccId, debit: 50000000, credit: 0 },
              { account_id: capitalAccId, debit: 0, credit: 50000000 },
            ]),
          ],
        );
        return res.rows[0]!.id;
      },
    );

    // Gagal UPDATE header jurnal terposting
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "UPDATE public.journals SET description = 'Diubah diam-diam' WHERE id = $1",
          [postedJrnId],
        );
      }),
    ).rejects.toThrow(/BR-2/);

    // Gagal DELETE jurnal terposting
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query("DELETE FROM public.journals WHERE id = $1", [
          postedJrnId,
        ]);
      }),
    ).rejects.toThrow(/BR-2/);

    // Gagal UPDATE/DELETE journal_lines pada jurnal terposting
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "UPDATE public.journal_lines SET debit = 999999 WHERE journal_id = $1 AND line_no = 1",
          [postedJrnId],
        );
      }),
    ).rejects.toThrow(/BR-2/);

    // Koreksi kesalahan yang sah melalui create_correction_journal berhasil & mereferensikan jurnal asal
    const correctionId = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const res = await tx.query<{ id: string }>(
          `SELECT public.create_correction_journal($1, DATE '2026-11-04', 'Koreksi salah nominal setoran awal') AS id`,
          [postedJrnId],
        );
        return res.rows[0]!.id;
      },
    );

    const corrRow = await db.query<{
      journal_type: string;
      reference_journal_id: string;
    }>(
      "SELECT journal_type::text, reference_journal_id FROM public.journals WHERE id = $1",
      [correctionId],
    );
    expect(corrRow.rows[0]?.journal_type).toBe("correction");
    expect(corrRow.rows[0]?.reference_journal_id).toBe(postedJrnId);
  });

  it("menghitung realisasi anggaran HANYA dari jurnal terposting (BR-8) & mengizinkan User melihat proyeknya sendiri", async () => {
    // Admin menyusun anggaran Rp10.000.000 pada akun Beban Cloud untuk proyek PRJ/ALT/2026/001
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      const bRes = await tx.query<{ id: string }>(
        `INSERT INTO public.budgets (project_id, version, alert_threshold_pct, status, created_by)
         VALUES ($1, 1, 80.00, 'active', $2)
         RETURNING id`,
        [projectId, TEST_ACTORS.adminId],
      );
      await tx.query(
        `INSERT INTO public.budget_lines (budget_id, account_id, allocated_amount)
         VALUES ($1, $2, 10000000)`,
        [bRes.rows[0]!.id, expenseCloudId],
      );
    });

    // User membuat Payment Request berstatus draft/submitted Rp8.500.000 (BELUM disetujui/diposting)
    const reqId = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) => {
        const ins = await tx.query<{ id: string }>(
          `INSERT INTO public.payment_requests (
             request_number, requester_id, purpose, recipient_name, amount, project_id, expense_account_id
           )
           VALUES ('PA/ALT/2026/11/801', $1, 'Server Produksi', 'PT Awan', 8500000, $2, $3)
           RETURNING id`,
          [TEST_ACTORS.userAssignedId, projectId, expenseCloudId],
        );
        await tx.query(
          `INSERT INTO public.attachments (entity_type, entity_id, file_name, mime_type, file_size_bytes, storage_path, uploaded_by)
           VALUES ('payment_request_proof', $1, 'inv.pdf', 'application/pdf', 50000, 'proofs/inv.pdf', $2)`,
          [ins.rows[0]!.id, TEST_ACTORS.userAssignedId],
        );
        await tx.query("SELECT public.submit_payment_request($1)", [
          ins.rows[0]!.id,
        ]);
        return ins.rows[0]!.id;
      },
    );

    // BR-8: Sebelum jurnal diposting, realized_amount wajib masih 0!
    const beforeApproval = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) => {
        return tx.query<{
          allocated_amount: string;
          realized_amount: string;
          is_over_threshold: boolean;
        }>("SELECT * FROM public.get_project_budget_vs_actual($1)", [projectId]);
      },
    );
    expect(Number(beforeApproval.rows[0]?.realized_amount)).toBe(0);
    expect(beforeApproval.rows[0]?.is_over_threshold).toBe(false);

    // Setelah disetujui Admin -> jurnal akrual terposting -> realized_amount menjadi 8.500.000 (85% >= 80% threshold!)
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query(
        "SELECT public.decide_payment_request($1, 'approve', NULL, DATE '2026-11-15')",
        [reqId],
      );
    });

    const afterApproval = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) => {
        return tx.query<{
          allocated_amount: string;
          realized_amount: string;
          remaining_amount: string;
          absorption_pct: string;
          is_over_threshold: boolean;
        }>("SELECT * FROM public.get_project_budget_vs_actual($1)", [projectId]);
      },
    );
    expect(Number(afterApproval.rows[0]?.realized_amount)).toBe(8500000);
    expect(Number(afterApproval.rows[0]?.remaining_amount)).toBe(1500000);
    expect(Number(afterApproval.rows[0]?.absorption_pct)).toBe(85);
    expect(afterApproval.rows[0]?.is_over_threshold).toBe(true);

    // User yang bukan anggota proyek ditolak memanggil fungsi anggaran proyek tersebut
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.userOtherId, async (tx) => {
        await tx.query(
          "SELECT * FROM public.get_project_budget_vs_actual($1)",
          [projectId],
        );
      }),
    ).rejects.toThrow(/bukan anggota proyek/);
  });

  it("menolak posting transaksi ke dalam periode akuntansi yang sudah ditutup (BR-3)", async () => {
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query("SELECT public.run_period_closing($1, DATE '2026-11-30')", [
        novPeriodId,
      ]);
    });

    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          `SELECT public.create_and_post_journal(
             DATE '2026-11-28',
             'general',
             'Transaksi Terlambat di Periode Tertutup',
             $1::jsonb
           )`,
          [
            JSON.stringify([
              { account_id: cashAccId, debit: 1000000, credit: 0 },
              { account_id: capitalAccId, debit: 0, credit: 1000000 },
            ]),
          ],
        );
      }),
    ).rejects.toThrow(/BR-3/);
  });
});

