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
  disabled = false,
}: ActionTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const timeoutRef = React.useRef<number | null>(null);
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);

  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    if (side === "top") {
      top = rect.top - offset;
      if (align === "center") left = rect.left + rect.width / 2;
      else if (align === "start") left = rect.left;
      else left = rect.right;
    } else if (side === "bottom") {
      top = rect.bottom + offset;
      if (align === "center") left = rect.left + rect.width / 2;
      else if (align === "start") left = rect.left;
      else left = rect.right;
    } else if (side === "left") {
      left = rect.left - offset;
      if (align === "center") top = rect.top + rect.height / 2;
      else if (align === "start") top = rect.top;
      else top = rect.bottom;
    } else if (side === "right") {
      left = rect.right + offset;
      if (align === "center") top = rect.top + rect.height / 2;
      else if (align === "start") top = rect.top;
      else top = rect.bottom;
    }

    setCoords({ top, left });
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
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;
    const handleScroll = () => calculatePosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isVisible, calculatePosition]);

  const getTransformClasses = () => {
    if (side === "top") {
      return align === "center"
        ? "-translate-x-1/2 -translate-y-full"
        : align === "start"
        ? "-translate-y-full"
        : "-translate-x-full -translate-y-full";
    }
    if (side === "bottom") {
      return align === "center"
        ? "-translate-x-1/2"
        : align === "start"
        ? ""
        : "-translate-x-full";
    }
    if (side === "left") {
      return align === "center"
        ? "-translate-x-full -translate-y-1/2"
        : align === "start"
        ? "-translate-x-full"
        : "-translate-x-full -translate-y-full";
    }
    return align === "center"
      ? "-translate-y-1/2"
      : align === "start"
      ? ""
      : "-translate-y-full";
  };

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex max-w-full"
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
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={cn(
              "fixed pointer-events-none z-[9999] whitespace-nowrap",
              "rounded-full bg-white text-slate-900 border border-slate-200/90 shadow-xl",
              "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 dark:shadow-black/60",
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
