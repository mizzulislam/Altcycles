import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, DownloadIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface DocumentDownloadMenuProps {
  title?: string;
  label?: string;
  variant?: "icon" | "button";
  size?: "default" | "sm";
  onDownloadPdf: () => void | Promise<void>;
  onDownloadWord: () => void | Promise<void>;
  className?: string;
  buttonClassName?: string;
}

export function DocumentDownloadMenu({
  title = "Unduh Dokumen (PDF / Word)",
  label = "Unduh / Ekspor",
  variant = "icon",
  size = "default",
  onDownloadPdf,
  onDownloadWord,
  className,
  buttonClassName,
}: DocumentDownloadMenuProps) {
  const { t } = useLanguage();
  const isDefaultOrSingleUnduh =
    !label ||
    label === "Unduh / Ekspor" ||
    label === "Unduh" ||
    label === "Download" ||
    label === "Download / Export";
  const displayLabel = isDefaultOrSingleUnduh ? t("action.export_download", "Unduh / Ekspor") : label;

  const [open, setOpen] = React.useState(false);
  const [loadingFmt, setLoadingFmt] = React.useState<"pdf" | "word" | null>(null);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = React.useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 260; // w-[260px] (sesuai standar tata letak Gambar 1)
    const menuHeight = 124;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + 12 && rect.top > menuHeight + 12;

    const top = openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.max(
      12,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12),
    );
    setCoords({ top, left });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, updatePosition]);

  async function trigger(fmt: "pdf" | "word", handler: () => void | Promise<void>) {
    if (loadingFmt) return;
    setLoadingFmt(fmt);
    try {
      await handler();
      setOpen(false);
    } finally {
      setLoadingFmt(null);
    }
  }

  return (
    <div className={cn("inline-flex", className)}>
      {variant === "button" ? (
        <ActionTooltip content={title} side="top" disabled={open || !title}>
          <button
            ref={triggerRef}
            type="button"
            disabled={loadingFmt !== null}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "inline-flex items-center justify-between gap-2 rounded-xl border border-border bg-card font-semibold text-foreground shadow-2xs transition-all duration-100 ease-out cursor-pointer select-none active:scale-[0.98] motion-reduce:transform-none",
              size === "sm"
                ? "h-8 px-3 text-xs"
                : "h-9 px-3.5 text-xs sm:text-sm",
              "hover:bg-muted/70 hover:border-primary/40",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
              open && "border-primary/60 ring-2 ring-primary/20",
              buttonClassName,
            )}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="flex items-center gap-2">
              {loadingFmt ? (
                <Loader2Icon className="size-4 animate-spin text-primary" />
              ) : (
                <DownloadIcon className="size-4 text-primary" />
              )}
              <span>{displayLabel}</span>
            </span>
            <ChevronDownIcon
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </ActionTooltip>
      ) : (
        <ActionTooltip content={title} side="top" disabled={open || !title}>
          <button
            ref={triggerRef}
            type="button"
            disabled={loadingFmt !== null}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-100 ease-out cursor-pointer active:scale-[0.98] motion-reduce:transform-none disabled:active:scale-100 relative after:absolute after:-inset-1.5 after:content-[''] sm:after:hidden",
              buttonClassName,
            )}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {loadingFmt ? (
              <Loader2Icon className="size-4 animate-spin text-primary" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
            <span className="sr-only">{title}</span>
          </button>
        </ActionTooltip>
      )}

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[99999] w-[260px] rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 text-left animate-in fade-in-0 zoom-in-95 duration-150 ease-out motion-reduce:animate-none"
          >
            <button
              type="button"
              disabled={loadingFmt !== null}
              onClick={() => void trigger("pdf", onDownloadPdf)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-all duration-100 ease-out cursor-pointer active:scale-[0.98] motion-reduce:transform-none",
                "hover:bg-muted/80 text-foreground",
                loadingFmt === "pdf" && "opacity-70",
              )}
              role="menuitem"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {loadingFmt === "pdf" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <FileTextIcon className="size-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-semibold text-foreground whitespace-nowrap">{t("export.pdf", "PDF Dokumen (.pdf)")}</span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{t("export.pdf_desc", "Format cetak & laporan resmi")}</span>
              </div>
            </button>

            <button
              type="button"
              disabled={loadingFmt !== null}
              onClick={() => void trigger("word", onDownloadWord)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-all duration-100 ease-out cursor-pointer active:scale-[0.98] motion-reduce:transform-none",
                "hover:bg-muted/80 text-foreground",
                loadingFmt === "word" && "opacity-70",
              )}
              role="menuitem"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                {loadingFmt === "word" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <FileTextIcon className="size-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-semibold text-foreground whitespace-nowrap">{t("export.word", "Word Dokumen (.docx)")}</span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{t("export.word_desc", "Dapat disunting")}</span>
              </div>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
