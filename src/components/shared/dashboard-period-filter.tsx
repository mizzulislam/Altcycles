import * as React from "react";
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateI18n } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { PeriodRow } from "@/types/database.types";

export type DashboardPeriodPreset =
  | "this_month"
  | "last_month"
  | "this_year"
  | "all"
  | "custom"
  | string;

export interface DashboardPeriodFilterProps {
  value: DashboardPeriodPreset;
  onChange: (val: DashboardPeriodPreset, startDate?: string, endDate?: string) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  periods?: PeriodRow[];
  className?: string;
}

/**
 * Helper terpusat untuk memverifikasi apakah tanggal transaksi/dokumen/log berada
 * dalam cakupan preset atau rentang tanggal yang dipilih.
 */
export function isDateInPeriod(
  dateStr: string | null | undefined,
  preset: DashboardPeriodPreset,
  startDate?: string,
  endDate?: string,
  periods: PeriodRow[] = [],
): boolean {
  if (!dateStr) return false;
  const isoDate = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return true;

  if (preset === "custom" || (startDate && endDate)) {
    if (startDate && isoDate < startDate) return false;
    if (endDate && isoDate > endDate) return false;
    return true;
  }

  if (preset === "all" || !preset) return true;

  const now = new Date();
  if (preset === "this_month") {
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return isoDate.startsWith(curMonth);
  }
  if (preset === "last_month") {
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    return isoDate.startsWith(prevMonth);
  }
  if (preset === "this_year") {
    const curYear = String(now.getFullYear());
    return isoDate.startsWith(curYear);
  }

  const matchedPeriod = periods.find((p) => p.id === preset);
  if (matchedPeriod) {
    return (
      isoDate >= matchedPeriod.start_date && isoDate <= matchedPeriod.end_date
    );
  }

  return true;
}

