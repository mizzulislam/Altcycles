import { describe, expect, it } from "vitest";
import {
  BRAND_IMAGE_METRICS,
  clearDocumentTitleFallbackRecord,
  DOCUMENT_TITLE_FALLBACK_RECORD,
  DOCUMENT_TITLE_MAPPINGS,
  findDocumentTitleMapping,
  inspectPdfDocumentLayout,
  MAX_HEADER_TITLE_WIDTH,
  measureHelveticaBoldWidth,
  PDF_LAYOUT_TOKENS,
  resolveDocTitleConfig,
} from "@/lib/pdf-generator";
import {
  ALL_BASELINE_FIXTURES,
  REPORT_LIST_FIXTURES,
} from "../fixtures/document-layout-fixtures";

describe("Tabel Pemetaan Tunggal Judul Dokumen & Logika Header", () => {
  it("aturan 3: memvalidasi seluruh entri pemetaan memenuhi batas kata, karakter, lebar, dan keunikan", () => {
    const entries = Object.entries(DOCUMENT_TITLE_MAPPINGS);
    expect(entries.length).toBeGreaterThanOrEqual(7);

    const seenHeaders = new Set<string>();

    for (const [sourceKey, mapping] of entries) {
      const headerTitle = mapping.headerTitle;

      // (d) Maksimal 2 kata
      const wordCount = headerTitle.trim().split(/\s+/).length;
      expect(
        wordCount,
        `Judul header "${headerTitle}" pada entri "${sourceKey}" harus <= 2 kata`,
      ).toBeLessThanOrEqual(2);

      // (d) Maksimal 16 karakter
      expect(
        headerTitle.length,
        `Judul header "${headerTitle}" pada entri "${sourceKey}" harus <= 16 karakter`,
      ).toBeLessThanOrEqual(16);

      // (a) Lebar tidak melebihi lebar 'PURCHASE ORDER (PO)' (261.558 pt)
      const measuredW = measureHelveticaBoldWidth(headerTitle, 22);
      expect(
        measuredW,
        `Lebar judul header "${headerTitle}" (${measuredW.toFixed(2)} pt) melebihi batas (${MAX_HEADER_TITLE_WIDTH.toFixed(2)} pt)`,
      ).toBeLessThanOrEqual(MAX_HEADER_TITLE_WIDTH);

      // (e) Tidak ada Judul Header ganda
      expect(
        seenHeaders.has(headerTitle),
        `Ditemukan judul header ganda: "${headerTitle}"`,
      ).toBe(false);
      seenHeaders.add(headerTitle);
    }
  });

  it("aturan 3b & 7: memastikan kotak batas judul tidak beririsan dengan kotak batas ikon dan wordmark", () => {
    const { pageWidth, marginX } = PDF_LAYOUT_TOKENS;
    const rightEdgeX = pageWidth - marginX; // 544.26 pt

    // Hitung batas kanan wordmark tinta
    const iconW =
      (BRAND_IMAGE_METRICS.icon.fileWidth / BRAND_IMAGE_METRICS.icon.inkHeight) * 36;
    const wmScale = 22 / BRAND_IMAGE_METRICS.wordmark.inkHeight;
    const wmW = BRAND_IMAGE_METRICS.wordmark.fileWidth * wmScale;
    const wmRightX = marginX + iconW + 8 + wmW; // ~220.42 pt

    for (const [sourceKey, mapping] of Object.entries(DOCUMENT_TITLE_MAPPINGS)) {
      const w = measureHelveticaBoldWidth(mapping.headerTitle, 22);
      const titleStartX = rightEdgeX - w;

      // Jarak bebas (gap) ke wordmark harus positif dan aman
      const clearance = titleStartX - wmRightX;
      expect(
        clearance,
        `Judul header "${mapping.headerTitle}" (${sourceKey}) menabrak wordmark! Gap: ${clearance.toFixed(2)} pt`,
      ).toBeGreaterThan(20); // minimal jarak aman 20 pt
    }

    // Periksa khusus PAYMENT APPROVAL (terpanjang di pemetaan, 16 karakter)
    const paWidth = measureHelveticaBoldWidth("PAYMENT APPROVAL", 22);
    expect(paWidth).toBeLessThanOrEqual(MAX_HEADER_TITLE_WIDTH);
    const paStartX = rightEdgeX - paWidth;
    const paClearance = paStartX - wmRightX;
    expect(
      paClearance,
      "PAYMENT APPROVAL harus menyisakan ruang bebas > 85 pt dari wordmark",
    ).toBeGreaterThan(85);
  });

  it("aturan 1 & 2: teks baris biru sama persis dengan Judul Lengkap pemetaan (huruf kapital, tanpa MASTER)", () => {
    for (const [sourceKey, mapping] of Object.entries(DOCUMENT_TITLE_MAPPINGS)) {
      const resolved = resolveDocTitleConfig(sourceKey);

      expect(resolved.headerTitle).toBe(mapping.headerTitle);

      // Kata 'MASTER' hanya dihapus pada Judul Lengkap di PDF
      expect(
        mapping.fullTitle.includes("MASTER"),
        `Judul lengkap "${mapping.fullTitle}" tidak boleh memuat kata MASTER`,
      ).toBe(false);

      // Baris biru tampil hanya bila Judul Header berbeda dari Judul Lengkap
      if (mapping.headerTitle === mapping.fullTitle) {
        expect(resolved.fullTitleBar).toBeUndefined();
      } else {
        expect(resolved.fullTitleBar).toBe(mapping.fullTitle);
      }
    }
  });

  it("aturan 2: perilaku INVOICE, KUITANSI, dan PURCHASE ORDER tidak berubah", () => {
    // INVOICE: tidak ada baris biru
    const inv = resolveDocTitleConfig("INVOICE");
    expect(inv.headerTitle).toBe("INVOICE");
    expect(inv.fullTitleBar).toBeUndefined();

    // KUITANSI: tidak ada baris biru
    const kw = resolveDocTitleConfig("KUITANSI");
    expect(kw.headerTitle).toBe("KUITANSI");
    expect(kw.fullTitleBar).toBeUndefined();

    // PO Klien: baris biru PURCHASE ORDER (PO) KLIEN
    const poKlien = resolveDocTitleConfig("PURCHASE ORDER (PO) KLIEN");
    expect(poKlien.headerTitle).toBe("PURCHASE ORDER");
    expect(poKlien.fullTitleBar).toBe("PURCHASE ORDER (PO) KLIEN");

    // PO Vendor: baris biru PURCHASE ORDER (PO) VENDOR
    const poVendor = resolveDocTitleConfig("PURCHASE ORDER (PO PEMBELIAN VENDOR)");
    expect(poVendor.headerTitle).toBe("PURCHASE ORDER");
    expect(poVendor.fullTitleBar).toBe("PURCHASE ORDER (PO) VENDOR");
  });

  it("aturan 4: pengaman judul tidak terdaftar yang melebihi batas lebar & proteksi CI", () => {
    clearDocumentTitleFallbackRecord();

    const longUnmapped =
      "LAPORAN REKAPITULASI KEUANGAN TAHUNAN ALTCYCLES PERSEROAN TERBATAS";
    const resolvedFallback = resolveDocTitleConfig(longUnmapped);

    // Ambil 2 kata pertama, maksimal 16 karakter
    expect(resolvedFallback.headerTitle).toBe("LAPORAN REKAPITU");
    expect(resolvedFallback.headerTitle.length).toBeLessThanOrEqual(16);
    expect(resolvedFallback.fullTitleBar).toBe(longUnmapped);

    // Pastikan tercatat di DOCUMENT_TITLE_FALLBACK_RECORD
    expect(DOCUMENT_TITLE_FALLBACK_RECORD.length).toBe(1);
    expect(DOCUMENT_TITLE_FALLBACK_RECORD[0]?.rawTitle).toBe(longUnmapped);

    // PENGUJIAN CI: Seluruh dokumen fixture sistem Altcycles TIDAK BOLEH memicu fallback pengaman
    clearDocumentTitleFallbackRecord();
    const allSystemFixtures = [...ALL_BASELINE_FIXTURES, ...REPORT_LIST_FIXTURES];

    for (const fixture of allSystemFixtures) {
      const spec = fixture.buildSpec();
      resolveDocTitleConfig(spec.docTitle);
    }

    expect(
      DOCUMENT_TITLE_FALLBACK_RECORD,
      `Dokumen sistem memicu fallback pengaman tidak disengaja: ${JSON.stringify(
        DOCUMENT_TITLE_FALLBACK_RECORD,
      )}`,
    ).toEqual([]);
  });

  it("aturan pengujian layout: memastikan seluruh 7 dokumen daftar & laporan bebas tabrakan (normal, multi-page, empty)", async () => {
    for (const fixture of REPORT_LIST_FIXTURES) {
      const spec = fixture.buildSpec();
      const layout = await inspectPdfDocumentLayout(spec);

      // (a) Bebas tabrakan kotak batas teks
      expect(layout.collisions, `Collisions on ${fixture.slug}`).toEqual([]);

      // (b) Bebas pelanggaran batas margin
      expect(
        layout.marginViolations,
        `Margin violations on ${fixture.slug}`,
      ).toEqual([]);

      // (f) Kesejajaran No/Ref dan ikon-wordmark-judul tetap lulus
      expect(
        layout.headerAlignment.deltaNoVsLegalName,
        `Kesejajaran No vs Nama PT pada ${fixture.slug}`,
      ).toBeLessThanOrEqual(1);
      expect(
        layout.headerAlignment.deltaRefVsAddr1,
        `Kesejajaran Ref vs Alamat 1 pada ${fixture.slug}`,
      ).toBeLessThanOrEqual(1);
      expect(
        layout.headerAlignment.iconInkHeight,
        `Ikon lebih besar dari wordmark pada ${fixture.slug}`,
      ).toBeGreaterThan(layout.headerAlignment.wordmarkInkHeight);

      // Teks baris biru sama persis dengan Judul Lengkap pemetaan
      const mapping = findDocumentTitleMapping(spec.docTitle);
      expect(mapping).toBeDefined();
      const resolved = resolveDocTitleConfig(spec.docTitle);
      expect(resolved.fullTitleBar).toBe(mapping?.fullTitle);
    }
  });
});
