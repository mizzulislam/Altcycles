/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  isDateInPeriod,
  PeriodFilter,
} from "@/components/shared/dashboard-period-filter";
import type { PeriodRow } from "@/types/database.types";

const mockPeriods: PeriodRow[] = [
  {
    id: "per-nov-2026",
    year: 2026,
    month: 11,
    name: "November 2026",
    start_date: "2026-11-01",
    end_date: "2026-11-30",
    status: "open",
    closed_at: null,
    closed_by: null,
    reopened_at: null,
    reopened_by: null,
    reopen_reason: null,
    created_by: "usr-1",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "per-okt-2026",
    year: 2026,
    month: 10,
    name: "Oktober 2026",
    start_date: "2026-10-01",
    end_date: "2026-10-31",
    status: "closed",
    closed_at: "2026-11-01T00:00:00Z",
    closed_by: "usr-1",
    reopened_at: null,
    reopened_by: null,
    reopen_reason: null,
    created_by: "usr-1",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
];

describe("PeriodFilter Component & isDateInPeriod Helper", () => {
  describe("isDateInPeriod Logic", () => {
    it("returns true for preset 'all'", () => {
      expect(isDateInPeriod("2026-11-15", "all")).toBe(true);
      expect(isDateInPeriod("2025-01-01", "all")).toBe(true);
    });

    it("filters accurately by accounting period id", () => {
      expect(
        isDateInPeriod("2026-11-15", "per-nov-2026", "", "", mockPeriods),
      ).toBe(true);
      expect(
        isDateInPeriod("2026-10-15", "per-nov-2026", "", "", mockPeriods),
      ).toBe(false);
      expect(
        isDateInPeriod("2026-10-15", "per-okt-2026", "", "", mockPeriods),
      ).toBe(true);
    });

    it("filters accurately by custom start and end date range", () => {
      expect(
        isDateInPeriod("2026-11-10", "custom", "2026-11-05", "2026-11-20"),
      ).toBe(true);
      expect(
        isDateInPeriod("2026-11-04", "custom", "2026-11-05", "2026-11-20"),
      ).toBe(false);
      expect(
        isDateInPeriod("2026-11-21", "custom", "2026-11-05", "2026-11-20"),
      ).toBe(false);
      // Boundary test
      expect(
        isDateInPeriod("2026-11-05", "custom", "2026-11-05", "2026-11-20"),
      ).toBe(true);
      expect(
        isDateInPeriod("2026-11-20", "custom", "2026-11-05", "2026-11-20"),
      ).toBe(true);
    });
  });

  describe("PeriodFilter Modal UI & Interaction", () => {
    it("renders trigger button with standard styling and opens modal on click", () => {
      const handleChange = vi.fn();
      render(
        <PeriodFilter
          value="all"
          onChange={handleChange}
          periods={mockPeriods}
        />,
      );

      // Trigger button
      const triggerBtn = screen.getByRole("button", { name: /filter periode/i });
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn).toHaveTextContent(/semua periode/i);

      // Klik tombol untuk membuka modal dialog
      fireEvent.click(triggerBtn);

      // Modal dialog terbuka
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /filter rentang waktu & periode/i }),
      ).toBeInTheDocument();

      // Memastikan seksi-seksi utama tampil
      expect(screen.getByText(/pilihan cepat/i)).toBeInTheDocument();
      expect(screen.getByText(/kustom rentang tanggal/i)).toBeInTheDocument();
      expect(screen.getByText(/tanggal mulai/i)).toBeInTheDocument();
      expect(screen.getByText(/tanggal selesai/i)).toBeInTheDocument();
      expect(screen.getByText(/periode buku akuntansi/i)).toBeInTheDocument();
      expect(screen.getByText("November 2026")).toBeInTheDocument();
    });

    it("applies quick preset and calls onChange on apply", () => {
      const handleChange = vi.fn();
      render(
        <PeriodFilter
          value="all"
          onChange={handleChange}
          periods={mockPeriods}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filter periode/i }));

      // Klik preset "Bulan Ini"
      const thisMonthBtn = screen.getByRole("button", { name: /^bulan ini$/i });
      fireEvent.click(thisMonthBtn);

      // Klik "Terapkan Filter"
      const applyBtn = screen.getByRole("button", { name: /terapkan filter/i });
      fireEvent.click(applyBtn);

      expect(handleChange).toHaveBeenCalledWith("this_month", "", "");
    });

    it("resets filter to 'all' when reset button is clicked", () => {
      const handleChange = vi.fn();
      render(
        <PeriodFilter
          value="this_month"
          startDate="2026-11-01"
          endDate="2026-11-30"
          onChange={handleChange}
          periods={mockPeriods}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filter periode/i }));

      // Klik "Reset ke Semua Periode"
      const resetBtn = screen.getByRole("button", {
        name: /reset ke semua periode/i,
      });
      fireEvent.click(resetBtn);

      expect(handleChange).toHaveBeenCalledWith("all", "", "");
    });

    it("allows selecting accounting period card", () => {
      const handleChange = vi.fn();
      render(
        <PeriodFilter
          value="all"
          onChange={handleChange}
          periods={mockPeriods}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filter periode/i }));

      // Klik kartu periode "November 2026"
      const novCard = screen.getByRole("button", { name: /november 2026/i });
      fireEvent.click(novCard);

      // Klik "Terapkan Filter"
      const applyBtn = screen.getByRole("button", { name: /terapkan filter/i });
      fireEvent.click(applyBtn);

      expect(handleChange).toHaveBeenCalledWith(
        "per-nov-2026",
        "2026-11-01",
        "2026-11-30",
      );
    });
  });
});