export function PeriodFilter({
  value,
  onChange,
  startDate = "",
  endDate = "",
  onDateRangeChange,
  periods = [],
  className,
}: DashboardPeriodFilterProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = React.useState(false);

  // Draft state sementara di dalam modal sebelum tombol "Terapkan Filter" ditekan
  const [draftPreset, setDraftPreset] = React.useState<DashboardPeriodPreset>(value);
  const [draftStartDate, setDraftStartDate] = React.useState<string>(startDate);
  const [draftEndDate, setDraftEndDate] = React.useState<string>(endDate);

  // Sinkronisasi state draft saat modal dibuka
  React.useEffect(() => {
    if (open) {
      setDraftPreset(value);
      setDraftStartDate(startDate);
      setDraftEndDate(endDate);
    }
  }, [open, value, startDate, endDate]);

  const presetLabels: Record<string, string> = {
    all: t("dashboard:filter.all_periods", "Semua Periode"),
    this_month: t("dashboard:filter.this_month", "Bulan Ini"),
    last_month: t("dashboard:filter.last_month", "Bulan Lalu"),
    this_year: t("dashboard:filter.this_year", "Tahun Ini"),
  };

  const hasActiveFilter =
    value !== "all" || (startDate.trim() !== "" || endDate.trim() !== "");

  const getDisplayLabel = () => {
    if (value === "custom" || (startDate && endDate)) {
      if (startDate && endDate) {
        return `${formatDateI18n(startDate, language)} – ${formatDateI18n(endDate, language)}`;
      }
      if (startDate) {
        return `≥ ${formatDateI18n(startDate, language)}`;
      }
      if (endDate) {
        return `≤ ${formatDateI18n(endDate, language)}`;
      }
      return t("dashboard:filter.custom_active", "Kustom");
    }
    if (value === "this_month") return presetLabels.this_month;
    if (value === "last_month") return presetLabels.last_month;
    if (value === "this_year") return presetLabels.this_year;
    if (value === "all") return presetLabels.all;
    const matchedPeriod = periods.find((p) => p.id === value);
    if (matchedPeriod) return matchedPeriod.name;
    return value || presetLabels.all;
  };

  const isInvalidRange =
    Boolean(draftStartDate && draftEndDate && draftStartDate > draftEndDate);

  function handleSelectPreset(presetKey: "all" | "this_month" | "last_month" | "this_year") {
    setDraftPreset(presetKey);
    setDraftStartDate("");
    setDraftEndDate("");
  }

  function handleSelectPeriod(period: PeriodRow) {
    setDraftPreset(period.id);
    setDraftStartDate(period.start_date);
    setDraftEndDate(period.end_date);
  }

  function handleReset() {
    setDraftPreset("all");
    setDraftStartDate("");
    setDraftEndDate("");
    onChange("all", "", "");
    onDateRangeChange?.("", "");
    setOpen(false);
  }

  function handleApply() {
    if (isInvalidRange) return;
    onChange(draftPreset, draftStartDate, draftEndDate);
    onDateRangeChange?.(draftStartDate, draftEndDate);
    setOpen(false);
  }

  return (
    <div className={cn("inline-flex w-full sm:w-auto items-center gap-2", className)}>
      {/* Tombol Utama Filter Periode */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={t("dashboard:filter.label", "Filter Periode")}
        className={cn(
          "h-9 w-full sm:w-auto min-w-0 sm:min-w-[175px] max-w-full sm:max-w-[260px] gap-2 rounded-xl px-3 sm:px-3.5 text-xs sm:text-sm font-semibold justify-between transition-all duration-200 cursor-pointer shadow-2xs select-none",
          hasActiveFilter
            ? "border-primary/60 bg-primary/10 text-primary dark:text-cyan-400 hover:bg-primary/15"
            : "border-border/80 bg-background/90 dark:bg-card text-foreground hover:bg-muted/70 hover:border-primary/50",
        )}
      >
        <span className="flex items-center gap-1.5 sm:gap-2 truncate">
          <CalendarDaysIcon className="size-3.5 text-primary shrink-0" />
          <span className="truncate">{getDisplayLabel()}</span>
        </span>
        <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0 ml-0.5" />
      </Button>

      {/* Modal Dialog Filter Terpadu */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {t("dashboard:filter.modal_title", "Filter Rentang Waktu & Periode")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-1 pb-1">
            {/* Seksi 1: Preset Waktu Cepat */}
            <div className="space-y-2.5">
              <label className="text-xs sm:text-sm font-semibold text-foreground block">
                {t("dashboard:filter.presets_title", "Pilihan Cepat")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(
                  [
                    { key: "all", label: presetLabels.all },
                    { key: "this_month", label: presetLabels.this_month },
                    { key: "last_month", label: presetLabels.last_month },
                    { key: "this_year", label: presetLabels.this_year },
                  ] as const
                ).map((item) => {
                  const isSelected =
                    draftPreset === item.key && !draftStartDate && !draftEndDate;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectPreset(item.key)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center shadow-2xs",
                        isSelected
                          ? "border-primary bg-primary/15 text-primary shadow-xs dark:text-cyan-400 ring-1 ring-primary/30"
                          : "border-border/70 text-foreground hover:bg-muted/70 hover:border-border",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seksi 2: Kustom Rentang Tanggal */}
            <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  {t("dashboard:filter.custom_range", "Kustom Rentang Tanggal")}
                </label>
                {(draftStartDate || draftEndDate) && (
                  <span className="text-[11px] font-semibold text-primary dark:text-cyan-400 bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20 tabular-nums">
                    {draftStartDate ? formatDateI18n(draftStartDate, language) : "..."} –{" "}
                    {draftEndDate ? formatDateI18n(draftEndDate, language) : "..."}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground block">
                    {t("dashboard:filter.start_date", "Tanggal Mulai")}
                  </span>
                  <DatePicker
                    value={draftStartDate}
                    onChange={(val) => {
                      setDraftStartDate(val);
                      setDraftPreset("custom");
                    }}
                    placeholder={t("dashboard:filter.select_start", "Pilih tanggal mulai...")}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground block">
                    {t("dashboard:filter.end_date", "Tanggal Selesai")}
                  </span>
                  <DatePicker
                    value={draftEndDate}
                    onChange={(val) => {
                      setDraftEndDate(val);
                      setDraftPreset("custom");
                    }}
                    placeholder={t("dashboard:filter.select_end", "Pilih tanggal selesai...")}
                  />
                </div>
              </div>

              {isInvalidRange && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {t(
                    "dashboard:filter.start_after_end_err",
                    "Tanggal mulai tidak boleh melebihi tanggal selesai.",
                  )}
                </p>
              )}
            </div>

            {/* Seksi 3: Periode Buku Akuntansi (Jika Tersedia) */}
            {periods.length > 0 && (
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-foreground block">
                    {t("dashboard:filter.periods_title", "Periode Buku Akuntansi")}
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t(
                      "dashboard:filter.periods_subtitle",
                      "Pilih periode pembukuan resmi yang terdaftar di master data.",
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {periods.map((p) => {
                    const isSelected = draftPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPeriod(p)}
                        className={cn(
                          "flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs",
                          isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-primary dark:text-cyan-400"
                            : "border-border/70 hover:bg-muted/60 hover:border-border text-foreground",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                            {formatDateI18n(p.start_date, language)} –{" "}
                            {formatDateI18n(p.end_date, language)}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                              p.status === "open"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border/60",
                            )}
                          >
                            {p.status === "open"
                              ? t("dashboard:filter.active_badge", "Aktif")
                              : t("dashboard:filter.closed_badge", "Tutup")}
                          </span>
                          {isSelected && <CheckIcon className="size-4 text-primary shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-border/70">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="w-full sm:w-auto h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcwIcon className="size-3.5 mr-1.5 shrink-0" />
              <span>{t("dashboard:filter.reset", "Reset ke Semua Periode")}</span>
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {t("dashboard:filter.cancel", "Batal")}
              </Button>
              <Button
                type="button"
                onClick={handleApply}
                disabled={isInvalidRange}
                className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground shadow-xs cursor-pointer"
              >
                {t("dashboard:filter.apply", "Terapkan Filter")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
