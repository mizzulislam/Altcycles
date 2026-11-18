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
  });
});
