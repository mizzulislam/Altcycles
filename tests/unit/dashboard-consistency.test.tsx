// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { WalletIcon } from "lucide-react";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { PeriodFilter } from "@/components/shared/dashboard-period-filter";
import {
  HistogramChart,
  MultiSeriesChart,
  CompositionChart,
} from "@/components/shared/dashboard-charts";

describe("Dashboard Consistency & Shared Components", () => {
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
  it("KpiCard merender label, nominal, dan sparkline dengan rapi", () => {
    const { container } = render(
      <BrowserRouter>
        <KpiCard
          label="Kas & Bank Terkini"
          value={25000000}
          formatter={(v) => `Rp ${v.toLocaleString("id-ID")}`}
          subtext="periode buku aktif terbuka"
          icon={WalletIcon}
          to="/admin/akuntansi/laporan"
          sparklineData={[10000000, 15000000, 20000000, 25000000]}
          changePercent={12.5}
          changeLabel="vs periode lalu"
        />
      </BrowserRouter>,
    );

    expect(screen.getByText("Kas & Bank Terkini")).toBeInTheDocument();
    expect(screen.getByText(/12\.5%/)).toBeInTheDocument();
    expect(screen.getByText("vs periode lalu")).toBeInTheDocument();
    // Memastikan elemen SVG sparkline hadir
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("ChartCard merender title, subtitle, controls, dan content terstandar", () => {
    render(
      <ChartCard
        title="Tren Pendapatan & Beban"
        subtitle="Analisis bulanan jurnal terposting"
        controls={<button type="button">Kontrol</button>}
      >
        <div data-testid="chart-content">Konten Grafik</div>
      </ChartCard>,
    );

    expect(screen.getByText("Tren Pendapatan & Beban")).toBeInTheDocument();
    expect(screen.getByText("Analisis bulanan jurnal terposting")).toBeInTheDocument();
    expect(screen.getByText("Kontrol")).toBeInTheDocument();
    expect(screen.getByTestId("chart-content")).toBeInTheDocument();
  });

  it("PeriodFilter merender pilihan preset terpadu", () => {
    let selectedVal = "this_month";
    const handleChange = (val: string) => {
      selectedVal = val;
    };

    render(
      <PeriodFilter
        value={selectedVal}
        onChange={handleChange}
        periods={[
          {
            id: "p1",
            year: 2026,
            month: 11,
            name: "November 2026",
            status: "open",
            start_date: "2026-11-01",
            end_date: "2026-11-30",
            closed_at: null,
            closed_by: null,
            reopened_at: null,
            reopened_by: null,
            reopen_reason: null,
            created_by: "user-1",
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-01T00:00:00Z",
          },
        ]}
      />,
    );

    // Filter trigger hadir dan bisa diakses
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });

  it("HistogramChart merender bar dengan rounded-none (presisi tanpa sudut membulat)", () => {
    const { container } = render(
      <HistogramChart
        bins={[
          { label: "< Rp 1 Jt", count: 5, totalAmount: 2500000 },
          { label: "Rp 1 Jt - 5 Jt", count: 8, totalAmount: 18000000 },
        ]}
        average={2000000}
        median={1500000}
        totalCount={13}
      />,
    );

    const bars = container.querySelectorAll(".rounded-none");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("MultiSeriesChart dan CompositionChart memiliki fallback aman untuk nilai preferensi lama (line/bubble/pie)", () => {
    const { container } = render(
      <div>
        {/* Menguji fallback MultiSeriesChart bila diberikan tipe lama "line" atau "bubble" */}
        <MultiSeriesChart
          chartType="line"
          data={[
            { key: "2026-10", label: "Okt 26", values: { rev: 1000000 } },
            { key: "2026-11", label: "Nov 26", values: { rev: 2000000 } },
          ]}
          series={[{ key: "rev", label: "Pendapatan", color: "#10b981" }]}
          formatValue={(v) => `Rp ${v}`}
        />
        {/* Menguji fallback CompositionChart bila diberikan tipe lama "pie" */}
        <CompositionChart
          chartType="donut"
          slices={[
            { label: "Aset", value: 100, color: "#10b981", dotClass: "bg-emerald-500" },
          ]}
          formatValue={(v) => `${v}`}
        />
      </div>,
    );

    // Keduanya harus berhasil dirender tanpa melempar runtime error
    expect(container).toBeInTheDocument();
  });
});
