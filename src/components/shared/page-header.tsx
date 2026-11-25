import * as React from "react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { cn } from "@/lib/utils";

export interface TruncatedTooltipTextProps {
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  children: React.ReactNode;
  tooltipText?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  wrapperClassName?: string;
  "data-testid"?: string;
}

/**
 * Merender teks 1 baris (`truncate whitespace-nowrap overflow-hidden text-ellipsis`)
 * dan hanya menampilkan `<ActionTooltip>` apabila teks benar-benar terpotong
 * (`scrollWidth > clientWidth`), termasuk saat sidebar dibuka/ditutup atau bahasa diganti.
 */
export function TruncatedTooltipText({
  as: Component = "span",
  children,
  tooltipText,
  side = "bottom",
  align = "start",
  className,
  wrapperClassName,
  "data-testid": dataTestId,
}: TruncatedTooltipTextProps) {
  const elRef = React.useRef<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  const resolvedFullText =
    tooltipText ?? (typeof children === "string" ? children : undefined);

  const checkOverflow = React.useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth);
  }, []);

  React.useEffect(() => {
    checkOverflow();
    const el = elRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        checkOverflow();
      });
      ro.observe(el);
      if (el.parentElement) {
        ro.observe(el.parentElement);
      }
    }

    window.addEventListener("resize", checkOverflow);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow, children, resolvedFullText]);

  const elementNode = React.createElement(
    Component,
    {
      ref: elRef,
      onMouseEnter: checkOverflow,
      onFocus: checkOverflow,
      "aria-label": resolvedFullText,
      "data-testid": dataTestId,
      "data-truncated": isTruncated ? "true" : "false",
      className: cn(
        "truncate whitespace-nowrap overflow-hidden text-ellipsis block max-w-full",
        className,
      ),
    },
    children,
  );

  if (!resolvedFullText) {
    return elementNode;
  }

  const isBlock = Component !== "span";

  return (
    <ActionTooltip
      content={resolvedFullText}
      side={side}
      align={align}
      disabled={!isTruncated}
      wrapperClassName={cn(
        isBlock ? "block w-full max-w-full" : "inline-flex max-w-full",
        wrapperClassName,
      )}
    >
      {elementNode}
    </ActionTooltip>
  );
}

export interface PageHeaderProps {
  title: React.ReactNode;
  titleTooltip?: string;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  descriptionTooltip?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Header Halaman Terstandar Altcycles (Item 12).
 * - Judul (`<h1>`) dan subjudul (`<p>`) masing-masing maksimal 1 baris dengan ellipsis (`truncate`).
 * - Hanya memunculkan `<ActionTooltip>` bila teks benar-benar terpotong.
 * - Kelompok tombol aksi di kanan (`actions`) menggunakan `shrink-0` sehingga tidak pernah tergeser.
 */
export function PageHeader({
  title,
  titleTooltip,
  badge,
  description,
  descriptionTooltip,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between min-w-0",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {badge ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0 flex-1">
              <TruncatedTooltipText
                as="h1"
                tooltipText={titleTooltip}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
              >
                {title}
              </TruncatedTooltipText>
            </div>
            <div className="shrink-0">{badge}</div>
          </div>
        ) : (
          <TruncatedTooltipText
            as="h1"
            tooltipText={titleTooltip}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          >
            {title}
          </TruncatedTooltipText>
        )}
        {description ? (
          <TruncatedTooltipText
            as="p"
            tooltipText={descriptionTooltip}
            className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed"
          >
            {description}
          </TruncatedTooltipText>
        ) : null}
      </div>
      {actions ? (
        <div className="shrink-0 flex flex-wrap items-center gap-2 sm:items-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
