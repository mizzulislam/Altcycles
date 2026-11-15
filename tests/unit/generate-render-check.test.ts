import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateDocumentPdf,
  inspectPdfDocumentLayout,
} from "@/lib/pdf-generator";
import { ALL_BASELINE_FIXTURES } from "../fixtures/document-layout-fixtures";

describe("Render Check Generator & Collision Detector", () => {
  it("memastikan seluruh fixture dokumen bebas tabrakan kotak batas dan pelanggaran margin", async () => {
    for (const fixture of ALL_BASELINE_FIXTURES) {
      const spec = fixture.buildSpec();
      const layout = await inspectPdfDocumentLayout(spec);
      expect(layout.collisions, `Collisions on ${fixture.slug}`).toEqual([]);
      expect(
        layout.marginViolations,
        `Margin violations on ${fixture.slug}`,
      ).toEqual([]);

      const singlePageSlugs = new Set([
        "01-invoice-normal",
        "01c-invoice-minimum",
        "02-kuitansi-normal",
        "02b-kuitansi-extreme",
        "02c-kuitansi-minimum",
        "03-quotation-normal",
        "03c-quotation-minimum",
        "05-po-klien-normal",
        "05c-po-klien-minimum",
        "06-po-vendor-normal",
        "06c-po-vendor-minimum",
      ]);
      if (singlePageSlugs.has(fixture.slug)) {
        expect(layout.pageCount, `Page count for ${fixture.slug}`).toBe(1);
      }
    }
  });

  it("merender seluruh fixture dokumen ke direktori target", async () => {
    const stage = process.env.RENDER_STAGE;
    if (!stage) {
      expect(ALL_BASELINE_FIXTURES.length).toBeGreaterThanOrEqual(11);
      return;
    }

    const outDir = path.resolve(process.cwd(), "docs", "render-check", stage);
    fs.mkdirSync(outDir, { recursive: true });

    for (const fixture of ALL_BASELINE_FIXTURES) {
      const spec = fixture.buildSpec();
      const pdfBytes = await generateDocumentPdf(spec);
      const pdfPath = path.join(outDir, `${fixture.slug}.pdf`);
      fs.writeFileSync(pdfPath, pdfBytes);
      expect(pdfBytes.byteLength).toBeGreaterThan(800);
    }
  });
});
