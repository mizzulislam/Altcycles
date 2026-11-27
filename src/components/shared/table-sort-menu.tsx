import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { useLanguage } from "@/lib/i18n";

export interface SortFieldOption<T extends string = string> {
  value?: T;
  key?: T;
  label: string;
}

export interface TableSortMenuProps<T extends string = string> {
  sortKey?: T;
  selectedKey?: T;
  sortOrder?: "asc" | "desc";
  sortDirection?: "asc" | "desc";
  options: SortFieldOption<T>[];
  onSortChange: (key: T, order: "asc" | "desc") => void;
  defaultSortKey?: T;
  defaultKey?: T;
  defaultSortOrder?: "asc" | "desc";
  defaultDirection?: "asc" | "desc";
  ascLabel?: string;
  descLabel?: string;
  className?: string;
  buttonLabel?: string;
}

export function TableSortMenu<T extends string = string>({
  sortKey,
  selectedKey,
  sortOrder,
  sortDirection,
  options,
  onSortChange,
  defaultSortKey,
  defaultKey,
  defaultSortOrder,
  defaultDirection,
  ascLabel,
  descLabel,
  className,
  buttonLabel,
}: TableSortMenuProps<T>) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const getOptValue = (opt?: SortFieldOption<T>): T => (opt ? (opt.value ?? opt.key) : "") as T;

  const activeKey = (sortKey ?? selectedKey ?? getOptValue(options[0])) as T;
  const activeOrder = (sortOrder ?? sortDirection ?? "desc") as "asc" | "desc";
  const effectiveDefaultKey = (defaultSortKey ?? defaultKey ?? getOptValue(options[0])) as T;
  const effectiveDefaultOrder = (defaultSortOrder ?? defaultDirection ?? "desc") as "asc" | "desc";

  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 99999,
  });

  const isDefault =
    activeKey === effectiveDefaultKey && activeOrder === effectiveDefaultOrder;

  const currentOption = options.find((opt) => getOptValue(opt) === activeKey) ?? options[0];

  const resolvedAscLabel =
    ascLabel || t("common:sort.ascending", "Terlama / Menaik (A-Z)");
  const resolvedDescLabel =
    descLabel || t("common:sort.descending", "Terbaru / Menurun (Z-A)");

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 220;
    const padding = 12;

    let left = rect.right - menuWidth;
    if (left < padding) left = padding;
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    let top = rect.bottom + 6;
    if (spaceBelow < menuHeight && rect.top > menuHeight) {
      top = rect.top - menuHeight - 6;
    }

    setMenuStyle({
      position: "fixed",
      top: Math.round(top),
      left: Math.round(left),
      zIndex: 99999,
      width: menuWidth,
    });
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node | null;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const activeDisplayLabel =
    buttonLabel ||
    (activeOrder === "desc"
      ? `${currentOption?.label ?? ""} (${t("common:sort.short_desc", "Terbaru")})`
      : `${currentOption?.label ?? ""} (${t("common:sort.short_asc", "Terlama")})`);

  const trigger = isDefault ? (
    <ActionTooltip content={t("common:action.sort", "Urutan data")}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("common:action.sort", "Urutan data")}
        aria-expanded={isOpen}
        className={cn(
          "size-9 min-w-9 p-0 inline-flex items-center justify-center rounded-xl border border-border/80 bg-card text-foreground shadow-2xs hover:bg-muted/70 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer select-none shrink-0",
          isOpen && "border-primary/60 ring-2 ring-primary/20",
          className,
        )}
      >
        <ArrowUpDownIcon className="size-4 text-primary shrink-0" />
        <span className="sr-only">{t("common:action.sort", "Urutan data")}</span>
      </button>
    </ActionTooltip>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setIsOpen((prev) => !prev)}
      aria-expanded={isOpen}
      className={cn(
        "h-9 w-auto max-w-[240px] inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs sm:text-sm font-semibold text-primary shadow-2xs hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer select-none shrink-0",
        isOpen && "ring-2 ring-primary/20",
        className,
      )}
    >
      <ArrowUpDownIcon className="size-3.5 shrink-0" />
      <span className="truncate">{activeDisplayLabel}</span>
    </button>
  );

  return (
    <>
      {trigger}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            role="menu"
            aria-orientation="vertical"
            className="rounded-2xl border border-border/90 bg-card/95 p-1.5 shadow-2xl backdrop-blur-md duration-150 animate-in fade-in-0 zoom-in-95 select-none"
          >
            {/* Opsi Kriteria / Kolom Urutan (Image 11 style) */}
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("common:sort.field_title", "Urutkan Berdasarkan")}
            </div>
            <div className="space-y-0.5">
              {options.map((opt) => {
                const optVal = getOptValue(opt);
                const isSelected = optVal === activeKey;
                return (
                  <button
                    key={optVal}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => {
                      onSortChange(optVal, activeOrder);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors text-left",
                      isSelected
                        ? "bg-primary/15 text-primary font-semibold dark:text-cyan-400"
                        : "text-foreground hover:bg-muted/70",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected ? (
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border/70 my-1.5" />

            {/* Opsi Arah Urutan: Ascending / Descending (Image 11 style) */}
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("common:sort.order_title", "Arah Urutan")}
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={activeOrder === "desc"}
                onClick={() => {
                  onSortChange(activeKey, "desc");
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors text-left",
                  activeOrder === "desc"
                    ? "bg-primary/15 text-primary font-semibold dark:text-cyan-400"
                    : "text-foreground hover:bg-muted/70",
                )}
              >
                <span className="truncate">{resolvedDescLabel}</span>
                {activeOrder === "desc" ? (
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                ) : null}
              </button>

              <button
                type="button"
                role="menuitemradio"
                aria-checked={activeOrder === "asc"}
                onClick={() => {
                  onSortChange(activeKey, "asc");
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors text-left",
                  activeOrder === "asc"
                    ? "bg-primary/15 text-primary font-semibold dark:text-cyan-400"
                    : "text-foreground hover:bg-muted/70",
                )}
              >
                <span className="truncate">{resolvedAscLabel}</span>
                {activeOrder === "asc" ? (
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                ) : null}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
