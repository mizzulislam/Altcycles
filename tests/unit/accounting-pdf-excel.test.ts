import { describe, expect, it } from "vitest";
import {
  buildBalanceSheet,
  buildIncomeStatement,
  buildTrialBalance,
} from "@/lib/accounting-engine";
import { DEMO_ACCOUNTS, DEMO_COMPANY, DEMO_PROJECTS } from "@/lib/demo-seed";
import { createExcelBlob } from "@/lib/excel-exporter";
import { buildInvoicePdfSpec, generateDocumentPdf } from "@/lib/pdf-generator";
import type { JournalLineRow, JournalRow } from "@/types/database.types";

describe("Mesin Laporan Keuangan, Generator PDF Lampiran A, & Ekspor Excel (.xlsx)", () => {
  it("menyajikan Aset Kontrak (31/12/2026 = Rp5.000.000) & Neraca Seimbang pada skenario Progress Billing", () => {
    const journals: JournalRow[] = [
      {
        id: "j1",
        journal_number: "JRN/ALT/2026/11/001",
        journal_date: "2026-11-01",
        period_id: "per-2026-11",
        journal_type: "auto_invoice",
        source_type: null,
        source_id: null,
        project_id: "prj-001",
        description: "Termin 1 DP",
        status: "posted",
        reference_journal_id: null,
        auto_reverse_next_period: false,
        is_reversed: false,
        posted_at: "2026-11-01T10:00:00Z",
        posted_by: null,
        created_by: null,
        created_at: "2026-11-01T10:00:00Z",
        updated_at: "2026-11-01T10:00:00Z",
      },
      {
        id: "j2",
        journal_number: "JRN/ALT/2026/12/001",
        journal_date: "2026-12-01",
        period_id: "per-2026-12",
        journal_type: "auto_invoice",
        source_type: null,
        source_id: null,
        project_id: "prj-001",
        description: "Termin 2",
        status: "posted",
        reference_journal_id: null,
        auto_reverse_next_period: false,
        is_reversed: false,
        posted_at: "2026-12-01T10:00:00Z",
        posted_by: null,
        created_by: null,
        created_at: "2026-12-01T10:00:00Z",
        updated_at: "2026-12-01T10:00:00Z",
      },
      {
        id: "j3",
        journal_number: "JRN/ALT/2026/12/002",
        journal_date: "2026-12-31",
        period_id: "per-2026-12",
        journal_type: "progress_billing",
        source_type: null,
        source_id: null,
        project_id: "prj-001",
        description: "Progres 66,67%",
        status: "posted",
        reference_journal_id: null,
        auto_reverse_next_period: false,
        is_reversed: false,
        posted_at: "2026-12-31T10:00:00Z",
        posted_by: null,
        created_by: null,
        created_at: "2026-12-31T10:00:00Z",
        updated_at: "2026-12-31T10:00:00Z",
      },
    ];

    const lines: JournalLineRow[] = [
      { id: "l1", journal_id: "j1", line_no: 1, account_id: "acc-1102", project_id: "prj-001", description: null, debit: 30_000_000, credit: 0 },
      { id: "l2", journal_id: "j1", line_no: 2, account_id: "acc-1310", project_id: "prj-001", description: null, debit: 0, credit: 30_000_000 },
      { id: "l3", journal_id: "j2", line_no: 1, account_id: "acc-1102", project_id: "prj-001", description: null, debit: 45_000_000, credit: 0 },
      { id: "l4", journal_id: "j2", line_no: 2, account_id: "acc-1310", project_id: "prj-001", description: null, debit: 0, credit: 45_000_000 },
      { id: "l5", journal_id: "j3", line_no: 1, account_id: "acc-1300", project_id: "prj-001", description: null, debit: 80_000_000, credit: 0 },
      { id: "l6", journal_id: "j3", line_no: 2, account_id: "acc-4101", project_id: "prj-001", description: null, debit: 0, credit: 80_000_000 },
    ];

    // Pada 30/11/2026 (WIP 0 < Billings 30jt) => Liabilitas Kontrak Rp30.000.000
    const bsNov = buildBalanceSheet(
      DEMO_ACCOUNTS,
      journals,
      lines,
      DEMO_PROJECTS,
      "2026-11-30",
    );
    expect(bsNov.isBalanced).toBe(true);
    expect(bsNov.contractLiabilities).toHaveLength(1);
    expect(Math.abs(bsNov.contractLiabilities[0]!.netContractPosition)).toBe(30_000_000);

    // Pada 31/12/2026 (WIP 80jt > Billings 75jt) => Aset Kontrak Rp5.000.000, Total Aset = Kas 75jt + Aset Kontrak 5jt = 80jt
    const bsDec = buildBalanceSheet(
      DEMO_ACCOUNTS,
      journals,
      lines,
      DEMO_PROJECTS,
      "2026-12-31",
    );
    expect(bsDec.isBalanced).toBe(true);
    expect(bsDec.contractAssets).toHaveLength(1);
    expect(bsDec.contractAssets[0]!.netContractPosition).toBe(5_000_000);
    expect(bsDec.totalAssets).toBe(80_000_000);

    const isDec = buildIncomeStatement(DEMO_ACCOUNTS, journals, lines, {
      endDate: "2026-12-31",
    });
    expect(isDec.totalRevenue).toBe(80_000_000);
    expect(isDec.netProfit).toBe(80_000_000);

    const tbDec = buildTrialBalance(DEMO_ACCOUNTS, journals, lines, {
      endDate: "2026-12-31",
    });
    expect(tbDec.sumEndingDebit).toBe(tbDec.sumEndingCredit);
  });

  it("menghasilkan berkas PDF A4 valid (%PDF-1.) dan berkas Excel (.xlsx) valid", async () => {
    const pdfBytes = await generateDocumentPdf(
      buildInvoicePdfSpec({
        company: DEMO_COMPANY,
        invoiceNumber: "INV/ALT/2026/11/001",
        invoiceDate: "2026-11-01",
        dueDate: "2026-11-08",
        customerName: "PT Sinar Niaga Digital",
        customerAddress: "Jakarta",
        projectName: "Portal Distribusi",
        clientPoNumber: "PO-202611-AB3K9M",
        description: "Termin 1 (DP 25%)",
        subtotal: 30_000_000,
        ppnAmount: 0,
        totalAmount: 30_000_000,
      }),
    );

    const headerStr = new TextDecoder().decode(pdfBytes.slice(0, 7));
    expect(headerStr).toBe("%PDF-1.");
    expect(pdfBytes.byteLength).toBeGreaterThan(800);

    const excelBlob = await createExcelBlob({
      sheetName: "Laba Rugi",
      columns: [
        { header: "Kode Akun", width: 15 },
        { header: "Nama Akun", width: 35 },
        { header: "Nilai (IDR)", width: 20 },
      ],
      rows: [["4-1101", "Pendapatan Jasa", 80_000_000]],
    });
    expect(excelBlob.size).toBeGreaterThan(500);
  });
});

