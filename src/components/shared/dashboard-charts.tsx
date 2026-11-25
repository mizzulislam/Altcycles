import * as React from "react";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Ekspor komponen dan tipe dari modul terpecah untuk menjaga backwards-compatibility 100%
export * from "./charts/multi-series-chart";
export * from "./charts/composition-chart";

export interface ChartSwitchOption<T extends string> {
  value: T;
  label: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ChartCardFooter({
  label,
  rightMeta,
  children,
  className,
}: {
  label?: string;
  rightMeta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useLanguage();
  const displayLabel = !label || label === "Jenis Grafik" ? t("dashboard:charts.types.chart_type", "Jenis Grafik") : label;

  return (
    <div
      className={cn(
        "px-6 py-3 border-t border-border/70 bg-muted/10 flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <span>{displayLabel}</span>
        {rightMeta}
      </div>
      {children}
    </div>
  );
}

/** Komponen bersama baris keterangan warna seri grafik (tanpa border, rapat di dalam area grafik) */
export function ChartLegendRow({
  series,
  hiddenKeys,
  onToggleSeries,
  className,
}: {
  series: Array<{ key: string; label: string; color: string; textClass?: string }>;
  hiddenKeys?: Set<string>;
  onToggleSeries?: (key: string) => void;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-xs select-none",
        className,
      )}
    >
      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
        {t("dashboard:charts.legend", "Keterangan")}
      </span>
      <div className="flex flex-wrap items-center justify-end gap-3 text-[11px] font-medium">
        {series.map((s) => {
          const isHidden = hiddenKeys?.has(s.key) ?? false;
          const legendTooltip = onToggleSeries
            ? isHidden
              ? `Tampilkan seri ${s.label}`
              : `Sembunyikan seri ${s.label}`
            : undefined;
          const btnNode = (
            <button
              key={s.key}
              type="button"
              onClick={() => onToggleSeries?.(s.key)}
              className={cn(
                "inline-flex items-center gap-1.5 transition-opacity select-none",
                onToggleSeries ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default",
                isHidden ? "opacity-35 line-through" : "opacity-100",
              )}
            >
              <span
                style={{ backgroundColor: s.color }}
                className="size-2.5 rounded-full shrink-0"
              />
              <span className={s.textClass ?? "text-muted-foreground"}>
                {s.label}
              </span>
            </button>
          );
          return legendTooltip ? (
            <ActionTooltip key={s.key} content={legendTooltip} side="top">
              {btnNode}
            </ActionTooltip>
          ) : (
            btnNode
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegendFooter = ChartLegendRow;

/** Komponen bersama footer kartu yang menampilkan nilai total / indikator tunggal selaras dengan ChartSummaryFooter */
export function ChartValueFooter({
  label,
  value,
  trend,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  trend?: "up" | "down" | "neutral" | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-6 py-3.5 border-t border-border/70 bg-muted/10 flex items-center justify-between gap-3 text-xs h-[64px] min-h-[64px]",
        className,
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground inline-flex items-center gap-1.5">
        {trend === "up" && <TrendingUpIcon className="size-3.5 text-emerald-500 shrink-0" />}
        {trend === "down" && <TrendingDownIcon className="size-3.5 text-rose-500 shrink-0" />}
        {value}
      </span>
    </div>
  );
}

export interface ChartSummaryItem {
  label: React.ReactNode;
  value: React.ReactNode;
  valueClass?: string;
  onClick?: () => void;
  active?: boolean;
}

/**
 * Baris footer ringkasan metrik grafik (grid edge-to-edge dengan garis pembatas atas border-t).
 * Memiliki pembatas vertikal antar item (divide-x) dan min-h-[64px] selaras dengan ChartValueFooter.
 */
export function ChartSummaryFooter({
  items,
  className,
}: {
  items: ChartSummaryItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid bg-muted/10 divide-x divide-border/60 text-xs h-[64px] min-h-[64px] border-t border-border/70",
        items.length === 2 && "grid-cols-2",
        items.length === 3 && "grid-cols-3",
        items.length === 4 && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item, idx) => {
        const content = (
          <div
            className={cn(
              "py-3.5 flex flex-col justify-center",
              idx === 0 && "pl-6 pr-4",
              idx > 0 && idx < items.length - 1 && "px-4",
              idx === items.length - 1 && "pl-3.5 pr-6",
            )}
          >
            <div className="text-[11px] text-muted-foreground leading-tight">
              {item.label}
            </div>
            <p
              className={cn(
                "text-xs sm:text-sm font-bold tabular-nums mt-0.5",
                item.valueClass ?? "text-foreground",
              )}
            >
              {item.value}
            </p>
          </div>
        );

        if (item.onClick) {
          return (
            <button
              key={idx}
              type="button"
              onClick={item.onClick}
              className={cn(
                "text-left transition-opacity cursor-pointer hover:bg-muted/20 active:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                item.active === false && "opacity-40",
              )}
            >
              {content}
            </button>
          );
        }

        return <div key={idx}>{content}</div>;
      })}
    </div>
  );
}

export const ChartSummaryRow = ChartSummaryFooter;

/** Pemilih jenis grafik ringkas bergaya pill terstandar Altcycles. */
export function ChartTypeSwitcher<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: ChartSwitchOption<T>[];
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Pilihan tampilan grafik"
      className={cn(
        "inline-flex flex-wrap items-center gap-0.5 rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0",
        className,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <ActionTooltip key={opt.value} content={opt.title ?? opt.label} side="top">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                active
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60",
              )}
            >
              {Icon ? <Icon className="size-3.5" /> : null}
              <span>{opt.label}</span>
            </button>
          </ActionTooltip>
        );
      })}
    </div>
  );
}

