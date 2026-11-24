// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { ChartSummaryFooter } from "@/components/shared/dashboard-charts";
import { AdminDashboardPage } from "@/features/master-data/admin-dashboard";
import { AuthProvider } from "@/features/auth/auth-context";

vi.mock("@/lib/data-service", () => ({
  listAccounts: vi.fn().mockResolvedValue([]),
  listPeriods: vi.fn().mockResolvedValue([]),
  listProjects: vi.fn().mockResolvedValue({
    projects: [
      {
        id: "p-1",
        code: "PRJ/001",
        name: "Proyek Alpha",
        contract_value: 10000000,
      },
    ],
    total: 1,
  }),
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
  getProjectWorkspace: vi.fn().mockResolvedValue({
    invoices: [
      {
        id: "inv-1",
        project_id: "p-1",
        doc_status: "issued",
        total_amount: 5000000,
        paid_amount: 2500000,
      },
    ],
    clientPos: [],
  }),
  recordExportLog: vi.fn().mockResolvedValue(undefined),
}));

describe("Dashboard Row 3 Card Alignment & Zero CLS Toggle", () => {
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

  it("(a) Header semua kartu memakai tinggi tetap terstandar h-14 min-h-[56px] py-0", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <div className="grid grid-cols-2">
          <ChartCard
            title="Frekuensi Transaksi"
            controls={<button type="button">Area | Histogram</button>}
          >
            <div>Konten 1</div>
          </ChartCard>
          <ChartCard
            title="Realisasi Penagihan & Piutang"
            controls={<a href="#test">Kelola Tagihan</a>}
          >
            <div>Konten 2</div>
          </ChartCard>
        </div>
      </I18nextProvider>
    );

    const headers = container.querySelectorAll(".border-b.border-border\\/70");
    expect(headers.length).toBe(2);

    const h1 = headers[0] as HTMLElement;
    const h2 = headers[1] as HTMLElement;

    expect(h1.className).toContain("h-14");
    expect(h2.className).toContain("h-14");
    expect(h1.className).toContain("min-h-[56px]");
    expect(h2.className).toContain("min-h-[56px]");
    expect(h1.className).toContain("py-0");
    expect(h2.className).toContain("py-0");
  });

  it("(b & c) ChartSummaryFooter memiliki tinggi tetap h-[64px] min-h-[64px] untuk 2, 3, dan 4 item", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <div className="space-y-4">
          <ChartSummaryFooter
            items={[
              { label: "L1", value: "V1" },
              { label: "L2", value: "V2" },
            ]}
          />
          <ChartSummaryFooter
            items={[
              { label: "L1", value: "V1" },
              { label: "L2", value: "V2" },
              { label: "L3", value: "V3" },
            ]}
          />
          <ChartSummaryFooter
            items={[
              { label: "L1", value: "V1" },
              { label: "L2", value: "V2" },
              { label: "L3", value: "V3" },
              { label: "L4", value: "V4" },
            ]}
          />
        </div>
      </I18nextProvider>
    );

    const footers = container.querySelectorAll(".border-t.border-border\\/70");
    expect(footers.length).toBe(3);

    Array.from(footers).forEach((f) => {
      const el = f as HTMLElement;
      expect(el.className).toContain("h-[64px]");
      expect(el.className).toContain("min-h-[64px]");
      expect(el.className).toContain("bg-muted/10");
      expect(el.className).toContain("divide-x");
    });
  });

  it("(d & e) Admin Dashboard Row 3: Header & Footer sejajar, toggle Area/Histogram tidak mengubah tinggi footer", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <I18nextProvider i18n={i18n}>
            <AdminDashboardPage />
          </I18nextProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const txTitle = await screen.findByRole("heading", {
      name: /Frekuensi Transaksi/i,
    });
    expect(txTitle).toBeInTheDocument();

    const billingTitle = screen.getByRole("heading", {
      name: /Realisasi Penagihan/i,
    });
    expect(billingTitle).toBeInTheDocument();

    // Dapatkan kontainer grid Row 3 yang menampung kedua kartu tersebut
    const row3Grid = txTitle.closest(".grid");
    expect(row3Grid).toBeInTheDocument();

    const cards = row3Grid?.children;
    expect(cards?.length).toBe(2);

    const cardTx = cards?.[0] as HTMLElement;
    const cardBilling = cards?.[1] as HTMLElement;

    // 1. Header kedua kartu memiliki h-14 min-h-[56px] py-0
    const headerTx = cardTx.querySelector(".border-b.border-border\\/70") as HTMLElement;
    const headerBilling = cardBilling.querySelector(".border-b.border-border\\/70") as HTMLElement;
    expect(headerTx.className).toContain("h-14");
    expect(headerBilling.className).toContain("h-14");

    // 2. Footer kedua kartu memiliki h-[64px] min-h-[64px] border-t
    const footerTx = cardTx.querySelector(".border-t.border-border\\/70") as HTMLElement;
    const footerBilling = cardBilling.querySelector(".border-t.border-border\\/70") as HTMLElement;
    expect(footerTx.className).toContain("h-[64px]");
    expect(footerBilling.className).toContain("h-[64px]");

    // Verifikasi awal pada mode Area: Card 1 punya 2 kolom ringkasan
    expect(footerTx).toHaveTextContent("Total Transaksi");
    expect(footerTx).toHaveTextContent("Rata-Rata / Bulan");

    // Card 2 punya 4 kolom ringkasan umur piutang
    expect(footerBilling).toHaveTextContent("Belum Jatuh Tempo");
    expect(footerBilling).toHaveTextContent("1–30 Hari");
    expect(footerBilling).toHaveTextContent("31–60 Hari");
    expect(footerBilling).toHaveTextContent("> 60 Hari");

    // 3. Uji toggle Area/Histogram berulang kali: tinggi footer tetap h-[64px] dan tanpa footer ganda
    const areaBtn = within(cardTx).getByRole("button", { name: /^Area$/i });
    const histogramBtn = within(cardTx).getByRole("button", { name: /^Histogram$/i });

    for (let i = 0; i < 10; i++) {
      fireEvent.click(histogramBtn);
      const updatedFooterHist = cardTx.querySelector(".border-t.border-border\\/70") as HTMLElement;
      expect(updatedFooterHist.className).toContain("h-[64px]");
      expect(updatedFooterHist.className).toContain("min-h-[64px]");
      expect(updatedFooterHist).toHaveTextContent("Jumlah Sampel");
      expect(updatedFooterHist).toHaveTextContent("Rata-Rata");
      expect(updatedFooterHist).toHaveTextContent("Median");

      // Pastikan tepat 1 footer di kartu Tx (tidak ada footer ganda dari HistogramChart)
      const allTxFootersHist = cardTx.querySelectorAll(".border-t.border-border\\/70");
      expect(allTxFootersHist.length).toBe(1);

      fireEvent.click(areaBtn);
      const updatedFooterArea = cardTx.querySelector(".border-t.border-border\\/70") as HTMLElement;
      expect(updatedFooterArea.className).toContain("h-[64px]");
      expect(updatedFooterArea.className).toContain("min-h-[64px]");
      expect(updatedFooterArea).toHaveTextContent("Total Transaksi");
      expect(updatedFooterArea).toHaveTextContent("Rata-Rata / Bulan");

      const allTxFootersArea = cardTx.querySelectorAll(".border-t.border-border\\/70");
      expect(allTxFootersArea.length).toBe(1);
    }
  });
});
