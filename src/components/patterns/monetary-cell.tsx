import { roundRupiah } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface MonetaryCellProps {
  amount: number;
  currency?: string;
  className?: string;
}

/**
 * Komponen pola sel nominal moneter terstandar Altcycles.
 * Menampilkan simbol mata uang di ujung kiri kolom dan angka nominal rata kanan
 * di ujung kanan kolom dengan font tabular-nums (Design System Rule).
 */
export function MonetaryCell({
  amount,
  currency = "Rp",
  className,
}: MonetaryCellProps) {
  const whole = roundRupiah(amount);
  const absFormatted = Math.abs(whole).toLocaleString("id-ID");
  const prefix = whole < 0 ? `-${currency}` : currency;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 w-full tabular-nums text-xs sm:text-sm leading-5 font-semibold text-foreground",
        className,
      )}
    >
      <span className="text-muted-foreground font-normal shrink-0">{prefix}</span>
      <span className="text-right">{absFormatted}</span>
    </div>
  );
}
