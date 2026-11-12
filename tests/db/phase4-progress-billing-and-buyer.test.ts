import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  createMigratedTestDb,
  runAsAnon,
  runAsAuthenticated,
  runAsServiceRole,
  TEST_ACTORS,
} from "./setup-pglite";

describe("Fase 4 Uji Penerimaan Wajib Progress Billing (>= 3 Termin), Skenario 2 Termin, Bagi Hasil, & Keamanan Portal Pembeli", () => {
  let db: PGlite;
  let projectId: string;
  let customerId: string;
  let cashAccId: string;
  let dec2026PeriodId: string;

  beforeAll(async () => {
    db = await createMigratedTestDb();
    const prj = await db.query<{ id: string; customer_id: string }>(
      "SELECT id, customer_id FROM public.projects WHERE code = 'PRJ/ALT/2026/001'",
    );
    projectId = prj.rows[0]!.id;
    customerId = prj.rows[0]!.customer_id;

    cashAccId = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.accounts WHERE code = '1-1102'",
      )
    ).rows[0]!.id;

    dec2026PeriodId = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.periods WHERE year = 2026 AND month = 12",
      )
    ).rows[0]!.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("LULUS Uji Penerimaan Wajib PRD 7.1: Kontrak Rp120.000.000, 3 Termin (1 Nov 2026 - 31 Jan 2027) lengkap dengan Penutupan & Eliminasi 100%", async () => {
    // 0. Pembeli mengajukan PO lewat RPC server (simulasi Edge Function) -> Admin memverifikasi PO Klien
    const submittedPo = await runAsServiceRole(db, async (tx) => {
      const res = await tx.query<{ payload: { po_number: string } }>(
        `SELECT public.rpc_buyer_submit_po(
           'Hendra Wijaya',
           'PT Sinar Niaga Digital',
           'hendra@sinarniaga.co.id',
           '021-7894321',
           'QT/ALT/2026/11/001',
           120000000,
           '[{"item":"Pengembangan Portal Distribusi","qty":1,"price":120000000}]'::jsonb,
           'ip_hash_client_1'
         ) AS payload`,
      );
      return res.rows[0]!.payload;
    });
    expect(submittedPo.po_number).toMatch(/^PO-\d{6}-[A-HJ-NP-Z2-9]{6}$/);

    const cpoRow = await db.query<{ id: string }>(
      "SELECT id FROM public.client_purchase_orders WHERE po_number = $1",
      [submittedPo.po_number],
    );
    const clientPoId = cpoRow.rows[0]!.id;

    // BR-23: Sebelum PO diverifikasi Admin, penerbitan Invoice wajib ditolak!
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        const invDraft = await tx.query<{ id: string }>(
          `INSERT INTO public.sales_invoices (
             invoice_number, invoice_date, due_date, project_id, customer_id, client_po_id,
             invoice_kind, subtotal_amount, ppn_amount, total_amount
           )
           VALUES ('INV-PREMATURE', DATE '2026-11-01', DATE '2026-11-08', $1, $2, $3, 'down_payment', 30000000, 0, 30000000)
           RETURNING id`,
          [projectId, customerId, clientPoId],
        );
        await tx.query("SELECT public.issue_sales_invoice($1, $2)", [
          invDraft.rows[0]!.id,
          cashAccId,
        ]);
      }),
    ).rejects.toThrow(/BR-23/);

    // Admin memverifikasi PO Klien & menyusun 3 Termin (total wajib tepat 100% -> BR-17)
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query("SELECT * FROM public.save_project_milestones($1, $2::jsonb)", [
          projectId,
          JSON.stringify([
            { name: "Termin 1 (DP)", percentage: 25, amount: 30000000 },
            { name: "Termin 2", percentage: 37.5, amount: 45000000 },
            // Kurang dari 100%!
          ]),
        ]);
      }),
    ).rejects.toThrow(/BR-17/);

    const milestones = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        await tx.query("SELECT public.verify_client_po($1, $2, true, NULL)", [
          clientPoId,
          projectId,
        ]);
        const ms = await tx.query<{ id: string; sequence_no: number }>(
          "SELECT id, sequence_no FROM public.save_project_milestones($1, $2::jsonb)",
          [
            projectId,
            JSON.stringify([
              {
                name: "Termin 1 (DP 25%)",
                is_down_payment: true,
                percentage: 25.0,
                amount: 30000000,
              },
              {
                name: "Termin 2 (Progres 37,5%)",
                percentage: 37.5,
                amount: 45000000,
              },
              {
                name: "Termin 3 (Pelunasan 37,5%)",
                is_final_settlement: true,
                percentage: 37.5,
                amount: 45000000,
              },
            ]),
          ],
        );
        return ms.rows;
      },
    );
    const [m1, m2, m3] = milestones;

    // =========================================================================
    // BARIS 1 (01/11/2026): Termin 1 (DP) dibayar -> D Kas 30.000.000; K Penagihan atas Kontrak 30.000.000
    // =========================================================================
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      const inv1 = await tx.query<{ id: string }>(
        `INSERT INTO public.sales_invoices (
           invoice_number, invoice_date, due_date, project_id, customer_id, milestone_id, client_po_id,
           invoice_kind, subtotal_amount, ppn_amount, total_amount
         )
         VALUES ('INV/ALT/2026/11/001', DATE '2026-11-01', DATE '2026-11-08', $1, $2, $3, $4, 'down_payment', 30000000, 0, 30000000)
         RETURNING id`,
        [projectId, customerId, m1!.id, clientPoId],
      );
      await tx.query("SELECT public.issue_sales_invoice($1, $2)", [
        inv1.rows[0]!.id,
        cashAccId,
      ]);
    });

    // =========================================================================
    // BARIS 2 (01/12/2026): Termin 2 ditagih lebih dulu sebelum kas masuk (uji alur Piutang -> Kas + Kuitansi)
    //   a) Saat Invoice terbit (setelah BAKP disetujui klien, BR-14): D Piutang 45jt / K Penagihan atas Kontrak 45jt
    //   b) Saat dibayar pada 01/12/2026: D Kas 45jt / K Piutang 45jt -> Efek neto identik D Kas 45jt / K Penagihan 45jt!
    // =========================================================================
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      const bakp2 = await tx.query<{ id: string }>(
        `INSERT INTO public.progress_reports (
           bakp_number, bakp_date, project_id, milestone_id, cumulative_percentage, billable_amount, status, approved_at
         )
         VALUES ('BAKP/ALT/2026/12/001', DATE '2026-12-01', $1, $2, 62.50, 45000000, 'approved_by_client', now())
         RETURNING id`,
        [projectId, m2!.id],
      );

      const inv2 = await tx.query<{ id: string }>(
        `INSERT INTO public.sales_invoices (
           invoice_number, invoice_date, due_date, project_id, customer_id, milestone_id, client_po_id, bakp_id,
           invoice_kind, subtotal_amount, ppn_amount, total_amount
         )
         VALUES ('INV/ALT/2026/12/001', DATE '2026-12-01', DATE '2026-12-08', $1, $2, $3, $4, $5, 'milestone', 45000000, 0, 45000000)
         RETURNING id`,
        [projectId, customerId, m2!.id, clientPoId, bakp2.rows[0]!.id],
      );

      // Terbitkan sebagai Piutang terlebih dahulu
      await tx.query("SELECT public.issue_sales_invoice($1, NULL)", [
        inv2.rows[0]!.id,
      ]);

      // Catat dana masuk -> otomatis menerbitkan Kuitansi (FR-FJ6)
      const kw2 = await tx.query<{ receipt_number: string; amount: string }>(
        "SELECT receipt_number, amount::text FROM public.record_invoice_payment($1, DATE '2026-12-01', 45000000, $2)",
        [inv2.rows[0]!.id, cashAccId],
      );
      expect(kw2.rows[0]?.receipt_number).toBe("KW/ALT/2026/12/001");
      expect(Number(kw2.rows[0]?.amount)).toBe(45000000);
    });

    // =========================================================================
    // BARIS 3 (31/12/2026): Progres 66,67% (2 dari 3 bulan = Rp80.000.000)
    //   -> D Jasa dalam Proses 80.000.000; K Pendapatan Jasa 80.000.000
    // =========================================================================
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      const prog = await tx.query<{
        period_recognized_revenue: string;
        cumulative_recognized_revenue: string;
      }>(
        `SELECT period_recognized_revenue::text, cumulative_recognized_revenue::text
         FROM public.record_period_project_progress($1, DATE '2026-12-31', 66.67, 80000000)`,
        [projectId],
      );
      expect(Number(prog.rows[0]?.period_recognized_revenue)).toBe(80000000);
      expect(Number(prog.rows[0]?.cumulative_recognized_revenue)).toBe(80000000);
    });

    // Periksa posisi Neraca per 31/12/2026 sebelum penutupan:
    // Jasa dalam Proses = 80.000.000 (D), Penagihan atas Kontrak = 75.000.000 (K)
    // Selisih = +5.000.000 -> Aset Kontrak sebesar Rp5.000.000!
    const decBalances = await db.query<{ code: string; net: string }>(
      `SELECT a.code, SUM(jl.debit - jl.credit)::text AS net
       FROM public.journal_lines jl
       JOIN public.journals j ON j.id = jl.journal_id
       JOIN public.accounts a ON a.id = jl.account_id
       WHERE j.status = 'posted' AND a.code IN ('1-1102', '1-1300', '1-1310', '4-1101')
       GROUP BY a.code
       ORDER BY a.code`,
    );
    expect(decBalances.rows).toEqual([
      { code: "1-1102", net: "75000000" }, // Kas/Bank = 75jt
      { code: "1-1300", net: "80000000" }, // Jasa dalam Proses = 80jt (Debit)
      { code: "1-1310", net: "-75000000" }, // Penagihan atas Kontrak = 75jt (Kredit) -> Selisih +5jt Aset Kontrak!
      { code: "4-1101", net: "-80000000" }, // Pendapatan Jasa = 80jt (Kredit)
    ]);

    // =========================================================================
    // BARIS 4 (31/12/2026): Jurnal Penutup -> D Pendapatan Jasa 80.000.000; K Laba Ditahan 80.000.000
    // =========================================================================
    const closingJrnId = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const res = await tx.query<{ id: string }>(
          "SELECT public.run_period_closing($1, DATE '2026-12-31') AS id",
          [dec2026PeriodId],
        );
        return res.rows[0]!.id;
      },
    );

    const closingLines = await db.query<{
      code: string;
      debit: string;
      credit: string;
    }>(
      `SELECT a.code, jl.debit::text, jl.credit::text
       FROM public.journal_lines jl
       JOIN public.accounts a ON a.id = jl.account_id
       WHERE jl.journal_id = $1
       ORDER BY a.code`,
      [closingJrnId],
    );
    expect(closingLines.rows).toEqual([
      { code: "3-1201", debit: "0", credit: "80000000" }, // K Laba Ditahan 80.000.000
      { code: "4-1101", debit: "80000000", credit: "0" }, // D Pendapatan Jasa 80.000.000
    ]);

    // =========================================================================
    // BARIS 5 (01/01/2027): Jurnal Pembalik -> TIDAK ADA (0 jurnal pembalik dibuat!)
    // =========================================================================
    const reversedCount = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const res = await tx.query<{ cnt: number }>(
          "SELECT public.generate_optional_reversing_entries($1, DATE '2027-01-01') AS cnt",
          [dec2026PeriodId],
        );
        return res.rows[0]!.cnt;
      },
    );
    expect(reversedCount).toBe(0);

    // BR-21: Uji proteksi persentase penyelesaian tidak boleh turun di bawah 66.67%
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "SELECT public.record_period_project_progress($1, DATE '2027-01-15', 50.00)",
          [projectId],
        );
      }),
    ).rejects.toThrow(/BR-21/);

    // FR-PK8 & BR-15: Uji UAT wajib lulus sebelum BAST, dan BAST wajib bertanda tangan sebelum Invoice Pelunasan
    const bastId = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const uatPending = await tx.query<{ id: string }>(
          `INSERT INTO public.uat_checklists (
             uat_number, test_date, project_id, client_tester_name, altvira_companion_name, conclusion
           )
           VALUES ('UAT/ALT/2027/01/001', DATE '2027-01-29', $1, 'Hendra Wijaya', 'Muhammad Izzul Islam', 'pending')
           RETURNING id`,
          [projectId],
        );

        await expect(
          tx.query("SAVEPOINT sp_bast_fail").then(async () => {
            try {
              await tx.query(
                `INSERT INTO public.handover_reports (bast_number, bast_date, project_id, uat_id, status)
                 VALUES ('BAST/ALT/2027/01/001', DATE '2027-01-30', $1, $2, 'signed')`,
                [projectId, uatPending.rows[0]!.id],
              );
            } catch (err) {
              await tx.query("ROLLBACK TO SAVEPOINT sp_bast_fail");
              throw err;
            }
          }),
        ).rejects.toThrow(/FR-PK8/);

        await tx.query(
          "UPDATE public.uat_checklists SET conclusion = 'accepted' WHERE id = $1",
          [uatPending.rows[0]!.id],
        );

        const bast = await tx.query<{ id: string }>(
          `INSERT INTO public.handover_reports (bast_number, bast_date, project_id, uat_id, status, signed_at)
           VALUES ('BAST/ALT/2027/01/001', DATE '2027-01-30', $1, $2, 'signed', now())
           RETURNING id`,
          [projectId, uatPending.rows[0]!.id],
        );
        return bast.rows[0]!.id;
      },
    );

    // =========================================================================
    // BARIS 6 (31/01/2027): Termin 3 dibayar -> D Kas 45.000.000; K Penagihan atas Kontrak 45.000.000
    // =========================================================================
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      const inv3 = await tx.query<{ id: string }>(
        `INSERT INTO public.sales_invoices (
           invoice_number, invoice_date, due_date, project_id, customer_id, milestone_id, client_po_id, bast_id,
           invoice_kind, subtotal_amount, ppn_amount, total_amount
         )
         VALUES ('INV/ALT/2027/01/001', DATE '2027-01-31', DATE '2027-02-07', $1, $2, $3, $4, $5, 'final_settlement', 45000000, 0, 45000000)
         RETURNING id`,
        [projectId, customerId, m3!.id, clientPoId, bastId],
      );
      await tx.query("SELECT public.issue_sales_invoice($1, $2)", [
        inv3.rows[0]!.id,
        cashAccId,
      ]);
    });

    // =========================================================================
    // BARIS 7 & BARIS 8 (31/01/2027):
    //   - Sisa pendapatan 100%: D Jasa dalam Proses 40.000.000; K Pendapatan Jasa 40.000.000
    //   - Eliminasi proyek selesai otomatis: D Penagihan atas Kontrak 120.000.000; K Jasa dalam Proses 120.000.000
    // =========================================================================
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      const progFinal = await tx.query<{ period_recognized_revenue: string }>(
        "SELECT period_recognized_revenue::text FROM public.record_period_project_progress($1, DATE '2027-01-31', 100.00)",
        [projectId],
      );
      expect(Number(progFinal.rows[0]?.period_recognized_revenue)).toBe(40000000);
    });

    // Verifikasi saldo akhir setelah eliminasi otomatis:
    // - Kas/Bank = Rp120.000.000
    // - Jasa dalam Proses (1-1300) = Rp0
    // - Penagihan atas Kontrak (1-1310) = Rp0
    // - Laba Ditahan 2026 = Rp80.000.000, Pendapatan Jasa 2027 = Rp40.000.000
    const finalBalances = await db.query<{ code: string; net: string }>(
      `SELECT a.code, SUM(jl.debit - jl.credit)::text AS net
       FROM public.journal_lines jl
       JOIN public.journals j ON j.id = jl.journal_id
       JOIN public.accounts a ON a.id = jl.account_id
       WHERE j.status = 'posted' AND a.code IN ('1-1102', '1-1300', '1-1310', '3-1201', '4-1101')
       GROUP BY a.code
       ORDER BY a.code`,
    );
    expect(finalBalances.rows).toEqual([
      { code: "1-1102", net: "120000000" }, // Kas = 120.000.000
      { code: "1-1300", net: "0" }, // Jasa dalam Proses tereliminasi habis = 0!
      { code: "1-1310", net: "0" }, // Penagihan atas Kontrak tereliminasi habis = 0!
      { code: "3-1201", net: "-80000000" }, // Laba Ditahan (dari penutupan 2026) = 80.000.000
      { code: "4-1101", net: "-40000000" }, // Pendapatan Jasa berjalan Jan 2027 = 40.000.000
    ]);

    const elimJrn = await db.query<{ journal_type: string }>(
      "SELECT journal_type::text FROM public.journals WHERE project_id = $1 AND journal_type = 'elimination'",
      [projectId],
    );
    expect(elimJrn.rows).toHaveLength(1);
  });

  it("menegakkan Bagi Hasil tepat 100% (BR-10), alokasi biaya bersama proporsional (BR-20), & kunci pasca-finalisasi (BR-9)", async () => {
    const sharedExpenseAcc = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.accounts WHERE code = '6-1101'",
      )
    ).rows[0]!.id;
    const directExpenseAcc = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.accounts WHERE code = '5-1201'",
      )
    ).rows[0]!.id;

    // Catat beban langsung Rp20.000.000 & beban bersama Rp6.000.000 di Jan 2027
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query(
        `SELECT public.create_and_post_journal(
           DATE '2027-01-10', 'general', 'Biaya Subkontraktor & Alat Bersama', $1::jsonb
         )`,
        [
          JSON.stringify([
            {
              account_id: directExpenseAcc,
              project_id: projectId,
              debit: 20000000,
              credit: 0,
            },
            { account_id: sharedExpenseAcc, debit: 6000000, credit: 0 },
            { account_id: cashAccId, debit: 0, credit: 26000000 },
          ]),
        ],
      );
    });

    // BR-10: Skema < 100% ditolak
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "SELECT * FROM public.save_profit_sharing_scheme($1, $2::jsonb)",
          [
            projectId,
            JSON.stringify([
              { recipient_name: "Kas Perusahaan Altvira", percentage: 60 },
              {
                recipient_name: "User Anggota Proyek",
                recipient_user_id: TEST_ACTORS.userAssignedId,
                percentage: 30,
              },
            ]),
          ],
        );
      }),
    ).rejects.toThrow(/BR-10/);

    // Simpan skema 60% / 40% = 100%, simulasi, lalu finalisasi
    const finalized = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        await tx.query(
          "SELECT * FROM public.save_profit_sharing_scheme($1, $2::jsonb)",
          [
            projectId,
            JSON.stringify([
              { recipient_name: "Kas Perusahaan Altvira", percentage: 60 },
              {
                recipient_name: "User Anggota Proyek",
                recipient_user_id: TEST_ACTORS.userAssignedId,
                percentage: 40,
              },
            ]),
          ],
        );
        const res = await tx.query<{
          recognized_revenue: string;
          direct_cost: string;
          allocated_shared_cost: string;
          gross_profit: string;
          status: string;
        }>(
          "SELECT recognized_revenue::text, direct_cost::text, allocated_shared_cost::text, gross_profit::text, status::text FROM public.calculate_project_profit_sharing($1, true, DATE '2027-01-31')",
          [projectId],
        );
        return res.rows[0]!;
      },
    );

    // Pendapatan diakui total 120jt - Biaya langsung 20jt - Alokasi biaya bersama 6jt = Laba Kotor 94jt
    expect(Number(finalized.recognized_revenue)).toBe(120000000);
    expect(Number(finalized.direct_cost)).toBe(20000000);
    expect(Number(finalized.allocated_shared_cost)).toBe(6000000);
    expect(Number(finalized.gross_profit)).toBe(94000000);
    expect(finalized.status).toBe("finalized");

    // FR-BH5: User anggota proyek hanya dapat membaca porsi miliknya sendiri (40% x 94jt = Rp37.600.000)
    const userShare = await runAsAuthenticated(
      db,
      TEST_ACTORS.userAssignedId,
      async (tx) =>
        tx.query<{ share_amount: string }>(
          "SELECT share_amount::text FROM public.profit_sharing_lines",
        ),
    );
    expect(userShare.rows).toEqual([{ share_amount: "37600000" }]);

    // BR-9: Setelah difinalisasi, perhitungan ulang atau perubahan skema terkunci
    await expect(
      runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
        await tx.query(
          "SELECT * FROM public.calculate_project_profit_sharing($1, false, DATE '2027-01-31')",
          [projectId],
        );
      }),
    ).rejects.toThrow(/BR-9/);
  });

  it("menjamin keamanan Portal Pembeli tanpa login: anon ditolak tabel & RPC langsung, lookup hanya 1 PO tanpa bocor margin, & anti brute-force (FR-PB6..9)", async () => {
    const cpoRes = await db.query<{ po_number: string }>(
      "SELECT po_number FROM public.client_purchase_orders LIMIT 1",
    );
    const validPoNumber = cpoRes.rows[0]!.po_number;

    // Buat PO klien kedua untuk proyek lain guna memastikan isolasi antar-PO
    const secondPo = await runAsServiceRole(db, async (tx) => {
      const res = await tx.query<{ payload: { po_number: string } }>(
        `SELECT public.rpc_buyer_submit_po(
           'Dewi Kartika', 'Koperasi Mitra Sejahtera', 'dewi@mitra.org', '031-555', NULL, 25000000, '[]'::jsonb, 'ip_hash_client_2'
         ) AS payload`,
      );
      return res.rows[0]!.payload.po_number;
    });

    // 1. Peran anon TIDAK BISA membaca tabel client_purchase_orders, sales_invoices, journals, maupun memanggil RPC tanpa lewat Edge Function!
    await expect(
      runAsAnon(db, async (tx) => {
        await tx.query("SELECT * FROM public.client_purchase_orders");
      }),
    ).rejects.toThrow();

    await expect(
      runAsAnon(db, async (tx) => {
        await tx.query("SELECT public.rpc_buyer_lookup_po($1, 'anon_direct')", [
          validPoNumber,
        ]);
      }),
    ).rejects.toThrow();

    // 2. Melalui service_role (Edge Function), lookup validPoNumber HANYA mengembalikan 1 PO tersebut tanpa kolom biaya/margin/jurnal
    const lookupRes = await runAsServiceRole(db, async (tx) => {
      const res = await tx.query<{
        result: {
          ok: boolean;
          data: {
            po_number: string;
            project: { cumulative_progress_pct: number };
            milestones: unknown[];
            documents: Array<{ doc_number: string }>;
          };
        };
      }>("SELECT public.rpc_buyer_lookup_po($1, 'ip_lookup_ok') AS result", [
        validPoNumber,
      ]);
      return res.rows[0]!.result;
    });

    expect(lookupRes.ok).toBe(true);
    expect(lookupRes.data.po_number).toBe(validPoNumber);
    expect(Number(lookupRes.data.project.cumulative_progress_pct)).toBe(100);
    expect(lookupRes.data.milestones).toHaveLength(3);
    const serialized = JSON.stringify(lookupRes);
    expect(serialized).not.toContain(secondPo);
    expect(serialized).not.toContain("gross_profit");
    expect(serialized).not.toContain("direct_cost");
    expect(serialized).not.toContain("JRN/ALT");

    // 3. FR-PB7 & FR-PB9: 10 percobaan gagal dari IP yang sama TERSIMPAN permanen di po_access_logs & percobaan ke-11 langsung diblokir!
    for (let i = 1; i <= 10; i++) {
      const failRes = await runAsServiceRole(db, async (tx) => {
        const r = await tx.query<{
          result: { ok: boolean; code: string; error: string };
        }>("SELECT public.rpc_buyer_lookup_po($1, 'ip_bruteforce') AS result", [
          `PO-202611-XXXX${String(i).padStart(2, "0")}`,
        ]);
        return r.rows[0]!.result;
      });
      expect(failRes.ok).toBe(false);
      expect(failRes.code).toBe("NOT_FOUND");
    }

    const loggedFails = await db.query<{ cnt: string }>(
      "SELECT count(*)::text AS cnt FROM public.po_access_logs WHERE ip_hash = 'ip_bruteforce' AND was_found = false",
    );
    expect(Number(loggedFails.rows[0]?.cnt)).toBe(10);

    // Percobaan ke-11 meskipun memakai nomor PO yang VALID tetap ditolak karena rate-limit IP aktif!
    const blockedRes = await runAsServiceRole(db, async (tx) => {
      const r = await tx.query<{
        result: { ok: boolean; code: string; error: string };
      }>("SELECT public.rpc_buyer_lookup_po($1, 'ip_bruteforce') AS result", [
        validPoNumber,
      ]);
      return r.rows[0]!.result;
    });
    expect(blockedRes.ok).toBe(false);
    expect(blockedRes.code).toBe("RATE_LIMITED");
    expect(blockedRes.error).toMatch(/Terlalu banyak percobaan/);
  });

  it("mendukung Skenario Proyek 2 Termin Lintas Tahun beserta Jurnal Pembalik Opsional yang dikontrol Admin (FR-AK12)", async () => {
    // Buka kembali Desember 2026 sementara atau gunakan proyek 2 termin di Januari-Februari 2027
    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query(
        `INSERT INTO public.periods (year, month, name, start_date, end_date, status)
         VALUES (2027, 2, 'Februari 2027', DATE '2027-02-01', DATE '2027-02-28', 'open')`,
      );
    });

    const jan2027Id = (
      await db.query<{ id: string }>(
        "SELECT id FROM public.periods WHERE year = 2027 AND month = 1",
      )
    ).rows[0]!.id;

    const twoTermProjId = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const prj = await tx.query<{ id: string; revenue_method: string }>(
          `INSERT INTO public.projects (code, name, project_category, customer_id, status, start_date, target_end_date, contract_value, term_count)
           VALUES ('PRJ/ALT/2027/002', 'Proyek 2 Termin Website Korporat', 'client', $1, 'active', DATE '2027-01-05', DATE '2027-02-20', 40000000, 2)
           RETURNING id, revenue_method::text`,
          [customerId],
        );
        expect(prj.rows[0]?.revenue_method).toBe("two_term_accrual");

        // Progres 60% akhir Januari 2027 (Rp24.000.000) tanpa DP -> melahirkan Piutang Belum Ditagih dengan opsi auto_reverse = true
        await tx.query(
          "SELECT public.record_period_project_progress($1, DATE '2027-01-31', 60.00, NULL, true)",
          [prj.rows[0]!.id],
        );
        return prj.rows[0]!.id;
      },
    );

    const revCount = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const r = await tx.query<{ cnt: number }>(
          "SELECT public.generate_optional_reversing_entries($1, DATE '2027-02-01') AS cnt",
          [jan2027Id],
        );
        return r.rows[0]!.cnt;
      },
    );
    expect(revCount).toBe(1);

    const revJrn = await db.query<{ journal_type: string }>(
      "SELECT journal_type::text FROM public.journals WHERE project_id = $1 AND journal_type = 'reversing'",
      [twoTermProjId],
    );
    expect(revJrn.rows).toHaveLength(1);
  });

  it("Faktur PKP memisahkan kredit Utang PPN Keluaran (2-1501) dan verify_client_po menjaga transisi status serta audit reject", async () => {
    // Aktifkan mode PKP dan akun 2-1501 untuk skenario PKP
    await db.query(
      "UPDATE public.company_profile SET pkp_enabled = true WHERE id = 1",
    );
    await db.query(
      "UPDATE public.accounts SET is_active = true WHERE code = '2-1501'",
    );

    const custRes = await db.query<{ id: string }>(
      "SELECT id FROM public.customers LIMIT 1",
    );
    const custId = custRes.rows[0]!.id;

    // Uji verify_client_po: reject menulis audit_logs, dan PO verified tidak dapat ditimpa ulang
    const cpoIds = await runAsServiceRole(db, async (tx) => {
      const po1 = await tx.query<{ po_number: string }>(
        `SELECT (public.rpc_buyer_submit_po('Klien A', 'PT A', 'a@a.com', '', '', 5000000, '[]'::jsonb, 'ip-1'))->>'po_number' AS po_number`,
      );
      const po2 = await tx.query<{ po_number: string }>(
        `SELECT (public.rpc_buyer_submit_po('Klien B', 'PT B', 'b@b.com', '', '', 10000000, '[]'::jsonb, 'ip-2'))->>'po_number' AS po_number`,
      );
      const r1 = await tx.query<{ id: string }>(
        "SELECT id FROM public.client_purchase_orders WHERE po_number = $1",
        [po1.rows[0]!.po_number],
      );
      const r2 = await tx.query<{ id: string }>(
        "SELECT id FROM public.client_purchase_orders WHERE po_number = $1",
        [po2.rows[0]!.po_number],
      );
      return { rejectId: r1.rows[0]!.id, verifyId: r2.rows[0]!.id };
    });

    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await tx.query(
        "SELECT public.verify_client_po($1, NULL, false, 'Lampiran belum lengkap')",
        [cpoIds.rejectId],
      );
    });

    const rejectAudit = await db.query<{ status: string | null }>(
      `SELECT new_data->>'status' AS status
       FROM public.audit_logs
       WHERE entity_name = 'client_purchase_orders' AND entity_id = $1
       ORDER BY id DESC LIMIT 1`,
      [cpoIds.rejectId],
    );
    expect(rejectAudit.rows[0]?.status).toBe("rejected");

    const invJournalId = await runAsAuthenticated(
      db,
      TEST_ACTORS.adminId,
      async (tx) => {
        const prj = await tx.query<{ id: string }>(
          `INSERT INTO public.projects (code, name, project_category, customer_id, status, start_date, target_end_date, contract_value, term_count)
           VALUES ('PRJ/ALT/2026/PKP', 'Proyek Uji PKP', 'client', $1, 'active', DATE '2026-11-01', DATE '2026-12-31', 10000000, 1)
           RETURNING id`,
          [custId],
        );

        await tx.query(
          "SELECT public.verify_client_po($1, $2, true, NULL)",
          [cpoIds.verifyId, prj.rows[0]!.id],
        );

        const inv = await tx.query<{ id: string }>(
          `INSERT INTO public.sales_invoices (
             invoice_number, invoice_date, due_date, project_id, customer_id, client_po_id,
             invoice_kind, subtotal_amount, ppn_amount, total_amount
           )
           VALUES ('INV/ALT/2026/11/PKP', DATE '2026-11-10', DATE '2026-11-24', $1, $2, $3, 'down_payment', 10000000, 1100000, 11100000)
           RETURNING id`,
          [prj.rows[0]!.id, custId, cpoIds.verifyId],
        );

        const issued = await tx.query<{ journal_id: string }>(
          "SELECT journal_id FROM public.issue_sales_invoice($1, NULL)",
          [inv.rows[0]!.id],
        );
        return issued.rows[0]!.journal_id;
      },
    );

    await runAsAuthenticated(db, TEST_ACTORS.adminId, async (tx) => {
      await expect(
        tx.query(
          "SELECT public.verify_client_po($1, NULL, false, 'Coba timpa ulang')",
          [cpoIds.verifyId],
        ),
      ).rejects.toThrow(/sudah diproses dengan status verified/i);
    });

    const lines = await db.query<{ code: string; debit: string; credit: string }>(
      `SELECT a.code, jl.debit::text, jl.credit::text
       FROM public.journal_lines jl
       JOIN public.accounts a ON a.id = jl.account_id
       WHERE jl.journal_id = $1
       ORDER BY a.code`,
      [invJournalId],
    );
    expect(lines.rows).toEqual([
      { code: "1-1201", debit: "11100000", credit: "0" },
      { code: "2-1401", debit: "0", credit: "10000000" },
      { code: "2-1501", debit: "0", credit: "1100000" },
    ]);
  });
});
