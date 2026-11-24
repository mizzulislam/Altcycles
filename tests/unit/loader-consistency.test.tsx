// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import {
  PageLoader,
  FullScreenLoader,
  SectionLoader,
  ButtonLoader,
} from "@/components/ui/loader";
import { Table, TableBody, TableLoadingRow } from "@/components/ui/table";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

describe("Sistem Loader Terstandar (Reusable Loader System)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("PageLoader: merender container terpusat, atribut aksesibilitas, dan teks loading", async () => {
    await act(async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <PageLoader message="Memuat pengujian..." delayMs={0} />
        </I18nextProvider>
      );
    });

    const loaderEl = screen.getByRole("status");
    expect(loaderEl).toBeInTheDocument();
    expect(loaderEl).toHaveAttribute("aria-live", "polite");
    expect(loaderEl).toHaveAttribute("aria-busy", "true");
    expect(loaderEl.className).toContain("flex");
    expect(loaderEl.className).toContain("items-center");
    expect(loaderEl.className).toContain("justify-center");
    expect(loaderEl.className).toContain("min-h-[55vh]");
    expect(screen.getByText("Memuat pengujian...")).toBeInTheDocument();
  });

  it("PageLoader: mengaktifkan timeout 15 detik dan memunculkan tombol Muat Ulang", () => {
    const onRetryMock = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <PageLoader
          message="Memuat lambat..."
          delayMs={0}
          timeoutMs={15000}
          onRetry={onRetryMock}
        />
      </I18nextProvider>
    );

    expect(screen.getByText("Memuat lambat...")).toBeInTheDocument();

    // Fast-forward 15 seconds
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    const retryBtn = screen.getByRole("button");
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it("FullScreenLoader: merender overlay fixed dengan aria-live assertive", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <FullScreenLoader message="Mengganti Peran..." />
      </I18nextProvider>
    );

    const fsLoader = screen.getByRole("status");
    expect(fsLoader).toBeInTheDocument();
    expect(fsLoader).toHaveAttribute("aria-live", "assertive");
    expect(fsLoader.className).toContain("fixed inset-0");
    expect(screen.getByText("Mengganti Peran...")).toBeInTheDocument();
  });

  it("SectionLoader: merender indikator loading kartu atau tab bertinggi proporsional", () => {
    render(<SectionLoader message="Memuat ringkasan..." minHeight={280} />);

    const secLoader = screen.getByRole("status");
    expect(secLoader).toBeInTheDocument();
    expect(secLoader.style.minHeight).toBe("280px");
    expect(screen.getByText("Memuat ringkasan...")).toBeInTheDocument();
  });

  it("ButtonLoader: menyertakan atribut aria-hidden dan kelas motion-reduce", () => {
    const { container } = render(<ButtonLoader className="text-primary" />);
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.getAttribute("class")).toContain("animate-spin");
    expect(icon?.getAttribute("class")).toContain("motion-reduce:animate-none");
  });

  it("TableLoadingRow: terpasang rapi di dalam TableBody dengan role status", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Table>
          <TableBody>
            <TableLoadingRow colSpan={5} message="Memuat baris data..." />
          </TableBody>
        </Table>
      </I18nextProvider>
    );

    const statusEl = screen.getByRole("status");
    expect(statusEl).toBeInTheDocument();
    expect(screen.getByText("Memuat baris data...")).toBeInTheDocument();
  });
});
