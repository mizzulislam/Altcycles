import { KeyboardIcon, LockIcon, ShieldCheckIcon, SlidersHorizontalIcon } from "lucide-react";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { useLanguage } from "@/lib/i18n";

export interface ShortcutsKpiGridProps {
  totalItems: number;
  customCount: number;
  lockedCount: number;
}

export function ShortcutsKpiGrid({
  totalItems,
  customCount,
  lockedCount,
}: ShortcutsKpiGridProps) {
  const { t } = useLanguage();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Terdaftar */}
      <KpiCard
        label={t("shortcuts.kpi_total", "Total Terdaftar")}
        value={totalItems}
        suffix={` ${t("shortcuts.unit_shortcuts", "Pintasan")}`}
        subtext={t("shortcuts.kpi_total_desc", "Pintasan global di registry")}
        icon={KeyboardIcon}
        iconTone="text-primary dark:text-sky-400 bg-primary/10 border-primary/20"
      />

      {/* Pintasan Kustom */}
      <KpiCard
        label={t("shortcuts.kpi_custom", "Pintasan Kustom")}
        value={customCount}
        suffix={` ${t("shortcuts.unit_modified", "Dimodifikasi")}`}
        subtext={t("shortcuts.kpi_custom_desc", "Dimodifikasi dari bawaan")}
        icon={SlidersHorizontalIcon}
        iconTone="text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
      />

      {/* Sistem Terkunci */}
      <KpiCard
        label={t("shortcuts.kpi_locked", "Sistem Terkunci")}
        value={lockedCount}
        suffix={` ${t("shortcuts.unit_locked", "Terkunci")}`}
        subtext={t("shortcuts.kpi_locked_desc", "Proteksi tombol inti sistem")}
        icon={LockIcon}
        iconTone="text-muted-foreground bg-muted border-border"
      />

      {/* Cakupan Portal */}
      <KpiCard
        label={t("shortcuts.kpi_coverage", "Cakupan Portal")}
        displayValue={t("shortcuts.kpi_coverage_value", "3 Portal")}
        subtext={t("shortcuts.kpi_coverage_desc", "Super Admin, Bendahara, User")}
        icon={ShieldCheckIcon}
        iconTone="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      />
    </div>
  );
}
