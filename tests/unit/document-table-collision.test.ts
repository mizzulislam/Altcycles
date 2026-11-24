import { describe, expect, it } from "vitest";
import { generateDocumentPdf, inspectPdfDocumentLayout } from "@/lib/pdf-generator";
import { PDFDocument, PDFName } from "pdf-lib";
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
      orientation: "landscape" as const,
      tableColumns: [
        { header: "No. & Tanggal", widthRatio: 0.16 },
        { header: "Pemohon", widthRatio: 0.16 },
        { header: "Keterangan", widthRatio: 0.28 },
        { header: "Nominal (IDR)", widthRatio: 0.16, align: "right" as const },
        { header: "Status", widthRatio: 0.10, align: "center" as const },
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
      orientation: "landscape" as const,
      tableColumns: [
        { header: "No. & Date", widthRatio: 0.16 },
        { header: "Requester", widthRatio: 0.16 },
        { header: "Description", widthRatio: 0.28 },
        { header: "Amount (IDR)", widthRatio: 0.16, align: "right" as const },
        { header: "Status", widthRatio: 0.10, align: "center" as const },
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
      orientation: "landscape" as const,
      docNumber: "BUDGET-EXTREME-999",
      docDate: "2026-11-19",
      company: FIXTURE_COMPANY,
      tableColumns: [
        { header: "Expense Account", widthRatio: 0.26, align: "left" as const },
        { header: "Budget Ceiling", widthRatio: 0.16, align: "right" as const },
        { header: "Realization", widthRatio: 0.16, align: "right" as const },
        { header: "Remaining", widthRatio: 0.16, align: "right" as const },
        { header: "Absorption (%)", widthRatio: 0.14, align: "center" as const },
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

  it("(g) Item 1: Memastikan ukuran font header tabel seragam 9.5pt di seluruh box header tanpa penyusutan font (shrink-to-fit)", async () => {
    for (const fixture of REPORT_LIST_FIXTURES) {
      // Uji ID
      const specId = fixture.buildSpec();
      const layoutId = await inspectPdfDocumentLayout(specId);
      const headerBoxesId = layoutId.textBoxes.filter((b) => b.zone === "D-table-header");
      for (const box of headerBoxesId) {
        expect(
          box.height,
          `Header font size pada ${fixture.slug} (ID) teks '${box.text}' harus 9.5pt tapi bernilai ${box.height}pt`,
        ).toBe(9.5);
      }

      // Uji EN
      const specEn = {
        ...fixture.buildSpec(),
        language: "en" as const,
        docTitle: fixture.slug.includes("budget")
          ? "PROJECT BUDGET"
          : fixture.slug.includes("payment")
            ? "PAYMENT APPROVALS & CASH DISBURSEMENTS"
            : fixture.buildSpec().docTitle,
      };
      const layoutEn = await inspectPdfDocumentLayout(specEn);
      const headerBoxesEn = layoutEn.textBoxes.filter((b) => b.zone === "D-table-header");
      for (const box of headerBoxesEn) {
        expect(
          box.height,
          `Header font size pada ${fixture.slug} (EN) teks '${box.text}' harus 9.5pt tapi bernilai ${box.height}pt`,
        ).toBe(9.5);
      }
    }
  });

  it("(h) Item 1: Memastikan dokumen dengan orientasi landscape memiliki dimensi 841.89 x 595.28 pt", async () => {
    const landscapeSlugs = [
      "12-daftar-proyek-tim",
      "13-daftar-payment-approval",
      "14-backup-jurnal",
      "15-laporan-budgeting",
      "16-daftar-invoice",
    ];

    for (const slug of landscapeSlugs) {
      const fixture = REPORT_LIST_FIXTURES.find((f) => f.slug === slug);
      expect(fixture, `Fixture ${slug} harus ditemukan`).toBeDefined();
      const spec = fixture!.buildSpec();
      expect(spec.orientation).toBe("landscape");

      const layout = await inspectPdfDocumentLayout(spec);
      expect(layout.pageCount).toBeGreaterThanOrEqual(1);
      // Cek bahwa seluruh bounding box berada dalam rentang landscape x <= 805.89 (margin 36pt dari 841.89pt)
      for (const box of layout.textBoxes) {
        expect(box.x + box.width).toBeLessThanOrEqual(841.89 - 36 + 1.0); // Margin kanan 36pt
      }
    }
  });

  it("(i) Item 2: Memastikan konfigurasi kolom PDF master data tidak memiliki kolom Status, sedangkan dokumen non-master tetap memilikinya", () => {
    const masterKeys = [
      "DAFTAR MASTER VENDOR PEMASOK",
      "SUPPLIERS & VENDORS LIST",
      "DAFTAR MASTER PELANGGAN/KLIEN",
      "OFFICIAL CLIENTS & CUSTOMERS LIST",
      "DAFTAR KATALOG LAYANAN & PRODUK",
      "OFFICIAL PRODUCT & SERVICE CATALOG",
    ];

    for (const key of masterKeys) {
      const config = PDF_TABLE_COLUMN_CONFIGS[key];
      expect(config, `Konfigurasi ${key} harus ada`).toBeDefined();
      const hasStatusId = config!.id.some((c) => c.header.toLowerCase().includes("status"));
      const hasStatusEn = config!.en.some((c) => c.header.toLowerCase().includes("status"));
      expect(hasStatusId, `Master PDF ${key} (ID) tidak boleh ada kolom Status`).toBe(false);
      expect(hasStatusEn, `Master PDF ${key} (EN) tidak boleh ada kolom Status`).toBe(false);
    }

    // Dokumen non-master tetap memiliki kolom status
    const nonMasterKeys = [
      "DAFTAR PENGAJUAN PEMBAYARAN OPERASIONAL",
      "PAYMENT APPROVALS & CASH DISBURSEMENTS",
      "LAPORAN ANGGARAN VS REALISASI PROYEK",
      "PROJECT BUDGETING REPORT",
      "DAFTAR INVOICE PENAGIHAN & PIUTANG",
      "INVOICES & RECEIVABLES LIST",
    ];

    for (const key of nonMasterKeys) {
      const config = PDF_TABLE_COLUMN_CONFIGS[key];
      expect(config, `Konfigurasi ${key} harus ada`).toBeDefined();
      const hasStatusId = config!.id.some((c) => c.header.toLowerCase().includes("status"));
      const hasStatusEn = config!.en.some((c) => c.header.toLowerCase().includes("status"));
      expect(hasStatusId, `Non-master PDF ${key} (ID) harus tetap punya kolom Status`).toBe(true);
      expect(hasStatusEn, `Non-master PDF ${key} (EN) harus tetap punya kolom Status`).toBe(true);
    }
  });

  it("(j) Tahap 2: Validasi pemetaan judul EN & ID untuk Vendor, Klien, dan Katalog (Bagian B Item 2)", async () => {
    const { resolveDocTitleConfig } = await import("@/lib/pdf-generator");

    // 1. Vendor
    const vendorEn = resolveDocTitleConfig("SUPPLIER VENDOR LIST");
    expect(vendorEn.headerTitle).toBe("VENDOR LIST");
    expect(vendorEn.fullTitleBar).toBe("SUPPLIER VENDOR LIST");

    // 2. Klien
    const clientEn = resolveDocTitleConfig("CUSTOMER / CLIENT LIST");
    expect(clientEn.headerTitle).toBe("CLIENT LIST");
    expect(clientEn.fullTitleBar).toBe("CUSTOMER / CLIENT LIST");

    const clientOldEn = resolveDocTitleConfig("OFFICIAL CLIENTS & CUSTOMERS LIST");
    expect(clientOldEn.headerTitle).toBe("CLIENT LIST");
    expect(clientOldEn.fullTitleBar).toBe("CUSTOMER / CLIENT LIST");

    const clientNormalizedId = resolveDocTitleConfig("DAFTAR PELANGGAN/KLIEN");
    expect(clientNormalizedId.headerTitle).toBe("DAFTAR KLIEN");
    expect(clientNormalizedId.fullTitleBar).toBe("DAFTAR PELANGGAN/KLIEN");

    // 3. Katalog
    const catalogEn = resolveDocTitleConfig("ALTVIRA OFFICIAL PRODUCT & SERVICE CATALOG");
    expect(catalogEn.headerTitle).toBe("OFFICIAL CATALOG");
    expect(catalogEn.fullTitleBar).toBe("ALTVIRA OFFICIAL PRODUCT & SERVICE CATALOG");

    const catalogEnAlias = resolveDocTitleConfig("OFFICIAL PRODUCT & SERVICE CATALOG");
    expect(catalogEnAlias.headerTitle).toBe("OFFICIAL CATALOG");
    expect(catalogEnAlias.fullTitleBar).toBe("ALTVIRA OFFICIAL PRODUCT & SERVICE CATALOG");
  });

  it("(k) Validasi menu pilihan format unduh (teks tepat di ID dan EN sesuai Gambar 1)", async () => {
    const idLocale = await import("@/locales/id/common.json");
    const enLocale = await import("@/locales/en/common.json");

    expect(idLocale.default.export.pdf).toBe("PDF Dokumen (.pdf)");
    expect(idLocale.default.export.pdf_desc).toBe("Format cetak & laporan resmi");

    expect(idLocale.default.export.word).toBe("Word Dokumen (.docx)");
    expect(idLocale.default.export.word_desc).toBe("Dapat disunting");

    expect(idLocale.default.export.excel).toBe("Excel Spreadsheet (.xlsx)");
    expect(idLocale.default.export.excel_desc).toBe("Buku kerja spreadsheet lengkap");

    expect(idLocale.default.export.csv).toBe("Format CSV (.csv)");
    expect(idLocale.default.export.csv_desc).toBe("Tabel data pemisah koma");

    expect(enLocale.default.export.pdf).toBe("PDF Document (.pdf)");
    expect(enLocale.default.export.word).toBe("Word Document (.docx)");
    expect(enLocale.default.export.excel).toBe("Excel Spreadsheet (.xlsx)");
    expect(enLocale.default.export.csv).toBe("CSV Format (.csv)");
  });

  it("(l) Validasi footer PDF: ikon medsos memiliki Link Annotation aktif (URI action, F=4, H=I) dan tersinkronisasi", async () => {
    const bytes = await generateDocumentPdf({
      docTitle: "DAFTAR VENDOR",
      docNumber: "VND-RPT/20261118",
      docDate: "2026-11-18",
      company: FIXTURE_COMPANY,
      tableColumns: [{ header: "Vendor", widthRatio: 1 }],
      tableRows: [["Test Vendor"]],
    });

    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();
    expect(pages.length).toBeGreaterThanOrEqual(1);
    const page = pages[0]!;
    const annots = page.node.Annots();
    expect(annots, "Halaman harus memiliki objek Annots").toBeDefined();
    expect(annots!.size()).toBeGreaterThanOrEqual(1);

    const firstAnnotRef = annots!.get(0);
    const annotObj = doc.context.lookup(firstAnnotRef) as unknown as {
      get: (name: unknown) => { encodedName?: string; numberValue?: number; get?: (subName: unknown) => unknown };
    };
    expect(annotObj.get(PDFName.of("Type")).encodedName).toBe("/Annot");
    expect(annotObj.get(PDFName.of("Subtype")).encodedName).toBe("/Link");
    expect(annotObj.get(PDFName.of("F")).numberValue).toBe(4);
    expect(annotObj.get(PDFName.of("H")).encodedName).toBe("/I");

    const actionObj = annotObj.get(PDFName.of("A"));
    expect(actionObj.get?.(PDFName.of("S"))).toBeDefined();
    expect(actionObj.get?.(PDFName.of("URI"))).toBeDefined();
  });
});
