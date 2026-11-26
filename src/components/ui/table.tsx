import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/empty";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto overflow-y-hidden max-w-full touch-pan-x @container group/table">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
    {/* Petunjuk scroll horizontal halus hanya di layar kecil / sempit saat konten meluap */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card/80 to-transparent lg:hidden opacity-75 transition-opacity"
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b bg-muted/40", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  // Pastikan seluruh teks judul di header tabel posisinya selalu tengah/middle
  const sanitizedClassName = className
    ?.replace(/\btext-(left|right|start|end)\b/g, "")
    ?.replace(/\balign-(top|bottom)\b/g, "");

  return (
    <th
      ref={ref}
      className={cn(
        "h-10 px-3 text-center align-middle text-xs sm:text-sm font-semibold text-muted-foreground",
        sanitizedClassName,
      )}
      {...props}
    />
  );
});
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-3 py-3.5 align-top text-xs sm:text-sm leading-5", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export interface TableLoadingRowProps {
  colSpan: number;
  message?: string;
  className?: string;
}

export function TableLoadingRow({
  colSpan,
  message = "Memuat data...",
  className,
}: TableLoadingRowProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn("h-32 text-center text-muted-foreground", className)}
      >
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="flex items-center justify-center gap-2.5 text-xs sm:text-sm text-muted-foreground"
        >
          <Spinner className="size-4 text-primary dark:text-sky-400" />
          <span>{message}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };

