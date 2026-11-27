import * as React from "react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { cn } from "@/lib/utils";

/**
 * STANDAR RESMI UI BUTTON TOOLBAR TABEL & KARTU ALTCYCLES (Single Source of Truth)
 * Menyeragamkan:
 * - Ukuran: size-9 (36x36 px)
 * - Radius / Sudut Box: rounded-xl (!rounded-xl untuk mencegah override CSS global)
 * - Warna Box: Solid Biru Primary (bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs)
 * - Warna Ikon: Putih / Kontras Tema (text-primary-foreground)
 */
export const TOOLBAR_BUTTON_CLASS =
  "size-9 min-w-9 min-h-9 p-0 inline-flex items-center justify-center rounded-xl !rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs border border-primary/20 cursor-pointer select-none shrink-0 transition-all active:scale-[0.98] motion-reduce:transform-none [&_svg]:size-4 [&_svg]:text-primary-foreground [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const TOOLBAR_ACTIVE_EXPANDED_CLASS =
  "h-9 w-auto max-w-[240px] px-3 inline-flex items-center gap-1.5 rounded-xl !rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs border border-primary/30 text-xs sm:text-sm font-semibold cursor-pointer select-none shrink-0 transition-all [&_svg]:size-3.5 [&_svg]:text-primary-foreground [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface ToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: React.ReactNode;
  srLabel?: string;
}

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, icon: Icon, tooltip, srLabel, children, ...props }, ref) => {
    const btn = (
      <button
        ref={ref}
        type="button"
        className={cn(TOOLBAR_BUTTON_CLASS, className)}
        {...props}
      >
        {Icon && <Icon className="size-4 text-primary-foreground shrink-0" />}
        {children}
        {srLabel && <span className="sr-only">{srLabel}</span>}
      </button>
    );

    if (tooltip) {
      return <ActionTooltip content={tooltip}>{btn}</ActionTooltip>;
    }

    return btn;
  },
);
ToolbarButton.displayName = "ToolbarButton";
