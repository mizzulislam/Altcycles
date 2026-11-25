/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  isDemoMode: true,
  supabase: null,
  IDLE_TIMEOUT_MINUTES: 30,
  TAB_AUTH_STORAGE_KEY: "altcycles_tab_auth_token",
}));

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

import { AuditTrailPage } from "@/features/system-config/audit-trail-page";
import { LoginMediaPage } from "@/features/system-config/login-media-page";
import {
  createLoginMediaItem,
  demoStore,
  listAllLoginMedia,
  listAuditLogs,
  listAuditLogsSummary,
  setDemoCurrentUser,
} from "@/lib/data-service";
import { LanguageProvider } from "@/lib/i18n";
import {
  getDashboardBillingSummary,
  listMyNotifications,
  markAllNotificationsRead,
} from "@/lib/operations-service";
import { invalidateAndNotifyDataChange, peekCache } from "@/lib/realtime-cache";

describe("Kelompok D — Item 9 (Optimasi Performa Loading Halaman, SWR Cache, & Isolasi Re-render)", () => {
  const initialAuditLogs = structuredClone(demoStore.auditLogs);
  const initialNotifications = structuredClone(demoStore.notifications);

  beforeEach(() => {
    localStorage.clear();
    invalidateAndNotifyDataChange("test_reset");
    demoStore.auditLogs = structuredClone(initialAuditLogs);
    demoStore.notifications = structuredClone(initialNotifications);

    const superAdmin = demoStore.profiles.find((p) => p.role === "super_admin");
    if (superAdmin) {
      setDemoCurrentUser(superAdmin.id);
    }
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("(a) membatasi query listAuditLogs (default 300 baris), mendukung mode summaryOnly tanpa payload JSONB berat, dan menyimpan hasil di SWR cache", async () => {
    // Tambahkan 400 baris log sintetis dengan payload old_data/new_data besar
    for (let i = 1; i <= 400; i++) {
      demoStore.auditLogs.unshift({
        id: 10_000 + i,
        actor_id: "00000000-0000-0000-0000-000000000001",
        actor_role: "super_admin",
        action: i % 2 === 0 ? "UPDATE" : "INSERT",
        entity_name: "company_profile",
        entity_id: String(i),
        old_data: { heavy_payload: "X".repeat(1024) },
        new_data: { heavy_payload: "Y".repeat(1024) },
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      });
    }

    // 1. Default listAuditLogs() membatasi 300 baris dan mengisi cache
    const fullLogs = await listAuditLogs();
    expect(fullLogs).toHaveLength(300);
    expect(fullLogs[0]?.new_data).not.toBeNull();
    expect(peekCache("audit_logs:list:300:full")).toBeDefined();

    // 2. listAuditLogsSummary(300) membuang old_data & new_data (null) sehingga hemat >90% memori/payload
    const summaryLogs = await listAuditLogsSummary(300);
    expect(summaryLogs).toHaveLength(300);
    expect(summaryLogs[0]?.old_data).toBeNull();
    expect(summaryLogs[0]?.new_data).toBeNull();
    expect(peekCache("audit_logs:list:300:summary")).toBeDefined();

    const fullJsonSize = JSON.stringify(fullLogs).length;
    const summaryJsonSize = JSON.stringify(summaryLogs).length;
    // Ukuran JSON summary wajib jauh lebih kecil (< 20% dari full JSON)
    expect(summaryJsonSize).toBeLessThan(fullJsonSize * 0.2);
  });

  it("(b) merender AuditTrailPage dengan pencarian pra-indeks yang cepat atas 300 baris log", async () => {
    for (let i = 1; i <= 250; i++) {
      demoStore.auditLogs.unshift({
        id: 20_000 + i,
        actor_id: "00000000-0000-0000-0000-000000000001",
        actor_role: "super_admin",
        action: "UPDATE",
        entity_name: i === 125 ? "target_entity_khusus" : "regular_entity",
        entity_id: `ENT-${i}`,
        old_data: null,
        new_data: { ok: true },
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      });
    }

    render(
      <LanguageProvider>
        <MemoryRouter>
          <AuditTrailPage />
        </MemoryRouter>
      </LanguageProvider>,
    );

    expect(await screen.findByText("#20001")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Cari entitas, ID transaksi, atau pelaku|Search entity, transaction ID, or actor/i,
    );
    fireEvent.change(searchInput, { target: { value: "target_entity_khusus" } });

    expect(await screen.findByText("target_entity_khusus")).toBeInTheDocument();
    expect(screen.getByText("ENT-125")).toBeInTheDocument();
  });

  it("(c) mengisolasi ticker 3,2 detik pada LoginMediaPage, memasang lazy/async image decoding, dan memangkas Base64 dari log audit media", async () => {
    const hugeBase64 = `data:image/png;base64,${"A".repeat(2048)}`;
    await createLoginMediaItem({
      title: "Banner Promo Akhir Tahun",
      subtitle: "Diskon ERP",
      category: "banner",
      image_url: hugeBase64,
      link_url: "https://altvira.tech",
      display_order: 1,
      is_active: true,
    });

    // Pastikan cache login_media:all bekerja dan log audit tidak menyimpan string Base64 ribuan karakter mentah
    const mediaRes = await listAllLoginMedia();
    expect(mediaRes.items).toHaveLength(1);
    expect(peekCache("login_media:all")).toBeDefined();

    const latestAudit = demoStore.auditLogs[0];
    expect(latestAudit?.entity_name).toBe("login_media_items");
    const serializedAuditNew = JSON.stringify(latestAudit?.new_data ?? {});
    expect(serializedAuditNew).toContain("[MEDIA_URL_");
    expect(serializedAuditNew).not.toContain("A".repeat(500));

    render(
      <LanguageProvider>
        <MemoryRouter>
          <LoginMediaPage />
        </MemoryRouter>
      </LanguageProvider>,
    );

    expect(
      await screen.findByText("Banner Promo Akhir Tahun", { selector: "p.font-semibold" }),
    ).toBeInTheDocument();

    // Verifikasi gambar di dalam tabel memiliki atribut loading="lazy" dan decoding="async"
    const allImgs = screen.getAllByRole("img", { name: "Banner Promo Akhir Tahun" });
    const tableImg = allImgs.find((img) => img.getAttribute("loading") === "lazy");
    expect(tableImg).toBeDefined();
    expect(tableImg).toHaveAttribute("decoding", "async");

    // Verifikasi komponen ticker terisolasi memiliki data-testid="login-media-category-ticker"
    const tickerEl = screen.getByTestId("login-media-category-ticker");
    expect(tickerEl.textContent).toMatch(/1\s+Banner/i);
  });

  it("(d) menggunakan getDashboardBillingSummary (2 tabel, ter-cache) untuk Dashboard Bendahara dan membatasi listMyNotifications (maks 50 item, ter-cache)", async () => {
    const adminUser = demoStore.profiles.find((p) => p.role === "admin")!;
    setDemoCurrentUser(adminUser.id);

    // 1. getDashboardBillingSummary mengisi cache workspace:dashboard_billing_summary
    const summary = await getDashboardBillingSummary();
    expect(Array.isArray(summary.invoices)).toBe(true);
    expect(typeof summary.pendingClientPosCount).toBe("number");
    expect(peekCache("workspace:dashboard_billing_summary")).toBeDefined();

    // 2. Tambahkan 75 notifikasi untuk adminUser -> listMyNotifications membatasi 50 item & ter-cache
    for (let i = 1; i <= 75; i++) {
      demoStore.notifications.push({
        id: `notif-perf-${i}`,
        user_id: adminUser.id,
        title: `Notifikasi #${i}`,
        body: "Uji batas 50 notifikasi",
        link_path: "/admin/dashboard",
        is_read: false,
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      });
    }
    invalidateAndNotifyDataChange("notifications");

    const notifs = await listMyNotifications();
    expect(notifs).toHaveLength(50);
    expect(peekCache("notifications:my")).toBeDefined();

    // Saat markAllNotificationsRead dipanggil, cache notifications dibersihkan dan semua berubah is_read = true
    await markAllNotificationsRead();
    const afterRead = await listMyNotifications();
    expect(afterRead.every((n) => n.is_read)).toBe(true);
  });
});
