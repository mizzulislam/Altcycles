import * as React from "react";
import { createPortal } from "react-dom";
import { DownloadIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocumentDownloadMenuProps {
  title?: string;
  onDownloadPdf: () => void | Promise<void>;
  onDownloadWord: () => void | Promise<void>;
  className?: string;
}

export function DocumentDownloadMenu({
  title = "Unduh Dokumen (PDF / Word)",
  onDownloadPdf,
  onDownloadWord,
  className,
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
    const menuWidth = 192; // w-48
    const menuHeight = 104;
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
      <button
        ref={triggerRef}
        type="button"
        title={title}
        disabled={loadingFmt !== null}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
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

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-50 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/20 text-left"
          >
            <button
              type="button"
              disabled={loadingFmt !== null}
              onClick={() => void trigger("pdf", onDownloadPdf)}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              role="menuitem"
            >
              <FileTextIcon className="size-3.5 text-rose-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold">Unduh PDF (.pdf)</div>
                <div className="text-[10px] text-muted-foreground">Siap cetak A4</div>
              </div>
            </button>

            <button
              type="button"
              disabled={loadingFmt !== null}
              onClick={() => void trigger("word", onDownloadWord)}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer mt-0.5"
              role="menuitem"
            >
              <FileTextIcon className="size-3.5 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold">Unduh Word (.docx)</div>
                <div className="text-[10px] text-muted-foreground">Dapat disunting</div>
              </div>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
