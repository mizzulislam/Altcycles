import * as React from "react";
import { InfoIcon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { useGameDialog } from "@/components/shared/game-dialog";
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
    setIsTruncated(
      el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight,
    );
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
  mobileFloating?: boolean;
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
  mobileFloating,
}: PageHeaderProps) {
  const { openGameDialog } = useGameDialog();
  const infoBtnRef = React.useRef<HTMLButtonElement>(null);

  const isActionsInDiv =
    React.isValidElement(actions) &&
    typeof actions.type === "string" &&
    actions.type === "div";

  const rawChildren =
    React.isValidElement(actions) && actions.type === React.Fragment
      ? (actions.props as { children?: React.ReactNode }).children
      : actions;
  const childCount = React.Children.count(rawChildren);

  const hasFloatingProp = (node: unknown): boolean => {
    if (!React.isValidElement(node)) return false;
    const props = node.props as Record<string, unknown> | undefined;
    if (props?.mobileFloating) return true;
    if (props?.children) {
      return React.Children.toArray(props.children as React.ReactNode).some(hasFloatingProp);
    }
    return false;
  };

  const isFloating =
    Boolean(mobileFloating) ||
    hasFloatingProp(actions) ||
    React.Children.toArray(rawChildren as React.ReactNode).some(hasFloatingProp);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-end sm:justify-between min-w-0",
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
                className="max-sm:text-[22px] max-sm:leading-tight max-sm:whitespace-normal max-sm:line-clamp-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground sm:truncate sm:whitespace-nowrap"
              >
                {title}
                {description ? (
                  <span className="sm:hidden inline-flex align-middle ml-1.5 shrink-0">
                    <ActionTooltip
                      content={
                        typeof description === "string"
                          ? description
                          : "Informasi halaman"
                      }
                      side="top"
                    >
                      <button
                        ref={infoBtnRef}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGameDialog({
                            title,
                            description,
                            triggerRef: infoBtnRef,
                          });
                        }}
                        className="sm:hidden inline-flex items-center justify-center size-5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                        aria-label="Informasi halaman"
                      >
                        <InfoIcon className="size-3.5 text-muted-foreground" />
                      </button>
                    </ActionTooltip>
                  </span>
                ) : null}
              </TruncatedTooltipText>
            </div>
            <div className="shrink-0">{badge}</div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <TruncatedTooltipText
              as="h1"
              tooltipText={titleTooltip}
              className="max-sm:text-[22px] max-sm:leading-tight max-sm:whitespace-normal max-sm:line-clamp-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground sm:truncate sm:whitespace-nowrap"
            >
              {title}
              {description ? (
                <span className="sm:hidden inline-flex align-middle ml-1.5 shrink-0">
                  <ActionTooltip
                    content={
                      typeof description === "string"
                        ? description
                        : "Informasi halaman"
                    }
                    side="top"
                  >
                    <button
                      ref={infoBtnRef}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGameDialog({
                          title,
                          description,
                            triggerRef: infoBtnRef,
                        });
                      }}
                      className="sm:hidden inline-flex items-center justify-center size-5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                      aria-label="Informasi halaman"
                    >
                      <InfoIcon className="size-3.5 text-muted-foreground" />
                    </button>
                  </ActionTooltip>
                </span>
              ) : null}
            </TruncatedTooltipText>
          </div>
        )}
        {description ? (
          <TruncatedTooltipText
            as="p"
            tooltipText={descriptionTooltip}
            className="hidden sm:block text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed"
          >
            {description}
          </TruncatedTooltipText>
        ) : null}
      </div>
      {actions ? (
        <>
          {/* Desktop: Tetap di Header sebelah kanan sejajar */}
          <div className="hidden sm:flex sm:items-end sm:gap-2 shrink-0 sm:w-auto">
            {actions}
          </div>

          {/* Mobile: Floating Action Button (FAB) jika isFloating true, atau jika actions dalam div / default grid 2 */}
          {isFloating ? (
            <div className="sm:hidden fixed bottom-6 right-5 z-50 flex flex-row items-center gap-2.5 pointer-events-auto [filter:drop-shadow(0_10px_15px_rgba(0,0,0,0.15))]">
              <div className="flex flex-row items-center gap-2.5 [&>div]:!flex [&>div]:!flex-row [&>div]:!items-center [&>div]:!gap-2.5 [&>div]:!w-auto [&>div]:!m-0 [&>div]:!p-0 [&_button,&_a]:!relative [&_button,&_a]:!inset-auto [&_button,&_a]:size-12 [&_button,&_a]:rounded-2xl [&_button,&_a]:p-0 [&_button,&_a]:shadow-xl [&_button,&_a]:flex [&_button,&_a]:items-center [&_button,&_a]:justify-center [&_button,&_a]:bg-primary/15 [&_button,&_a]:border [&_button,&_a]:border-primary/30 [&_button,&_a]:text-primary dark:[&_button,&_a]:bg-primary dark:[&_button,&_a]:border-primary/50 dark:[&_button,&_a]:text-white [&_svg]:!size-5.5 [&_svg]:!text-current [&_svg]:!shrink-0 [&_svg.text-muted-foreground]:!hidden [&_svg.lucide-chevron-down]:!hidden [&_span:not(:has(svg))]:!hidden [&_span:has(svg)]:!flex [&_span:has(svg)]:!items-center [&_span:has(svg)]:!justify-center [&_span:has(svg)]:!gap-0 [&_span:has(svg)]:!p-0 [&_span:has(svg)]:!m-0">
                {actions}
              </div>
            </div>
          ) : isActionsInDiv ? (
            <div className="sm:hidden w-full mt-3">{actions}</div>
          ) : childCount === 1 ? (
            <div className="sm:hidden grid grid-cols-2 gap-2 w-full">
              <div className="col-start-2 w-full">
                {actions}
              </div>
            </div>
          ) : (
            <div className="sm:hidden grid grid-cols-2 gap-2 w-full">
              {actions}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
