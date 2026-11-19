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

/** Komponen bersama footer kartu yang menampilkan keterangan warna seri interaktif (Item 2) */
export function ChartLegendFooter({
  series,
  hiddenKeys,
  onToggleSeries,
  className,
}: {
  series: ChartSeriesDef[];
  hiddenKeys?: Set<string>;
  onToggleSeries?: (key: string) => void;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "px-6 py-3 border-t border-border/70 bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-xs",
        className,
      )}
    >
      <span className="text-[11px] font-medium text-muted-foreground">
        {t("dashboard:charts.legend", "Keterangan")}
      </span>
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
        {series.map((s) => {
          const isHidden = hiddenKeys?.has(s.key) ?? false;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onToggleSeries?.(s.key)}
              className={cn(
                "inline-flex items-center gap-1.5 transition-opacity cursor-pointer rounded-sm hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                isHidden ? "opacity-35" : "opacity-90",
              )}
              title={isHidden ? `Tampilkan ${s.label}` : `Sembunyikan ${s.label}`}
            >
              <span
                style={{ backgroundColor: s.color }}
                className={cn(
                  "size-2.5 rounded-xs shrink-0 transition-transform",
                  isHidden && "scale-75",
                )}
              />
              <span className={cn(isHidden && "line-through text-muted-foreground")}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
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
                    fill={val < 0 ? "#f43f5e" : s.color}
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

export interface CompositionSlice {
  label: string;
  value: number;
  count?: number;
  color: string;
  dotClass: string;
}

export type CompositionChartKind = "pie3d" | "donut" | "pie" | "bar";

/** Komponen 3D Pie Chart isometrik solid bebas lubang dengan gradasi halus, bayangan lembut, dan tanpa border gelap (Item 5) */
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
  const cx = 145;
  const cy = 66;
  const rx = 114;
  const ry = 54;
  const depth = 16;
  const chartUid = React.useId().replace(/:/g, "");

  const baseStartDeg = -90;
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

  const getPt = (radiusX: number, radiusY: number, angleDeg: number, offsetY = 0) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radiusX * Math.cos(rad),
      y: cy + radiusY * Math.sin(rad) + offsetY,
    };
  };

  const getFrontOuterPoints = (startDeg: number, endDeg: number) => {
    const pts: { x: number; y: number }[] = [];
    const step = 2;
    for (let a = startDeg; a <= endDeg; a += step) {
      const norm = ((a % 360) + 360) % 360;
      if (norm >= 0 && norm <= 180) {
        pts.push(getPt(rx, ry, a));
      }
    }
    const endNorm = ((endDeg % 360) + 360) % 360;
    if (endNorm >= 0 && endNorm <= 180) {
      pts.push(getPt(rx, ry, endDeg));
    }
    return pts;
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full py-1">
      <svg
        viewBox="0 0 290 152"
        className="w-full max-w-[290px] h-auto select-none overflow-visible"
        role="img"
        aria-label="3D Solid Pie Chart Komposisi Keuangan"
      >
        <defs>
          <filter id={`pie-shadow-${chartUid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
          {sectors.map((s) => (
            <linearGradient
              key={`grad-${s.idx}`}
              id={`pie-slice-grad-${chartUid}-${s.idx}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.seg.color} stopOpacity="1" />
              <stop offset="100%" stopColor={s.seg.color} stopOpacity="0.86" />
            </linearGradient>
          ))}
        </defs>

        {/* Bayangan Lembut di Bawah 3D Pie */}
        <ellipse
          cx={cx}
          cy={cy + depth + 4}
          rx={rx - 4}
          ry={ry - 4}
          fill="rgba(0,0,0,0.22)"
          filter={`url(#pie-shadow-${chartUid})`}
          className="pointer-events-none"
        />

        {/* 1. DINDING DEPAN LENGKUNG KEDALAMAN 3D (Tanpa Stroke Gelap) */}
        {sectors.map((s) => {
          const frontPts = getFrontOuterPoints(s.start, s.end);
          if (frontPts.length < 2) return null;
          const firstPt = frontPts[0];
          const lastPt = frontPts[frontPts.length - 1];
          if (!firstPt || !lastPt) return null;
          const active = hoveredIdx === s.idx;
          const midRad = (s.mid * Math.PI) / 180;
          const explodeX = active ? Math.cos(midRad) * 5 : 0;
          const explodeY = active ? Math.sin(midRad) * 3 : 0;

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
              style={{ filter: "brightness(0.72)" }}
              opacity={hoveredIdx === null || active ? 0.95 : 0.65}
              transform={active ? `translate(${explodeX.toFixed(1)}, ${explodeY.toFixed(1)})` : undefined}
              className="cursor-pointer transition-all duration-200 ease-out"
              onMouseEnter={() => setHoveredIdx(s.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}

        {/* 2. DINDING POTONGAN RADIAL 3D (Solid Radial Cut Faces - Tanpa Stroke Gelap) */}
        {sectors.map((s) => {
          const active = hoveredIdx === s.idx;
          const midRad = (s.mid * Math.PI) / 180;
          const explodeX = active ? Math.cos(midRad) * 5 : 0;
          const explodeY = active ? Math.sin(midRad) * 3 : 0;

          const pStart = getPt(rx, ry, s.start);
          const pEnd = getPt(rx, ry, s.end);
          const radStart = (s.start * Math.PI) / 180;
          const radEnd = (s.end * Math.PI) / 180;
          const startFacesFront = Math.cos(radStart) < 0;
          const endFacesFront = Math.cos(radEnd) > 0;

          return (
            <g
              key={`cuts-${s.seg.label}`}
              transform={active ? `translate(${explodeX.toFixed(1)}, ${explodeY.toFixed(1)})` : undefined}
              className="cursor-pointer transition-all duration-200 ease-out"
            >
              {startFacesFront ? (
                <polygon
                  points={`${cx},${cy} ${pStart.x.toFixed(1)},${pStart.y.toFixed(1)} ${pStart.x.toFixed(1)},${(pStart.y + depth).toFixed(1)} ${cx},${cy + depth}`}
                  fill={s.seg.color}
                  style={{ filter: "brightness(0.78)" }}
                  opacity={hoveredIdx === null || active ? 0.95 : 0.65}
                  onMouseEnter={() => setHoveredIdx(s.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ) : null}
              {endFacesFront ? (
                <polygon
                  points={`${cx},${cy} ${pEnd.x.toFixed(1)},${pEnd.y.toFixed(1)} ${pEnd.x.toFixed(1)},${(pEnd.y + depth).toFixed(1)} ${cx},${cy + depth}`}
                  fill={s.seg.color}
                  style={{ filter: "brightness(0.82)" }}
                  opacity={hoveredIdx === null || active ? 0.95 : 0.65}
                  onMouseEnter={() => setHoveredIdx(s.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ) : null}
            </g>
          );
        })}

        {/* 3. MUKA ATAS SOLID PIE DENGAN GRADASI HALUS & PEMISAH TOKEN */}
        {sectors.map((s) => {
          const active = hoveredIdx === s.idx;
          const pStart = getPt(rx, ry, s.start);
          const pEnd = getPt(rx, ry, s.end);
          const largeArc = s.sweep > 180 ? 1 : 0;
          const isFull = s.sweep >= 359.5;

          const topD = isFull
            ? `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry} Z`
            : `M ${cx} ${cy} L ${pStart.x.toFixed(1)} ${pStart.y.toFixed(1)} A ${rx} ${ry} 0 ${largeArc} 1 ${pEnd.x.toFixed(1)} ${pEnd.y.toFixed(1)} Z`;

          const midRad = (s.mid * Math.PI) / 180;
          const explodeX = active ? Math.cos(midRad) * 5 : 0;
          const explodeY = active ? Math.sin(midRad) * 3 : 0;

          const pLabel = getPt(rx * 0.65, ry * 0.65, s.mid);

          return (
            <g
              key={`top-${s.seg.label}`}
              transform={active ? `translate(${explodeX.toFixed(1)}, ${explodeY.toFixed(1)})` : undefined}
              className="cursor-pointer transition-all duration-200 ease-out"
              onMouseEnter={() => setHoveredIdx(s.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <path
                d={topD}
                fill={`url(#pie-slice-grad-${chartUid}-${s.idx})`}
                stroke="var(--card)"
                strokeWidth="1.2"
                opacity={hoveredIdx === null || active ? 1 : 0.65}
              />
              {/* Teks nominal langsung pada irisan jika porsi >= 15% */}
              {s.pct >= 15 ? (
                <text
                  x={pLabel.x}
                  y={pLabel.y + 3.5}
                  textAnchor="middle"
                  className="fill-white text-[10px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] pointer-events-none select-none tabular-nums"
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
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 rounded-lg border border-border/80 bg-popover px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-md whitespace-nowrap tabular-nums pointer-events-none">
          {slices[hoveredIdx].label}: {formatValue(slices[hoveredIdx].value)} (
          {total > 0 ? Math.round((Math.max(0, slices[hoveredIdx].value) / total) * 100) : 0}%)
        </div>
      ) : null}
    </div>
  );
}


/** Grafik proporsi komposisi data: 3D Solid Pie Chart, Donut Chart, maupun Horizontal Bar Chart. */
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
    <div className="flex flex-col justify-between gap-4 flex-1">
      {/* 1. Ringkasan Metrik Bersih di Luar Pie (Item 5: Bebas dari Lubang/Teks Timpaan) */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-border/70 bg-muted/20">
        <span className="text-xs font-semibold text-muted-foreground">{centerLabel}</span>
        <span className="text-sm sm:text-base font-bold text-foreground tabular-nums">{centerValue}</span>
      </div>

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
          /* Mode Utama: 3D Solid Pie Chart Modern Sesuai Permintaan Item 5 */
          <ThreeDPieChart
            slices={slices}
            total={total}
            formatValue={formatValue}
            hoveredIdx={hoveredIdx}
            setHoveredIdx={setHoveredIdx}
          />
        )}
      </div>

      {/* Rincian Komposisi dengan Batang Horizontal Terintegrasi (Pie & Bar Menyatu) */}
      <div className="space-y-2.5">
        {slices.map((seg, idx) => {
          const val = Math.max(0, seg.value);
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          const active = hoveredIdx === idx;
          return (
            <div
              key={seg.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={cn(
                "p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer space-y-1.5",
                active ? "bg-muted/40 font-semibold" : "hover:bg-muted/20",
              )}
            >
              <div className="flex items-center justify-between gap-3 text-xs">
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
              {/* Batang Horizontal Terintegrasi (Persegi Kaku rounded-none) */}
              <div className="h-1.5 w-full rounded-none bg-muted/60 overflow-hidden">
                <div
                  style={{
                    width: `${pct}%`,
                    backgroundColor: seg.color,
                  }}
                  className={cn(
                    "h-full rounded-none transition-all duration-300",
                    active ? "opacity-100" : "opacity-85",
                  )}
                />
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
  const svgW = 640;
  const svgH = 216;
  const padT = 24;
  const padB = 30;
  // Dynamic padL to place Y labels starting at x=0
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
    <div className="flex flex-col h-full justify-between space-y-4 relative">
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
                {/* Tepi kiri label teks Y di x=0 dengan textAnchor="start" sejajar tepi card content */}
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
                {/* Hit area transparan */}
                <rect
                  x={centerX - slotW / 2}
                  y={padT}
                  width={slotW}
                  height={plotH + padB}
                  fill="transparent"
                />

                {/* Angka frekuensi di atas batang jika ada transaksi */}
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

                {/* Batang Histogram (Persegi Kaku rounded-none) */}
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

                {/* Label Interval di Bawah Sumbu X */}
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

      {/* Ringkasan Statistik Edge-to-Edge dengan tinggi min-h-[58px] identik mode area (CLS = 0) */}
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
    </div>
  );
}
