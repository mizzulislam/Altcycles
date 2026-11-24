import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionLoaderProps {
  message?: string;
  className?: string;
  minHeight?: string | number;
}

/**
 * Komponen SectionLoader Terstandar
 * Digunakan pada kartu tunggal, modal dialog, atau section berbatas
 */
export function SectionLoader({
  message,
  className,
  minHeight = "min-h-[220px]",
}: SectionLoaderProps) {
  const isNumberHeight = typeof minHeight === "number";
  const isCssUnitHeight = typeof minHeight === "string" && (minHeight.includes("px") || minHeight.includes("rem") || minHeight.includes("vh") || minHeight.includes("%"));
  const styleMinHeight = isNumberHeight ? `${minHeight}px` : isCssUnitHeight ? minHeight : undefined;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={styleMinHeight ? { minHeight: styleMinHeight } : undefined}
      className={cn(
        "flex flex-col items-center justify-center p-4 text-center select-none w-full",
        !styleMinHeight && typeof minHeight === "string" ? minHeight : "",
        className,
      )}
    >
      <Loader2Icon
        className="size-5 text-primary dark:text-sky-400 animate-spin motion-reduce:animate-none shrink-0 mb-2"
        aria-hidden="true"
      />
      {message && (
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
          {message}
        </p>
      )}
    </div>
  );
}
