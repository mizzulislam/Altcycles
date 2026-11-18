import { describe, expect, it } from "vitest";
import { inspectPdfDocumentLayout } from "@/lib/pdf-generator";
import { PDF_TABLE_COLUMN_CONFIGS } from "@/lib/pdf/pdf-table-columns";
import {
  REPORT_LIST_FIXTURES,
  ACCOUNTING_REPORT_FIXTURES,
  FIXTURE_COMPANY,
} from "../fixtures/document-layout-fixtures";

describe("Tahap 1 (Bagian A): Validasi Kolom Tabel PDF Terstandar & Deteksi Bebas Tabrakan", () => {
  it("(c) Memastikan jumlah lebar kolom (widthRatio) tepat 1.00 (100%) dan header bebas karakter pilihan ganda '/' untuk semua konfigurasi", () => {
    for (const [key, entry] of Object.entries(PDF_TABLE_COLUMN_CONFIGS)) {
      // 1. Versi Bahasa Indonesia
      const totalRatioId = entry.id.reduce((sum, col) => sum + col.widthRatio, 0);
      expect(
        Math.abs(totalRatioId - 1.0),
        `Total ratio ID pada ${key} harus 1.00 tapi bernilai ${totalRatioId}`,
      ).toBeLessThan(0.0001);

      for (const col of entry.id) {
        expect(
          col.header.includes("/"),
          `Header ID '${col.header}' pada '${key}' tidak boleh mengandung karakter '/'`,
        ).toBe(false);
      }

      // 2. Versi Bahasa Inggris
      const totalRatioEn = entry.en.reduce((sum, col) => sum + col.widthRatio, 0);
      expect(
        Math.abs(totalRatioEn - 1.0),
        `Total ratio EN pada ${key} harus 1.00 tapi bernilai ${totalRatioEn}`,
      ).toBeLessThan(0.0001);

      for (const col of entry.en) {
        expect(
          col.header.includes("/"),
          `Header EN '${col.header}' pada '${key}' tidak boleh mengandung karakter '/'`,
        ).toBe(false);
      }
    }
  });

  it("(a & b) Memastikan kotak batas tiap sel di dalam batas tabel & tidak ada teks sel sebaris yang beririsan untuk semua dokumen daftar & laporan", async () => {
    for (const fixture of REPORT_LIST_FIXTURES) {
      // Uji ID
      const specId = fixture.buildSpec();
      const layoutId = await inspectPdfDocumentLayout(specId);

      expect(
        layoutId.collisions,
        `Ditemukan tabrakan teks pada fixture ID ${fixture.slug}: ${JSON.stringify(layoutId.collisions)}`,
      ).toEqual([]);
      expect(
        layoutId.marginViolations,
        `Ditemukan pelanggaran margin pada fixture ID ${fixture.slug}: ${JSON.stringify(layoutId.marginViolations)}`,
      ).toEqual([]);

      // Uji EN
      const baseSpec = fixture.buildSpec();
      const specEn = {
        ...baseSpec,
        language: "en" as const,
        docTitle: fixture.slug.includes("budget")
          ? "PROJECT BUDGET"
          : fixture.slug.includes("payment")
            ? "PAYMENT APPROVALS & CASH DISBURSEMENTS"
            : baseSpec.docTitle,
      };
      const layoutEn = await inspectPdfDocumentLayout(specEn);

      expect(
        layoutEn.collisions,
        `Ditemukan tabrakan teks pada fixture EN ${fixture.slug}: ${JSON.stringify(layoutEn.collisions)}`,
      ).toEqual([]);
      expect(
        layoutEn.marginViolations,
        `Ditemukan pelanggaran margin pada fixture EN ${fixture.slug}: ${JSON.stringify(layoutEn.marginViolations)}`,
      ).toEqual([]);
    }
  });

  it("(d) Pengujian fixture terburuk: data kosong, nominal raksasa, teks panjang, dan label terpanjang di ID dan EN", async () => {
    // 1. Fixture Empty State
    const emptySpecId = {
      docTitle: "DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL",
      docNumber: "PA-EMPTY-001",
      docDate: "2026-11-19",
      company: FIXTURE_COMPANY,
      tableColumns: [
        { header: "No. & Tanggal", widthRatio: 0.18 },
        { header: "Pemohon", widthRatio: 0.15 },
        { header: "Keterangan", widthRatio: 0.26 },
        { header: "Nominal (IDR)", widthRatio: 0.16, align: "right" as const },
        { header: "Status", widthRatio: 0.11, align: "center" as const },
        { header: "Tanggal Transfer", widthRatio: 0.14, align: "center" as const },
      ],
      tableRows: [],
      rightSignatureName: "Muhammad Izzul Islam - Finance & Accounting",
    };
    const emptyLayoutId = await inspectPdfDocumentLayout(emptySpecId);
    expect(emptyLayoutId.collisions).toEqual([]);
    expect(emptyLayoutId.marginViolations).toEqual([]);

    const emptySpecEn = {
      ...emptySpecId,
      docTitle: "PAYMENT APPROVALS & CASH DISBURSEMENTS",
      language: "en" as const,
      tableColumns: [
        { header: "No. & Date", widthRatio: 0.18 },
        { header: "Requester", widthRatio: 0.15 },
        { header: "Description", widthRatio: 0.26 },
        { header: "Amount (IDR)", widthRatio: 0.16, align: "right" as const },
        { header: "Status", widthRatio: 0.11, align: "center" as const },
        { header: "Transfer Date", widthRatio: 0.14, align: "center" as const },
      ],
    };
    const emptyLayoutEn = await inspectPdfDocumentLayout(emptySpecEn);
    expect(emptyLayoutEn.collisions).toEqual([]);
    expect(emptyLayoutEn.marginViolations).toEqual([]);

    // 2. Fixture Extreme Worst-Case (Nominal Triliun, Teks Email & Kode Tanpa Spasi Panjang)
    const extremeSpec = {
      docTitle: "PROJECT BUDGETING REPORT",
      language: "en" as const,
      docNumber: "BUDGET-EXTREME-999",
      docDate: "2026-11-19",
      company: FIXTURE_COMPANY,
      tableColumns: [
        { header: "Expense Account", widthRatio: 0.27, align: "left" as const },
        { header: "Budget Ceiling", widthRatio: 0.17, align: "right" as const },
        { header: "Realization", widthRatio: 0.16, align: "right" as const },
        { header: "Remaining", widthRatio: 0.16, align: "right" as const },
        { header: "Absorption (%)", widthRatio: 0.12, align: "center" as const },
        { header: "Status", widthRatio: 0.12, align: "center" as const },
      ],
      tableRows: [
        [
          "5-51001-VERY-LONG-UNBROKEN-EXPENSE-ACCOUNT-IDENTIFIER-AND-CODE-STRING-XYZ",
          "Rp 999.888.777.666",
          "Rp 888.777.666.555",
          "Rp 111.111.111.111",
          "88.89%",
          "On Budget",
        ],
        [
          "5-51002 - Cloud Infrastructure Hosting and Distributed Microservices Scalability Subscriptions",
          "Rp 50.000.000",
          "Rp 55.000.000",
          "-Rp 5.000.000",
          "110.00%",
          "Exceeded",
        ],
      ],
      rightSignatureName: "Muhammad Izzul Islam - Finance & Accounting",
    };
    const extremeLayout = await inspectPdfDocumentLayout(extremeSpec);
    expect(extremeLayout.collisions).toEqual([]);
    expect(extremeLayout.marginViolations).toEqual([]);
  });

  it("(e & f) Memastikan seluruh 9 laporan akuntansi & lampiran keuangan bebas tabrakan dan data konsisten", async () => {
    for (const fixture of ACCOUNTING_REPORT_FIXTURES) {
      const spec = fixture.buildSpec();
      const layout = await inspectPdfDocumentLayout(spec);
      expect(
        layout.collisions,
        `Collisions on accounting fixture ${fixture.slug}`,
      ).toEqual([]);
      expect(
        layout.marginViolations,
        `Margin violations on accounting fixture ${fixture.slug}`,
      ).toEqual([]);
    }
  });
});
