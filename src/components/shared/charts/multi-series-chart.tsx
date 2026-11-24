import * as React from "react";
import { BarChart3Icon } from "lucide-react";
import { cn } from "@/lib/utils";

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

export type MultiSeriesChartKind = "column" | "bar" | "area" | "line" | "bubble";

/** Grafik multi-seri serbaguna: Column dan Area Chart (Item 4: Batang dialihkan ke Kolom). */
export function MultiSeriesChart({
  chartType: rawChartType,
  data,
  series,
  formatValue,
  formatShortValue,
  hiddenKeys,
  emptyTitle = "Belum Ada Data Grafik",
  emptySubtitle = "Visualisasi akan muncul otomatis setelah transaksi tercatat.",
}: {
  chartType: MultiSeriesChartKind;
  data: MultiSeriesDatum[];
  series: ChartSeriesDef[];
  formatValue: (v: number) => string;
  formatShortValue?: (v: number) => string;
  bubbleConfig?: BubbleAxisConfig;
  hiddenKeys?: Set<string>;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  // Fallback anggun: Batang, Line, dan Bubble otomatis dialihkan ke Column/Area tanpa error (Item 4)
  const chartType: "column" | "area" =
    rawChartType === "area" ? "area" : "column";
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const chartUid = React.useId().replace(/:/g, "");
  const shortFmt = formatShortValue ?? formatValue;

  const activeSeries = React.useMemo(() => {
    if (!hiddenKeys || hiddenKeys.size === 0) return series;
    return series.filter((s) => !hiddenKeys.has(s.key));
  }, [series, hiddenKeys]);

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
    ...data.flatMap((d) => activeSeries.map((s) => Math.abs(d.values[s.key] ?? 0))),
  );

  // Ukuran kanvas SVG & konfigurasi tema grafik terstandar
  const svgW = 640;
  const svgH = 216;
  const padT = 18;
  const padB = 30;
  const tickRatios = [1, 0.5, 0];
  const tickStrings = tickRatios.map((r) => shortFmt(Math.round(maxAbsValue * r)));
  const maxLabelChars = Math.max(3, ...tickStrings.map((s) => s.length));
  // Lebar label Y dihitung presisi, padR = 0 untuk edge-to-edge rata kanan sempurna (Item 3 & 6)
  const padL = Math.max(50, Math.ceil(maxLabelChars * 6.5 + 8));
  const padR = 0;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const count = data.length;

  // Mode Area Chart
  if (chartType === "area") {
    const getX = (idx: number) =>
      count <= 1 ? padL + plotW / 2 : padL + (idx / (count - 1)) * plotW;
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
            {activeSeries.map((s) => (
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
          aria-label="Grafik area tren"
        >
          <defs>
            {activeSeries.map((s) => (
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

          {/* Garis Grid Horizontal dan Label Sumbu Y (Tepi kiri persis x=0) */}
          {tickRatios.map((ratio) => {
            const y = padT + plotH * (1 - ratio);
            return (
              <g key={ratio}>
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
                  className="fill-muted-foreground text-[10px] tabular-nums font-medium"
                >
                  {shortFmt(Math.round(maxAbsValue * ratio))}
                </text>
              </g>
            );
          })}

          {/* Sumbu Y (Vertikal) Memisahkan Angka Nilai dengan Area Grafik */}
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={padT + plotH}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-border/80"
          />

          {/* Sumbu X (Horizontal) Memisahkan Grafik dengan Label Bawah, ujung kanan x=svgW */}
          <line
            x1={padL}
            y1={padT + plotH}
            x2={svgW}
            y2={padT + plotH}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-border/80"
          />

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

          {activeSeries.map((s) => {
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
                {areaPath ? (
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

  // Default Mode: Column Chart (Grouped Vertical Bars dengan Sumbu X & Y Tegas Edge-to-Edge)
  const colSlotW = count > 0 ? plotW / count : plotW;
  const colSeriesCount = activeSeries.length;
  const colBarWidth = Math.min(18, Math.max(7, Math.floor((colSlotW * 0.58) / (colSeriesCount || 1))));
  const colBarGap = 2;
  const colTotalGroupWidth = colSeriesCount * colBarWidth + Math.max(0, colSeriesCount - 1) * colBarGap;

  const colHoveredDatum = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative">
      {colHoveredDatum ? (
        <div className="absolute top-1 right-2 z-20 w-48 rounded-xl border border-border/80 bg-popover p-2.5 text-[11px] shadow-xl pointer-events-none">
          <p className="font-bold text-foreground mb-1">{colHoveredDatum.label}</p>
          {activeSeries.map((s) => (
            <div
              key={s.key}
              className={cn(
                "flex justify-between gap-2",
                s.textClass ?? "text-foreground",
              )}
            >
              <span className="truncate">{s.label}</span>
              <span className="font-semibold tabular-nums shrink-0">
                {shortFmt(colHoveredDatum.values[s.key] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto max-h-56 overflow-visible select-none"
        role="img"
        aria-label="Grafik kolom tren"
      >
        {/* Garis Grid Horizontal dan Skala Nilai Y (Tepi kiri persis x=0) */}
        {tickRatios.map((ratio) => {
          const y = padT + plotH * (1 - ratio);
          return (
            <g key={ratio}>
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
                className="fill-muted-foreground text-[10px] tabular-nums font-medium"
              >
                {shortFmt(Math.round(maxAbsValue * ratio))}
              </text>
            </g>
          );
        })}

        {/* Sumbu Y (Vertikal) Memisahkan Angka Nilai dengan Area Grafik */}
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-border/80"
        />

        {/* Sumbu X (Horizontal) Memisahkan Grafik dengan Label Bawah, ujung kanan x=svgW */}
        <line
          x1={padL}
          y1={padT + plotH}
          x2={svgW}
          y2={padT + plotH}
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-border/80"
        />

        {/* Kolom Grafik Persegi Kaku untuk Setiap Periode */}
        {data.map((pt, idx) => {
          const centerX = padL + (idx + 0.5) * colSlotW;
          const groupStartX = centerX - colTotalGroupWidth / 2;
          const isHovered = hoveredIndex === idx;

          return (
            <g
              key={pt.key}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              {/* Hit area transparan */}
              <rect
                x={centerX - colSlotW / 2}
                y={padT}
                width={colSlotW}
                height={plotH + padB}
                fill="transparent"
              />

              {/* Batang Kolom untuk Setiap Series Aktif */}
              {activeSeries.map((s, sIdx) => {
                const val = pt.values[s.key] ?? 0;
                const barH =
                  maxAbsValue > 0
                    ? Math.round((Math.abs(val) / maxAbsValue) * plotH)
                    : 0;
                const bx = groupStartX + sIdx * (colBarWidth + colBarGap);
                const actualH = val !== 0 ? Math.max(3, barH) : 0;
                const by = padT + plotH - actualH;

                return (
                  <rect
                    key={s.key}
                    x={bx}
                    y={by}
                    width={colBarWidth}
                    height={actualH}
                    fill={s.color}
                    rx="0"
                    ry="0"
                    className={cn(
                      "transition-opacity duration-150",
                      isHovered ? "opacity-100" : "opacity-90 hover:opacity-100",
                    )}
                  />
                );
              })}

              {/* Label Bulan/Periode di Bawah Sumbu X */}
              <text
                x={centerX}
                y={padT + plotH + 18}
                textAnchor="middle"
                className={cn(
                  "text-[11px] font-medium transition-colors select-none",
                  isHovered
                    ? "fill-foreground font-semibold"
                    : "fill-muted-foreground",
                )}
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
