import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeaderTitleWithInfo } from "@/components/shared/card-header-with-info";
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
          "px-5 sm:px-6 py-3.5 border-b border-border/70 flex flex-row items-center justify-between gap-2.5 sm:gap-3 min-h-[56px]",
          headerClassName,
        )}
      >
        <CardHeaderTitleWithInfo
          title={title}
          description={subtitle}
          titleClassName="text-sm sm:text-base"
        />
        {controls ? (
          <div className="shrink-0 flex items-center gap-2 ml-auto justify-end">
            {controls}
          </div>
        ) : null}
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
