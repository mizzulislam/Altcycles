import { roundRupiah } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * Menampilkan nominal moneter di dalam sel tabel dengan simbol mata uang di ujung kiri
 * dan angka rata kanan di ujung kanan kolom (Design System Rule).
 */
export function MonetaryCell({
  amount,
  currency = "Rp",
  className,
}: {
  amount: number;
  currency?: string;
  className?: string;
}) {
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

