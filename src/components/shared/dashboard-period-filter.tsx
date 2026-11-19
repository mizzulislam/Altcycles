import { CalendarDaysIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { PeriodRow } from "@/types/database.types";

export type DashboardPeriodPreset = "this_month" | "last_month" | "this_year" | "all" | string;

export interface DashboardPeriodFilterProps {
  value: DashboardPeriodPreset;
  onChange: (val: DashboardPeriodPreset) => void;
  periods?: PeriodRow[];
  className?: string;
}

export function PeriodFilter({
  value,
  onChange,
  periods = [],
  className,
}: DashboardPeriodFilterProps) {
  const { t } = useLanguage();

  const presetLabels: Record<string, string> = {
    this_month: t("dashboard:filter.this_month", "Bulan Ini"),
    last_month: t("dashboard:filter.last_month", "Bulan Lalu"),
    this_year: t("dashboard:filter.this_year", "Tahun Ini"),
    all: t("dashboard:filter.all_periods", "Semua Periode"),
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Select value={value} onValueChange={(val) => onChange(val as DashboardPeriodPreset)}>
        <SelectTrigger
          aria-label={t("dashboard:filter.label", "Filter Periode")}
          className="h-9 min-w-[155px] sm:min-w-[175px] gap-2 rounded-xl text-xs sm:text-sm font-semibold border-border/80 bg-background/90 dark:bg-card shadow-2xs"
        >
          <CalendarDaysIcon className="size-3.5 text-primary shrink-0" />
          <SelectValue>
            {presetLabels[value] ?? (periods.find((p) => p.id === value)?.name ?? value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl border-border/80 bg-popover shadow-lg">
          <SelectGroup>
            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground select-none">
              {t("dashboard:filter.presets_title", "Pilihan Cepat")}
            </div>
            <SelectItem value="this_month" className="text-xs sm:text-sm">
              {presetLabels.this_month}
            </SelectItem>
            <SelectItem value="last_month" className="text-xs sm:text-sm">
              {presetLabels.last_month}
            </SelectItem>
            <SelectItem value="this_year" className="text-xs sm:text-sm">
              {presetLabels.this_year}
            </SelectItem>
            <SelectItem value="all" className="text-xs sm:text-sm">
              {presetLabels.all}
            </SelectItem>
          </SelectGroup>

          {periods.length > 0 ? (
            <>
              <div className="h-px bg-border/60 my-1 -mx-1" />
              <SelectGroup>
                <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground select-none">
                  {t("dashboard:filter.periods_title", "Periode Buku Akuntansi")}
                </div>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs sm:text-sm">
                    {p.name} {p.status === "open" ? `(${t("common:status.active", "Aktif")})` : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}
