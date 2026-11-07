import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  createMigratedTestDb,
  runAsAnon,
  runAsAuthenticated,
  TEST_ACTORS,
} from "./setup-pglite";

describe("Fase 1 Database & RLS Integration Tests (PostgreSQL)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  it("menjalankan seed.sql berulang kali secara idempoten tanpa duplikasi", async () => {
    const seedSql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/seed.sql"),
      "utf8",
    );
    const before = await db.query<{ cnt: string }>(
      "SELECT count(*)::text AS cnt FROM public.accounts",
    );
    await db.exec(seedSql);
    const after = await db.query<{ cnt: string }>(
      "SELECT count(*)::text AS cnt FROM public.accounts",
    );
    expect(after.rows[0]?.cnt).toBe(before.rows[0]?.cnt);
  });

  it("menetapkan default belum PKP (pkp_enabled = false) dan memiliki akun Progress Billing SAK", async () => {
    const company = await db.query<{ pkp_enabled: boolean }>(
      "SELECT pkp_enabled FROM public.company_profile WHERE id = 1",
    );
    expect(company.rows[0]?.pkp_enabled).toBe(false);

    const pbAccounts = await db.query<{
      code: string;
      account_type: string;
      normal_balance: string;
      system_tag: string;
    }>(
      `SELECT code, account_type::text, normal_balance::text, system_tag::text
       FROM public.accounts
       WHERE system_tag IN ('work_in_progress', 'contract_billings', 'service_revenue', 'retained_earnings')
       ORDER BY code`,
    );

    expect(pbAccounts.rows).toEqual([
      {
        code: "1-1300",
        account_type: "asset",
        normal_balance: "debit",
        system_tag: "work_in_progress",
      },
      {
        code: "1-1310",
        account_type: "contra_asset",
        normal_balance: "credit",
        system_tag: "contract_billings",
      },
      {
        code: "3-1201",
        account_type: "equity",
        normal_balance: "credit",
        system_tag: "retained_earnings",
      },
      {
        code: "4-1101",
        account_type: "revenue",
        normal_balance: "credit",
        system_tag: "service_revenue",
      },
    ]);
  });

  it("menerbitkan nomor dokumen berurutan sesuai Lampiran A.0 & nomor PO Klien acak (BR-6, BR-18)", async () => {
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      const qt1 = await tx.query<{ num: string }>(
        "SELECT public.next_doc_number('QT', DATE '2026-11-07') AS num",
      );
      const qt2 = await tx.query<{ num: string }>(
        "SELECT public.next_doc_number('QT', DATE '2026-11-20') AS num",
      );
      const qtDec = await tx.query<{ num: string }>(
        "SELECT public.next_doc_number('QT', DATE '2026-12-01') AS num",
      );
      const inv1 = await tx.query<{ num: string }>(
        "SELECT public.next_doc_number('INV', DATE '2026-11-07') AS num",
      );

      expect(qt1.rows[0]?.num).toBe("QT/ALT/2026/11/001");
      expect(qt2.rows[0]?.num).toBe("QT/ALT/2026/11/002");
      expect(qtDec.rows[0]?.num).toBe("QT/ALT/2026/12/001");
      expect(inv1.rows[0]?.num).toBe("INV/ALT/2026/11/001");
    });

    const clientPo = await db.query<{ po: string }>(
      "SELECT public.generate_client_po_number(DATE '2026-11-07') AS po",
    );
    expect(clientPo.rows[0]?.po).toMatch(/^PO-202611-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("menolak penghapusan akun yang sudah dipakai di jurnal, namun mengizinkan penonaktifan (BR-19)", async () => {
    const tempAcc = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const res = await tx.query<{ id: string }>(
          `INSERT INTO public.accounts (code, name, account_type, normal_balance)
           VALUES ('5-9999', 'Beban Uji Sementara', 'expense', 'debit')
           RETURNING id`,
        );
        return res.rows[0]!.id;
      },
    );

    // Simulasikan akun telah direferensikan oleh jurnal
    await db.query(
      "UPDATE public.accounts SET used_in_journal_count = 1 WHERE id = $1",
      [tempAcc],
    );

    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query("DELETE FROM public.accounts WHERE id = $1", [tempAcc]);
      }),
    ).rejects.toThrow(/BR-19/);

    // Penonaktifan tetap diizinkan
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query(
        "UPDATE public.accounts SET is_active = false WHERE id = $1",
        [tempAcc],
      );
    });

    const check = await db.query<{ is_active: boolean }>(
      "SELECT is_active FROM public.accounts WHERE id = $1",
      [tempAcc],
    );
    expect(check.rows[0]?.is_active).toBe(false);
  });

  it("menetapkan metode pengakuan otomatis menurut jumlah termin & menguncinya setelah ada jurnal (BR-13)", async () => {
    const createdIds = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const p1 = await tx.query<{ id: string; revenue_method: string }>(
          `INSERT INTO public.projects (code, name, contract_value, term_count)
           VALUES ('PRJ-T1', 'Proyek 1 Termin', 25000000, 1)
           RETURNING id, revenue_method::text`,
        );
        const p2 = await tx.query<{ id: string; revenue_method: string }>(
          `INSERT INTO public.projects (code, name, contract_value, term_count)
           VALUES ('PRJ-T2', 'Proyek 2 Termin', 50000000, 2)
           RETURNING id, revenue_method::text`,
        );
        expect(p1.rows[0]?.revenue_method).toBe("single_term_deferral");
        expect(p2.rows[0]?.revenue_method).toBe("two_term_accrual");
        return p1.rows[0]!.id;
      },
    );

    // Tandai proyek sudah memiliki jurnal terposting
    await db.query(
      "UPDATE public.projects SET has_posted_journal = true WHERE id = $1",
      [createdIds],
    );

    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "UPDATE public.projects SET revenue_method = 'progress_billing' WHERE id = $1",
          [createdIds],
        );
      }),
    ).rejects.toThrow(/BR-13/);
  });

  it("menegakkan aturan penutupan & pembukaan kembali periode beserta jejak audit (BR-3)", async () => {
    const periodRes = await db.query<{ id: string }>(
      "SELECT id FROM public.periods WHERE year = 2026 AND month = 11",
    );
    const periodId = periodRes.rows[0]!.id;

    // Super Admin & User tidak boleh menutup periode
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
        await tx.query("SELECT public.close_accounting_period($1)", [periodId]);
      }),
    ).rejects.toThrow(/hanya Admin/);

    // Admin menutup periode
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query("SELECT public.close_accounting_period($1)", [periodId]);
    });

    // Pembukaan kembali tanpa alasan memadai ditolak
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query("SELECT public.reopen_accounting_period($1, '')", [
          periodId,
        ]);
      }),
    ).rejects.toThrow(/minimal 5 karakter/);

    // Pembukaan kembali dengan alasan sah tercatat di audit_logs
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query(
        "SELECT public.reopen_accounting_period($1, 'Koreksi akrual akhir bulan')",
        [periodId],
      );
    });

    const reopenLogs = await runAsAuthenticated(
      db,
      TEST_ACTORS.superAdminId,
      async (tx) => {
        return tx.query<{ action: string; entity_id: string }>(
          `SELECT action::text, entity_id
           FROM public.audit_logs
           WHERE action = 'REOPEN_PERIOD' AND entity_id = $1`,
          [periodId],
        );
      },
    );
    expect(reopenLogs.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("melindungi audit_logs agar tidak dapat diubah atau dihapus sama sekali (FR-LA2)", async () => {
    await expect(
      db.query("DELETE FROM public.audit_logs"),
    ).rejects.toThrow(/immutable/i);

    await expect(
      db.query("UPDATE public.audit_logs SET entity_name = 'manipulated'"),
    ).rejects.toThrow(/immutable/i);
  });

  it("menegakkan isolasi RLS ketat untuk anon, User, Admin, dan Super Admin (FR-A2, FR-PB6)", async () => {
    // 1. Pengunjung publik tanpa login (anon) ditolak total membaca tabel langsung
    await expect(
      runAsAnon(db, async (tx) => {
        await tx.query("SELECT * FROM public.projects");
      }),
    ).rejects.toThrow();

    await expect(
      runAsAnon(db, async (tx) => {
        await tx.query("SELECT * FROM public.accounts");
      }),
    ).rejects.toThrow();

    // 2. User yang ditugaskan hanya melihat 1 proyek miliknya; User lain melihat 0 proyek
    const assignedProjects = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) => tx.query("SELECT code FROM public.projects"),
    );
    expect(assignedProjects.rows.map((r) => (r as { code: string }).code)).toEqual([
      "PRJ/ALT/2026/001",
    ]);

    const unassignedProjects = await runAsAuthenticated(
      db,
      TEST_ACTORS.userOtherId,
      async (tx) => tx.query("SELECT code FROM public.projects"),
    );
    expect(unassignedProjects.rows).toHaveLength(0);

    // 3. User dan Admin tidak dapat membaca audit_logs (khusus Super Admin)
    const adminAuditAttempt = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => tx.query("SELECT id FROM public.audit_logs"),
    );
    expect(adminAuditAttempt.rows).toHaveLength(0);

    // 4. Super Admin dapat membaca COA, tetapi ditolak menambah/mengubah COA milik Admin
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
        await tx.query(
          `INSERT INTO public.accounts (code, name, account_type, normal_balance)
           VALUES ('1-9999', 'Akun Ilegal Super Admin', 'asset', 'debit')`,
        );
      }),
    ).rejects.toThrow();

    // 5. Pengguna yang dinonaktifkan otomatis kehilangan seluruh akses RLS
    await runAsAuthenticated(db, TEST_ACTORS.superAdminId, async (tx) => {
      await tx.query(
        "UPDATE public.profiles SET is_active = false WHERE id = $1",
        [TEST_ACTORS.userAssignedId],
      );
    });

    const afterDeactivated = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) => tx.query("SELECT code FROM public.projects"),
    );
    expect(afterDeactivated.rows).toHaveLength(0);
  });
});

