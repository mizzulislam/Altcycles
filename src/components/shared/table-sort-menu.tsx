import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import {
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ACTIVE_EXPANDED_CLASS,
} from "@/components/shared/toolbar-button";
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
  const [coords, setCoords] = React.useState<{ top: number; left: number; isUpward: boolean } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const getOptValue = (opt?: SortFieldOption<T>): T => (opt ? (opt.value ?? opt.key) : "") as T;

  const activeKey = (sortKey ?? selectedKey ?? getOptValue(options[0])) as T;
  const activeOrder = (sortOrder ?? sortDirection ?? "desc") as "asc" | "desc";
  const effectiveDefaultKey = (defaultSortKey ?? defaultKey ?? getOptValue(options[0])) as T;
  const effectiveDefaultOrder = (defaultSortOrder ?? defaultDirection ?? "desc") as "asc" | "desc";

  const isDefault =
    activeKey === effectiveDefaultKey && activeOrder === effectiveDefaultOrder;

  const currentOption = options.find((opt) => getOptValue(opt) === activeKey) ?? options[0];

  const resolvedAscLabel =
    ascLabel || t("common:sort.ascending", "Terlama / Menaik (A-Z)");
  const resolvedDescLabel =
    descLabel || t("common:sort.descending", "Terbaru / Menurun (Z-A)");

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 240;
    const padding = 12;

    let left = rect.right - menuWidth;
    if (left < padding) left = padding;
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const isUpward = spaceBelow < menuHeight && rect.top > menuHeight;
    const top = isUpward ? rect.top - menuHeight - 6 : rect.bottom + 6;

    const newCoords = {
      top: Math.round(top),
      left: Math.round(left),
      isUpward,
    };
    setCoords(newCoords);
    return newCoords;
  }, []);

  const handleToggle = React.useCallback(() => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    if (!isOpen) return;

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
        onClick={handleToggle}
        aria-label={t("common:action.sort", "Urutan data")}
        aria-expanded={isOpen}
        className={cn(
          TOOLBAR_BUTTON_CLASS,
          isOpen && "ring-2 ring-primary/30",
          className,
        )}
      >
        <ArrowUpDownIcon className="size-4 text-primary-foreground shrink-0" />
        <span className="sr-only">{t("common:action.sort", "Urutan data")}</span>
      </button>
    </ActionTooltip>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleToggle}
      aria-expanded={isOpen}
      className={cn(
        TOOLBAR_ACTIVE_EXPANDED_CLASS,
        isOpen && "ring-2 ring-primary/30",
        className,
      )}
    >
      <ArrowUpDownIcon className="size-3.5 text-primary-foreground shrink-0" />
      <span className="truncate">{activeDisplayLabel}</span>
    </button>
  );

  return (
    <>
      {trigger}
      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: coords.top, left: coords.left, width: 240 }}
            role="menu"
            aria-orientation="vertical"
            className={cn(
              "fixed z-[99999] rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 select-none animate-in fade-in-0 zoom-in-95 duration-150 ease-out motion-reduce:animate-none",
              coords.isUpward ? "origin-bottom-right" : "origin-top-right",
            )}
          >
            {/* Opsi Kriteria / Kolom Urutan */}
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition-colors text-left",
                      isSelected
                        ? "bg-primary/15 text-primary font-semibold dark:text-sky-300"
                        : "text-foreground hover:bg-muted/70",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border/70 my-1.5" />

            {/* Opsi Arah Urutan: Ascending / Descending */}
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("common:sort.order_title", "Arah Urutan")}
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={activeOrder === "desc"}
                onClick={() => {
                  onSortChange(activeKey, "desc");
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition-colors text-left",
                  activeOrder === "desc"
                    ? "bg-primary/15 text-primary font-semibold dark:text-sky-300"
                    : "text-foreground hover:bg-muted/70",
                )}
              >
                <span className="truncate">{resolvedDescLabel}</span>
              </button>

              <button
                type="button"
                role="menuitemradio"
                aria-checked={activeOrder === "asc"}
                onClick={() => {
                  onSortChange(activeKey, "asc");
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition-colors text-left",
                  activeOrder === "asc"
                    ? "bg-primary/15 text-primary font-semibold dark:text-sky-300"
                    : "text-foreground hover:bg-muted/70",
                )}
              >
                <span className="truncate">{resolvedAscLabel}</span>
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
