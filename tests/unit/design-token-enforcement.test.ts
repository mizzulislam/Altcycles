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
      // Modul Baru Dekomposisi Paket 6
      "src/lib/pdf/pdf-canvas-primitives.ts",
      "src/lib/pdf/pdf-footer.ts",
      "src/features/buyer-portal/components/buyer-portal-lookup-tab.tsx",
      "src/features/buyer-portal/components/buyer-portal-submit-tab.tsx",
      "src/features/buyer-portal/components/buyer-portal-success-dialog.tsx",
      "src/features/buyer-portal/components/buyer-portal-types.ts",
      "src/features/profit-sharing/components/profit-sharing-scheme-dialog.tsx",
      "src/features/profit-sharing/components/profit-sharing-tax-dialog.tsx",
      "src/features/profit-sharing/components/profit-sharing-types.ts",
      // Modul Baru Dekomposisi Paket 6 Gelombang 3 (admin-dashboard SP-02 & user-dashboard SP-10)
      "src/features/master-data/dashboard/admin-dashboard-kpi-grid.tsx",
      "src/features/master-data/dashboard/admin-dashboard-charts-row.tsx",
      "src/features/master-data/dashboard/admin-dashboard-secondary-charts.tsx",
      "src/features/master-data/dashboard/admin-dashboard-recent-activity.tsx",
      "src/features/master-data/dashboard/admin-dashboard-export-handlers.ts",
      "src/features/master-data/dashboard/dashboard-types.ts",
      "src/features/dashboard/user-dashboard/user-dashboard-kpi-grid.tsx",
      "src/features/dashboard/user-dashboard/user-dashboard-shortcuts.tsx",
      "src/features/dashboard/user-dashboard/user-dashboard-charts.tsx",
      "src/features/dashboard/user-dashboard/user-dashboard-claims-progress.tsx",
      "src/features/dashboard/user-dashboard/user-dashboard-projects-table.tsx",
      "src/features/dashboard/user-dashboard/user-dashboard-sharing-table.tsx",
      "src/features/dashboard/user-dashboard/user-dashboard-export-handlers.ts",
      "src/features/dashboard/user-dashboard/user-dashboard-types.ts",
      "src/features/system-config/dashboard/super-admin-dashboard-kpi-grid.tsx",
      "src/features/system-config/dashboard/super-admin-dashboard-charts.tsx",
      "src/features/system-config/dashboard/super-admin-dashboard-audit-table.tsx",
      "src/features/system-config/dashboard/super-admin-dashboard-export-handlers.ts",
      "src/features/payment-approvals/user-payments/user-payments-types.ts",
      "src/features/payment-approvals/user-payments/user-payments-export-handlers.ts",
      "src/features/payment-approvals/user-payments/user-payments-kpi-grid.tsx",
      "src/features/payment-approvals/user-payments/user-payments-table.tsx",
      "src/features/payment-approvals/user-payments/user-payment-create-dialog.tsx",
      "src/features/payment-approvals/user-payments/user-payment-revise-dialog.tsx",
      "src/features/payment-approvals/admin-approvals/admin-approvals-types.ts",
      "src/features/payment-approvals/admin-approvals/admin-approvals-export-handlers.ts",
      "src/features/payment-approvals/admin-approvals/admin-approvals-kpi-grid.tsx",
      "src/features/payment-approvals/admin-approvals/admin-approvals-table.tsx",
      "src/features/payment-approvals/admin-approvals/admin-approval-dialogs.tsx",
      "src/features/invoicing/components/invoice-tab-navigation.tsx",
      "src/features/invoicing/components/invoice-tabs-content.tsx",
      "src/features/invoicing/components/invoice-action-dialogs.tsx",
      "src/features/invoicing/components/use-invoicing-page-state.ts",
      "src/features/invoicing/components/invoice-document-handlers.ts",
      "src/features/master-data/projects/projects-types.ts",
      "src/features/master-data/projects/projects-export-handlers.ts",
      "src/features/master-data/projects/projects-table.tsx",
      "src/features/master-data/projects/project-form-dialog.tsx",
      "src/features/master-data/projects/project-view-dialog.tsx",
      "src/features/accounting/components/use-journals-page-state.ts",
      "src/features/accounting/components/journals-accounting-assumptions.tsx",
      "src/features/accounting/components/journals-toolbar-controls.tsx",
      "src/features/accounting/components/journals-action-dialogs.tsx",
      "src/features/client-projects/hooks/use-project-detail-state.ts",
      "src/features/client-projects/components/project-detail-tabs-content.tsx",
      "src/features/client-projects/dialogs/project-detail-action-dialogs.tsx",
      "src/features/system-config/login-media/login-media-types.ts",
      "src/features/system-config/login-media/use-login-media-state.ts",
      "src/features/system-config/login-media/login-media-kpi-grid.tsx",
      "src/features/system-config/login-media/login-media-preview-card.tsx",
      "src/features/system-config/login-media/login-media-table.tsx",
      "src/features/system-config/login-media/login-media-form-dialog.tsx",
    ];

    for (const relPath of extractedComponents) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `Komponen ${relPath} wajib ada`).toBe(true);
    }
  });

  it("memastikan berkas hasil dekomposisi Paket 6 berada di bawah ambang batas baris", () => {
    const limits: Record<string, number> = {
      "src/features/master-data/admin-dashboard.tsx": 500,
      "src/features/master-data/projects-page.tsx": 400,
      "src/features/invoicing/invoicing-page.tsx": 500,
      "src/features/dashboard/user-dashboard.tsx": 400,
      "src/features/system-config/super-admin-dashboard.tsx": 400,
      "src/features/payment-approvals/user-payments-page.tsx": 400,
      "src/features/payment-approvals/admin-approvals-page.tsx": 400,
      "src/features/accounting/journals-page.tsx": 400,
      "src/features/client-projects/project-detail-page.tsx": 400,
      "src/features/system-config/login-media-page.tsx": 400,
      "src/features/buyer-portal/buyer-portal-page.tsx": 500,
      "src/features/profit-sharing/profit-sharing-page.tsx": 950,
      "src/lib/pdf/pdf-engine.ts": 3050,
    };

    for (const [relPath, maxLines] of Object.entries(limits)) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `${relPath} wajib ada`).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");
      const lineCount = content.split(/\r?\n/).length;
      expect(lineCount, `${relPath} memiliki ${lineCount} baris (wajib < ${maxLines} baris)`).toBeLessThan(maxLines);
    }
  });

  it("memastikan komponen pola terstandar (Single Source of Truth) tersedia di src/components/patterns/", () => {
    const patternComponents = [
      "src/components/patterns/modal-footer-action.tsx",
      "src/components/patterns/search-input.tsx",
      "src/components/patterns/monetary-cell.tsx",
      "src/components/shared/page-header.tsx",
    ];

    for (const relPath of patternComponents) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `Komponen pola ${relPath} wajib ada`).toBe(true);
    }
  });

  it("memastikan berkas yatim dan modul mati yang dibersihkan pada Paket 7 tidak ada di codebase", () => {
    const deletedFiles = [
      "src/features/system-config/components/company-profile-tab-tax.tsx",
      "src/components/ui/collapsible.tsx",
      "src/lib/design-system",
      "scripts/capture-stage2-review.mjs",
    ];

    for (const relPath of deletedFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `Berkas terhapus ${relPath} tidak boleh ada`).toBe(false);
    }
  });

  it("memastikan halaman representatif yang telah distandarisasi bebas dari tag <button> mentah", () => {
    const standardizedPages = [
      "src/features/buyer-portal/buyer-portal-page.tsx",
      "src/features/dashboard/user-dashboard.tsx",
      "src/features/purchase-orders/po-page.tsx",
      "src/features/budgeting/budget-page.tsx",
      "src/features/payment-approvals/user-payments-page.tsx",
      "src/features/payment-approvals/admin-approvals-page.tsx",
      "src/features/invoicing/invoicing-page.tsx",
      "src/features/master-data/projects-page.tsx",
      "src/features/accounting/journals-page.tsx",
      "src/features/client-projects/project-detail-page.tsx",
      "src/features/system-config/login-media-page.tsx",
    ];

    for (const relPath of standardizedPages) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      // Memastikan tidak ada penggunaan tag <button> atau <button ...> mentah
      const hasRawButton = /<button[\s>]/.test(content);
      expect(hasRawButton, `${relPath} tidak boleh memuat tag HTML mentah <button>`).toBe(false);
    }
  });
});
