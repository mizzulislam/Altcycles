import * as React from "react";
import { EyeIcon, ImageIcon, LayersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { useLanguage } from "@/lib/i18n";
import type { CategoryTickerItem } from "./login-media-types";

export const CategoryCompositionTicker = React.memo(function CategoryCompositionTicker({
  items,
}: {
  items: CategoryTickerItem[];
}) {
  const [activeTickerIdx, setActiveTickerIdx] = React.useState(0);
  const [tickerAnimating, setTickerAnimating] = React.useState(false);

  React.useEffect(() => {
    if (items.length <= 1) return;
    let innerTimeout: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      setTickerAnimating(true);
      innerTimeout = setTimeout(() => {
        setActiveTickerIdx((prev) => (prev + 1) % items.length);
        setTickerAnimating(false);
      }, 300);
    }, 3200);

    return () => {
      clearInterval(timer);
      if (innerTimeout) clearTimeout(innerTimeout);
    };
  }, [items.length]);

  const currentTicker = items[activeTickerIdx] ?? items[0] ?? {
    count: 0,
    label: "",
    dotTone: "bg-sky-400",
  };

  return (
    <div className="h-8 flex items-center mt-1 overflow-hidden">
      <div
        className={cn(
          "flex items-center transition-all duration-300 ease-out",
          tickerAnimating
            ? "-translate-y-4 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <span
          data-testid="login-media-category-ticker"
          className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums"
        >
          {currentTicker.count} {currentTicker.label}
        </span>
      </div>
    </div>
  );
});

export interface LoginMediaKpiGridProps {
  totalCount: number;
  activeCount: number;
  bannerCount: number;
  flyerCount: number;
  medsosCount: number;
  categoryTickerItems: CategoryTickerItem[];
}

export function LoginMediaKpiGrid({
  totalCount,
  activeCount,
  bannerCount,
  flyerCount,
  medsosCount,
  categoryTickerItems,
}: LoginMediaKpiGridProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
      <KpiCard
        label={t("settings:login_media.kpi_total")}
        value={totalCount}
        suffix={` ${t("settings:login_media.unit_content")}`}
        subtext={t("settings:login_media.kpi_total_desc")}
        icon={ImageIcon}
        iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
      />

      <KpiCard
        label={t("settings:login_media.kpi_active")}
        value={activeCount}
        suffix={` ${t("settings:login_media.unit_live")}`}
        subtext={
          activeCount > 1
            ? t("settings:login_media.kpi_active_desc_carousel")
            : activeCount === 1
              ? t("settings:login_media.kpi_active_desc_static")
              : t("settings:login_media.kpi_active_desc_default")
        }
        icon={EyeIcon}
        iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      />

      <KpiCard
        label={t("settings:login_media.kpi_composition")}
        displayValue={<CategoryCompositionTicker items={categoryTickerItems} />}
        subtext={t("settings:login_media.kpi_comp_count", {
          banner: bannerCount,
          flyer: flyerCount,
          medsos: medsosCount,
        })}
        icon={LayersIcon}
        iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      />
    </div>
  );
}
