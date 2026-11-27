import { ClockAlertIcon, ReceiptTextIcon, WalletIcon } from "lucide-react";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
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
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
      <KpiCard
        label={t("invoicing:kpi.total_invoiced")}
        displayValue={formatRupiah(totalInvoiced)}
        subtext={t("invoicing:kpi.invoice_count", { count: invoiceCount })}
        icon={ReceiptTextIcon}
        iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
      />

      <KpiCard
        label={t("invoicing:kpi.total_collected")}
        displayValue={formatRupiah(totalCollected)}
        subtext={t("invoicing:kpi.receipt_count", { count: receiptCount })}
        icon={WalletIcon}
        iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      />

      <KpiCard
        label={t("invoicing:kpi.total_outstanding")}
        displayValue={formatRupiah(totalOutstanding)}
        subtext={t("invoicing:kpi.pending_count", { count: arPendingCount })}
        icon={ClockAlertIcon}
        iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      />
    </div>
  );
}
