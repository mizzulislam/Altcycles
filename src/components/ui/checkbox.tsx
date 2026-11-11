import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onChange" | "value"
  > {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Checkbox UI terstandar Altcycles dengan gaya shadcn modern,
 * mendukung status checked, unchecked, serta indeterminate (parsial).
 */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      className,
      checked = false,
      indeterminate = false,
      onCheckedChange,
      onClick,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isActive = Boolean(checked || indeterminate);

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        data-state={
          indeterminate ? "indeterminate" : checked ? "checked" : "unchecked"
        }
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented && !disabled) {
            onCheckedChange?.(!checked);
          }
        }}
        className={cn(
          "peer inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 outline-none cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isActive
            ? "border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            : "border-slate-300/90 dark:border-white/25 bg-background/90 dark:bg-white/[0.04] hover:border-primary/70 hover:bg-primary/5 shadow-2xs",
          className,
        )}
        {...props}
      >
        {indeterminate ? (
          <MinusIcon className="size-3 stroke-[3]" aria-hidden="true" />
        ) : checked ? (
          <CheckIcon className="size-3 stroke-[3]" aria-hidden="true" />
        ) : null}
      </button>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };

