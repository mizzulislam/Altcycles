import {
  CoinsIcon,
  FolderKanbanIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { formatRupiah } from "@/lib/formatters";
import type {
  PaymentRequestRow,
  ProfitSharingLineRow,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";

export interface UserDashboardKpiGridProps {
  projects: ProjectRow[];
  filteredPos: PurchaseOrderRow[];
  filteredRequests: PaymentRequestRow[];
  sharingLines: ProfitSharingLineRow[];
  pendingPa: number;
  approvedPa: number;
  totalMyShare: number;
}

export function UserDashboardKpiGrid({
  projects,
  filteredPos,
  filteredRequests,
  sharingLines,
  pendingPa,
  approvedPa,
  totalMyShare,
}: UserDashboardKpiGridProps) {
  const { t } = useLanguage();

  return (
    <div className="flexbox-kpi-grid mobile-kpi-carousel sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label={t("user_portal.kpi_projects", "Proyek Ditugaskan")}
        value={projects.length}
        suffix={` ${t("user_portal.projects_count", "Proyek")}`}
        subtext={
          projects.length > 0
            ? t("user_portal.kpi_projects_sub", "Terdaftar sebagai pelaksana proyek")
            : t("user_portal.kpi_projects_empty", "Belum ada penugasan aktif")
        }
        icon={FolderKanbanIcon}
        to="/user/anggaran"
        sparklineData={projects.length > 0 ? [0, projects.length] : [0, 0]}
        changePercent={null}
      />

      <KpiCard
        label={t("user_portal.kpi_po", "PO Pembelian Vendor")}
        value={filteredPos.length}
        suffix={` ${t("user_portal.documents", "Dokumen")}`}
        subtext={
          filteredPos.length > 0
            ? t("user_portal.kpi_po_sub", "Dokumen pengadaan barang/jasa")
            : t("user_portal.kpi_po_empty", "Belum ada PO pembelian tercatat")
        }
        icon={ShoppingCartIcon}
        iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
        to="/user/po"
        sparklineData={filteredPos.length > 1 ? filteredPos.map((p) => p.total_amount) : [0, filteredPos.length]}
        changePercent={null}
      />

      <KpiCard
        label={t("user_portal.kpi_claims", "Pengajuan Pembayaran")}
        value={filteredRequests.length}
        suffix={` ${t("user_portal.submissions", "Pengajuan")}`}
        subtext={
          pendingPa > 0
            ? `${pendingPa} ${t("user_portal.pending_approval", "menunggu persetujuan Admin")}`
            : approvedPa > 0
              ? `${approvedPa} ${t("user_portal.approved_waiting", "disetujui menunggu transfer")}`
              : t("user_portal.all_processed", "Semua pengajuan telah diproses")
        }
        icon={ReceiptTextIcon}
        iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        to="/user/pembayaran"
        sparklineData={filteredRequests.length > 1 ? filteredRequests.map((r) => r.amount) : [0, filteredRequests.length]}
        changePercent={null}
      />

      <KpiCard
        label={t("user_portal.kpi_sharing", "Hak Bagi Hasil")}
        value={totalMyShare}
        formatter={formatRupiah}
        subtext={
          sharingLines.length > 0
            ? `${t("user_portal.from", "Dari")} ${sharingLines.length} ${t("user_portal.projects_completed", "proyek diselesaikan")}`
            : t("dashboard:user_dashboard.no_sharing_allocation", "Belum ada alokasi bagi hasil")
        }
        icon={CoinsIcon}
        iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        to="/user/pembayaran"
        sparklineData={sharingLines.length > 1 ? sharingLines.map((l) => l.share_amount) : [0, totalMyShare]}
        changePercent={null}
      />
    </div>
  );
}
