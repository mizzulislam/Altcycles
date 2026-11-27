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
  legend?: React.ReactNode;
  summary?: React.ReactNode;
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
  legend,
  summary,
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
        "rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col h-full",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "max-sm:px-4 px-5 sm:px-6 py-0 border-b border-border/70 flex flex-row items-center justify-between gap-2.5 sm:gap-3 h-14 min-h-[56px] shrink-0",
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
          "max-sm:p-4 p-6 flex-1 flex flex-col justify-between gap-4",
          contentClassName,
        )}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-12 text-xs sm:text-sm text-muted-foreground">
            <Spinner />
            <span>{loadingText}</span>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col justify-center min-h-0">
              {children}
            </div>
            {legend ? (
              <div className="shrink-0 mt-auto pt-1">
                {legend}
              </div>
            ) : null}
            {summary ? (
              <div className="shrink-0 max-sm:-mx-4 max-sm:-mb-4 -mx-6 -mb-6 mt-auto">
                {summary}
              </div>
            ) : null}
          </>
        )}
      </CardContent>

      {footer ? (
        <div className="shrink-0 mt-auto">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
