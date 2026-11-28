import {
  CheckCircle2Icon,
  ClockIcon,
  WalletIcon,
} from "lucide-react";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { formatRupiah } from "@/lib/formatters";

export interface UserPaymentsKpiGridProps {
  pendingCount: number;
  approvedCount: number;
  totalPaidAmount: number;
  t: (key: string) => string;
}

export function UserPaymentsKpiGrid({
  pendingCount,
  approvedCount,
  totalPaidAmount,
  t,
}: UserPaymentsKpiGridProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
      <KpiCard
        label={t("approvals:user.kpi_pending")}
        value={pendingCount}
        suffix={` ${t("approvals:user.unit_submissions")}`}
        subtext={
          pendingCount > 0
            ? t("approvals:user.kpi_pending_desc_active")
            : t("approvals:user.kpi_pending_desc_empty")
        }
        icon={ClockIcon}
        iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      />

      <KpiCard
        label={t("approvals:user.kpi_ready")}
        value={approvedCount}
        suffix={` ${t("approvals:user.unit_submissions")}`}
        subtext={
          approvedCount > 0
            ? t("approvals:user.kpi_ready_desc_active")
            : t("approvals:user.kpi_ready_desc_empty")
        }
        icon={WalletIcon}
        iconTone="bg-primary/10 text-primary dark:text-sky-400 border-primary/20"
      />

      <KpiCard
        label={t("approvals:user.kpi_paid")}
        displayValue={formatRupiah(totalPaidAmount)}
        subtext={t("approvals:user.kpi_paid_desc")}
        icon={CheckCircle2Icon}
        iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      />
    </div>
  );
}
