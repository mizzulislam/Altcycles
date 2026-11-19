import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface DashboardChartCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
}

export function ChartCard({
  title,
  subtitle,
  controls,
  children,
  footer,
  loading = false,
  loadingText = "Memuat grafik...",
  className,
  contentClassName,
  headerClassName,
}: DashboardChartCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "px-6 py-4 border-b border-border/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
          headerClassName,
        )}
      >
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-sm sm:text-base font-bold text-foreground">
            {title}
          </CardTitle>
          {subtitle ? (
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              {subtitle}
            </CardDescription>
          ) : null}
        </div>
        {controls ? <div className="shrink-0 flex items-center gap-2">{controls}</div> : null}
      </CardHeader>

      <CardContent
        className={cn(
          "p-6 flex-1 flex flex-col justify-between gap-5",
          contentClassName,
        )}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-12 text-xs sm:text-sm text-muted-foreground">
            <Spinner />
            <span>{loadingText}</span>
          </div>
        ) : (
          children
        )}
      </CardContent>

      {footer ? footer : null}
    </Card>
  );
}
