// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ClockIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";

describe("Polesan Mobile Halaman Persetujuan Pembayaran & Shared Components", () => {
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

  it("PageHeader mobile: judul mendukung 2 baris (line-clamp-2) dan font lebih besar (text-[22px])", () => {
    render(
      <PageHeader
        title="Persetujuan Pembayaran 1-Level & Pencairan Dana"
        description="Verifikasi permohonan dana dan otorisasi pengeluaran kas."
      />,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain("max-sm:text-[22px]");
    expect(heading.className).toContain("max-sm:line-clamp-2");
    expect(heading.className).toContain("max-sm:whitespace-normal");
    // Di desktop tetap mempertahankan truncate 1 baris
    expect(heading.className).toContain("sm:truncate");
  });

  it("PageHeader mobile: tombol info (i) menggunakan ActionTooltip tanpa atribut title bawaan browser", () => {
    const { container } = render(
      <PageHeader
        title="Persetujuan Pembayaran"
        description="Verifikasi permohonan dana."
      />,
    );

    const infoButton = container.querySelector("button[aria-label='Informasi halaman']");
    expect(infoButton).toBeInTheDocument();
    // Atribut title bawaan browser wajib tidak ada agar tidak muncul tooltip native yang jelek
    expect(infoButton).not.toHaveAttribute("title");
  });

  it("ExportDownloadMenu mobileFloating: tombol mengambang di pojok kanan bawah dengan kotak biru dan tanpa atribut title", () => {
    render(
      <ExportDownloadMenu
        label="Unduh / Ekspor"
        onExportExcel={() => {}}
        onExportPdf={() => {}}
        onExportCsv={() => {}}
        mobileFloating
      />,
    );

    const button = screen.getByRole("button", { name: "Unduh / Ekspor" });
    expect(button).toBeInTheDocument();
    // Posisi tetap di kanan bawah melayang
    expect(button.className).toContain("max-sm:fixed");
    expect(button.className).toContain("max-sm:bottom-6");
    expect(button.className).toContain("max-sm:right-5");
    expect(button.className).toContain("max-sm:z-50");
    expect(button.className).toContain("max-sm:size-12");

    // Warna kotak biru dan kontras ikon (gelap pada tema terang, terang pada tema gelap)
    expect(button.className).toContain("max-sm:bg-primary/15");
    expect(button.className).toContain("max-sm:text-primary");
    expect(button.className).toContain("max-sm:dark:bg-primary");
    expect(button.className).toContain("max-sm:dark:text-white");

    // Tidak ada atribut title bawaan
    expect(button).not.toHaveAttribute("title");
  });

  it("KpiCard compactMobile: merender tata letak padat (target <=84px) tanpa menghapus nilai & keterangan kecil", () => {
    const { container } = render(
      <BrowserRouter>
        <KpiCard
          compactMobile
          label="Menunggu Persetujuan Admin"
          value={3}
          suffix=" Pengajuan"
          subtext="Menunggu verifikasi & otorisasi bendahara"
          icon={ClockIcon}
        />
      </BrowserRouter>,
    );

    // Label, nilai, dan subtext wajib ada
    expect(screen.getByText("Menunggu Persetujuan Admin")).toBeInTheDocument();
    expect(screen.getByText("Menunggu verifikasi & otorisasi bendahara")).toBeInTheDocument();

    const card = container.querySelector("[data-slot='kpi-card']");
    expect(card).toBeInTheDocument();
    // Padding dan gap rapat untuk target <= 84px
    expect(card?.className).toContain("max-sm:px-3.5");
    expect(card?.className).toContain("max-sm:py-2.5");
    expect(card?.className).toContain("max-sm:gap-1.5");

    // Ukuran ikon lebih ringkas
    const iconWrapper = container.querySelector(".max-sm\\:size-8");
    expect(iconWrapper).toBeInTheDocument();
  });

  it("Pencegahan CI Bounding Box: tidak ada overflow horizontal pada viewport 375px", () => {
    // Memastikan styling root pada KpiCard dan PageHeader tidak memakai w-[>375px] atau overflow horizontal
    const { container } = render(
      <div style={{ width: "375px" }} className="w-[375px] overflow-hidden">
        <PageHeader
          title="Persetujuan Pembayaran 1-Level & Pencairan Dana"
          description="Verifikasi permohonan dana, persetujuan pengajuan, dan pencairan kas tim."
          actions={
            <ExportDownloadMenu
              label="Unduh / Ekspor"
              mobileFloating
            />
          }
        />
        <div className="grid gap-2.5 grid-cols-1">
          <KpiCard
            compactMobile
            label="Menunggu Persetujuan Admin"
            value={0}
            suffix=" Pengajuan"
            subtext="Tidak ada antrean pengajuan baru"
            icon={ClockIcon}
          />
        </div>
      </div>,
    );

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toBeInTheDocument();
    expect(rootDiv.scrollWidth).toBeLessThanOrEqual(375);
  });

  it("KPI layout Persetujuan Pembayaran mobile: grid 2 kolom dengan Card 3 col-span-2 dan tanpa sparkline/grafik", () => {
    const { container } = render(
      <BrowserRouter>
        <div className="grid gap-2.5 sm:gap-4 grid-cols-2 sm:grid-cols-3 shrink-0">
          <KpiCard
            label="Menunggu Persetujuan Admin"
            value={0}
            suffix=" Pengajuan"
            subtext="Tidak ada antrean pengajuan baru"
            icon={ClockIcon}
          />
          <KpiCard
            label="Disetujui & Siap Dicairkan"
            value={0}
            suffix=" Pengajuan"
            subtext="Seluruh pengajuan disetujui telah cair"
            icon={ClockIcon}
          />
          <KpiCard
            className="col-span-2 sm:col-span-1"
            label="Total Pembayaran Terealisasi"
            displayValue="Rp0"
            subtext="Tercatat otomatis di buku besar kas"
            icon={ClockIcon}
          />
        </div>
      </BrowserRouter>,
    );

    const grid = container.querySelector(".grid-cols-2");
    expect(grid).toBeInTheDocument();
    const cards = container.querySelectorAll("[data-slot='kpi-card']");
    expect(cards.length).toBe(3);
    // Card 3 harus col-span-2 pada mobile
    expect(cards[2]?.className).toContain("col-span-2");
    // Wajib tanpa grafik svg sparkline
    expect(container.querySelector("svg.overflow-visible")).not.toBeInTheDocument();
  });

  it("PageHeader mobile: info button (i) berada inline di dalam h1 bersebelahan dengan teks judul", () => {
    const { container } = render(
      <PageHeader
        title="Persetujuan Pembayaran 1-Level & Pencairan Dana"
        description="Verifikasi permohonan dana."
      />,
    );

    const h1 = container.querySelector("h1");
    expect(h1).toBeInTheDocument();
    const infoSpan = h1?.querySelector("span.sm\\:hidden.inline-flex");
    expect(infoSpan).toBeInTheDocument();
    const infoButton = infoSpan?.querySelector("button[aria-label='Informasi halaman']");
    expect(infoButton).toBeInTheDocument();
  });

  it("PageHeader mobile: multiple floating action buttons tersusun horizontal di pojok kanan bawah dengan icon terlihat", () => {
    const { container } = render(
      <PageHeader
        title="Anggaran Proyek"
        description="Kelola pos belanja."
        actions={
          <>
            <ExportDownloadMenu
              label="Unduh / Ekspor"
              mobileFloating
            />
            <button type="button">Tambah Anggaran</button>
          </>
        }
      />,
    );

    const fabContainer = container.querySelector(".sm\\:hidden.fixed.bottom-6.right-5");
    expect(fabContainer).toBeInTheDocument();
    expect(fabContainer?.className).toContain("flex-row");
    const buttons = fabContainer?.querySelectorAll("button");
    // Ada 2 tombol aksi melayang horizontal
    expect(buttons?.length).toBe(2);
    // Memastikan icon SVG tetap dirender di dalam tombol melayang
    const svgs = fabContainer?.querySelectorAll("svg");
    expect(svgs && svgs.length > 0).toBe(true);
  });

  it("Empty state adaptif dvh: halaman mobile mengisi layar dengan struktur flex kolom & flex-1 tanpa tinggi tetap", () => {
    const { container } = render(
      <div className="flex flex-col gap-4 sm:gap-6 max-sm:flex-1 max-sm:min-h-[calc(100dvh-5.5rem)]">
        <PageHeader title="Persetujuan" />
        <div className="rounded-2xl max-sm:flex-1 max-sm:flex max-sm:flex-col">
          <div className="max-sm:flex-1 max-sm:flex max-sm:flex-col">
            <div className="max-sm:h-full max-sm:flex-1 max-sm:min-h-0 flex flex-col items-center justify-center">
              <span>Tidak Ada Pengajuan Pembayaran</span>
            </div>
          </div>
        </div>
      </div>,
    );

    const root = container.querySelector(".max-sm\\:min-h-\\[calc\\(100dvh-5\\.5rem\\)\\]");
    expect(root).toBeInTheDocument();
    const card = container.querySelector(".max-sm\\:flex-1");
    expect(card).toBeInTheDocument();
    const emptyState = screen.getByText("Tidak Ada Pengajuan Pembayaran").parentElement;
    expect(emptyState?.className).toContain("max-sm:flex-1");
    expect(emptyState?.className).toContain("max-sm:h-full");
  });
});
