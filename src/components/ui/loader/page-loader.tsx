import * as React from "react";
import { Loader2Icon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export interface PageLoaderProps {
  message?: string;
  className?: string;
  minHeight?: string;
  showTimeoutAction?: boolean;
  timeoutSeconds?: number;
  timeoutMs?: number;
  delayMs?: number;
  onRetry?: () => void;
}

/**
 * Komponen PageLoader Terstandar
 * 
 * - Terpusat secara horizontal dan vertikal di dalam area konten
 * - Tidak berkedip (zero-overhead, CSS transform murni)
 * - Mendukung timeout opsional (default 15s) untuk memunculkan tombol reload darurat jika jaringan lambat
 * - Menghormati preferensi prefers-reduced-motion
 */
export function PageLoader({
  message,
  className,
  minHeight = "flex-1 min-h-[55vh]",
  showTimeoutAction = true,
  timeoutSeconds = 15,
  timeoutMs,
  delayMs: _delayMs,
  onRetry,
}: PageLoaderProps) {
  const { t } = useLanguage();
  const [isTimedOut, setIsTimedOut] = React.useState(false);
  const effectiveTimeoutSeconds = timeoutMs ? timeoutMs / 1000 : timeoutSeconds;

  React.useEffect(() => {
    if (!showTimeoutAction || effectiveTimeoutSeconds <= 0) return;
    const timer = setTimeout(() => {
      setIsTimedOut(true);
    }, effectiveTimeoutSeconds * 1000);
    return () => clearTimeout(timer);
  }, [showTimeoutAction, effectiveTimeoutSeconds]);

  const handleReload = () => {
    if (onRetry) {
      setIsTimedOut(false);
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-1 flex-col items-center justify-center p-6 text-center select-none w-full",
        minHeight,
        className,
      )}
    >
      <div className="flex flex-col items-center justify-center gap-3 max-w-sm">
        <Loader2Icon
          className="size-7 text-primary dark:text-sky-400 animate-spin motion-reduce:animate-none shrink-0"
          aria-hidden="true"
        />
        <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed">
          {message || t("common:status.loading_page", "Memuat data halaman...")}
        </p>

        {isTimedOut && (
          <div className="flex flex-col items-center gap-2 mt-2 animate-in fade-in duration-300">
            <span className="text-[11px] text-amber-500/90 font-medium">
              {t("common:status.slow_connection", "Proses memakan waktu lebih lama dari biasanya.")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReload}
              className="h-8 rounded-xl px-3 text-xs gap-1.5 cursor-pointer border-border/80"
            >
              <RotateCcwIcon className="size-3.5" />
              <span>{t("common:status.retry", "Coba Muat Ulang")}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
