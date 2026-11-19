import * as React from "react";
import { Link } from "react-router-dom";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DashboardKpiCardProps {
  label: string;
  value: number;
  formatter?: (val: number) => string;
  suffix?: string;
  subtext?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  iconTone?: string;
  to?: string;
  sparklineData?: number[];
  changePercent?: number | null;
  changeLabel?: string;
  invertChangeTone?: boolean;
  className?: string;
}

/** Mini Sparkline SVG rendering without external dependencies */
function MiniSparkline({
  data,
  color = "#10b981",
}: {
  data: number[];
  color?: string;
}) {
  const uid = React.useId().replace(/:/g, "");
  if (!data || data.length < 2) {
    return null;
  }

  const width = 58;
  const height = 22;
  const pad = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = pad + (idx / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((val - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const fillD = `${pathD} L ${points[points.length - 1]?.x.toFixed(1)} ${height} L ${points[0]?.x.toFixed(1)} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible shrink-0 select-none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#spark-grad-${uid})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  formatter,
  suffix,
  subtext,
  icon: Icon,
  iconTone = "bg-primary/10 text-primary dark:text-cyan-400 border-primary/20",
  to,
  sparklineData,
  changePercent,
  changeLabel,
  invertChangeTone = false,
  className,
}: DashboardKpiCardProps) {
  const hasChange = changePercent !== null && changePercent !== undefined && !Number.isNaN(changePercent);
  const isPositive = (changePercent ?? 0) >= 0;

  // Semantic color logic
  let trendColorClass = "text-muted-foreground";
  if (hasChange) {
    if (changePercent === 0) {
      trendColorClass = "text-muted-foreground";
    } else if (invertChangeTone) {
      trendColorClass = isPositive
        ? "text-rose-600 dark:text-rose-400"
        : "text-emerald-600 dark:text-emerald-400";
    } else {
      trendColorClass = isPositive
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400";
    }
  }

  const sparklineColor = hasChange
    ? trendColorClass.includes("emerald")
      ? "#10b981"
      : trendColorClass.includes("rose")
        ? "#f43f5e"
        : "#0B43C8"
    : "#0B43C8";

  const content = (
    <Card
      className={cn(
        "rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-between gap-3.5 transition-all duration-150",
        to && "group hover:border-primary/50 hover:bg-muted/15 cursor-pointer",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {label}
          </p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums truncate">
            <AnimatedNumber value={value} formatter={formatter} suffix={suffix} />
          </p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-150",
            to && "group-hover:scale-105",
            iconTone,
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
        <div className="min-w-0 flex items-center gap-1.5 text-[11px] leading-tight">
          {hasChange ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold tabular-nums shrink-0",
                trendColorClass,
              )}
            >
              {isPositive ? (
                <TrendingUpIcon className="size-3 shrink-0" />
              ) : (
                <TrendingDownIcon className="size-3 shrink-0" />
              )}
              {isPositive ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`}
            </span>
          ) : (
            <span className="text-muted-foreground font-semibold tabular-nums shrink-0">
              -
            </span>
          )}
          {changeLabel ? (
            <span className="text-muted-foreground truncate" title={changeLabel}>
              {changeLabel}
            </span>
          ) : subtext ? (
            <span className="text-muted-foreground truncate">
              {subtext}
            </span>
          ) : null}
        </div>

        {sparklineData && sparklineData.length >= 2 ? (
          <MiniSparkline data={sparklineData} color={sparklineColor} />
        ) : null}
      </div>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}
