import { ClockAlertIcon, ReceiptTextIcon, WalletIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";

export interface InvoiceKpiSummaryProps {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  invoiceCount: number;
  receiptCount: number;
  arPendingCount: number;
}

export function InvoiceKpiSummary({
  totalInvoiced,
  totalCollected,
  totalOutstanding,
  invoiceCount,
  receiptCount,
  arPendingCount,
}: InvoiceKpiSummaryProps) {
  const { t } = useLanguage();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {t("invoicing:kpi.total_invoiced")}
          </p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
            {formatRupiah(totalInvoiced)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("invoicing:kpi.invoice_count", { count: invoiceCount })}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-cyan-400 border border-primary/20">
          <ReceiptTextIcon className="size-5" />
        </div>
      </Card>

      <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {t("invoicing:kpi.total_collected")}
          </p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
            {formatRupiah(totalCollected)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("invoicing:kpi.receipt_count", { count: receiptCount })}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <WalletIcon className="size-5" />
        </div>
      </Card>

      <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {t("invoicing:kpi.total_outstanding")}
          </p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
            {formatRupiah(totalOutstanding)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("invoicing:kpi.pending_count", { count: arPendingCount })}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <ClockAlertIcon className="size-5" />
        </div>
      </Card>
    </div>
  );
}
