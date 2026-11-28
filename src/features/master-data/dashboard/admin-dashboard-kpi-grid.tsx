import {
  CheckCircle2Icon,
  ClockIcon,
  ReceiptTextIcon,
  WalletIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { formatRupiah } from "@/lib/formatters";
import type { ProjectRow } from "@/types/database.types";
import type { AgingBucketItem } from "./dashboard-types";

export interface AdminDashboardKpiGridProps {
  endingCash: number;
  openPeriods: number;
  cashSparkline: number[];
  cashChangePct: number | null;
  pendingApprovals: number;
  readyDisbursements: number;
  outstandingReceivable: number;
  unpaidInvoiceCount: number;
  pendingClientPos: number;
  agingBuckets: AgingBucketItem[];
  totalContract: number;
  projects: ProjectRow[];
}

export function AdminDashboardKpiGrid({
  endingCash,
  openPeriods,
  cashSparkline,
  cashChangePct,
  pendingApprovals,
  readyDisbursements,
  outstandingReceivable,
  unpaidInvoiceCount,
  pendingClientPos,
  agingBuckets,
  totalContract,
  projects,
}: AdminDashboardKpiGridProps) {
  const { t } = useLanguage();

  return (
    <div className="flexbox-kpi-grid mobile-kpi-carousel sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* KPI 1: Kas & Bank */}
      <KpiCard
        label={t("dashboard.kpi.ending_cash", "Kas & Bank Terkini")}
        value={endingCash}
        formatter={formatRupiah}
        subtext={
          openPeriods > 0
            ? `${openPeriods} ${t("dashboard.kpi.open_periods", "periode buku aktif terbuka")}`
            : t("dashboard.kpi.all_periods_closed", "Seluruh periode buku ditutup")
        }
        icon={WalletIcon}
        iconTone="bg-primary/10 text-primary dark:text-cyan-400 border-primary/20"
        to="/admin/akuntansi/laporan"
        sparklineData={cashSparkline}
        changePercent={cashChangePct}
        changeLabel={t("dashboard:charts.vs_prev_period", "vs periode lalu")}
      />

      {/* KPI 2: Antrean Pembayaran */}
      <KpiCard
        label={t("dashboard.kpi.pending_approvals", "Antrean Pembayaran")}
        value={pendingApprovals + readyDisbursements}
        suffix={` ${t("dashboard.kpi.submissions", "Pengajuan")}`}
        subtext={
          readyDisbursements > 0
            ? `${readyDisbursements} ${t("dashboard.kpi.ready_disbursements", "siap dicairkan ke rekening")}`
            : pendingApprovals > 0
              ? `${pendingApprovals} ${t("dashboard.kpi.awaiting_verification", "menunggu verifikasi Anda")}`
              : t("dashboard.kpi.all_processed", "Semua pengajuan telah diproses")
        }
        icon={ClockIcon}
        iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        to="/admin/persetujuan"
        invertChangeTone
        sparklineData={[readyDisbursements, pendingApprovals]}
        changePercent={null}
      />

      {/* KPI 3: Piutang Belum Tertagih */}
      <KpiCard
        label={t("dashboard.kpi.outstanding_receivables", "Piutang Belum Tertagih")}
        value={outstandingReceivable}
        formatter={formatRupiah}
        subtext={
          unpaidInvoiceCount > 0
            ? `${unpaidInvoiceCount} ${t("dashboard.kpi.invoices_awaiting_payment", "invoice menunggu pelunasan")}`
            : pendingClientPos > 0
              ? `${pendingClientPos} ${t("dashboard.kpi.client_pos_need_verification", "PO klien perlu verifikasi")}`
              : t("dashboard.kpi.all_receivables_managed", "Seluruh tagihan klien terkelola")
        }
        icon={ReceiptTextIcon}
        iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
        to="/admin/penagihan"
        invertChangeTone
        sparklineData={agingBuckets.map((b) => b.amount)}
        changePercent={null}
      />

      {/* KPI 4: Komitmen Kontrak */}
      <KpiCard
        label={t("dashboard.kpi.contract_commitments", "Komitmen Kontrak")}
        value={totalContract}
        formatter={formatRupiah}
        subtext={`${t("dashboard.kpi.accumulated_from", "Akumulasi dari")} ${projects.length} ${t("dashboard.kpi.client_projects", "proyek klien")}`}
        icon={CheckCircle2Icon}
        iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        to="/admin/proyek"
        sparklineData={projects.length > 1 ? projects.map((p) => p.contract_value) : [0, totalContract]}
        changePercent={null}
      />
    </div>
  );
}