export interface HistogramBin {
  label: string;
  count: number;
  totalAmount: number;
}

/** Mengelompokkan nominal transaksi ke dalam interval histogram Rupiah yang adaptif. */
export function buildRupiahHistogramBins(rawAmounts: number[]): {
  bins: HistogramBin[];
  average: number;
  median: number;
  totalCount: number;
} {
  const valid = rawAmounts
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (valid.length === 0) {
    return { bins: [], average: 0, median: 0, totalCount: 0 };
  }

  const maxVal = valid[valid.length - 1] ?? 0;
  const brackets =
    maxVal <= 10_000_000
      ? [
          { label: "< 500 rb", min: 0, max: 500_000 },
          { label: "500 rb–2 jt", min: 500_000, max: 2_000_000 },
          { label: "2–5 jt", min: 2_000_000, max: 5_000_000 },
          { label: "> 5 jt", min: 5_000_000, max: Number.POSITIVE_INFINITY },
        ]
      : maxVal <= 100_000_000
        ? [
            { label: "< 1 jt", min: 0, max: 1_000_000 },
            { label: "1–5 jt", min: 1_000_000, max: 5_000_000 },
            { label: "5–20 jt", min: 5_000_000, max: 20_000_000 },
            { label: "20–50 jt", min: 20_000_000, max: 50_000_000 },
            { label: "> 50 jt", min: 50_000_000, max: Number.POSITIVE_INFINITY },
          ]
        : [
            { label: "< 5 jt", min: 0, max: 5_000_000 },
            { label: "5–25 jt", min: 5_000_000, max: 25_000_000 },
            { label: "25–100 jt", min: 25_000_000, max: 100_000_000 },
            { label: "100–250 jt", min: 100_000_000, max: 250_000_000 },
            { label: "> 250 jt", min: 250_000_000, max: Number.POSITIVE_INFINITY },
          ];

  const bins: HistogramBin[] = brackets.map((b) => ({
    label: b.label,
    count: 0,
    totalAmount: 0,
  }));

  let sum = 0;
  for (const val of valid) {
    sum += val;
    const idx = brackets.findIndex((b) => val >= b.min && val < b.max);
    const target = bins[idx >= 0 ? idx : bins.length - 1];
    if (target) {
      target.count += 1;
      target.totalAmount += val;
    }
  }

  const mid = Math.floor(valid.length / 2);
  const midLeft = valid[mid - 1] ?? 0;
  const midVal = valid[mid] ?? 0;
  const median =
    valid.length % 2 === 0
      ? Math.round((midLeft + midVal) / 2)
      : midVal;

  return {
    bins,
    average: Math.round(sum / valid.length),
    median,
    totalCount: valid.length,
  };
}

