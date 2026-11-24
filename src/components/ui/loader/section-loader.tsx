import * as React from "react";
import { Spinner } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface SectionLoaderProps {
  message?: string;
  className?: string;
  minHeight?: string | number;
}

export function SectionLoader({
  message,
  className,
  minHeight = "min-h-[200px]",
}: SectionLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={typeof minHeight === "number" ? { minHeight: `${minHeight}px` } : undefined}
      className={cn(
        "flex w-full items-center justify-center gap-2 p-6 text-xs sm:text-sm text-muted-foreground select-none",
        typeof minHeight === "string" ? minHeight : "",
        className
      )}
    >
      <Spinner className="size-4 text-primary dark:text-sky-400" />
      {message ? <span>{message}</span> : null}
    </div>
  );
}
