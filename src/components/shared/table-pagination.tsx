import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100] as const;

export function buildPageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}

/**
 * Komponen pagination footer tabel terstandar Altcycles.
 * Menampilkan label rentang item di kiri serta navigasi halaman & pemilih baris di kanan.
 */
export function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
}: TablePaginationProps) {
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const startDisplay = totalItems === 0 ? 0 : startIndex + 1;
  const endDisplay = Math.min(startIndex + pageSize, totalItems);
  const pageNumbers = buildPageNumbers(safePage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border/70 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between select-none",
        className,
      )}
    >
      <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
        {totalItems === 0
          ? "0"
          : t("common:table.pagination_info", {
              start: startDisplay,
              end: endDisplay,
              total: totalItems.toLocaleString("id-ID"),
              defaultValue: `${startDisplay}–${endDisplay} dari ${totalItems}`,
            })}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            title={t("common:table.previous_page", "Halaman sebelumnya")}
            aria-label={t("common:table.previous_page", "Halaman sebelumnya")}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>

          {pageNumbers.map((item, idx) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1.5 text-xs text-muted-foreground select-none"
              >
                ...
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(item)}
                aria-current={item === safePage ? "page" : undefined}
                className={
                  item === safePage
                    ? "size-8 rounded-lg bg-primary/15 text-primary dark:text-sky-400 font-semibold hover:bg-primary/20 cursor-pointer tabular-nums"
                    : "size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer tabular-nums"
                }
              >
                {item}
              </Button>
            ),
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            title={t("common:table.next_page", "Halaman berikutnya")}
            aria-label={t("common:table.next_page", "Halaman berikutnya")}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        {onPageSizeChange ? (
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              onPageSizeChange(Number(val));
              onPageChange(1);
            }}
          >
            <SelectTrigger
              aria-label={t("common:table.rows_per_page", "Jumlah baris per halaman")}
              className="h-8 w-[76px] rounded-xl text-xs font-medium tabular-nums cursor-pointer"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {pageSizeOptions.map((opt) => (
                  <SelectItem
                    key={opt}
                    value={String(opt)}
                    className="tabular-nums text-xs cursor-pointer"
                  >
                    {opt}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </div>
  );
}
