import * as React from "react";
import { Link } from "react-router-dom";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { TruncatedTooltipText } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DashboardKpiCardProps {
  label: string;
  value?: number;
  displayValue?: React.ReactNode;
  valueClassName?: string;
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
  compactMobile?: boolean;
}

/** Mini Sparkline SVG rendering without external dependencies */
function MiniSparkline({
  data,
  color = "var(--status-success-fg, #10b981)",
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

function getToneStyles(iconTone: string) {
  const lower = iconTone.toLowerCase();

  const textClasses = iconTone
    .split(/\s+/)
    .filter(
      (c) =>
        (c.startsWith("text-") || c.startsWith("dark:text-")) &&
        !c.includes("bg-") &&
        !c.includes("border-"),
    );

  const textColor =
    textClasses.length > 0
      ? textClasses.join(" ")
      : "text-primary dark:text-cyan-400";

  let glowClass = "from-primary/20 via-primary/5 to-transparent";
  if (lower.includes("emerald")) {
    glowClass = "from-emerald-500/20 via-emerald-500/5 to-transparent";
  } else if (lower.includes("amber")) {
    glowClass = "from-amber-500/20 via-amber-500/5 to-transparent";
  } else if (lower.includes("violet") || lower.includes("purple")) {
    glowClass = "from-violet-500/20 via-violet-500/5 to-transparent";
  } else if (lower.includes("rose") || lower.includes("red")) {
    glowClass = "from-rose-500/20 via-rose-500/5 to-transparent";
  } else if (lower.includes("sky") || lower.includes("cyan")) {
    glowClass = "from-sky-500/20 via-sky-500/5 to-transparent";
  } else if (lower.includes("muted")) {
    glowClass = "from-muted-foreground/15 via-muted/5 to-transparent";
  }

  return { textColor, glowClass };
}

export function KpiCard({
  label,
  value,
  displayValue,
  valueClassName,
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
  compactMobile = false,
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
      ? "var(--status-success-fg, #10b981)"
      : trendColorClass.includes("rose")
        ? "var(--status-danger-fg, #f43f5e)"
        : "var(--primary, #0B43C8)"
    : "var(--primary, #0B43C8)";

  const { textColor, glowClass } = React.useMemo(
    () => getToneStyles(iconTone),
    [iconTone],
  );

  const content = (
    <Card
      data-slot="kpi-card"
      className={cn(
        "relative overflow-hidden rounded-2xl border-border/80 bg-card p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3 sm:gap-3.5 h-full transition-all duration-150",
        compactMobile
          ? "max-sm:px-3.5 max-sm:py-2.5 max-sm:gap-1.5"
          : "max-sm:p-3 max-sm:gap-2.5",
        to && "group hover:border-primary/50 hover:bg-muted/15 cursor-pointer",
        className,
      )}
    >
      {/* 4. Gradient glow di sisi kanan card memudar halus ke arah kiri */}
      <div
        className={cn(
          "absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none select-none bg-gradient-to-l rounded-r-2xl",
          glowClass,
        )}
        aria-hidden="true"
      />

      {/* 1, 2, 3. Ikon berdiri sendiri tanpa wadah/border, menyentuh top-0, tidak melewati footer, tidak menimpa teks, opacity samar seperti watermark */}
      <div
        className={cn(
          "absolute top-0 right-2 sm:right-3.5 pointer-events-none select-none z-0",
          "opacity-15 dark:opacity-20 transition-transform duration-200",
          compactMobile && "max-sm:size-8",
          to && "group-hover:scale-105",
          textColor,
        )}
        aria-hidden="true"
      >
        <Icon
          className={cn(
            "size-[68px] sm:size-[78px] stroke-[1.5]",
            compactMobile ? "max-sm:size-8" : "max-sm:size-[60px]",
          )}
        />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-14 sm:pr-16">
          <TruncatedTooltipText
            as="p"
            className="max-sm:text-[11px] text-xs font-medium text-muted-foreground leading-tight"
          >
            {label}
          </TruncatedTooltipText>
          <div
            className={cn(
              "text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums truncate leading-tight",
              compactMobile
                ? "max-sm:text-[17px] max-sm:leading-tight max-sm:mt-0 max-sm:py-0"
                : "max-sm:text-base max-sm:mt-0.5 mt-1 py-0.5",
              valueClassName,
            )}
          >
            {displayValue ? (
              displayValue
            ) : (
              <AnimatedNumber value={value ?? 0} formatter={formatter} suffix={suffix} />
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 flex items-center justify-between gap-2 pt-1 border-t border-border/50 min-h-[26px]",
          compactMobile
            ? "max-sm:min-h-0 max-sm:pt-1 max-sm:border-border/40"
            : "max-sm:min-h-[22px]",
        )}
      >
        <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden max-sm:text-[10px] text-[11px] leading-tight">
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
          ) : null}
          {changeLabel ? (
            <TruncatedTooltipText
              as="span"
              wrapperClassName="min-w-0 flex-1 truncate"
              className="text-muted-foreground truncate"
            >
              {changeLabel}
            </TruncatedTooltipText>
          ) : subtext ? (
            <TruncatedTooltipText
              as="span"
              wrapperClassName="min-w-0 flex-1 truncate"
              className="text-muted-foreground truncate"
            >
              {subtext}
            </TruncatedTooltipText>
          ) : null}
        </div>

        {sparklineData && sparklineData.length >= 2 ? (
          <div className="max-sm:hidden shrink-0 pl-1.5">
            <MiniSparkline data={sparklineData} color={sparklineColor} />
          </div>
        ) : (
          <div className="max-sm:hidden w-[58px] h-[22px] shrink-0" aria-hidden="true" />
        )}
      </div>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}
