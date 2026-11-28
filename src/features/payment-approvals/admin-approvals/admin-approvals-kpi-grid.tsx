import {
  CheckCircle2Icon,
  ClockIcon,
  WalletIcon,
} from "lucide-react";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { formatRupiah } from "@/lib/formatters";

export interface AdminApprovalsKpiGridProps {
  pendingCount: number;
  approvedUnpaidCount: number;
  totalPaidAmount: number;
  t: (k: string, fb?: string) => string;
}

export function AdminApprovalsKpiGrid({
  pendingCount,
  approvedUnpaidCount,
  totalPaidAmount,
  t,
}: AdminApprovalsKpiGridProps) {
  return (
    <div className="grid gap-2.5 sm:gap-4 grid-cols-2 sm:grid-cols-3 shrink-0">
      <KpiCard
        label={t("approvals:admin.kpi_pending", "Menunggu Persetujuan Admin")}
        value={pendingCount}
        suffix={` ${t("approvals:admin.unit_submissions", "Pengajuan")}`}
        subtext={
          pendingCount > 0
            ? t("approvals:admin.kpi_pending_desc_active", "Menunggu verifikasi & otorisasi bendahara")
            : t("approvals:admin.kpi_pending_desc_empty", "Tidak ada antrean pengajuan baru")
        }
        icon={ClockIcon}
        iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      />

      <KpiCard
        label={t("approvals:admin.kpi_ready", "Disetujui & Siap Dicairkan")}
        value={approvedUnpaidCount}
        suffix={` ${t("approvals:admin.unit_submissions", "Pengajuan")}`}
        subtext={
          approvedUnpaidCount > 0
            ? t("approvals:admin.kpi_ready_desc_active", "Menunggu realisasi transfer kas/bank")
            : t("approvals:admin.kpi_ready_desc_empty", "Seluruh pengajuan disetujui telah cair")
        }
        icon={WalletIcon}
        iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
      />

      <KpiCard
        className="col-span-2 sm:col-span-1"
        label={t("approvals:admin.kpi_paid", "Total Pembayaran Terealisasi")}
        displayValue={formatRupiah(totalPaidAmount)}
        subtext={t("approvals:admin.kpi_paid_desc", "Tercatat otomatis di buku besar kas")}
        icon={CheckCircle2Icon}
        iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      />
    </div>
  );
}
