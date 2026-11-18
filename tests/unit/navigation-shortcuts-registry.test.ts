import { describe, expect, it, beforeEach } from "vitest";
import {
  NAVIGATION_SHORTCUTS_REGISTRY,
  getShortcutsForRole,
  getDefaultFrequentFallback,
  searchRegistry,
} from "@/lib/navigation-shortcuts-registry";
import {
  recordPageVisit,
  getFrequentPageIds,
  clearPageVisitHistory,
} from "@/lib/navigation-history";

describe("Registry Terpusat Navigasi & Pintasan Keyboard", () => {
  it("memiliki struktur valid dan lengkap pada setiap entri", () => {
    expect(NAVIGATION_SHORTCUTS_REGISTRY.length).toBeGreaterThan(15);

    NAVIGATION_SHORTCUTS_REGISTRY.forEach((item) => {
      expect(item.id).toBeTruthy();
      expect(["page", "tab", "action"]).toContain(item.type);
      expect(item.titleKey).toBeTruthy();
      expect(item.fallbackTitle).toBeTruthy();
      expect(item.module).toBeTruthy();
      expect(item.moduleLabelKey).toBeTruthy();
      expect(item.iconName).toBeTruthy();
      expect(item.allowedRoles.length).toBeGreaterThan(0);
      expect(Array.isArray(item.defaultKeys)).toBe(true);
      expect(Array.isArray(item.aliases.id)).toBe(true);
      expect(Array.isArray(item.aliases.en)).toBe(true);
    });
  });

  it("tidak memiliki duplikasi ID di seluruh registry", () => {
    const ids = NAVIGATION_SHORTCUTS_REGISTRY.map((it) => it.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("memastikan tombol pembuka Command Palette adalah '/' dan berstatus locked", () => {
    const openItem = NAVIGATION_SHORTCUTS_REGISTRY.find(
      (it) => it.id === "general_open_command_palette",
    );
    expect(openItem).toBeDefined();
    expect(openItem?.defaultKeys).toEqual(["/"]);
    expect(openItem?.isLocked).toBe(true);

    const escItem = NAVIGATION_SHORTCUTS_REGISTRY.find(
      (it) => it.id === "general_close_active_modal",
    );
    expect(escItem).toBeDefined();
    expect(escItem?.defaultKeys).toEqual(["escape"]);
    expect(escItem?.isLocked).toBe(true);
  });

  it("memastikan seluruh pintasan sekuensial dimulai dengan 'g' dan memiliki panjang 2 tombol", () => {
    const navSequences = NAVIGATION_SHORTCUTS_REGISTRY.filter(
      (it) => it.group === "navigation" && it.defaultKeys.length > 0,
    );

    navSequences.forEach((item) => {
      expect(item.defaultKeys[0]).toBe("g");
      expect(item.defaultKeys.length).toBe(2);
      expect(item.defaultKeys[1]?.length).toBe(1);
    });
  });

  it("menyaring entri secara ketat berdasarkan role pengguna", () => {
    const userItems = getShortcutsForRole("user");
    const adminItems = getShortcutsForRole("admin");
    const superAdminItems = getShortcutsForRole("super_admin");

    // User tidak boleh melihat modul akuntansi, audit trail, atau pengguna
    expect(userItems.some((it) => it.id === "nav_admin_accounting")).toBe(false);
    expect(userItems.some((it) => it.id === "nav_super_audit_trail")).toBe(false);
    expect(userItems.some((it) => it.id === "nav_super_users")).toBe(false);

    // Admin memiliki akses ke akuntansi dan operasional
    expect(adminItems.some((it) => it.id === "nav_admin_accounting")).toBe(true);
    expect(adminItems.some((it) => it.id === "tab_accounting_ledger")).toBe(true);
    expect(adminItems.some((it) => it.id === "nav_super_audit_trail")).toBe(false);

    // Super Admin memiliki akses ke dashboard sistem dan audit trail
    expect(superAdminItems.some((it) => it.id === "nav_super_dashboard")).toBe(true);
    expect(superAdminItems.some((it) => it.id === "nav_super_audit_trail")).toBe(true);
  });

  it("menyediakan fallback daftar pintasan bawaan saat riwayat kunjungan kosong", () => {
    const adminFallback = getDefaultFrequentFallback("admin");
    expect(adminFallback.length).toBe(5);
    expect(adminFallback).toContain("nav_admin_dashboard");
    expect(adminFallback).toContain("nav_admin_accounting");

    const superFallback = getDefaultFrequentFallback("super_admin");
    expect(superFallback.length).toBe(5);
    expect(superFallback).toContain("nav_super_dashboard");
    expect(superFallback).toContain("nav_super_users");
  });
});

describe("Fungsi Pencarian & Filter Command Palette (searchRegistry)", () => {
  it("dapat menemukan item lewat judul bahasa Indonesia maupun bahasa Inggris", () => {
    const resultsId = searchRegistry("Buku Besar", "admin");
    expect(resultsId.some((it) => it.id === "tab_accounting_ledger")).toBe(true);

    const resultsEn = searchRegistry("ledger", "admin");
    expect(resultsEn.some((it) => it.id === "tab_accounting_ledger")).toBe(true);
  });

  it("dapat menemukan item lewat alias kata kunci sinonim", () => {
    // "neraca lajur" adalah alias untuk Neraca Saldo (Trial Balance)
    const resultsAliasId = searchRegistry("neraca lajur", "admin");
    expect(resultsAliasId.some((it) => it.id === "tab_accounting_trial_balance")).toBe(true);

    // "trial balance"
    const resultsAliasEn = searchRegistry("trial balance", "admin");
    expect(resultsAliasEn.some((it) => it.id === "tab_accounting_trial_balance")).toBe(true);

    // "reimbursement" untuk user
    const resultsReimburse = searchRegistry("reimbursement", "user");
    expect(resultsReimburse.some((it) => it.id === "nav_user_payments")).toBe(true);
  });

  it("bersifat case-insensitive dan toleran terhadap spasi", () => {
    const uppercase = searchRegistry("   JURNAL UMUM   ", "admin");
    expect(uppercase.some((it) => it.id === "tab_accounting_journal")).toBe(true);

    const mixedCase = searchRegistry("pRoYeK", "admin");
    expect(mixedCase.some((it) => it.id === "nav_admin_projects")).toBe(true);
  });

  it("dapat menemukan entri 'Tampilkan semua pintasan keyboard' via keyword shortcut/keyboard/pintasan", () => {
    const findShortcuts1 = searchRegistry("pintasan", "admin");
    expect(findShortcuts1.some((it) => it.id === "action_open_shortcuts")).toBe(true);

    const findShortcuts2 = searchRegistry("shortcut", "user");
    expect(findShortcuts2.some((it) => it.id === "action_open_shortcuts")).toBe(true);

    const findShortcuts3 = searchRegistry("keyboard", "super_admin");
    expect(findShortcuts3.some((it) => it.id === "action_open_shortcuts")).toBe(true);
  });

  it("mengembalikan array kosong bila query sama sekali tidak cocok", () => {
    const noResults = searchRegistry("xyzabc123nonexistent", "admin");
    expect(noResults).toHaveLength(0);
  });
});

describe("Pelacak Frekuensi Kunjungan (Navigation History)", () => {
  beforeEach(() => {
    clearPageVisitHistory();
  });

  it("mengembalikan array kosong jika belum ada kunjungan dan mengembalikan ID saat dicatat", () => {
    expect(getFrequentPageIds("admin")).toEqual([]);

    recordPageVisit("nav_admin_dashboard", "admin");
    recordPageVisit("nav_admin_accounting", "admin");
    recordPageVisit("nav_admin_accounting", "admin");

    const frequent = getFrequentPageIds("admin");
    expect(frequent[0]).toBe("nav_admin_accounting"); // Dikunjungi 2 kali
    expect(frequent[1]).toBe("nav_admin_dashboard"); // Dikunjungi 1 kali
  });

  it("membatasi jumlah hasil sesuai limit yang diminta", () => {
    for (let i = 1; i <= 8; i++) {
      recordPageVisit(`page_${i}`, "user");
    }

    const top3 = getFrequentPageIds("user", 3);
    expect(top3.length).toBe(3);

    const top5 = getFrequentPageIds("user", 5);
    expect(top5.length).toBe(5);
  });
});
