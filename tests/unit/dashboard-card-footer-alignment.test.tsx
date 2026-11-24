// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import {
  ChartLegendFooter,
  ChartValueFooter,
  ChartSummaryRow,
} from "@/components/shared/dashboard-charts";
import { AdminDashboardPage } from "@/features/master-data/admin-dashboard";
import { UserDashboardPage } from "@/features/dashboard/user-dashboard";
import { SuperAdminDashboardPage } from "@/features/system-config/super-admin-dashboard";
import { AuthProvider } from "@/features/auth/auth-context";

vi.mock("@/lib/data-service", () => ({
  listAccounts: vi.fn().mockResolvedValue([]),
  listPeriods: vi.fn().mockResolvedValue([]),
  listProjects: vi.fn().mockResolvedValue({ projects: [], total: 0 }),
  listCustomers: vi.fn().mockResolvedValue([]),
  listAuditLogs: vi.fn().mockResolvedValue([]),
  listProfiles: vi.fn().mockResolvedValue([]),
  getCompanyProfile: vi.fn().mockResolvedValue({
    id: "comp-1",
    company_name: "Altvira",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }),
}));

vi.mock("@/lib/operations-service", () => ({
  listJournalsWithLines: vi.fn().mockResolvedValue({ journals: [], lines: [] }),
  listPaymentRequests: vi.fn().mockResolvedValue({ requests: [], total: 0 }),
  listPurchaseOrders: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
  getProfitSharingBundle: vi.fn().mockResolvedValue({ lines: [], results: [] }),
  getProjectWorkspace: vi.fn().mockResolvedValue({ invoices: [], clientPos: [] }),
  recordExportLog: vi.fn().mockResolvedValue(undefined),
}));

