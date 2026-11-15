import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateDocumentPdf,
  generateSpkProjectCharterPdf,
  inspectPdfDocumentLayout,
} from "@/lib/pdf-generator";
import { buildDefaultSpkContent } from "@/lib/spk-defaults";
import {
  ALL_BASELINE_FIXTURES,
  FIXTURE_COMPANY,
} from "../fixtures/document-layout-fixtures";

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
        "04-sow-normal",
        "04c-sow-minimum",
        "05-po-klien-normal",
        "05c-po-klien-minimum",
        "06-po-vendor-normal",
        "06c-po-vendor-minimum",
        "07-bakp-normal",
        "07c-bakp-minimum",
        "08-uat-normal",
        "08c-uat-minimum",
        "09-bast-normal",
        "09c-bast-minimum",
        "10-payment-approval-normal",
        "10c-payment-approval-minimum",
        "11-jadwal-termin-normal",
        "11c-jadwal-termin-minimum",
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

    // Render juga SPK / Project Charter 10 Pasal (generateSpkProjectCharterPdf)
    const spkContent = buildDefaultSpkContent({
      project: {
        id: "prj-001",
        code: "PRJ/ALT/2026/001",
        name: "Development cost of Enhancement & Optimization Website TIMTravel RMM",
        project_category: "client",
        customer_id: "cust-001",
        status: "active",
        contract_value: 5_000_000,
        start_date: "2026-11-15",
        target_end_date: "2027-01-31",
        completed_date: null,
        term_count: 2,
        revenue_method: "two_term_accrual",
        spk_number: "SPK/ALT/2026/11/001",
        has_posted_journal: true,
        is_eliminated: false,
        description: null,
        created_by: null,
        created_at: "2026-11-15T00:00:00Z",
        updated_at: "2026-11-15T00:00:00Z",
      },
      customer: {
        id: "cust-001",
        code: "CUST-001",
        name: "TIMTravel RMM",
        company_name: "TIMTravel RMM",
        contact_person: "Anni Nuraini, M.T.",
        contact_title: "Direktur",
        email: "anni@timtravel.co.id",
        phone: "0812-8899-0011",
        address: "Komplek City Resort, Ruko Hawai Blok B No. 61 Timur, Jakarta Barat",
        npwp: null,
        logo_storage_path: null,
        signature_storage_path: null,
        paraf_storage_path: null,
        is_active: true,
        created_by: null,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
      },
      company: FIXTURE_COMPANY,
      milestones: [
        {
          id: "ms-1",
          project_id: "prj-001",
          sequence_no: 1,
          name: "Termin 1 (DP & Fondasi Sistem)",
          is_down_payment: true,
          is_final_settlement: false,
          percentage: 40,
          amount: 2_000_000,
          achievement_criteria: "Penandatanganan SPK & persetujuan arsitektur",
          status: "paid",
          created_at: "2026-11-15T00:00:00Z",
        },
        {
          id: "ms-2",
          project_id: "prj-001",
          sequence_no: 2,
          name: "Termin 2 (Pelunasan BAST)",
          is_down_payment: false,
          is_final_settlement: true,
          percentage: 60,
          amount: 3_000_000,
          achievement_criteria: "Lulus UAT & penandatanganan BAST",
          status: "planned",
          created_at: "2026-11-15T00:00:00Z",
        },
      ],
    });
    const spkBytes = await generateSpkProjectCharterPdf({
      docNumber: "SPK/ALT/2026/11/001",
      docDate: "2026-11-15",
      docTitle:
        "Development cost of Enhancement & Optimization Website TIMTravel RMM",
      company: FIXTURE_COMPANY,
      content: spkContent,
    });
    fs.writeFileSync(
      path.join(outDir, "04d-spk-project-charter.pdf"),
      spkBytes,
    );
    expect(spkBytes.byteLength).toBeGreaterThan(1500);
  });
});