/** Grafik Histogram distribusi frekuensi nominal transaksi. */
export function HistogramChart({
  bins,
  average,
  median,
  totalCount,
  unitLabel = "Transaksi",
  accentColor = "#0B43C8",
  emptyTitle = "Belum Ada Sampel Transaksi",
  emptySubtitle = "Histogram distribusi nominal otomatis muncul setelah ada catatan transaksi.",
  showFooter = true,
}: {
  bins: HistogramBin[];
  average: number;
  median: number;
  totalCount: number;
  unitLabel?: string;
  accentColor?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  showFooter?: boolean;
}) {
  const { t } = useLanguage();
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (bins.length === 0 || totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl border border-dashed border-border/70 bg-muted/10">
        <p className="text-xs font-semibold text-foreground">{emptyTitle}</p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
          {emptySubtitle}
        </p>
      </div>
    );
  }

  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const svgW = 640;
  const svgH = 216;
  const padT = 24;
  const padB = 30;
  const maxLabelWidth = String(maxCount).length * 8;
  const padL = Math.max(36, maxLabelWidth + 12);
  const padR = 0;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const binCount = bins.length;
  const slotW = binCount > 0 ? plotW / binCount : plotW;
  const barW = Math.max(20, slotW - 12);

  const hoveredBin = hoveredIdx !== null ? bins[hoveredIdx] : null;

  return (
    <div className={cn("flex flex-col h-full relative", showFooter ? "justify-between space-y-4" : "justify-center")}>
      {hoveredBin ? (
        <div className="absolute top-1 right-2 z-20 w-44 rounded-xl border border-border/80 bg-popover p-2 text-[11px] shadow-xl pointer-events-none">
          <p className="font-bold text-foreground">{hoveredBin.label}</p>
          <p className="text-muted-foreground tabular-nums mt-0.5">
            Frekuensi:{" "}
            <strong className="text-foreground">
              {hoveredBin.count} {unitLabel.toLowerCase()}
            </strong>{" "}
            ({totalCount > 0 ? Math.round((hoveredBin.count / totalCount) * 100) : 0}%)
          </p>
          <p className="text-muted-foreground tabular-nums">
            Total:{" "}
            <strong className="text-foreground">
              {formatRupiah(hoveredBin.totalAmount)}
            </strong>
          </p>
        </div>
      ) : null}

      <div className="relative">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto max-h-56 overflow-visible select-none"
          role="img"
          aria-label="Grafik histogram distribusi transaksi"
        >
          {/* Garis Grid Horizontal dan Skala Nilai Y (x1=padL sampai x2=svgW) */}
          {[maxCount, Math.ceil(maxCount / 2), 0].map((tick, idx) => {
            const ratio = maxCount > 0 ? tick / maxCount : 0;
            const y = padT + plotH * (1 - ratio);
            return (
              <g key={`${tick}-${idx}`}>
                <line
                  x1={padL}
                  y1={y}
                  x2={svgW}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-border/70"
                />
                <text
                  x={0}
                  y={y + 3.5}
                  textAnchor="start"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Sumbu Y (Vertikal) Memisahkan Skala Frekuensi dengan Batang */}
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={padT + plotH}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-border/80"
          />

          {/* Sumbu X (Horizontal) Memisahkan Batang dengan Label Bawah (x1=padL sampai x2=svgW) */}
          <line
            x1={padL}
            y1={padT + plotH}
            x2={svgW}
            y2={padT + plotH}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-border/80"
          />

          {/* Batang Histogram Persegi Kaku untuk Setiap Interval */}
          {bins.map((bin, idx) => {
            const centerX = padL + (idx + 0.5) * slotW;
            const barH =
              maxCount > 0
                ? Math.round((bin.count / maxCount) * plotH)
                : 0;
            const actualH = bin.count > 0 ? Math.max(4, barH) : 0;
            const bx = centerX - barW / 2;
            const by = padT + plotH - actualH;
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={bin.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={centerX - slotW / 2}
                  y={padT}
                  width={slotW}
                  height={plotH + padB}
                  fill="transparent"
                />

                {bin.count > 0 ? (
                  <text
                    x={centerX}
                    y={by - 4}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-semibold tabular-nums"
                  >
                    {bin.count}
                  </text>
                ) : null}

                <rect
                  x={bx}
                  y={by}
                  width={barW}
                  height={actualH}
                  fill={bin.count > 0 ? accentColor : "var(--muted)"}
                  rx="0"
                  ry="0"
                  className={cn(
                    "rounded-none transition-opacity duration-150",
                    bin.count > 0
                      ? isHovered
                        ? "opacity-100"
                        : "opacity-85 hover:opacity-100"
                      : "opacity-30",
                  )}
                />

                <text
                  x={centerX}
                  y={padT + plotH + 16}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-medium transition-colors select-none",
                    isHovered
                      ? "fill-foreground font-semibold"
                      : "fill-muted-foreground",
                  )}
                >
                  {bin.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {showFooter ? (
        <div className="-mx-6 -mb-6 mt-auto border-t border-border/70 bg-muted/10 grid grid-cols-3 divide-x divide-border/60 text-xs min-h-[58px] items-center">
          <div className="pl-6 pr-3 py-3 text-center sm:text-left">
            <p className="text-[10px] text-muted-foreground">{t("dashboard:charts.sample_count")}</p>
            <p className="font-bold text-foreground tabular-nums mt-0.5">
              {totalCount} {unitLabel}
            </p>
          </div>
          <div className="p-3 text-center sm:text-left">
            <p className="text-[10px] text-muted-foreground">{t("dashboard:charts.average_amount")}</p>
            <p className="font-bold text-foreground tabular-nums mt-0.5">
              {formatRupiah(average)}
            </p>
          </div>
          <div className="p-3 text-center sm:text-left">
            <p className="text-[10px] text-muted-foreground">{t("dashboard:charts.median_amount")}</p>
            <p className="font-bold text-foreground tabular-nums mt-0.5">
              {formatRupiah(median)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
