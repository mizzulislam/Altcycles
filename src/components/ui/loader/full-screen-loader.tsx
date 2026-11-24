import * as React from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface FullScreenLoaderProps {
  message?: string;
  messageKey?: string;
  className?: string;
  subMessage?: string;
}

export function FullScreenLoader({
  message,
  messageKey,
  className,
  subMessage,
}: FullScreenLoaderProps) {
  const { t } = useTranslation("common");
  const displayMessage =
    message || (messageKey ? t(messageKey) : t("status.loading_page", "Memuat data..."));

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-busy="true"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-4 text-center select-none",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card/90 p-8 shadow-lg max-w-sm w-full mx-4">
        <Spinner className="size-8 text-primary dark:text-sky-400" />
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {displayMessage}
          </p>
          {subMessage ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {subMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
