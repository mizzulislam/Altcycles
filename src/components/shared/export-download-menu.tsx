import * as React from "react";
import { createPortal } from "react-dom";
import {
  ChevronDownIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
  TableIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
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
  label,
  onExportExcel,
  onExportPdf,
  onExportCsv,
  disabled = false,
  className,
  align = "end",
}: ExportDownloadMenuProps) {
  const { t } = useLanguage();
  const isDefaultOrSingleUnduh =
    !label ||
    label === "Unduh / Ekspor" ||
    label === "Unduh" ||
    label === "Download" ||
    label === "Download / Export";
  const displayLabel = isDefaultOrSingleUnduh ? t("action.export_download", "Unduh / Ekspor") : label;

  const [isOpen, setIsOpen] = React.useState(false);
  const [loadingType, setLoadingType] = React.useState<"excel" | "pdf" | "csv" | null>(null);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Hitung perkiraan tinggi menu berdasarkan jumlah opsi aktif (tiap item ~52px + padding ~12px)
  const activeItemCount =
    (onExportExcel ? 1 : 0) + (onExportPdf ? 1 : 0) + (onExportCsv ? 1 : 0);
  const estimatedMenuHeight = Math.max(64, activeItemCount * 54 + 12);
  const menuWidth = 260; // w-[260px] (sesuai standar tata letak Gambar 1)

  const updatePosition = React.useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward =
      spaceBelow < estimatedMenuHeight + 12 && rect.top > estimatedMenuHeight + 12;

    const top = openUpward
      ? rect.top - estimatedMenuHeight - 6
      : rect.bottom + 6;

    const rawLeft = align === "end" ? rect.right - menuWidth : rect.left;
    const left = Math.max(
      12,
      Math.min(rawLeft, window.innerWidth - menuWidth - 12),
    );
    setCoords({ top, left });
  }, [align, estimatedMenuHeight, menuWidth]);

  React.useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    function handleReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, updatePosition]);

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
    <div className={cn("inline-block text-left", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full sm:w-auto min-h-10 sm:min-h-9 inline-flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-2xs transition-all duration-100 ease-out cursor-pointer select-none active:scale-[0.98] motion-reduce:transform-none",
          "hover:bg-muted/70 hover:border-primary/40",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
          isOpen && "border-primary/60 ring-2 ring-primary/20",
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          {isLoading ? (
            <Loader2Icon className="size-4 animate-spin text-primary" />
          ) : (
            <DownloadIcon className="size-4 text-primary" />
          )}
          <span>{displayLabel}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[99999] w-[260px] rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 text-left animate-in fade-in-0 zoom-in-95 duration-150 ease-out motion-reduce:animate-none"
          >
            {onExportExcel && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleTrigger("excel", onExportExcel)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-all duration-100 ease-out cursor-pointer active:scale-[0.98] motion-reduce:transform-none",
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
                <div className="flex flex-col min-w-0 text-left">
                  <span className="font-semibold text-foreground whitespace-nowrap">{t("export.excel", "Excel (.xlsx)")}</span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {t("export.excel_desc", "Buku kerja spreadsheet lengkap")}
                  </span>
                </div>
              </button>
            )}

            {onExportPdf && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleTrigger("pdf", onExportPdf)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-all duration-100 ease-out cursor-pointer active:scale-[0.98] motion-reduce:transform-none",
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
                <div className="flex flex-col min-w-0 text-left">
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    {t("export.pdf", "PDF Dokumen (.pdf)")}
                  </span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {t("export.pdf_desc", "Format cetak & laporan resmi")}
                  </span>
                </div>
              </button>
            )}

            {onExportCsv && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleTrigger("csv", onExportCsv)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-all duration-100 ease-out cursor-pointer active:scale-[0.98] motion-reduce:transform-none",
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
                <div className="flex flex-col min-w-0 text-left">
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    {t("export.csv", "Format CSV (.csv)")}
                  </span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {t("export.csv_desc", "Tabel data pemisah koma")}
                  </span>
                </div>
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

