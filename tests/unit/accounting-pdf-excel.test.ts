import { describe, expect, it } from "vitest";
import {
  buildBalanceSheet,
  buildIncomeStatement,
  buildTrialBalance,
} from "@/lib/accounting-engine";
import { DEMO_ACCOUNTS, DEMO_COMPANY, DEMO_PROJECTS } from "@/lib/demo-seed";
import { createExcelBlob } from "@/lib/excel-exporter";
import {
  buildInvoicePdfSpec,
  buildReceiptPdfSpec,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { generateDocumentWord } from "@/lib/word-generator";
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

  it("menghasilkan berkas PDF dan Word (.docx) dengan atribut 9 zona standar (status badge, balance due, meterai, 3 tanda tangan)", async () => {
    const spec = {
      ...buildInvoicePdfSpec({
        company: DEMO_COMPANY,
        invoiceNumber: "INV/ALT/2026/11/001",
        invoiceDate: "2026-11-01",
        dueDate: "2026-11-08",
        customerName: "PT Sinar Niaga Digital",
        customerAddress: "Jakarta Barat",
        projectName: "Portal Distribusi",
        clientPoNumber: "PO-202611-AB3K9M",
        description: "Termin 1 (DP 25%)",
        subtotal: 30_000_000,
        ppnAmount: 0,
        totalAmount: 30_000_000,
      }),
      docVersion: "v1.0",
      statusBadge: { text: "DISETUJUI", variant: "success" as const },
      balanceDueBox: {
        label: "TOTAL PEMBAYARAN JATUH TEMPO",
        amountText: "Rp 30.000.000",
        dueDateText: "Jatuh Tempo: 08 November 2026",
      },
      hasMeterai: true,
      meteraiLabel: "TEMPAT E-METERAI Rp10.000",
      thirdSignatureLabel: "Menyetujui,",
      thirdSignatureName: "Komisaris Utama",
      footerDocNumber: "INV/ALT/2026/11/001",
    };

    const pdfBytes = await generateDocumentPdf(spec);
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 7));
    expect(pdfHeader).toBe("%PDF-1.");

    const wordBlob = await generateDocumentWord(spec);
    expect(wordBlob.size).toBeGreaterThan(1000);
    expect(wordBlob.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });

  it("Langkah 3: menghasilkan spesifikasi INVOICE standar dengan rujukan dokumen induk, riwayat termin, dan estimasi PPh 23", async () => {
    const invSpec = buildInvoicePdfSpec({
      company: DEMO_COMPANY,
      invoiceNumber: "INV/ALT/2026/11/001",
      invoiceDate: "2026-11-01",
      dueDate: "2026-11-15",
      customerName: "PT Sinar Niaga Digital",
      customerAddress: "Jakarta Barat",
      projectName: "Portal Distribusi B2B",
      clientPoNumber: "PO-202611-AB3K9M",
      spkNumber: "SPK/ALT/2026/10/001",
      bakpNumber: "BAKP/ALT/2026/11/001",
      servicePeriod: "01 November 2026 s/d 15 November 2026",
      description: "Termin 1 (DP 25%) Pengembangan Portal",
      items: [
        {
          description: "Pengembangan Modul Autentikasi & Dashboard",
          qty: 1,
          unit: "Paket",
          duration: "14 Hari",
          unitPrice: 30_000_000,
          subtotal: 30_000_000,
        },
      ],
      subtotal: 30_000_000,
      ppnAmount: 0,
      totalAmount: 30_000_000,
      contractValue: 120_000_000,
      previousBilledAmount: 0,
      remainingContractAmount: 90_000_000,
      includePph23Estimate: true,
      paymentStatus: "unpaid",
      docStatus: "issued",
      balanceDue: 30_000_000,
    });

    // Validasi Butir 1.2: Judul dokumen INVOICE
    expect(invSpec.docTitle).toBe("INVOICE");
    // Validasi Butir 1.5 & 1.6: Rujukan SPK, BAKP, Periode Layanan
    expect(invSpec.metaRows.some((r) => r.label === "Referensi SPK / Kontrak")).toBe(true);
    expect(invSpec.metaRows.some((r) => r.label === "Referensi BAKP Acuan")).toBe(true);
    expect(invSpec.metaRows.some((r) => r.label === "Periode Layanan")).toBe(true);
    // Validasi Butir 1.11: Akumulasi termin dan sisa kontrak
    expect(invSpec.summaryRows.some((r) => r.label === "Total Nilai Kontrak Proyek")).toBe(true);
    expect(invSpec.summaryRows.some((r) => r.label === "Sisa Nilai Kontrak")).toBe(true);
    // Validasi Butir 1.16: Estimasi PPh 23
    expect(invSpec.summaryRows.some((r) => r.label === "Estimasi Potongan PPh 23 (2%)")).toBe(true);

    const pdfBytes = await generateDocumentPdf(invSpec);
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
    const wordBlob = await generateDocumentWord(invSpec);
    expect(wordBlob.size).toBeGreaterThan(1000);
  });

  it("Langkah 3: menghasilkan spesifikasi KUITANSI berpasangan dengan aktivasi e-meterai otomatis (> Rp5 juta)", async () => {
    // Kuitansi > 5 juta => hasMeterai: true (Butir 2.6)
    const receiptOver5M = buildReceiptPdfSpec({
      company: DEMO_COMPANY,
      receiptNumber: "KW/ALT/2026/11/001",
      receiptDate: "2026-11-07",
      receivedFrom: "PT Sinar Niaga Digital",
      invoiceNumber: "INV/ALT/2026/11/001",
      projectName: "Portal Distribusi B2B",
      clientPoNumber: "PO-202611-AB3K9M",
      servicePeriod: "Termin 1",
      paymentMethod: "Transfer Bank Mandiri",
      amount: 30_000_000,
    });

    expect(receiptOver5M.docTitle).toBe("KUITANSI");
    expect(receiptOver5M.hasMeterai).toBe(true);
    expect(receiptOver5M.meteraiLabel).toContain("Rp10.000");
    expect(receiptOver5M.metaRows.some((r) => r.label === "Referensi PO Klien")).toBe(true);

    const pdfOver5M = await generateDocumentPdf(receiptOver5M);
    expect(pdfOver5M.byteLength).toBeGreaterThan(1000);

    // Kuitansi <= 5 juta => hasMeterai: false (tidak kena bea meterai)
    const receiptUnder5M = buildReceiptPdfSpec({
      company: DEMO_COMPANY,
      receiptNumber: "KW/ALT/2026/11/002",
      receiptDate: "2026-11-08",
      receivedFrom: "PT Sinar Niaga Digital",
      invoiceNumber: "INV/ALT/2026/11/002",
      projectName: "Portal Distribusi B2B",
      amount: 4_500_000,
    });

    expect(receiptUnder5M.hasMeterai).toBe(false);
    const pdfUnder5M = await generateDocumentPdf(receiptUnder5M);
    expect(pdfUnder5M.byteLength).toBeGreaterThan(1000);
  });
});

