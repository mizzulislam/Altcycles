import * as React from "react";
import { InfoIcon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import {
  Card,
  CardContent,
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
          "px-6 py-3.5 border-b border-border/70 flex flex-row items-center justify-between gap-3 min-h-[56px]",
          headerClassName,
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <CardTitle className="text-sm sm:text-base font-bold text-foreground truncate leading-6 m-0 p-0 flex items-center">
            {title}
          </CardTitle>
          {subtitle ? (
            <ActionTooltip content={subtitle} side="top" align="center">
              <button
                type="button"
                className="inline-flex h-6 w-5 items-center justify-center p-0 m-0 rounded-sm text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors cursor-help shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={typeof subtitle === "string" ? subtitle : "Informasi"}
              >
                <InfoIcon className="size-3.5 block shrink-0" />
              </button>
            </ActionTooltip>
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
