import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Design Token Enforcement & Asset Protection CI Guard (Paket 10)", () => {
  it("memastikan ukuran altcycles-favicon.png di bawah batas aman (< 40 KB)", () => {
    const faviconPath = path.resolve(process.cwd(), "public/brand/altcycles-favicon.png");
    expect(fs.existsSync(faviconPath)).toBe(true);
    const stats = fs.statSync(faviconPath);
    // Batas aman 40 KB (40 * 1024 bytes = 40.960 bytes)
    const MAX_FAVICON_BYTES = 40 * 1024;
    expect(stats.size).toBeLessThan(MAX_FAVICON_BYTES);
    expect(stats.size).toBeGreaterThan(0);
  });

  it("memastikan seluruh file halaman fitur utama di src/features/ tidak melebihi 1.000 baris kode", () => {
    const targetFiles = [
      "src/features/master-data/coa-accounts-page.tsx",
      "src/features/purchase-orders/po-page.tsx",
      "src/features/profile/profile-settings-page.tsx",
      "src/features/system-config/company-profile-page.tsx",
      "src/features/accounting/journals-page.tsx",
      "src/features/invoicing/invoicing-page.tsx",
    ];

    for (const relPath of targetFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");
      const lineCount = content.split(/\r?\n/).length;
      expect(lineCount, `${relPath} memiliki ${lineCount} baris (wajib < 1.000 baris)`).toBeLessThan(1000);
    }
  });

  it("memastikan komponen modular yang diekstrak ada dan valid di direktori fitur", () => {
    const extractedComponents = [
      "src/features/master-data/coa/coa-table.tsx",
      "src/features/master-data/coa/coa-form-dialog.tsx",
      "src/features/master-data/coa/fixed-asset-table.tsx",
      "src/features/purchase-orders/components/po-table.tsx",
      "src/features/purchase-orders/components/po-export-handlers.ts",
      "src/features/profile/components/profile-main-form.tsx",
      "src/features/profile/components/profile-personal-form.tsx",
      "src/features/profile/components/profile-notifications-form.tsx",
      "src/features/system-config/components/company-profile-tab-identity.tsx",
      "src/features/system-config/components/company-profile-tab-bank-signer.tsx",
    ];

    for (const relPath of extractedComponents) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `Komponen ${relPath} wajib ada`).toBe(true);
    }
  });
});
