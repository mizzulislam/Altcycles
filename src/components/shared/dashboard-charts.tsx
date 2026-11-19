import * as React from "react";
import { BarChart3Icon } from "lucide-react";
import { formatCompactRupiah, formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

export type MultiSeriesChartKind = "column" | "bar" | "area" | "line" | "bubble";

/** Grafik multi-seri serbaguna: Column, Horizontal Bar, dan Area Chart. */
export function MultiSeriesChart({
  chartType: rawChartType,
  data,
  series,
  formatValue,
  formatShortValue,
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
  // Fallback anggun: Line dan Bubble otomatis dialihkan ke Column/Area tanpa error
  const chartType: "column" | "bar" | "area" =
    rawChartType === "bar"
      ? "bar"
      : rawChartType === "area"
        ? "area"
        : "column";
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

  // Mode Horizontal Bar Chart (hanya 3 periode terakhir agar proporsional dan tidak meninggalkan whitespace)
  if (chartType === "bar") {
    const barData = data.slice(-3);
    return (
      <div className="space-y-3">
        {barData.map((pt, idx) => {
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
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/60">
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
              <div className="space-y-2">
                {series.map((s) => {
                  const val = pt.values[s.key] ?? 0;
                  const pct =
                    val === 0 ? 0 : Math.max(3, Math.round((Math.abs(val) / maxAbsValue) * 100));
                  return (
                    <div key={s.key} className="flex items-center gap-2.5">
                      <span className="w-20 shrink-0 text-[10px] font-medium text-muted-foreground truncate">
                        {s.label}
                      </span>
                      {/* Sumbu Vertikal Pemisah Label dengan Batang */}
                      <div className="border-l-2 border-border/80 pl-2.5 flex-1 flex items-center">
                        <div className="h-2.5 w-full rounded-none bg-muted/60 overflow-hidden">
                          <div
                            style={{
                              width: `${pct}%`,
                              backgroundColor: val < 0 ? "#f43f5e" : s.color,
                            }}
                            className="h-full rounded-none transition-all duration-300"
                          />
                        </div>
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


  // Mode Area Chart
  if (chartType === "area") {
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
          {/* Sumbu X (Horizontal) Memisahkan Grafik dengan Label Bawah */}
          <line
            x1={padL}
            y1={padT + plotH}
            x2={padL + plotW}
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

  // Default Mode: Column Chart (Grouped Vertical Bars dengan Sumbu X & Y Tegas)
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

      {/* Sumbu Y Vertikal Memisahkan Skala Angka dengan Kolom Grafik */}
      <div className="mt-[-92px] ml-16 pl-4 pr-2 border-l-2 border-border/80 flex items-end justify-around gap-3 h-40">
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

              {/* Sumbu X Horizontal di Bawah Kolom Persegi Kaku */}
              <div className="flex items-end gap-1.5 h-32 w-full justify-center border-b border-border/80 pb-0.5">
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
                      className="w-3.5 sm:w-4 rounded-none opacity-90 group-hover:opacity-100 transition-all duration-200"
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

export type CompositionChartKind = "pie3d" | "donut" | "pie" | "bar";

/** Komponen 3D Pie / Donut Chart isometrik dengan dinding kedalaman dan label nominal langsung di irisan */
function ThreeDPieChart({
  slices,
  total,
  formatValue,
  hoveredIdx,
  setHoveredIdx,
}: {
  slices: CompositionSlice[];
  total: number;
  formatValue: (v: number) => string;
  hoveredIdx: number | null;
  setHoveredIdx: (idx: number | null) => void;
}) {
  const cx = 130;
  const cy = 58;
  const rx = 90;
  const ry = 44;
  const irx = 26;
  const iry = 13;
  const depth = 16;

  // Bangun busur sektor mulai dari sudut -45° untuk perspektif 3D terbaik
  const baseStartDeg = -45;
  let cursor = baseStartDeg;
  const sectors = slices
    .map((seg, idx) => {
      const val = Math.max(0, seg.value);
      const sweep = total > 0 ? (val / total) * 360 : 0;
      const start = cursor;
      const end = cursor + sweep;
      cursor = end;
      return {
        seg,
        idx,
        val,
        pct: total > 0 ? Math.round((val / total) * 100) : 0,
        start,
        end,
        sweep,
        mid: start + sweep / 2,
      };
    })
    .filter((s) => s.val > 0);

  const getPt = (radiusX: number, radiusY: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radiusX * Math.cos(rad),
      y: cy + radiusY * Math.sin(rad),
    };
  };

  // Sampling titik busur yang menghadap depan (sudut di kuadran depan: 0° s.d. 180° mod 360)
  const getFrontPoints = (startDeg: number, endDeg: number, radiusX: number, radiusY: number) => {
    const pts: { x: number; y: number }[] = [];
    const step = 4;
    for (let a = startDeg; a <= endDeg; a += step) {
      const norm = ((a % 360) + 360) % 360;
      if (norm >= 0 && norm <= 180) {
        pts.push(getPt(radiusX, radiusY, a));
      }
    }
    const endNorm = ((endDeg % 360) + 360) % 360;
    if (endNorm >= 0 && endNorm <= 180) {
      pts.push(getPt(radiusX, radiusY, endDeg));
    }
    return pts;
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <svg
        viewBox="0 0 260 144"
        className="w-full max-w-[270px] h-auto select-none overflow-visible"
        role="img"
        aria-label="3D Pie Chart Komposisi Keuangan"
      >
        {/* Dinding Lubang Silinder Dalam (Bagian belakang terlihat dari atas) */}
        <path
          d={`M ${getPt(irx, iry, 180).x.toFixed(1)} ${getPt(irx, iry, 180).y.toFixed(1)} A ${irx} ${iry} 0 0 1 ${getPt(irx, iry, 360).x.toFixed(1)} ${getPt(irx, iry, 360).y.toFixed(1)} L ${getPt(irx, iry, 360).x.toFixed(1)} ${(getPt(irx, iry, 360).y + depth).toFixed(1)} A ${irx} ${iry} 0 0 0 ${getPt(irx, iry, 180).x.toFixed(1)} ${(getPt(irx, iry, 180).y + depth).toFixed(1)} Z`}
          fill="rgba(0,0,0,0.5)"
          className="pointer-events-none"
        />

        {/* 1. DINDING DEPAN LUAR BERPERSPEKTIF 3D (Extruded Curved Front Wall) */}
        {sectors.map((s) => {
          const frontPts = getFrontPoints(s.start, s.end, rx, ry);
          if (frontPts.length < 2) return null;
          const firstPt = frontPts[0];
          const lastPt = frontPts[frontPts.length - 1];
          if (!firstPt || !lastPt) return null;
          const active = hoveredIdx === s.idx;
          const wallPath = [
            `M ${firstPt.x.toFixed(1)} ${firstPt.y.toFixed(1)}`,
            ...frontPts.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
            `L ${lastPt.x.toFixed(1)} ${(lastPt.y + depth).toFixed(1)}`,
            ...frontPts.slice().reverse().map((p) => `L ${p.x.toFixed(1)} ${(p.y + depth).toFixed(1)}`),
            "Z",
          ].join(" ");

          return (
            <path
              key={`wall-${s.seg.label}`}
              d={wallPath}
              fill={s.seg.color}
              style={{ filter: "brightness(0.68)" }}
              opacity={active ? 1 : 0.88}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="0.75"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIdx(s.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}

        {/* 2. DINDING POTONGAN RADIAL 3D (Radial Cut Faces) */}
        {sectors.map((s) => {
          const active = hoveredIdx === s.idx;
          const startPtOut = getPt(rx, ry, s.start);
          const startPtIn = getPt(irx, iry, s.start);
          const endPtOut = getPt(rx, ry, s.end);
          const endPtIn = getPt(irx, iry, s.end);

          const radStart = (s.start * Math.PI) / 180;
          const radEnd = (s.end * Math.PI) / 180;
          const startFacesFront = Math.cos(radStart) < 0;
          const endFacesFront = Math.cos(radEnd) > 0;

          return (
            <g key={`cuts-${s.seg.label}`}>
              {startFacesFront ? (
                <polygon
                  points={`${startPtIn.x.toFixed(1)},${startPtIn.y.toFixed(1)} ${startPtOut.x.toFixed(1)},${startPtOut.y.toFixed(1)} ${startPtOut.x.toFixed(1)},${(startPtOut.y + depth).toFixed(1)} ${startPtIn.x.toFixed(1)},${(startPtIn.y + depth).toFixed(1)}`}
                  fill={s.seg.color}
                  style={{ filter: "brightness(0.78)" }}
                  opacity={active ? 1 : 0.9}
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="0.5"
                  onMouseEnter={() => setHoveredIdx(s.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                />
              ) : null}
              {endFacesFront ? (
                <polygon
                  points={`${endPtIn.x.toFixed(1)},${endPtIn.y.toFixed(1)} ${endPtOut.x.toFixed(1)},${endPtOut.y.toFixed(1)} ${endPtOut.x.toFixed(1)},${(endPtOut.y + depth).toFixed(1)} ${endPtIn.x.toFixed(1)},${(endPtIn.y + depth).toFixed(1)}`}
                  fill={s.seg.color}
                  style={{ filter: "brightness(0.82)" }}
                  opacity={active ? 1 : 0.9}
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="0.5"
                  onMouseEnter={() => setHoveredIdx(s.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                />
              ) : null}
            </g>
          );
        })}

        {/* 3. MUKA ATAS ELIPS IRISAN 3D (Top Faces) */}
        {sectors.map((s) => {
          const active = hoveredIdx === s.idx;
          const pToStart = getPt(rx, ry, s.start);
          const pToEnd = getPt(rx, ry, s.end);
          const pTiStart = getPt(irx, iry, s.start);
          const pTiEnd = getPt(irx, iry, s.end);
          const largeArc = s.sweep > 180 ? 1 : 0;

          const isFull = s.sweep >= 359.5;
          let topD = "";
          if (isFull) {
            const p1 = getPt(rx, ry, 0);
            const p2 = getPt(rx, ry, 180);
            const pi1 = getPt(irx, iry, 0);
            const pi2 = getPt(irx, iry, 180);
            topD = `M ${p1.x} ${p1.y} A ${rx} ${ry} 0 0 1 ${p2.x} ${p2.y} A ${rx} ${ry} 0 0 1 ${p1.x} ${p1.y} M ${pi1.x} ${pi1.y} A ${irx} ${iry} 0 0 0 ${pi2.x} ${pi2.y} A ${irx} ${iry} 0 0 0 ${pi1.x} ${pi1.y} Z`;
          } else {
            topD = `M ${pToStart.x.toFixed(1)} ${pToStart.y.toFixed(1)} A ${rx} ${ry} 0 ${largeArc} 1 ${pToEnd.x.toFixed(1)} ${pToEnd.y.toFixed(1)} L ${pTiEnd.x.toFixed(1)} ${pTiEnd.y.toFixed(1)} A ${irx} ${iry} 0 ${largeArc} 0 ${pTiStart.x.toFixed(1)} ${pTiStart.y.toFixed(1)} Z`;
          }

          // Efek mekar irisan (exploded slice) saat disorot kursor
          const midRad = (s.mid * Math.PI) / 180;
          const explodeX = active ? Math.cos(midRad) * 4 : 0;
          const explodeY = active ? Math.sin(midRad) * 2.5 : 0;

          // Koordinat teks label nominal di atas irisan
          const labelRadX = (rx + irx) / 2;
          const labelRadY = (ry + iry) / 2;
          const pLabel = getPt(labelRadX, labelRadY, s.mid);

          return (
            <g
              key={`top-${s.seg.label}`}
              transform={`translate(${explodeX.toFixed(1)}, ${explodeY.toFixed(1)})`}
              className="cursor-pointer transition-transform duration-200"
              onMouseEnter={() => setHoveredIdx(s.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <path
                d={topD}
                fill={s.seg.color}
                stroke="var(--card)"
                strokeWidth="1.25"
                opacity={hoveredIdx === null || active ? 1 : 0.8}
              />
              {/* Teks nominal langsung pada irisan (seperti gambar referensi) jika porsi >= 10% */}
              {s.pct >= 10 ? (
                <text
                  x={pLabel.x}
                  y={pLabel.y + 3.5}
                  textAnchor="middle"
                  className="fill-white text-[10px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none select-none tabular-nums"
                >
                  {formatCompactRupiah(s.val)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Floating Badge Interaktif saat Irisan Disorot */}
      {hoveredIdx !== null && slices[hoveredIdx] ? (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 rounded-lg border border-border/80 bg-popover px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-md whitespace-nowrap tabular-nums">
          {slices[hoveredIdx].label}: {formatValue(slices[hoveredIdx].value)} (
          {total > 0 ? Math.round((Math.max(0, slices[hoveredIdx].value) / total) * 100) : 0}%)
        </div>
      ) : null}
    </div>
  );
}


/** Grafik proporsi komposisi data: 3D Pie Chart, Donut Chart, maupun Horizontal Bar Chart. */
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

  // Mode Horizontal Bar: semua persegi panjang tanpa rounded (rounded-none)
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
                    className={cn("size-2.5 rounded-none shrink-0", seg.dotClass)}
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
              {/* Sumbu Pemisah dan Batang Persegi Kaku */}
              <div className="border-l-2 border-border/80 pl-2">
                <div className="h-2.5 w-full rounded-none bg-muted/60 overflow-hidden">
                  <div
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: seg.color,
                    }}
                    className={cn(
                      "h-full rounded-none transition-all duration-300",
                      hoveredIdx === idx ? "opacity-100" : "opacity-85",
                    )}
                  />
                </div>
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

  return (
    <div className="flex flex-col justify-between gap-5 flex-1">
      <div className="flex items-center justify-center">
        {chartType === "donut" ? (
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
        ) : (
          /* Mode Utama: 3D Pie Chart Sesuai Referensi Gambar */
          <ThreeDPieChart
            slices={slices}
            total={total}
            formatValue={formatValue}
            hoveredIdx={hoveredIdx}
            setHoveredIdx={setHoveredIdx}
          />
        )}
      </div>

      <div className="space-y-2">
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
                "flex items-center justify-between gap-3 text-xs p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer",
                active ? "bg-muted/40 font-semibold" : "hover:bg-muted/20",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn("size-2.5 rounded-none shrink-0", seg.dotClass)}
                />
                <span className="text-foreground font-medium truncate">
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

  return (
    <div className="flex flex-col h-full justify-between space-y-4">
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

        {/* Kolom Histogram Saling Berdampingan Rapat dengan Sumbu Y & Sumbu X */}
        <div className="mt-[-76px] ml-9 pl-2 pr-1 flex items-end gap-1 h-28 border-l-2 border-b border-border/80 pb-0.5">
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
                    "w-full rounded-none transition-all duration-200",
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

        <div className="ml-9 pl-2 pr-1 flex items-start gap-1 mt-1.5">
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

      {/* Ringkasan Statistik Edge-to-Edge */}
      <div className="-mx-6 -mb-6 mt-auto border-t border-border/70 bg-muted/10 grid grid-cols-3 divide-x divide-border/60 text-xs">
        <div className="p-3 text-center sm:text-left">
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
    </div>
  );
}
