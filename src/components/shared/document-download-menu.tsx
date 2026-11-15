import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, DownloadIcon, FileTextIcon, Loader2Icon } from "lucide-react";
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
    const menuWidth = 224; // w-56
    const menuHeight = 112;
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
        <button
          ref={triggerRef}
          type="button"
          disabled={loadingFmt !== null}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "inline-flex items-center justify-between gap-2 rounded-xl border border-border bg-card font-semibold text-foreground shadow-2xs transition-all duration-150 cursor-pointer select-none",
            size === "sm"
              ? "h-8 px-3 text-xs"
              : "h-9 px-3.5 text-xs sm:text-sm",
            "hover:bg-muted/70 hover:border-primary/40",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            open && "border-primary/60 ring-2 ring-primary/20",
            buttonClassName,
          )}
          aria-haspopup="menu"
          aria-expanded={open}
          title={title}
        >
          <span className="flex items-center gap-2">
            {loadingFmt ? (
              <Loader2Icon className="size-4 animate-spin text-primary" />
            ) : (
              <DownloadIcon className="size-4 text-primary" />
            )}
            <span>{label}</span>
          </span>
          <ChevronDownIcon
            className={cn(
              "size-3.5 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          title={title}
          disabled={loadingFmt !== null}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer",
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
      )}

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-50 w-56 rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/20 text-left animate-in fade-in-0 zoom-in-95 duration-100"
          >
            <button
              type="button"
              disabled={loadingFmt !== null}
              onClick={() => void trigger("pdf", onDownloadPdf)}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              role="menuitem"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {loadingFmt === "pdf" ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <FileTextIcon className="size-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-xs">PDF Dokumen (.pdf)</div>
                <div className="text-[10px] text-muted-foreground leading-tight">Format cetak &amp; laporan resmi</div>
              </div>
            </button>

            <button
              type="button"
              disabled={loadingFmt !== null}
              onClick={() => void trigger("word", onDownloadWord)}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer mt-0.5"
              role="menuitem"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                {loadingFmt === "word" ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <FileTextIcon className="size-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-xs">Word Dokumen (.docx)</div>
                <div className="text-[10px] text-muted-foreground leading-tight">Dapat disunting</div>
              </div>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
