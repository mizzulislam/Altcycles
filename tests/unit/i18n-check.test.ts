import { describe, it, expect } from "vitest";
import { getNavStructureForRole, getRoleShortName } from "@/components/layout/nav-structure";
import { getHeaderBreadcrumbs } from "@/components/layout/breadcrumb-map";
import { DICTIONARY } from "@/lib/i18n";

describe("i18n navigation and layout checks", () => {
  it("translates nav structure when t is provided for English", () => {
    const tEn = (key: string, fallback?: string) => DICTIONARY.en[key] ?? fallback ?? key;
    const nav = getNavStructureForRole("admin", tEn);
    const dashboardItem = nav.find((i) => i.type !== "group" && i.to === "/admin/dashboard");
    expect(dashboardItem?.label).toBe("Financial Dashboard");

    const opGroup = nav.find((i) => i.type === "group" && i.id === "operasional-pengeluaran");
    expect(opGroup?.label).toBe("Operations & PO");
  });

  it("translates role short name to English", () => {
    const tEn = (key: string, fallback?: string) => DICTIONARY.en[key] ?? fallback ?? key;
    expect(getRoleShortName("admin", tEn)).toBe("Treasurer");
    expect(getRoleShortName("user", tEn)).toBe("Team Member");
  });

  it("translates breadcrumbs to English", () => {
    const tEn = (key: string, fallback?: string) => DICTIONARY.en[key] ?? fallback ?? key;
    const crumbs = getHeaderBreadcrumbs("/admin/dashboard", tEn);
    expect(crumbs[0]?.label).toBe("Home");
    expect(crumbs[1]?.label).toBe("Financial Dashboard");
  });

  it("contains complete auth i18n dictionary for login and register", () => {
    const authKeys = [
      "auth.signin_tab",
      "auth.signup_tab",
      "auth.signin_title",
      "auth.signup_title",
      "auth.username",
      "auth.password",
      "auth.signin_button",
      "auth.signup_button",
      "auth.signin_google",
    ];

    for (const key of authKeys) {
      expect(DICTIONARY.id[key]).toBeDefined();
      expect(DICTIONARY.en[key]).toBeDefined();
    }

    expect(DICTIONARY.en["auth.signin_tab"]).toBe("Sign In");
    expect(DICTIONARY.en["auth.signup_tab"]).toBe("Create Account");
    expect(DICTIONARY.id["auth.signin_tab"]).toBe("Masuk");
    expect(DICTIONARY.id["auth.signup_tab"]).toBe("Buat Akun");
  });

  it("translates namespace keys correctly with i18n", async () => {
    const { i18n } = await import("@/lib/i18n");
    await i18n.changeLanguage("en");
    expect(i18n.t("projects:title")).toBe("Projects Master & Team Assignments");
    expect(i18n.t("invoicing:kpi.total_invoiced")).toBe("Total Invoiced Amount");
    expect(i18n.t("common:action.export_download")).toBe("Download / Export");
    expect(i18n.t("projects:milestones.card_title")).toBe("Milestone Payment Schedule (Total 100%)");

    await i18n.changeLanguage("id");
    expect(i18n.t("projects:title")).toBe("Master Proyek & Penugasan Tim");
    expect(i18n.t("invoicing:kpi.total_invoiced")).toBe("Total Nilai Invoice Diterbitkan");
    expect(i18n.t("common:action.export_download")).toBe("Unduh / Ekspor");
    expect(i18n.t("projects:milestones.card_title")).toBe("Jadwal Termin Penagihan (Total 100%)");
  });

  it("ensures locale files id and en have matching top-level keys", async () => {
    const commonId = (await import("@/locales/id/common.json")).default;
    const commonEn = (await import("@/locales/en/common.json")).default;
    const projectsId = (await import("@/locales/id/projects.json")).default;
    const projectsEn = (await import("@/locales/en/projects.json")).default;
    const invoicingId = (await import("@/locales/id/invoicing.json")).default;
    const invoicingEn = (await import("@/locales/en/invoicing.json")).default;

    expect(Object.keys(commonId).sort()).toEqual(Object.keys(commonEn).sort());
    expect(Object.keys(projectsId).sort()).toEqual(Object.keys(projectsEn).sort());
    expect(Object.keys(invoicingId).sort()).toEqual(Object.keys(invoicingEn).sort());

    const poId = (await import("@/locales/id/po.json")).default;
    const poEn = (await import("@/locales/en/po.json")).default;
    const approvalsId = (await import("@/locales/id/approvals.json")).default;
    const approvalsEn = (await import("@/locales/en/approvals.json")).default;

    const accountingId = (await import("@/locales/id/accounting.json")).default;
    const accountingEn = (await import("@/locales/en/accounting.json")).default;

    function getDeepKeys(obj: Record<string, any>, prefix = ""): string[] {
      return Object.keys(obj).reduce((res: string[], el: string) => {
        if (typeof obj[el] === "object" && obj[el] !== null && !Array.isArray(obj[el])) {
          return [...res, ...getDeepKeys(obj[el], prefix + el + ".")];
        }
        return [...res, prefix + el];
      }, []);
    }

    const idKeys = getDeepKeys(accountingId).sort();
    const enKeys = getDeepKeys(accountingEn).sort();

    expect(idKeys).toEqual(enKeys);
    expect(idKeys.length).toBeGreaterThan(50);

    // Check po.json deep keys
    const poIdKeys = getDeepKeys(poId).sort();
    const poEnKeys = getDeepKeys(poEn).sort();
    expect(poIdKeys).toEqual(poEnKeys);
    expect(poIdKeys.length).toBeGreaterThan(20);

    // Check approvals.json deep keys
    const apprvIdKeys = getDeepKeys(approvalsId).sort();
    const apprvEnKeys = getDeepKeys(approvalsEn).sort();
    expect(apprvIdKeys).toEqual(apprvEnKeys);
    expect(apprvIdKeys.length).toBeGreaterThan(40);

    // Ensure no empty translation values in po and approvals
    for (const key of poIdKeys) {
      const parts = key.split(".");
      let valId: any = poId;
      let valEn: any = poEn;
      for (const p of parts) {
        valId = valId[p];
        valEn = valEn[p];
      }
      expect(typeof valId).toBe("string");
      expect(valId.trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect(valEn.trim().length).toBeGreaterThan(0);
    }

    for (const key of apprvIdKeys) {
      const parts = key.split(".");
      let valId: any = approvalsId;
      let valEn: any = approvalsEn;
      for (const p of parts) {
        valId = valId[p];
        valEn = valEn[p];
      }
      expect(typeof valId).toBe("string");
      expect(valId.trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect(valEn.trim().length).toBeGreaterThan(0);
    }

    // Ensure no empty translation values
    for (const key of idKeys) {
      const parts = key.split(".");
      let valId: any = accountingId;
      let valEn: any = accountingEn;
      for (const p of parts) {
        valId = valId[p];
        valEn = valEn[p];
      }
      expect(typeof valId).toBe("string");
      expect(valId.trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect(valEn.trim().length).toBeGreaterThan(0);
    }
  });

  it("translates accounting glossary and dynamic data accurately", async () => {
    const {
      getLocalizedAccountName,
      getLocalizedCashFlowCategory,
      getLocalizedAccountType,
      getLocalizedNormalBalance,
      getLocalizedPeriodName,
      getLocalizedPeriodStatus,
    } = await import("@/lib/glossary");

    // Standard CoA
    expect(getLocalizedAccountName({ code: "1-1101", name: "Kas Kecil" }, "en")).toBe("Petty Cash");
    expect(getLocalizedAccountName({ code: "1-1101", name: "Kas Kecil" }, "id")).toBe("Kas Kecil");

    // Suffix preservation for customer/client sub-accounts
    expect(
      getLocalizedAccountName({ code: "1-1202", name: "Piutang Usaha - TIM Travel RMM" }, "en")
    ).toBe("Accounts Receivable - TIM Travel RMM");
    expect(
      getLocalizedAccountName({ code: "2-1402", name: "Pendapatan Diterima di Muka - Development" }, "en")
    ).toBe("Unearned Revenue - Development");

    // Cash flow categories (fixing raw enum Cash_equivalent / Operating bug)
    expect(getLocalizedCashFlowCategory("cash_equivalent", "en")).toBe("Cash & Cash Equivalent");
    expect(getLocalizedCashFlowCategory("cash_equivalent", "id")).toBe("Setara Kas");
    expect(getLocalizedCashFlowCategory("operating", "en")).toBe("Operating Activities");
    expect(getLocalizedCashFlowCategory("operating", "id")).toBe("Aktivitas Operasi");

    // Account types
    expect(getLocalizedAccountType("asset", "en")).toBe("Asset");
    expect(getLocalizedAccountType("asset", "id")).toBe("Aset");
    expect(getLocalizedAccountType("liability", "en")).toBe("Liability");
    expect(getLocalizedAccountType("liability", "id")).toBe("Liabilitas");

    // Normal balance
    expect(getLocalizedNormalBalance("debit", "en")).toBe("Debit");
    expect(getLocalizedNormalBalance("credit", "en")).toBe("Credit");
    expect(getLocalizedNormalBalance("credit", "id")).toBe("Kredit");

    // Periods
    expect(getLocalizedPeriodName("Agustus 2026", "en")).toBe("August 2026");
    expect(getLocalizedPeriodName("Agustus 2026", "id")).toBe("Agustus 2026");
    expect(getLocalizedPeriodStatus("open", "en")).toBe("Open Period");
    expect(getLocalizedPeriodStatus("open", "id")).toBe("Periode Terbuka");
    expect(getLocalizedPeriodStatus("closed", "en")).toBe("Closed Period");
    expect(getLocalizedPeriodStatus("closed", "id")).toBe("Periode Ditutup");
  });
});
