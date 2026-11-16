import * as React from "react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/formatters";

export function formatBalanceAmount(amount: number): string {
  if (amount < 0) return `(${formatRupiah(Math.abs(amount))})`;
  return formatRupiah(amount);
}

export function formatCurrency(
  val: number,
  isNegative = false,
  colorClass = "",
): React.ReactNode {
  if (val === 0) {
    return (
      <span className="inline-flex justify-between items-center w-[125px] shrink-0 pl-2 text-muted-foreground font-semibold">
        <span className="font-normal mr-2">Rp</span>
        <span>0</span>
      </span>
    );
  }

  const absVal = Math.abs(val);
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(absVal);

  if (isNegative || val < 0) {
    return (
      <span
        className={cn(
          "inline-flex justify-between items-center w-[125px] shrink-0 pl-2 font-semibold",
          colorClass || "text-foreground",
        )}
      >
        <span className="text-muted-foreground font-normal mr-1">(Rp</span>
        <span>
          {formatted}
          <span className="text-muted-foreground font-normal">)</span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex justify-between items-center w-[125px] shrink-0 pl-2 font-semibold",
        colorClass || "text-foreground",
      )}
    >
      <span className="text-muted-foreground font-normal mr-2">Rp</span>
      <span>{formatted}</span>
    </span>
  );
}

export function formatSplitzCurrency(val: number): React.ReactNode {
  if (val === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex justify-between items-center w-full min-w-[90px]">
      <span className="text-muted-foreground/70 mr-2 text-xs">Rp</span>
      <span className="font-semibold text-foreground">
        {new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(val)}
      </span>
    </div>
  );
}

export function formatDateSplitz(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
