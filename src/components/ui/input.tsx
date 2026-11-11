import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isDate =
      type === "date" || type === "datetime-local" || type === "month";
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex h-9 w-full rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45 focus-visible:border-ring/70 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          isDate &&
            "cursor-pointer select-none dark:[color-scheme:dark] [color-scheme:light]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

