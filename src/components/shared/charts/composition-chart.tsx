import * as React from "react";
import { formatCompactRupiah } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
  const cx = 130;
  const cy = 40;
  const rx = 85;
  const ry = 38;
  const depth = 11;
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
    <div className="relative flex flex-col items-center justify-center w-full pt-1 pb-6">
      <svg
        viewBox="0 0 260 92"
        className="w-full max-w-[210px] sm:max-w-[225px] h-auto select-none overflow-visible"
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

      {/* Floating Badge Interaktif saat Irisan Disorot dengan Jarak Lega dari Pie */}
      {hoveredIdx !== null && slices[hoveredIdx] ? (
        <div className="absolute top-[86px] left-1/2 -translate-x-1/2 z-20 rounded-lg border border-border/80 bg-popover px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-md whitespace-nowrap tabular-nums pointer-events-none">
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
    <div className="flex flex-col justify-between gap-3 flex-1">
      <div className="flex items-center justify-center pt-1">
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
