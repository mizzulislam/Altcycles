import * as React from "react";
import {
  ChevronDownIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
  TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExportDownloadMenuProps {
  label?: string;
  onExportExcel?: () => void | Promise<void>;
  onExportPdf?: () => void | Promise<void>;
  onExportCsv?: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  align?: "start" | "end";
}

export function ExportDownloadMenu({
  label = "Unduh / Ekspor",
  onExportExcel,
  onExportPdf,
  onExportCsv,
  disabled = false,
  className,
  align = "end",
}: ExportDownloadMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loadingType, setLoadingType] = React.useState<"excel" | "pdf" | "csv" | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleTrigger(
    type: "excel" | "pdf" | "csv",
    handler?: () => void | Promise<void>,
  ) {
    if (!handler || loadingType) return;
    setLoadingType(type);
    try {
      await handler();
      setIsOpen(false);
    } finally {
      setLoadingType(null);
    }
  }

  const isLoading = loadingType !== null;

  return (
    <div ref={menuRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-2xs transition-all duration-150 cursor-pointer select-none",
          "hover:bg-muted/70 hover:border-primary/40",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          isOpen && "border-primary/60 ring-2 ring-primary/20",
        )}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          {isLoading ? (
            <Loader2Icon className="size-4 animate-spin text-primary" />
          ) : (
            <DownloadIcon className="size-4 text-primary" />
          )}
          <span>{label}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-60 rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 transition-all",
            align === "end" ? "right-0" : "left-0",
          )}
          role="menu"
        >
          {onExportExcel && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleTrigger("excel", onExportExcel)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-colors cursor-pointer",
                "hover:bg-muted/80 text-foreground",
                loadingType === "excel" && "opacity-70",
              )}
              role="menuitem"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {loadingType === "excel" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <FileSpreadsheetIcon className="size-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground">Excel (.xlsx)</span>
                <span className="text-[11px] text-muted-foreground">Buku kerja spreadsheet lengkap</span>
              </div>
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleTrigger("pdf", onExportPdf)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-colors cursor-pointer",
                "hover:bg-muted/80 text-foreground",
                loadingType === "pdf" && "opacity-70",
              )}
              role="menuitem"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {loadingType === "pdf" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <FileTextIcon className="size-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground">PDF Dokumen (.pdf)</span>
                <span className="text-[11px] text-muted-foreground">Format cetak &amp; laporan resmi</span>
              </div>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleTrigger("csv", onExportCsv)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-colors cursor-pointer",
                "hover:bg-muted/80 text-foreground",
                loadingType === "csv" && "opacity-70",
              )}
              role="menuitem"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                {loadingType === "csv" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <TableIcon className="size-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground">Format CSV (.csv)</span>
                <span className="text-[11px] text-muted-foreground">Tabel data pemisah koma</span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

