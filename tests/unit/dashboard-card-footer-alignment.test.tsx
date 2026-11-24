// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import {
  ChartLegendRow,
  ChartValueFooter,
  ChartSummaryFooter,
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

  it("(a) Komponen bersama ChartSummaryFooter dan ChartValueFooter memiliki tinggi dan kelas border yang seragam", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <div className="grid grid-cols-2">
          <ChartCard
            title="Kartu Kiri"
            legend={
              <ChartLegendRow
                series={[
                  { key: "a", label: "Seri A", color: "#10b981" },
                  { key: "b", label: "Seri B", color: "#f59e0b" },
                ]}
              />
            }
            footer={
              <ChartSummaryFooter
                items={[
                  { label: "M1", value: "100" },
                  { label: "M2", value: "200" },
                  { label: "M3", value: "300" },
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

    // Pastikan kedua footer memiliki min-height 64px, border-t, dan bg-muted/10
    expect(leftFooter.className).toContain("min-h-[64px]");
    expect(rightFooter.className).toContain("min-h-[64px]");
    expect(leftFooter.className).toContain("border-t");
    expect(rightFooter.className).toContain("border-t");
    expect(leftFooter.className).toContain("bg-muted/10");
    expect(rightFooter.className).toContain("bg-muted/10");
  });

  it("(b & d) Susunan DOM kartu kiri: grafik -> Keterangan (tanpa border) -> SATU garis footer -> footer ringkasan", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ChartCard
          title="Kartu Grafik"
          legend={
            <ChartLegendRow
              series={[{ key: "1", label: "Seri 1", color: "#10b981" }]}
            />
          }
          footer={
            <ChartSummaryFooter
              items={[
                { label: "Metrik 1", value: "100" },
                { label: "Metrik 2", value: "200" },
                { label: "Metrik 3", value: "300" },
              ]}
            />
          }
        >
          <div data-testid="chart-area">Area Grafik</div>
        </ChartCard>
      </I18nextProvider>
    );

    // Keterangan berada di dalam CardContent tanpa garis border-t
    const legendEl = screen.getByText("Keterangan").closest("div");
    expect(legendEl).toBeInTheDocument();
    expect(legendEl?.className).not.toContain("border-t");
    expect(legendEl?.className).not.toContain("border-b");

    // Tepat satu footer dengan border-t
    const footers = container.querySelectorAll(".border-t.border-border\\/70");
    expect(footers.length).toBe(1);

    // Footer memuat baris ringkasan metrik dengan pembatas divide-x
    const footerEl = footers[0] as HTMLElement;
    expect(footerEl.className).toContain("divide-x");
    expect(footerEl).toHaveTextContent("Metrik 1");
    expect(footerEl).toHaveTextContent("100");
  });

  it("(c) Admin Dashboard merender Keterangan di atas garis dan tepat satu footer ringkasan di kiri serta nilai di kanan", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <I18nextProvider i18n={i18n}>
            <AdminDashboardPage />
          </I18nextProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const trendsTitle = await screen.findByRole("heading", {
      name: /Tren Pendapatan, Beban, & Arus Kas/i,
    });
    expect(trendsTitle).toBeInTheDocument();

    const compTitle = screen.getByRole("heading", {
      name: /^Komposisi Keuangan$/i,
    });
    expect(compTitle).toBeInTheDocument();

    const gridContainer = trendsTitle.closest(".grid");
    expect(gridContainer).toBeInTheDocument();

    const cards = gridContainer?.children;
    expect(cards?.length).toBe(2);

    const leftCard = cards?.[0] as HTMLElement;
    const rightCard = cards?.[1] as HTMLElement;

    // Tepat satu footer per kartu
    const leftFooters = leftCard.querySelectorAll(".border-t.border-border\\/70");
    const rightFooters = rightCard.querySelectorAll(".border-t.border-border\\/70");
    expect(leftFooters.length).toBe(1);
    expect(rightFooters.length).toBe(1);

    // Footer kiri adalah baris ringkasan dengan pembatas vertikal divide-x
    expect(leftFooters[0]?.className).toContain("divide-x");
    expect(leftFooters[0]).toHaveTextContent("Total Pendapatan");
    expect(leftFooters[0]).toHaveTextContent("Total Beban");
    expect(leftFooters[0]).toHaveTextContent("Laba / Rugi Bersih");

    // Keterangan berada di atas garis footer (di dalam body kartu kiri)
    const legendInLeftCard = leftCard.querySelector(".text-\\[11px\\].font-medium.text-muted-foreground");
    expect(legendInLeftCard).toHaveTextContent("Keterangan");

    // Footer kanan memuat indikator pertumbuhan
    expect(rightFooters[0]?.querySelector("svg")).toBeInTheDocument();
  });

  it("(c) User Dashboard merender Keterangan di atas garis dan footer ringkasan di kiri serta Total Klaim di kanan", async () => {
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

    // Footer kiri memuat 3 ringkasan nilai PO, diajukan, dicairkan
    expect(leftFooters[0]?.className).toContain("divide-x");
    expect(leftFooters[0]).toHaveTextContent("Total Nilai PO");
    expect(leftFooters[0]).toHaveTextContent("Total Diajukan");
    expect(leftFooters[0]).toHaveTextContent("Sudah Dicairkan");

    // Footer kanan memuat Total Klaim tunggal tanpa duplikasi
    expect(rightFooters[0]).toHaveTextContent("Total Klaim");
  });

  it("(e) Super Admin Dashboard memiliki baris Keterangan di atas garis dan footer ringkasan log audit di dasar", async () => {
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

    // Baris Keterangan di kartu kiri
    expect(leftCard).toHaveTextContent("Keterangan");

    // Footer kiri Super Admin memuat 3 operasi log dengan divide-x
    expect(leftFooters[0]?.className).toContain("divide-x");
    expect(leftFooters[0]).toHaveTextContent("Operasi Tambah");
    expect(leftFooters[0]).toHaveTextContent("Operasi Ubah");
    expect(leftFooters[0]).toHaveTextContent("Operasi Hapus");

    // Kartu kanan Super Admin memuat footer tunggal Pengguna Aktif
    expect(rightFooters[0]).toHaveTextContent("Pengguna Aktif");
  });
});
