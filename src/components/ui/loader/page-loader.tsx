import * as React from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageLoaderProps {
  message?: string;
  messageKey?: string;
  className?: string;
  minHeight?: string;
  delayMs?: number;
  timeoutMs?: number;
  onRetry?: () => void;
}

export function PageLoader({
  message,
  messageKey = "status.loading_page",
  className,
  minHeight = "min-h-[55vh]",
  delayMs = 150,
  timeoutMs = 15000,
  onRetry,
}: PageLoaderProps) {
  const { t } = useTranslation("common");
  const [visible, setVisible] = React.useState(delayMs <= 0);
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    if (delayMs > 0) {
      delayTimer = setTimeout(() => {
        setVisible(true);
      }, delayMs);
    }
    return () => {
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [delayMs]);

  React.useEffect(() => {
    if (timeoutMs <= 0) return;
    const timeoutTimer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);
    return () => {
      clearTimeout(timeoutTimer);
    };
  }, [timeoutMs]);

  if (!visible) return null;

  const displayMessage =
    message ||
    (messageKey ? t(messageKey, "Memuat data halaman...") : t("status.loading_page", "Memuat data halaman..."));

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex w-full flex-col items-center justify-center p-6 text-center select-none",
        minHeight,
        className
      )}
    >
      {!timedOut ? (
        <div className="flex flex-col items-center justify-center gap-3">
          <Spinner className="size-6 text-primary dark:text-sky-400" />
          <p className="text-xs sm:text-sm font-medium text-muted-foreground animate-pulse">
            {displayMessage}
          </p>
        </div>
      ) : (
        <div className="flex max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card p-6 shadow-2xs">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t("status.slow_connection_title", "Pemuatan Lebih Lambat")}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "status.slow_connection",
                "Proses memuat membutuhkan waktu lebih lama dari biasanya. Periksa koneksi internet Anda."
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="mt-1 rounded-xl text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>{t("status.retry", "Coba Muat Ulang")}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
