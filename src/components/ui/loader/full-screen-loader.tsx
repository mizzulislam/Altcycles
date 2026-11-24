import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";

export interface FullScreenLoaderProps {
  message?: string;
  showLogo?: boolean;
  className?: string;
}

/**
 * FullScreenLoader Terstandar
 * Digunakan untuk auth checking awal aplikasi dan role-switching overlay
 */
export function FullScreenLoader({
  message = "Memuat...",
  showLogo = true,
  className,
}: FullScreenLoaderProps) {
  return (
    <div
      role="status"
      aria-live="assertive"
      aria-busy="true"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 dark:bg-background/90 backdrop-blur-md select-none transition-all duration-200",
        className,
      )}
    >
      <div className="flex flex-col items-center justify-center gap-4 p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {showLogo && (
          <div className="relative flex items-center justify-center size-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm mb-1">
            <AltviraLogoMark className="size-8" />
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <Loader2Icon
            className="size-5 text-primary dark:text-sky-400 animate-spin motion-reduce:animate-none shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
