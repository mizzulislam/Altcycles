import * as React from "react";
import { cn } from "@/lib/utils";

export interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  children: React.ReactNode;
}

/**
 * Komponen Collapsible berbasis CSS Grid (grid-template-rows 0fr -> 1fr).
 * Menjamin 60 FPS tanpa reflow JavaScript berat dan patuh prefers-reduced-motion.
 */
export function Collapsible({
  open = false,
  className,
  children,
  ...props
}: CollapsibleProps) {
  return (
    <div
      className={cn(
        "grid transition-all duration-200 ease-in-out overflow-hidden motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
      aria-hidden={!open}
      {...props}
    >
      <div className="min-h-0">{children}</div>
    </div>
  );
}
