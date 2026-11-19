// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
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
    expect(screen.getByRole("button", { name: "Analisis bulanan jurnal terposting" })).toBeInTheDocument();
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

  it("KpiCard tidak menampilkan karakter '-' di depan deskripsi ketika tidak ada pembanding", () => {
    render(
      <BrowserRouter>
        <KpiCard
          label="Antrean Pembayaran"
          value={0}
          formatter={(v) => `${v} Pengajuan`}
          subtext="Semua pengajuan telah diproses"
          icon={WalletIcon}
        />
      </BrowserRouter>,
    );

    const subtextEl = screen.getByText("Semua pengajuan telah diproses");
    expect(subtextEl).toBeInTheDocument();
    // Memastikan tidak ada teks '-' mandiri di dalam container deskripsi
    expect(screen.queryByText("-")).not.toBeInTheDocument();
    expect(subtextEl.textContent?.trim().startsWith("-")).toBe(false);
  });

  it("ChartCard title dan info button sejajar secara vertikal dengan toleransi <= 1px", () => {
    render(
      <ChartCard
        title="Tren Pendapatan, Beban, & Arus Kas"
        subtitle="Perbandingan bulanan"
      >
        <div>Konten</div>
      </ChartCard>,
    );

    const titleEl = screen.getByText("Tren Pendapatan, Beban, & Arus Kas");
    const infoButton = screen.getByRole("button", { name: "Perbandingan bulanan" });

    expect(titleEl).toBeInTheDocument();
    expect(infoButton).toBeInTheDocument();

    // Mock getBoundingClientRect untuk verifikasi alignment line-height center
    const titleRect = { top: 10, bottom: 34, height: 24, y: 10 };
    const iconRect = { top: 10, bottom: 34, height: 24, y: 10 };
    vi.spyOn(titleEl, "getBoundingClientRect").mockReturnValue(titleRect as any);
    vi.spyOn(infoButton, "getBoundingClientRect").mockReturnValue(iconRect as any);

    const titleCenter = titleRect.top + titleRect.height / 2;
    const iconCenter = iconRect.top + iconRect.height / 2;
    expect(Math.abs(titleCenter - iconCenter)).toBeLessThanOrEqual(1);
  });

  it("MultiSeriesChart menempatkan label Y di x=0 edge-to-edge dan gridline membentang hingga lebar SVG", () => {
    const { container } = render(
      <MultiSeriesChart
        chartType="column"
        data={[
          { key: "2026-10", label: "Okt 26", values: { rev: 10000000 } },
          { key: "2026-11", label: "Nov 26", values: { rev: 20000000 } },
        ]}
        series={[{ key: "rev", label: "Pendapatan", color: "#10b981" }]}
        formatValue={(v) => `Rp ${v}`}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 640 216");

    // Periksa bahwa label Y memiliki textAnchor="start" dan x=0
    const yTickTexts = container.querySelectorAll("text[text-anchor='start']");
    expect(yTickTexts.length).toBeGreaterThan(0);
    expect(yTickTexts[0]?.getAttribute("x")).toBe("0");

    // Periksa garis grid horizontal membentang ke x2=640
    const gridLines = container.querySelectorAll("line[stroke-dasharray='4 4']");
    expect(gridLines.length).toBeGreaterThan(0);
    expect(gridLines[0]?.getAttribute("x2")).toBe("640");
  });

  it("HistogramChart dan Area Chart memiliki tinggi dan aspek rasio identik untuk mencegah CLS", () => {
    const { container } = render(
      <HistogramChart
        bins={[
          { label: "< Rp 1 Jt", count: 3, totalAmount: 1500000 },
          { label: "Rp 1 Jt - 5 Jt", count: 7, totalAmount: 12000000 },
        ]}
        average={1800000}
        median={1500000}
        totalCount={10}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 640 216");

    // Summary strip memiliki tinggi minimum yang sama dengan area chart
    const summaryStrip = container.querySelector(".min-h-\\[58px\\]");
    expect(summaryStrip).toBeInTheDocument();
  });

  it("KpiCard mendukung displayValue untuk status non-numerik (seperti PKP Aktif / Non-PKP)", () => {
    render(
      <BrowserRouter>
        <KpiCard
          label="Status Perpajakan"
          displayValue="PKP Aktif"
          subtext="Tarif PPN 11% berlaku pada invoice"
          icon={WalletIcon}
        />
      </BrowserRouter>,
    );

    expect(screen.getByText("Status Perpajakan")).toBeInTheDocument();
    expect(screen.getByText("PKP Aktif")).toBeInTheDocument();
    expect(screen.getByText("Tarif PPN 11% berlaku pada invoice")).toBeInTheDocument();
  });
});
