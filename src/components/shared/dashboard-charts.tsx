import * as React from "react";
import { BarChart3Icon } from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface ChartSwitchOption<T extends string> {
  value: T;
  label: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

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
          <button
            key={opt.value}
            type="button"
            title={opt.title ?? opt.label}
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
            {Icon ? <Icon className="size-3 shrink-0" /> : null}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface ChartSeriesDef {
  key: string;
  label: string;
  color: string;
  barClass?: string;
  textClass?: string;
}

export interface MultiSeriesDatum {
  key: string;
  label: string;
  values: Record<string, number>;
}

export interface BubbleAxisConfig {
  xKey: string;
  yKey: string;
  sizeKey: string;
  xLabel: string;
  yLabel: string;
  sizeLabel: string;
  showBreakEvenLine?: boolean;
}

export type MultiSeriesChartKind = "column" | "bar" | "line" | "area" | "bubble";

/** Grafik multi-seri serbaguna: Column, Horizontal Bar, Line, Area, dan Bubble Chart. */
export function MultiSeriesChart({
  chartType,
  data,
  series,
  formatValue,
  formatShortValue,
  bubbleConfig,
  emptyTitle = "Belum Ada Data Grafik",
  emptySubtitle = "Visualisasi akan muncul otomatis setelah transaksi tercatat.",
}: {
  chartType: MultiSeriesChartKind;
  data: MultiSeriesDatum[];
  series: ChartSeriesDef[];
  formatValue: (v: number) => string;
  formatShortValue?: (v: number) => string;
  bubbleConfig?: BubbleAxisConfig;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const chartUid = React.useId().replace(/:/g, "");
  const shortFmt = formatShortValue ?? formatValue;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-border/70 bg-muted/10">
        <BarChart3Icon className="size-8 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
          {emptySubtitle}
        </p>
      </div>
    );
  }

  const maxAbsValue = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => Math.abs(d.values[s.key] ?? 0))),
  );

  // Mode Horizontal Bar Chart
  if (chartType === "bar") {
    return (
      <div className="space-y-3.5">
        {data.map((pt, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <div
              key={pt.key}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={cn(
                "rounded-xl border px-3.5 py-2.5 transition-colors",
                isHovered
                  ? "border-primary/40 bg-muted/30"
                  : "border-border/50 bg-muted/10",
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-foreground">
                  {pt.label}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums">
                  {series.map((s) => {
                    const val = pt.values[s.key] ?? 0;
                    return (
                      <span
                        key={s.key}
                        className={cn("font-semibold", s.textClass ?? "text-foreground")}
                      >
                        {s.label}: {shortFmt(val)}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                {series.map((s) => {
                  const val = pt.values[s.key] ?? 0;
                  const pct =
                    val === 0 ? 0 : Math.max(3, Math.round((Math.abs(val) / maxAbsValue) * 100));
                  return (
                    <div key={s.key} className="flex items-center gap-2.5">
                      <span className="w-20 shrink-0 text-[10px] font-medium text-muted-foreground truncate">
                        {s.label}
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          style={{
                            width: `${pct}%`,
                            backgroundColor: val < 0 ? "#f43f5e" : s.color,
                          }}
                          className="h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Mode Bubble Chart (Pemetaan 2 Sumbu + Ukuran Gelembung)
  if (chartType === "bubble" && bubbleConfig) {
    const svgW = 640;
    const svgH = 232;
    const padL = 72;
    const padR = 26;
    const padT = 22;
    const padB = 34;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;

    const maxX = Math.max(
      1,
      ...data.map((d) => Math.max(0, d.values[bubbleConfig.xKey] ?? 0)),
    );
    const maxY = Math.max(
      1,
      ...data.map((d) => Math.max(0, d.values[bubbleConfig.yKey] ?? 0)),
    );
    const axisMax = bubbleConfig.showBreakEvenLine ? Math.max(maxX, maxY) : 0;
    const effMaxX = bubbleConfig.showBreakEvenLine ? axisMax : maxX;
    const effMaxY = bubbleConfig.showBreakEvenLine ? axisMax : maxY;
    const maxSize = Math.max(
      1,
      ...data.map((d) => Math.abs(d.values[bubbleConfig.sizeKey] ?? 0)),
    );

    const activeBubble = hoveredIndex !== null ? data[hoveredIndex] : null;

    return (
      <div className="relative space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            Sumbu X: <strong className="text-foreground">{bubbleConfig.xLabel}</strong>{" "}
            &bull; Sumbu Y:{" "}
            <strong className="text-foreground">{bubbleConfig.yLabel}</strong> &bull; Ukuran:{" "}
            <strong className="text-foreground">{bubbleConfig.sizeLabel}</strong>
          </span>
          {bubbleConfig.showBreakEvenLine ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-4 border-t border-dashed border-muted-foreground/70" />
              Garis Impas (Pendapatan = Beban)
            </span>
          ) : null}
        </div>

        <div className="relative">
          {activeBubble ? (
            <div className="absolute top-1 right-2 z-20 w-52 rounded-xl border border-border/80 bg-popover p-2.5 text-[11px] shadow-xl pointer-events-none">
              <p className="font-bold text-foreground mb-1">{activeBubble.label}</p>
              <div className="flex justify-between gap-2 text-emerald-500">
                <span>{bubbleConfig.xLabel}</span>
                <span className="font-semibold tabular-nums">
                  {shortFmt(activeBubble.values[bubbleConfig.xKey] ?? 0)}
                </span>
              </div>
              <div className="flex justify-between gap-2 text-amber-500">
                <span>{bubbleConfig.yLabel}</span>
                <span className="font-semibold tabular-nums">
                  {shortFmt(activeBubble.values[bubbleConfig.yKey] ?? 0)}
                </span>
              </div>
              <div className="flex justify-between gap-2 text-primary dark:text-sky-400">
                <span>{bubbleConfig.sizeLabel}</span>
                <span className="font-semibold tabular-nums">
                  {shortFmt(activeBubble.values[bubbleConfig.sizeKey] ?? 0)}
                </span>
              </div>
            </div>
          ) : null}

          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto max-h-60 overflow-visible select-none"
            role="img"
            aria-label="Grafik gelembung keuangan"
          >
            {[0, 0.5, 1].map((ratio) => {
              const y = padT + plotH * (1 - ratio);
              const x = padL + plotW * ratio;
              return (
                <g key={ratio}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={padL + plotW}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-border/70"
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px] tabular-nums"
                  >
                    {shortFmt(Math.round(effMaxY * ratio))}
                  </text>
                  <line
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={padT + plotH}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-border/40"
                  />
                  <text
                    x={x}
                    y={padT + plotH + 16}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px] tabular-nums"
                  >
                    {shortFmt(Math.round(effMaxX * ratio))}
                  </text>
                </g>
              );
            })}

            {bubbleConfig.showBreakEvenLine ? (
              <line
                x1={padL}
                y1={padT + plotH}
                x2={padL + plotW}
                y2={padT}
                stroke="currentColor"
                strokeWidth="1.25"
                strokeDasharray="5 4"
                className="text-muted-foreground/60"
              />
            ) : null}

            {data.map((pt, idx) => {
              const xv = Math.max(0, pt.values[bubbleConfig.xKey] ?? 0);
              const yv = Math.max(0, pt.values[bubbleConfig.yKey] ?? 0);
              const sv = Math.abs(pt.values[bubbleConfig.sizeKey] ?? 0);
              const cx = padL + (xv / effMaxX) * plotW;
              const cy = padT + plotH - (yv / effMaxY) * plotH;
              const r = 9 + Math.sqrt(sv / maxSize) * 16;
              const isSurplus = xv >= yv;
              const bubbleColor = isSurplus ? "#10b981" : "#f59e0b";
              const active = hoveredIndex === idx;

              return (
                <g
                  key={pt.key}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={active ? r + 3 : r}
                    fill={bubbleColor}
                    fillOpacity={active ? 0.38 : 0.22}
                    stroke={bubbleColor}
                    strokeWidth={active ? 2.5 : 1.75}
                    className="transition-all duration-150"
                  />
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-bold pointer-events-none"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  // Mode Line Chart & Area Chart
  if (chartType === "line" || chartType === "area") {
    const svgW = 640;
    const svgH = 216;
    const padL = 72;
    const padR = 24;
    const padT = 18;
    const padB = 30;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    const count = data.length;

    const getX = (idx: number) =>
      count === 1 ? padL + plotW / 2 : padL + (idx / (count - 1)) * plotW;
    const getY = (val: number) => {
      const clamped = Math.max(0, val);
      return padT + plotH - (clamped / maxAbsValue) * plotH;
    };

    const hoveredDatum = hoveredIndex !== null ? data[hoveredIndex] : null;

    return (
      <div className="relative">
        {hoveredDatum ? (
          <div className="absolute top-1 right-2 z-20 w-48 rounded-xl border border-border/80 bg-popover p-2.5 text-[11px] shadow-xl pointer-events-none">
            <p className="font-bold text-foreground mb-1">{hoveredDatum.label}</p>
            {series.map((s) => (
              <div
                key={s.key}
                className={cn(
                  "flex justify-between gap-2",
                  s.textClass ?? "text-foreground",
                )}
              >
                <span className="truncate">{s.label}</span>
                <span className="font-semibold tabular-nums shrink-0">
                  {shortFmt(hoveredDatum.values[s.key] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto max-h-56 overflow-visible select-none"
          role="img"
          aria-label={chartType === "area" ? "Grafik area tren" : "Grafik garis tren"}
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.key}
                id={`${chartUid}-grad-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {[1, 0.5, 0].map((ratio) => {
            const y = padT + plotH * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padL}
                  y1={y}
                  x2={padL + plotW}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-border/70"
                />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {shortFmt(Math.round(maxAbsValue * ratio))}
                </text>
              </g>
            );
          })}

          {hoveredIndex !== null ? (
            <line
              x1={getX(hoveredIndex)}
              y1={padT}
              x2={getX(hoveredIndex)}
              y2={padT + plotH}
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-primary/50"
            />
          ) : null}

          {series.map((s) => {
            const pts = data.map((d, idx) => ({
              x: getX(idx),
              y: getY(d.values[s.key] ?? 0),
            }));
            const linePath = pts
              .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(" ");
            const baselineY = (padT + plotH).toFixed(1);
            const firstPt = pts[0];
            const lastPt = pts[pts.length - 1];
            const areaPath =
              firstPt && lastPt
                ? `${linePath} L ${lastPt.x.toFixed(1)} ${baselineY} L ${firstPt.x.toFixed(1)} ${baselineY} Z`
                : "";

            return (
              <g key={s.key}>
                {chartType === "area" && areaPath ? (
                  <path d={areaPath} fill={`url(#${chartUid}-grad-${s.key})`} />
                ) : null}
                {pts.length > 1 ? (
                  <path
                    d={linePath}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {pts.map((p, idx) => (
                  <circle
                    key={`${s.key}-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === idx ? 5 : 3.5}
                    fill={s.color}
                    stroke="var(--card)"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                ))}
              </g>
            );
          })}

          {data.map((d, idx) => {
            const x = getX(idx);
            const hitWidth = count === 1 ? plotW : plotW / count;
            return (
              <g
                key={d.key}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x - hitWidth / 2}
                  y={padT}
                  width={hitWidth}
                  height={plotH + padB}
                  fill="transparent"
                />
                <text
                  x={x}
                  y={padT + plotH + 18}
                  textAnchor="middle"
                  className={cn(
                    "text-[11px] font-medium transition-colors",
                    hoveredIndex === idx
                      ? "fill-foreground font-semibold"
                      : "fill-muted-foreground",
                  )}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Default Mode: Column Chart (Grouped Vertical Bars)
  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-8 pointer-events-none">
        {[1, 0.5, 0].map((ratio) => (
          <div
            key={ratio}
            className="flex items-center gap-3 border-b border-dashed border-border/50 pb-1"
          >
            <span className="w-16 text-[10px] text-muted-foreground tabular-nums text-right shrink-0">
              {shortFmt(Math.round(maxAbsValue * ratio))}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-[-92px] pl-20 pr-2 flex items-end justify-around gap-3 h-40">
        {data.map((pt, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <div
              key={pt.key}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative flex-1 max-w-28 flex flex-col items-center group cursor-pointer"
            >
              {isHovered ? (
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20 w-48 rounded-xl border border-border/80 bg-popover p-2.5 text-[11px] shadow-xl pointer-events-none">
                  <p className="font-bold text-foreground mb-1">{pt.label}</p>
                  {series.map((s) => (
                    <div
                      key={s.key}
                      className={cn(
                        "flex justify-between gap-2",
                        s.textClass ?? "text-foreground",
                      )}
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="font-semibold tabular-nums shrink-0">
                        {shortFmt(pt.values[s.key] ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex items-end gap-1.5 h-32">
                {series.map((s) => {
                  const val = pt.values[s.key] ?? 0;
                  const barH = Math.max(
                    4,
                    Math.round((Math.abs(val) / maxAbsValue) * 124),
                  );
                  const negativeColor = val < 0 ? "#f43f5e" : s.color;
                  return (
                    <div
                      key={s.key}
                      style={{
                        height: `${val !== 0 ? barH : 2}px`,
                        backgroundColor: negativeColor,
                      }}
                      className="w-3.5 sm:w-4 rounded-t-md opacity-90 group-hover:opacity-100 transition-all duration-200"
                    />
                  );
                })}
              </div>
              <span className="mt-2 text-[11px] font-medium text-muted-foreground group-hover:text-foreground whitespace-nowrap">
                {pt.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface CompositionSlice {
  label: string;
  value: number;
  count?: number;
  color: string;
  dotClass: string;
}

export type CompositionChartKind = "donut" | "pie" | "bar";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describePieSector(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    cx,
    cy,
    "L",
    start.x.toFixed(2),
    start.y.toFixed(2),
    "A",
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x.toFixed(2),
    end.y.toFixed(2),
    "Z",
  ].join(" ");
}

/** Grafik proporsi komposisi data: Donut Chart, Pie Chart, maupun Horizontal Bar Chart. */
export function CompositionChart({
  chartType,
  slices,
  centerLabel = "Total",
  centerValue = "0",
  formatValue,
  emptyTitle = "Belum Ada Data Komposisi",
  emptySubtitle = "Proporsi akan muncul otomatis saat data tersedia.",
}: {
  chartType: CompositionChartKind;
  slices: CompositionSlice[];
  centerLabel?: string;
  centerValue?: string;
  formatValue: (v: number) => string;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const maxVal = Math.max(1, ...slices.map((s) => Math.max(0, s.value)));

  if (total <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl border border-dashed border-border/70 bg-muted/10">
        <p className="text-xs font-semibold text-foreground">{emptyTitle}</p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
          {emptySubtitle}
        </p>
      </div>
    );
  }

  if (chartType === "bar") {
    return (
      <div className="space-y-3">
        {slices.map((seg, idx) => {
          const val = Math.max(0, seg.value);
          const sharePct = Math.round((val / total) * 100);
          const barPct = val === 0 ? 0 : Math.max(4, Math.round((val / maxVal) * 100));
          return (
            <div
              key={seg.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn("size-2.5 rounded-full shrink-0", seg.dotClass)}
                  />
                  <span className="text-foreground font-medium truncate">
                    {seg.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="font-semibold text-foreground">
                    {formatValue(val)}
                  </span>
                  <span className="text-[11px] text-muted-foreground w-8 text-right">
                    {sharePct}%
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: seg.color,
                  }}
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    hoveredIdx === idx ? "opacity-100" : "opacity-85",
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const hoveredSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;
  const donutRadius = 56;
  const donutCircumference = 2 * Math.PI * donutRadius;

  // Build angles for Pie Chart
  const pieSectors = (() => {
    let cursor = 0;
    return slices.map((seg, idx) => {
      const val = Math.max(0, seg.value);
      const sweep = (val / total) * 360;
      const startAngle = cursor;
      const endAngle = cursor + sweep;
      cursor = endAngle;
      return { seg, idx, val, sweep, startAngle, endAngle };
    });
  })();

  const nonZeroSectors = pieSectors.filter((p) => p.val > 0);
  const singleSector = nonZeroSectors[0];

  return (
    <div className="flex flex-col justify-between gap-5 flex-1">
      <div className="flex items-center justify-center">
        {chartType === "pie" ? (
          <div className="relative size-36 flex items-center justify-center">
            <svg
              viewBox="0 0 140 140"
              className="size-36"
              role="img"
              aria-label="Pie Chart komposisi data"
            >
              {nonZeroSectors.length === 1 && singleSector ? (
                <circle
                  cx="70"
                  cy="70"
                  r="62"
                  fill={singleSector.seg.color}
                  stroke="var(--card)"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredIdx(singleSector.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-opacity"
                />
              ) : (
                nonZeroSectors.map(({ seg, idx, startAngle, endAngle }) => {
                  const active = hoveredIdx === idx;
                  return (
                    <path
                      key={seg.label}
                      d={describePieSector(
                        70,
                        70,
                        active ? 65 : 61,
                        startAngle,
                        endAngle,
                      )}
                      fill={seg.color}
                      stroke="var(--card)"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer transition-all duration-150"
                      opacity={hoveredIdx === null || active ? 1 : 0.72}
                    />
                  );
                })
              )}
            </svg>
            {hoveredSlice ? (
              <div className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-lg border border-border/80 bg-popover px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-md whitespace-nowrap tabular-nums">
                {hoveredSlice.label}: {Math.round((Math.max(0, hoveredSlice.value) / total) * 100)}%
              </div>
            ) : null}
          </div>
        ) : (
          <div className="relative size-36 flex items-center justify-center">
            <svg
              viewBox="0 0 140 140"
              className="size-36 -rotate-90"
              aria-label="Grafik donat komposisi"
            >
              <circle
                cx="70"
                cy="70"
                r={donutRadius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="16"
                className="text-muted/40"
              />
              {
                slices.reduce<{
                  offset: number;
                  nodes: React.ReactNode[];
                }>(
                  (acc, seg, idx) => {
                    const val = Math.max(0, seg.value);
                    const dash = (val / total) * donutCircumference;
                    const active = hoveredIdx === idx;
                    const node = (
                      <circle
                        key={seg.label}
                        cx="70"
                        cy="70"
                        r={donutRadius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth={active ? 19 : 16}
                        strokeDasharray={`${dash} ${donutCircumference - dash}`}
                        strokeDashoffset={-acc.offset}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        opacity={hoveredIdx === null || active ? 1 : 0.65}
                        className="cursor-pointer transition-all duration-200"
                      />
                    );
                    return {
                      offset: acc.offset + dash,
                      nodes: [...acc.nodes, node],
                    };
                  },
                  { offset: 0, nodes: [] },
                ).nodes
              }
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
              <span className="text-[10px] font-medium text-muted-foreground truncate max-w-24">
                {hoveredSlice ? hoveredSlice.label : centerLabel}
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums mt-0.5">
                {hoveredSlice ? formatValue(hoveredSlice.value) : centerValue}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {slices.map((seg, idx) => {
          const val = Math.max(0, seg.value);
          const pct = Math.round((val / total) * 100);
          const active = hoveredIdx === idx;
          return (
            <div
              key={seg.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={cn(
                "flex items-center justify-between gap-2 text-xs rounded-lg px-1.5 py-0.5 -mx-1.5 transition-colors cursor-default",
                active && "bg-muted/40",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn("size-2.5 rounded-full shrink-0", seg.dotClass)}
                />
                <span className="text-muted-foreground truncate">
                  {seg.label}
                </span>
                {typeof seg.count === "number" ? (
                  <span className="text-[10px] text-muted-foreground/80 tabular-nums shrink-0">
                    ({seg.count})
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className="font-semibold text-foreground">
                  {formatValue(val)}
                </span>
                <span className="text-[11px] text-muted-foreground w-8 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
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
}: {
  bins: HistogramBin[];
  average: number;
  median: number;
  totalCount: number;
  unitLabel?: string;
  accentColor?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
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

  return (
    <div className="space-y-4">
      <div className="relative pt-4">
        <div className="grid grid-cols-1 gap-7 pointer-events-none">
          {[maxCount, Math.ceil(maxCount / 2), 0].map((tick, idx) => (
            <div
              key={`${tick}-${idx}`}
              className="flex items-center gap-2 border-b border-dashed border-border/50 pb-1"
            >
              <span className="w-8 text-[10px] text-muted-foreground tabular-nums text-right shrink-0">
                {tick}
              </span>
            </div>
          ))}
        </div>

        {/* Kolom Histogram Saling Berdampingan Rapat */}
        <div className="mt-[-76px] pl-10 pr-1 flex items-end gap-1 h-28">
          {bins.map((bin, idx) => {
            const barH =
              bin.count === 0 ? 3 : Math.max(8, Math.round((bin.count / maxCount) * 88));
            const sharePct = Math.round((bin.count / totalCount) * 100);
            const active = hoveredIdx === idx;
            return (
              <div
                key={bin.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
              >
                {active ? (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 w-44 rounded-xl border border-border/80 bg-popover p-2 text-[11px] shadow-xl pointer-events-none">
                    <p className="font-bold text-foreground">{bin.label}</p>
                    <p className="text-muted-foreground tabular-nums mt-0.5">
                      Frekuensi:{" "}
                      <strong className="text-foreground">
                        {bin.count} {unitLabel.toLowerCase()}
                      </strong>{" "}
                      ({sharePct}%)
                    </p>
                    <p className="text-muted-foreground tabular-nums">
                      Total:{" "}
                      <strong className="text-foreground">
                        {formatRupiah(bin.totalAmount)}
                      </strong>
                    </p>
                  </div>
                ) : null}

                <span className="text-[10px] font-semibold text-foreground tabular-nums mb-1">
                  {bin.count > 0 ? bin.count : ""}
                </span>
                <div
                  style={{
                    height: `${barH}px`,
                    backgroundColor: bin.count > 0 ? accentColor : "var(--muted)",
                  }}
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-200",
                    bin.count > 0
                      ? active
                        ? "opacity-100"
                        : "opacity-80 group-hover:opacity-100"
                      : "opacity-40",
                  )}
                />
              </div>
            );
          })}
        </div>

        <div className="pl-10 pr-1 flex items-start gap-1 mt-1.5">
          {bins.map((bin, idx) => (
            <span
              key={bin.label}
              className={cn(
                "flex-1 text-center text-[10px] leading-tight truncate",
                hoveredIdx === idx
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground",
              )}
              title={bin.label}
            >
              {bin.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/60 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground">Jumlah Sampel</p>
          <p className="font-bold text-foreground tabular-nums mt-0.5">
            {totalCount} {unitLabel}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Rata-Rata Nominal</p>
          <p className="font-bold text-foreground tabular-nums mt-0.5">
            {formatRupiah(average)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Median Nominal</p>
          <p className="font-bold text-foreground tabular-nums mt-0.5">
            {formatRupiah(median)}
          </p>
        </div>
      </div>
    </div>
  );
}
