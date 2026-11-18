import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
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
    const budgetingId = (await import("@/locales/id/budgeting.json")).default;
    const budgetingEn = (await import("@/locales/en/budgeting.json")).default;
    const profitSharingId = (await import("@/locales/id/profit_sharing.json")).default;
    const profitSharingEn = (await import("@/locales/en/profit_sharing.json")).default;

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

    // Check budgeting.json deep keys
    const budgetIdKeys = getDeepKeys(budgetingId).sort();
    const budgetEnKeys = getDeepKeys(budgetingEn).sort();
    expect(budgetIdKeys).toEqual(budgetEnKeys);
    expect(budgetIdKeys.length).toBeGreaterThan(40);

    // Check profit_sharing.json deep keys
    const profitIdKeys = getDeepKeys(profitSharingId).sort();
    const profitEnKeys = getDeepKeys(profitSharingEn).sort();
    expect(profitIdKeys).toEqual(profitEnKeys);
    expect(profitIdKeys.length).toBeGreaterThan(50);

    // Ensure no empty translation values in budgeting and profit sharing
    for (const key of budgetIdKeys) {
      const parts = key.split(".");
      let valId: any = budgetingId;
      let valEn: any = budgetingEn;
      for (const p of parts) {
        valId = valId[p];
        valEn = valEn[p];
      }
      expect(typeof valId).toBe("string");
      expect(valId.trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect(valEn.trim().length).toBeGreaterThan(0);
    }

    for (const key of profitIdKeys) {
      const parts = key.split(".");
      let valId: any = profitSharingId;
      let valEn: any = profitSharingEn;
      for (const p of parts) {
        valId = valId[p];
        valEn = valEn[p];
      }
      expect(typeof valId).toBe("string");
      expect(valId.trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect(valEn.trim().length).toBeGreaterThan(0);
    }

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

  it("verifies accounting tab and journal headers resolve accurately in id and en", async () => {
    const { resolveTranslation } = await import("@/lib/i18n");

    const criticalKeys = [
      {
        key: "accounting:journals.history_title",
        id: "Riwayat Jurnal Umum",
        en: "General Journal History",
      },
      {
        key: "accounting:journals.history_desc",
        id: "Daftar historis kronologis seluruh pencatatan transaksi akuntansi keuangan.",
        en: "Chronological historical list of all financial accounting transactions.",
      },
      {
        key: "accounting:journals.record_transaction",
        id: "Catat Transaksi",
        en: "Record Transaction",
      },
      {
        key: "accounting:journals.daily_book_title",
        id: "Buku Jurnal Harian",
        en: "Daily Journal Book",
      },
      {
        key: "accounting:journals.th_date",
        id: "Tanggal",
        en: "Date",
      },
      {
        key: "accounting:journals.th_description",
        id: "Deskripsi",
        en: "Description",
      },
      {
        key: "accounting:journals.th_ref",
        id: "Ref",
        en: "Ref",
      },
      {
        key: "accounting:journals.th_debit",
        id: "Debit",
        en: "Debit",
      },
      {
        key: "accounting:journals.th_credit",
        id: "Kredit",
        en: "Credit",
      },
      {
        key: "accounting:journals.history_adj_title",
        id: "Riwayat Jurnal Penyesuaian",
        en: "Adjusting Journal History",
      },
      {
        key: "accounting:journals.record_adjusting",
        id: "Catat Penyesuaian",
        en: "Record Adjustment",
      },
      {
        key: "accounting:assumptions.title",
        id: "Asumsi & Prinsip Penyesuaian Akuntansi",
        en: "Accounting Adjustment Assumptions & Principles",
      },
    ];

    for (const item of criticalKeys) {
      const resId = resolveTranslation(item.key, "id", item.id);
      const resEn = resolveTranslation(item.key, "en", item.en);

      expect(resId).toBe(item.id);
      expect(resEn).toBe(item.en);

      // Verify that neither resolution matches raw key or snake_case
      expect(resId).not.toMatch(/^[a-z0-9_]+$/);
      expect(resEn).not.toMatch(/^[a-z0-9_]+$/);
      expect(resId).not.toContain("th_");
      expect(resEn).not.toContain("th_");
    }
  });

  it("ensures fallback safety: missing keys never return stripped snake_case subkeys", async () => {
    const { resolveTranslation } = await import("@/lib/i18n");

    // 1. Missing key in English with explicit fallback: MUST return fallback
    const fallbackText = "Catat Transaksi Baru";
    const resWithFallback = resolveTranslation(
      "accounting:non_existent_key_xyz",
      "en",
      fallbackText
    );
    expect(resWithFallback).toBe(fallbackText);
    expect(resWithFallback).not.toBe("non_existent_key_xyz");

    // 2. Missing key with no explicit fallback: MUST NOT strip to bare subkey
    const resNoFallback = resolveTranslation("accounting:unmapped_action_code", "en");
    expect(resNoFallback).not.toBe("unmapped_action_code");

    // 3. Known ID key but missing in EN: falls back to ID value safely
    const resIdFallback = resolveTranslation("common:action.confirm_continue", "en");
    expect(resIdFallback).toBeTruthy();
    expect(resIdFallback).not.toBe("confirm_continue");
  });

  it("statically verifies all t() keys used across src/ exist in both id and en locale files", () => {
    function getFiles(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          if (file !== "node_modules" && file !== ".git" && file !== "dist") {
            results = results.concat(getFiles(fullPath));
          }
        } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
          results.push(fullPath);
        }
      });
      return results;
    }

    const localesDir = path.resolve(process.cwd(), "src/locales");
    const idDir = path.join(localesDir, "id");
    const enDir = path.join(localesDir, "en");

    function loadNamespaceJson(dir: string) {
      const map: Record<string, any> = {};
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".json")) {
          const ns = f.replace(".json", "");
          map[ns] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        }
      }
      return map;
    }

    const idData = loadNamespaceJson(idDir);
    const enData = loadNamespaceJson(enDir);
    const i18nContent = fs.readFileSync(path.resolve(process.cwd(), "src/lib/i18n.tsx"), "utf8");

    function hasKey(data: Record<string, any>, fullKey: string) {
      let ns = "common";
      let subPath = fullKey;
      if (fullKey.includes(":")) {
        const parts = fullKey.split(":");
        ns = parts[0] || "common";
        subPath = parts.slice(1).join(":");
      } else if (
        fullKey.startsWith("accounting.") ||
        fullKey.startsWith("invoicing.") ||
        fullKey.startsWith("projects.") ||
        fullKey.startsWith("po.") ||
        fullKey.startsWith("approvals.") ||
        fullKey.startsWith("budgeting.") ||
        fullKey.startsWith("profit_sharing.")
      ) {
        const firstDot = fullKey.indexOf(".");
        ns = fullKey.substring(0, firstDot);
        subPath = fullKey.substring(firstDot + 1);
      }

      const root = data[ns];
      if (!root) return false;

      const segments = subPath.split(".");
      let curr: any = root;
      for (const s of segments) {
        if (curr === undefined || curr === null || typeof curr !== "object") return false;
        curr = curr[s];
      }
      return curr !== undefined && curr !== null;
    }

    const srcFiles = getFiles(path.resolve(process.cwd(), "src"));
    const tCallRegex = /\bt\(\s*["']([^"']+)["']/g;
    const missingKeys: { file: string; key: string; lang: string }[] = [];

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf8");
      let match;
      while ((match = tCallRegex.exec(content)) !== null) {
        const key = match[1];
        if (!key) continue;
        const inId = hasKey(idData, key);
        const inEn = hasKey(enData, key);
        const inDict = i18nContent.includes(`"${key}"`) || i18nContent.includes(`'${key}'`);

        const relPath = path.relative(process.cwd(), file);
        if (!inId && !inDict) {
          missingKeys.push({ file: relPath, key, lang: "id" });
        }
        if (!inEn && !inDict) {
          missingKeys.push({ file: relPath, key, lang: "en" });
        }
      }
    }

    expect(missingKeys).toEqual([]);
  });
});
