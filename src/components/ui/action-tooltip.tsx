import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ActionTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  offset?: number;
  delayMs?: number;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
}

export function ActionTooltip({
  content,
  children,
  side = "bottom",
  align = "center",
  offset = 8,
  delayMs = 150,
  className,
  wrapperClassName,
  disabled = false,
}: ActionTooltipProps) {
  const tooltipId = React.useId();
  const [isVisible, setIsVisible] = React.useState(false);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    effectiveAlign: "start" | "center" | "end";
  }>({
    top: 0,
    left: 0,
    effectiveAlign: align,
  });
  const timeoutRef = React.useRef<number | null>(null);
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);

  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = typeof window !== "undefined" ? window.innerWidth : 1024;
    let top = 0;
    let left = 0;

    let computedAlign = align;
    if (align === "center") {
      const centerX = rect.left + rect.width / 2;
      if (centerX > viewportW - 160) {
        computedAlign = "end";
      } else if (centerX < 160) {
        computedAlign = "start";
      }
    }

    if (side === "top") {
      top = rect.top - offset;
      if (computedAlign === "center") left = rect.left + rect.width / 2;
      else if (computedAlign === "start") left = rect.left;
      else left = rect.right;
    } else if (side === "bottom") {
      top = rect.bottom + offset;
      if (computedAlign === "center") left = rect.left + rect.width / 2;
      else if (computedAlign === "start") left = rect.left;
      else left = rect.right;
    } else if (side === "left") {
      left = rect.left - offset;
      if (computedAlign === "center") top = rect.top + rect.height / 2;
      else if (computedAlign === "start") top = rect.top;
      else top = rect.bottom;
    } else if (side === "right") {
      left = rect.right + offset;
      if (computedAlign === "center") top = rect.top + rect.height / 2;
      else if (computedAlign === "start") top = rect.top;
      else top = rect.bottom;
    }

    if (typeof window !== "undefined" && window.innerWidth > 0) {
      if (computedAlign === "end") {
        left = Math.min(left, window.innerWidth - 12);
      } else if (computedAlign === "start") {
        left = Math.max(12, left);
      } else {
        left = Math.max(12, Math.min(left, window.innerWidth - 12));
      }
    }

    setCoords({ top, left, effectiveAlign: computedAlign });
  }, [side, align, offset]);

  const show = React.useCallback(() => {
    if (disabled || !content) return;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, delayMs);
  }, [disabled, content, delayMs, calculatePosition]);

  const hide = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  React.useEffect(() => {
    if (disabled && isVisible) {
      setIsVisible(false);
    }
  }, [disabled, isVisible]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;
    const handleScroll = () => calculatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hide();
      }
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, calculatePosition, hide]);

  const getTransformClasses = (curAlign: "start" | "center" | "end" = coords.effectiveAlign) => {
    if (side === "top") {
      return curAlign === "center"
        ? "-translate-x-1/2 -translate-y-full"
        : curAlign === "start"
        ? "-translate-y-full"
        : "-translate-x-full -translate-y-full";
    }
    if (side === "bottom") {
      return curAlign === "center"
        ? "-translate-x-1/2"
        : curAlign === "start"
        ? ""
        : "-translate-x-full";
    }
    if (side === "left") {
      return curAlign === "center"
        ? "-translate-x-full -translate-y-1/2"
        : curAlign === "start"
        ? "-translate-x-full"
        : "-translate-x-full -translate-y-full";
    }
    return curAlign === "center"
      ? "-translate-y-1/2"
      : curAlign === "start"
      ? ""
      : "-translate-y-full";
  };

  return (
    <>
      <span
        ref={triggerRef}
        aria-describedby={isVisible ? tooltipId : undefined}
        className={cn("max-w-full", wrapperClassName || "inline-flex")}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {isVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={tooltipId}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={cn(
              "fixed pointer-events-none z-[9999] max-w-xs sm:max-w-md truncate",
              "rounded-full bg-popover text-popover-foreground border border-border shadow-xl",
              "px-3.5 py-1.5 text-xs font-bold tracking-tight leading-none",
              "animate-in fade-in zoom-in-95 duration-150",
              getTransformClasses(),
              className,
            )}
            role="tooltip"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