describe("Dashboard Card Footer Alignment & Shared Architecture", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("(a) Komponen bersama ChartLegendFooter dan ChartValueFooter memiliki tinggi dan kelas border yang seragam", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <div className="grid grid-cols-2">
          <ChartCard
            title="Kartu Kiri"
            footer={
              <ChartLegendFooter
                series={[
                  { key: "a", label: "Seri A", color: "#10b981" },
                  { key: "b", label: "Seri B", color: "#f59e0b" },
                ]}
              />
            }
          >
            <div>Konten Kiri</div>
          </ChartCard>
          <ChartCard
            title="Kartu Kanan"
            footer={
              <ChartValueFooter
                label="Total Metrik"
                value="Rp10.000.000"
                trend="up"
              />
            }
          >
            <div>Konten Kanan</div>
          </ChartCard>
        </div>
      </I18nextProvider>
    );

    const footers = container.querySelectorAll(".border-t.border-border\\/70");
    // Tepat 2 footer (1 untuk kartu kiri, 1 untuk kartu kanan)
    expect(footers.length).toBe(2);

    const leftFooter = footers[0] as HTMLElement;
    const rightFooter = footers[1] as HTMLElement;

    // Pastikan kedua footer memiliki min-height 48px dan padding px-6 py-2.5 sm:py-3
    expect(leftFooter.className).toContain("min-h-[48px]");
    expect(rightFooter.className).toContain("min-h-[48px]");
    expect(leftFooter.className).toContain("px-6");
    expect(rightFooter.className).toContain("px-6");
    expect(leftFooter.className).toContain("border-t");
    expect(rightFooter.className).toContain("border-t");
  });

  it("(b & d) ChartSummaryRow berada di atas garis footer tanpa garis pemisah atas dan tanpa divide-x", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ChartCard
          title="Kartu dengan Summary"
          summary={
            <ChartSummaryRow
              items={[
                { label: "Metrik 1", value: "100" },
                { label: "Metrik 2", value: "200" },
                { label: "Metrik 3", value: "300" },
              ]}
            />
          }
          footer={
            <ChartLegendFooter
              series={[{ key: "1", label: "Seri 1", color: "#10b981" }]}
            />
          }
        >
          <div>Area Grafik</div>
        </ChartCard>
      </I18nextProvider>
    );

    // Periksa bahwa summary row tidak memiliki border-t dan divide-x
    const summaryEl = container.querySelector(".grid.bg-muted\\/10");
    expect(summaryEl).toBeInTheDocument();
    expect(summaryEl?.className).not.toContain("border-t");
    expect(summaryEl?.className).not.toContain("divide-x");

    // Periksa bahwa footer tetap memiliki border-t
    const footerEl = container.querySelector(".border-t.border-border\\/70");
    expect(footerEl).toBeInTheDocument();
    expect(footerEl).toHaveTextContent("Keterangan");
  });

  it("(c) Admin Dashboard merender tepat satu footer per kartu dan footer kanan memuat indikator pertumbuhan", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <I18nextProvider i18n={i18n}>
            <AdminDashboardPage />
          </I18nextProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Cari kartu Tren Bulanan & Komposisi Keuangan setelah selesai loading
    const trendsTitle = await screen.findByRole("heading", {
      name: /Tren Pendapatan, Beban, & Arus Kas/i,
    });
    expect(trendsTitle).toBeInTheDocument();

    const compTitle = screen.getByRole("heading", {
      name: /^Komposisi Keuangan$/i,
    });
    expect(compTitle).toBeInTheDocument();

    // Dapatkan kontainer grid yang memuat kedua kartu tersebut
    const gridContainer = trendsTitle.closest(".grid");
    expect(gridContainer).toBeInTheDocument();

    // Kartu kiri dan kartu kanan
    const cards = gridContainer?.children;
    expect(cards?.length).toBe(2);

    const leftCard = cards?.[0] as HTMLElement;
    const rightCard = cards?.[1] as HTMLElement;

    // Verifikasi (b): Tepat satu footer per kartu
    const leftFooters = leftCard.querySelectorAll(".border-t.border-border\\/70");
    const rightFooters = rightCard.querySelectorAll(".border-t.border-border\\/70");
    expect(leftFooters.length).toBe(1);
    expect(rightFooters.length).toBe(1);

    // Verifikasi (c): Footer kanan memuat indikator pertumbuhan (SVG trending icon)
    expect(rightFooters[0]?.querySelector("svg")).toBeInTheDocument();

    // Verifikasi (d): Baris ringkasan kiri tidak memiliki border-t dan divide-x
    const leftSummary = leftCard.querySelector(".grid.bg-muted\\/10");
    expect(leftSummary).toBeInTheDocument();
    expect(leftSummary?.className).not.toContain("border-t");
    expect(leftSummary?.className).not.toContain("divide-x");
  });

  it("(c) User Dashboard merender tepat satu footer per kartu tanpa footer ganda", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <I18nextProvider i18n={i18n}>
            <UserDashboardPage />
          </I18nextProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const activityTitle = await screen.findByText(/Aktivitas PO & Pengajuan Pembayaran/i);
    expect(activityTitle).toBeInTheDocument();

    const claimsTitle = await screen.findByText(/Status Klaim & Bagi Hasil/i);
    expect(claimsTitle).toBeInTheDocument();

    const gridContainer = activityTitle.closest(".grid");
    const cards = gridContainer?.children;
    expect(cards?.length).toBe(2);

    const leftCard = cards?.[0] as HTMLElement;
    const rightCard = cards?.[1] as HTMLElement;

    // Tepat 1 footer pada kartu kiri dan 1 footer pada kartu kanan
    const leftFooters = leftCard.querySelectorAll(".border-t.border-border\\/70");
    const rightFooters = rightCard.querySelectorAll(".border-t.border-border\\/70");
    expect(leftFooters.length).toBe(1);
    expect(rightFooters.length).toBe(1);

    // Periksa bahwa summary kiri tidak memiliki border-t dan divide-x
    const leftSummary = leftCard.querySelector(".grid.bg-muted\\/10");
    expect(leftSummary).toBeInTheDocument();
    expect(leftSummary?.className).not.toContain("border-t");
    expect(leftSummary?.className).not.toContain("divide-x");
  });

  it("(e) Super Admin Dashboard memiliki baris Keterangan pada kartu kiri dan satu footer Pengguna Aktif pada kartu kanan", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <I18nextProvider i18n={i18n}>
            <SuperAdminDashboardPage />
          </I18nextProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const auditTitle = await screen.findByText(/Aktivitas Audit & Perubahan Data/i);
    expect(auditTitle).toBeInTheDocument();

    const masterTitle = await screen.findByText(/Komposisi Master Sistem/i);
    expect(masterTitle).toBeInTheDocument();

    const gridContainer = auditTitle.closest(".grid");
    const cards = gridContainer?.children;
    expect(cards?.length).toBe(2);

    const leftCard = cards?.[0] as HTMLElement;
    const rightCard = cards?.[1] as HTMLElement;

    // Tepat satu footer per kartu
    const leftFooters = leftCard.querySelectorAll(".border-t.border-border\\/70");
    const rightFooters = rightCard.querySelectorAll(".border-t.border-border\\/70");
    expect(leftFooters.length).toBe(1);
    expect(rightFooters.length).toBe(1);

    // Kartu kiri Super Admin kini memuat footer Keterangan dengan legenda interaktif
    expect(leftFooters[0]).toHaveTextContent("Keterangan");
    expect(leftFooters[0]).toHaveTextContent("Operasi Tambah");
    expect(leftFooters[0]).toHaveTextContent("Operasi Ubah");
    expect(leftFooters[0]).toHaveTextContent("Operasi Hapus");

    // Kartu kanan Super Admin memuat footer tunggal Pengguna Aktif
    expect(rightFooters[0]).toHaveTextContent("Pengguna Aktif");

    // Summary row kiri tidak memiliki garis pemisah
    const leftSummary = leftCard.querySelector(".grid.bg-muted\\/10");
    expect(leftSummary).toBeInTheDocument();
    expect(leftSummary?.className).not.toContain("border-t");
    expect(leftSummary?.className).not.toContain("divide-x");
  });
});
