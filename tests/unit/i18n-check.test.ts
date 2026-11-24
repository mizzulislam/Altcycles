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
    const dashboardId = (await import("@/locales/id/dashboard.json")).default;
    const dashboardEn = (await import("@/locales/en/dashboard.json")).default;
    const partiesId = (await import("@/locales/id/parties.json")).default;
    const partiesEn = (await import("@/locales/en/parties.json")).default;
    const settingsId = (await import("@/locales/id/settings.json")).default;
    const settingsEn = (await import("@/locales/en/settings.json")).default;

    const accountingId = (await import("@/locales/id/accounting.json")).default;
    const accountingEn = (await import("@/locales/en/accounting.json")).default;

    function getDeepKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      return Object.keys(obj).reduce((res: string[], el: string) => {
        const val = obj[el];
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          return [...res, ...getDeepKeys(val as Record<string, unknown>, prefix + el + ".")];
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

    // Check dashboard.json deep keys
    const dashIdKeys = getDeepKeys(dashboardId).sort();
    const dashEnKeys = getDeepKeys(dashboardEn).sort();
    expect(dashIdKeys).toEqual(dashEnKeys);
    expect(dashIdKeys.length).toBeGreaterThan(40);

    // Check parties.json deep keys
    const partiesIdKeys = getDeepKeys(partiesId).sort();
    const partiesEnKeys = getDeepKeys(partiesEn).sort();
    expect(partiesIdKeys).toEqual(partiesEnKeys);
    expect(partiesIdKeys.length).toBeGreaterThan(60);

    // Check settings.json deep keys
    const settingsIdKeys = getDeepKeys(settingsId).sort();
    const settingsEnKeys = getDeepKeys(settingsEn).sort();
    expect(settingsIdKeys).toEqual(settingsEnKeys);
    expect(settingsIdKeys.length).toBeGreaterThan(60);

    function getLeafValue(root: unknown, pathSegments: string[]): unknown {
      let curr: unknown = root;
      for (const p of pathSegments) {
        if (curr === undefined || curr === null || typeof curr !== "object") return undefined;
        curr = (curr as Record<string, unknown>)[p];
      }
      return curr;
    }

    for (const key of settingsIdKeys) {
      const parts = key.split(".");
      const valId = getLeafValue(settingsId, parts);
      const valEn = getLeafValue(settingsEn, parts);
      expect(typeof valId).toBe("string");
      expect((valId as string).trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect((valEn as string).trim().length).toBeGreaterThan(0);
    }

    for (const key of partiesIdKeys) {
      const parts = key.split(".");
      const valId = getLeafValue(partiesId, parts);
      const valEn = getLeafValue(partiesEn, parts);
      expect(typeof valId).toBe("string");
      expect((valId as string).trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect((valEn as string).trim().length).toBeGreaterThan(0);
    }

    // Ensure no empty translation values in budgeting and profit sharing
    for (const key of budgetIdKeys) {
      const parts = key.split(".");
      const valId = getLeafValue(budgetingId, parts);
      const valEn = getLeafValue(budgetingEn, parts);
      expect(typeof valId).toBe("string");
      expect((valId as string).trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect((valEn as string).trim().length).toBeGreaterThan(0);
    }

    for (const key of profitIdKeys) {
      const parts = key.split(".");
      const valId = getLeafValue(profitSharingId, parts);
      const valEn = getLeafValue(profitSharingEn, parts);
      expect(typeof valId).toBe("string");
      expect((valId as string).trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect((valEn as string).trim().length).toBeGreaterThan(0);
    }

    // Ensure no empty translation values in po and approvals
    for (const key of poIdKeys) {
      const parts = key.split(".");
      const valId = getLeafValue(poId, parts);
      const valEn = getLeafValue(poEn, parts);
      expect(typeof valId).toBe("string");
      expect((valId as string).trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect((valEn as string).trim().length).toBeGreaterThan(0);
    }

    for (const key of apprvIdKeys) {
      const parts = key.split(".");
      const valId = getLeafValue(approvalsId, parts);
      const valEn = getLeafValue(approvalsEn, parts);
      expect(typeof valId).toBe("string");
      expect((valId as string).trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect((valEn as string).trim().length).toBeGreaterThan(0);
    }

    // Ensure no empty translation values
    for (const key of idKeys) {
      const parts = key.split(".");
      const valId = getLeafValue(accountingId, parts);
      const valEn = getLeafValue(accountingEn, parts);
      expect(typeof valId).toBe("string");
      expect((valId as string).trim().length).toBeGreaterThan(0);
      expect(typeof valEn).toBe("string");
      expect((valEn as string).trim().length).toBeGreaterThan(0);
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

    function loadNamespaceJson(dir: string): Record<string, unknown> {
      const map: Record<string, unknown> = {};
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

    function hasKey(data: Record<string, unknown>, fullKey: string) {
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
      let curr: unknown = root;
      for (const s of segments) {
        if (curr === undefined || curr === null || typeof curr !== "object") return false;
        curr = (curr as Record<string, unknown>)[s];
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

  it("verifies COA_NAME_MAP, COA_DESCRIPTION_MAP, SYSTEM_TAG_MAP, and catalog helpers completeness (Items 4 & 5)", async () => {
    const {
      COA_NAME_MAP,
      COA_DESCRIPTION_MAP,
      SYSTEM_TAG_MAP,
      CATALOG_DEFAULT_ITEMS_MAP,
      getLocalizedAccountName,
      getLocalizedAccountDescription,
      getLocalizedSystemTag,
      getLocalizedServiceUnit,
      getLocalizedCatalogProduct,
      getLocalizedTransactionDescription,
    } = await import("@/lib/glossary");
    const { DEMO_ACCOUNTS } = await import("@/lib/demo-seed");
    const { listServicesProducts } = await import(
      "@/lib/services/products-services-service"
    );
    const defaultServicesProducts = await listServicesProducts();

    // 1. Every COA_NAME_MAP key must have non-empty id & en and matching COA_DESCRIPTION_MAP
    for (const [code, names] of Object.entries(COA_NAME_MAP)) {
      expect(names.id.trim().length).toBeGreaterThan(0);
      expect(names.en.trim().length).toBeGreaterThan(0);
      expect(COA_DESCRIPTION_MAP[code]).toBeDefined();
      expect(COA_DESCRIPTION_MAP[code]!.id.trim().length).toBeGreaterThan(0);
      expect(COA_DESCRIPTION_MAP[code]!.en.trim().length).toBeGreaterThan(0);
    }

    // 2. Every DEMO_ACCOUNTS item must resolve to pure English name & description in 'en' mode
    for (const acc of DEMO_ACCOUNTS) {
      const nameEn = getLocalizedAccountName(acc, "en");
      const descEn = getLocalizedAccountDescription(acc.code, acc.description, "en");
      expect(nameEn.trim().length).toBeGreaterThan(0);
      expect(descEn.trim().length).toBeGreaterThan(0);
      expect(nameEn).not.toMatch(/\b(Kas|Piutang|Beban|Pendapatan|Utang|Laba|Modal|Ekuitas)\b/);
      expect(descEn).not.toMatch(/\b(Akun|Digunakan|Mencatat|Pencatatan|Saldo|Dana)\b/);
    }

    // 3. Additional user-observed accounts (1-1402, 2-1403, 4-1102, 7-0000, 7-1101, 7-2101, 7-2201)
    const extraAccounts = [
      { code: "1-1402", name: "Beban Dibayar di Muka - Server", description: "Biaya sewa server tahunan" },
      { code: "2-1403", name: "Pendapatan Diterima di Muka - Hosting", description: "Uang muka hosting klien" },
      { code: "4-1102", name: "Pendapatan Jasa Pengembangan Website", description: "Pendapatan pengembangan website" },
      { code: "7-0000", name: "PENDAPATAN & BEBAN LAIN-LAIN", description: "Header akun non-operasional" },
      { code: "7-1101", name: "Pendapatan Bunga Bank", description: "Jasa giro dan bunga bank" },
      { code: "7-2101", name: "Beban Pajak Final atas Bunga", description: "Pajak final PPh atas bunga bank" },
      { code: "7-2201", name: "Beban Administrasi Bank", description: "Biaya admin bulanan rekening bank" },
    ];
    for (const acc of extraAccounts) {
      const nameEn = getLocalizedAccountName(acc, "en");
      const descEn = getLocalizedAccountDescription(acc.code, acc.description, "en");
      expect(nameEn).not.toMatch(/\b(Beban|Pendapatan|Biaya|Pajak)\b/i);
      expect(descEn).not.toMatch(/\b(Biaya|Uang|Pendapatan|Pajak)\b/i);
    }

    // 4. System tags: all 14 tags must translate cleanly without snake_case in both id and en
    const allTags = Object.keys(SYSTEM_TAG_MAP);
    expect(allTags.length).toBeGreaterThanOrEqual(14);
    for (const tag of allTags) {
      if (tag === "none") {
        expect(getLocalizedSystemTag(tag, "id")).toBe("-");
        expect(getLocalizedSystemTag(tag, "en")).toBe("-");
        continue;
      }
      const labelId = getLocalizedSystemTag(tag, "id");
      const labelEn = getLocalizedSystemTag(tag, "en");
      expect(labelId).not.toContain("_");
      expect(labelEn).not.toContain("_");
      expect(labelId.length).toBeGreaterThan(2);
      expect(labelEn.length).toBeGreaterThan(2);
    }

    // 5. Catalog products & service units (Item 5)
    expect(getLocalizedServiceUnit("Proyek", "en")).toBe("Project");
    expect(getLocalizedServiceUnit("Paket / Modul", "en")).toBe("Package / Module");
    expect(getLocalizedServiceUnit("Paket", "en")).toBe("Package");
    expect(getLocalizedServiceUnit("Bulan", "en")).toBe("Month");

    for (const item of defaultServicesProducts) {
      expect(CATALOG_DEFAULT_ITEMS_MAP[item.code]).toBeDefined();
      const locEn = getLocalizedCatalogProduct(item, "en");
      expect(locEn.name).not.toMatch(/\b(Pengembangan|Pemeliharaan|Pendampingan|Proyek)\b/i);
      expect(locEn.unit).not.toMatch(/\b(Proyek|Paket|Bulan)\b/i);
      expect(locEn.description).not.toMatch(/\b(Layanan|Pembuatan|Paket)\b/i);
    }

    // User-edited product name is preserved (not overwritten by default catalog map)
    const customEdited = getLocalizedCatalogProduct(
      {
        code: "SRV-001",
        name: "Custom AI Agent Integration by User",
        category: "Software Development",
        unit: "Proyek",
        description: "Custom description typed by user",
      },
      "en",
    );
    expect(customEdited.name).toBe("Custom AI Agent Integration by User");
    expect(customEdited.unit).toBe("Project");

    // 6. Automated journal descriptions in English
    expect(
      getLocalizedTransactionDescription(
        "Penerimaan termin 1 dari PT RMM berupa uang muka development dan pembayaran penuh hosting 1 tahun",
        "en",
      ),
    ).toBe(
      "Receipt of milestone 1 from PT RMM as advance payment for development and full 1-year hosting payment",
    );
    expect(
      getLocalizedTransactionDescription(
        "Pengakuan pendapatan hosting selama 42 hari (20 Sep s.d. 31 Okt 2026)",
        "en",
      ),
    ).toBe("Hosting revenue recognition for 42 days (20 Sep to 31 Oct 2026)");
    expect(
      getLocalizedTransactionDescription(
        "Pembebanan biaya server tahunan untuk 42 hari yang sudah terpakai (20 Sep s.d. 31 Okt 2026)",
        "en",
      ),
    ).toBe("Annual server cost allocation for 42 used days (20 Sep to 31 Oct 2026)");

    // 7. Invoice Kind labels (Fase 5 - I18N-001)
    const { getLocalizedInvoiceKind } = await import("@/lib/glossary");
    expect(getLocalizedInvoiceKind("down_payment", "id")).toBe("Uang Muka (DP)");
    expect(getLocalizedInvoiceKind("down_payment", "en")).toBe("Down Payment (DP)");
    expect(getLocalizedInvoiceKind("milestone", "id")).toBe("Termin Progres (Wajib BAKP)");
    expect(getLocalizedInvoiceKind("milestone", "en")).toBe("Progress Milestone (Requires BAKP)");
    expect(getLocalizedInvoiceKind("final_settlement", "id")).toBe("Pelunasan Akhir (Wajib BAST)");
    expect(getLocalizedInvoiceKind("final_settlement", "en")).toBe("Final Settlement (Requires BAST)");
  });

  it("verifies PDF layout parity (id vs en) and zero Indonesian leakage in English accounting PDFs (Items 1 & 2)", async () => {
    const {
      buildJournalsPdfSpec,
      buildGeneralLedgerPdfSpec,
      buildTrialBalancePdfSpec,
      buildIncomeStatementPdfSpec,
      buildRetainedEarningsPdfSpec,
      buildBalanceSheetPdfSpec,
      buildCashFlowPdfSpec,
      buildCompleteFinancialStatementsPdfSpec,
    } = await import("@/lib/pdf/specs/accounting-specs");
    const { inspectPdfDocumentLayout } = await import("@/lib/pdf/pdf-engine");
    const { DEMO_COMPANY: INITIAL_COMPANY } = await import("@/lib/demo-seed");

    const sampleJournalRows = [
      {
        date: "12 Nov 2026",
        description: "Kas di Bank - Bank Jago",
        ref: "1-1102",
        debit: 2000000,
        credit: 0,
      },
      {
        date: "",
        description: "    Pendapatan Diterima di Muka - Development",
        ref: "2-1402",
        debit: 0,
        credit: 2000000,
      },
      {
        date: "",
        description:
          "(Penerimaan termin 1 dari PT RMM berupa uang muka development dan pembayaran penuh hosting 1 tahun)",
        ref: "",
        debit: 0,
        credit: 0,
      },
    ];

    const ledgerAccounts = [
      {
        code: "1-1102",
        name: "Kas di Bank - Bank Jago",
        type: "Aset",
        normalBalance: "Debit",
        endingBalance: 2000000,
        rows: [
          {
            date: "12 Nov 2026",
            description:
              "Penerimaan termin 1 dari PT RMM berupa uang muka development dan pembayaran penuh hosting 1 tahun",
            ref: "JRN/ALT/2026/11/006",
            debit: 2000000,
            credit: 0,
            runningBalance: 2000000,
          },
        ],
      },
      {
        code: "1-1101",
        name: "Kas Kecil",
        type: "Aset",
        normalBalance: "Debit",
        endingBalance: 0,
        rows: [],
      },
    ];

    const tbRows = [
      {
        code: "1-1102",
        name: "Kas di Bank - Bank Jago",
        debit: 2000000,
        credit: 0,
      },
      {
        code: "4-1102",
        name: "Pendapatan Jasa Pengembangan Website",
        debit: 0,
        credit: 2000000,
      },
    ];

    const builders = [
      {
        name: "General Journal",
        build: (lang: "id" | "en") =>
          buildJournalsPdfSpec({
            company: INITIAL_COMPANY,
            isAdjusting: false,
            periodLabel: "Semua Periode",
            rows: sampleJournalRows,
            totalDebit: 2000000,
            totalCredit: 2000000,
            lang,
          }),
      },
      {
        name: "Adjusting Journal",
        build: (lang: "id" | "en") =>
          buildJournalsPdfSpec({
            company: INITIAL_COMPANY,
            isAdjusting: true,
            periodLabel: "Semua Periode",
            rows: sampleJournalRows,
            totalDebit: 2000000,
            totalCredit: 2000000,
            lang,
          }),
      },
      {
        name: "General Ledger",
        build: (lang: "id" | "en") =>
          buildGeneralLedgerPdfSpec({
            company: INITIAL_COMPANY,
            periodLabel: "Semua Periode",
            isAllAccounts: true,
            accounts: ledgerAccounts,
            lang,
          }),
      },
      {
        name: "Trial Balance",
        build: (lang: "id" | "en") =>
          buildTrialBalancePdfSpec({
            company: INITIAL_COMPANY,
            periodLabel: "Semua Periode",
            rows: tbRows,
            sumDebit: 2000000,
            sumCredit: 2000000,
            isBalanced: true,
            lang,
          }),
      },
      {
        name: "Income Statement",
        build: (lang: "id" | "en") =>
          buildIncomeStatementPdfSpec({
            company: INITIAL_COMPANY,
            periodLabel: "Semua Periode",
            revenueRows: [
              { label: "4-1102 — Pendapatan Jasa Pengembangan Website", amount: 2000000 },
            ],
            totalRevenue: 2000000,
            cogsRows: [
              { label: "5-1101 — Beban Cloud, Hosting, & Domain Proyek", amount: 500000 },
            ],
            grossProfit: 1500000,
            opexRows: [
              { label: "5-2101 — Beban Sewa & Utilitas Kantor Bersama", amount: 200000 },
            ],
            totalOpex: 200000,
            netIncome: 1300000,
            lang,
          }),
      },
      {
        name: "Retained Earnings",
        build: (lang: "id" | "en") =>
          buildRetainedEarningsPdfSpec({
            company: INITIAL_COMPANY,
            periodLabel: "Semua Periode",
            rows: [
              { label: "Saldo Laba Ditahan Awal Periode", amount: 0 },
              { label: "Ditambah: Laba (Rugi) Bersih Periode Berjalan", amount: 1300000 },
              { label: "Dikurangi: Prive Pemilik / Dividen", amount: 0 },
            ],
            endingRetainedEarnings: 1300000,
            lang,
          }),
      },
      {
        name: "Balance Sheet",
        build: (lang: "id" | "en") =>
          buildBalanceSheetPdfSpec({
            company: INITIAL_COMPANY,
            periodLabel: "Per 30 November 2026",
            currentAssetRows: [
              { label: "1-1102 — Kas di Bank - Bank Jago", amount: 11300000 },
            ],
            totalCurrentAssets: 11300000,
            nonCurrentAssetRows: [],
            totalNonCurrentAssets: 0,
            totalAssets: 11300000,
            currentLiabRows: [
              { label: "2-1101 — Utang Usaha Vendor", amount: 0 },
            ],
            totalCurrentLiabilities: 0,
            nonCurrentLiabRows: [],
            totalNonCurrentLiabilities: 0,
            totalLiabilities: 0,
            equityRows: [
              { label: "3-1101 — Modal Disetor Pemilik", amount: 10000000 },
              { label: "Laba (Rugi) Bersih Periode Berjalan", amount: 1300000 },
            ],
            totalEquity: 11300000,
            totalLiabilitiesAndEquity: 11300000,
            isBalanced: true,
            lang,
          }),
      },
      {
        name: "Cash Flow",
        build: (lang: "id" | "en") =>
          buildCashFlowPdfSpec({
            company: INITIAL_COMPANY,
            periodLabel: "Semua Periode",
            operatingRows: [
              { label: "Penerimaan Kas dari Pelanggan (Operasional)", amount: 2000000 },
              { label: "Pembayaran Kas Operasional & Vendor", amount: -500000 },
            ],
            netOperating: 1500000,
            netCashChange: 1500000,
            beginningCash: 0,
            endingCash: 1500000,
            lang,
          }),
      },
      {
        name: "Complete Financial Statements",
        build: (lang: "id" | "en") =>
          buildCompleteFinancialStatementsPdfSpec({
            company: INITIAL_COMPANY,
            periodLabel: "Semua Periode",
            incomeStatementRows: [
              ["PENDAPATAN USAHA", ""],
              ["  4-1102 — Pendapatan Jasa Pengembangan Website", "Rp 2.000.000"],
              ["TOTAL PENDAPATAN USAHA", "Rp 2.000.000"],
            ],
            retainedEarningsRows: [
              ["Saldo Laba Ditahan Awal Periode", "Rp 0"],
              ["TOTAL SALDO LABA DITAHAN AKHIR", "Rp 1.300.000"],
            ],
            balanceSheetRows: [
              ["ASET LANCAR", ""],
              ["  1-1102 — Kas di Bank - Bank Jago", "Rp 11.300.000"],
              ["TOTAL ASET", "Rp 11.300.000"],
            ],
            cashFlowRows: [
              ["AKTIVITAS OPERASI", ""],
              ["  Penerimaan Kas dari Pelanggan (Operasional)", "Rp 2.000.000"],
              ["SALDO KAS AKHIR PERIODE", "Rp 1.500.000"],
            ],
            lang,
          }),
      },
    ];

    const forbiddenIndonesianPattern =
      /\b(Semua Periode|Kas Kecil|Kas di Bank|Piutang Usaha|Pendapatan Diterima di Muka|Beban Dibayar di Muka|Pendapatan Jasa Pengembangan|Penerimaan termin|Pengakuan pendapatan|Pembebanan biaya|Dana masuk|Saldo Akhir|Tidak ada transaksi pada akun ini)\b/i;

    for (const item of builders) {
      const specId = item.build("id");
      const specEn = item.build("en");

      // Structural parity between id and en specs
      expect(specEn.tableRows?.length ?? 0).toBe(specId.tableRows?.length ?? 0);
      expect(specEn.tableColumns?.length ?? 0).toBe(specId.tableColumns?.length ?? 0);
      expect(specEn.sections?.length ?? 0).toBe(specId.sections?.length ?? 0);

      const layoutId = await inspectPdfDocumentLayout(specId);
      const layoutEn = await inspectPdfDocumentLayout(specEn);

      expect(layoutId.collisions).toEqual([]);
      expect(layoutEn.collisions).toEqual([]);
      expect(layoutEn.pageCount).toBe(layoutId.pageCount);

      // Ensure no Indonesian leakage in English PDF text boxes
      const allEnText = layoutEn.textBoxes.map((b) => b.text).join(" | ");
      expect(allEnText).not.toMatch(forbiddenIndonesianPattern);
    }
  });
});
