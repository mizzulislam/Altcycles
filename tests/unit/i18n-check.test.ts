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
});
