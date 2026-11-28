import {
  ActivityIcon,
  BarChart2Icon,
  BarChart3Icon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  ChartLegendRow,
  ChartSummaryFooter,
  ChartTypeSwitcher,
  ChartValueFooter,
  CompositionChart,
  HistogramChart,
  MultiSeriesChart,
  type buildRupiahHistogramBins,
} from "@/components/shared/dashboard-charts";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { formatCompactRupiah, formatRupiah } from "@/lib/formatters";

export interface UserDashboardChartsProps {
  activityChartType: "column" | "area" | "histogram";
  setActivityChartType: (val: "column" | "area" | "histogram") => void;
  hiddenActivitySeries: Set<string>;
  toggleActivitySeries: (key: string) => void;
  totalPoNominal: number;
  totalReqNominal: number;
  totalPaidNominal: number;
  userTxHistogram: ReturnType<typeof buildRupiahHistogramBins>;
  userMonthlyData: Array<{
    key: string;
    label: string;
    values: {
      poTotal: number;
      reqTotal: number;
      paidTotal: number;
    };
  }>;
  compDataset: "claims" | "sharing";
  setCompDataset: (val: "claims" | "sharing") => void;
  claimStatusSlices: Array<{
    label: string;
    value: number;
    count: number;
    color: string;
    dotClass: string;
  }>;
  sharingSlices: Array<{
    label: string;
    value: number;
    color: string;
    dotClass: string;
  }>;
  totalMyShare: number;
}

export function UserDashboardCharts({
  activityChartType,
  setActivityChartType,
  hiddenActivitySeries,
  toggleActivitySeries,
  totalPoNominal,
  totalReqNominal,
  totalPaidNominal,
  userTxHistogram,
  userMonthlyData,
  compDataset,
  setCompDataset,
  claimStatusSlices,
  sharingSlices,
  totalMyShare,
}: UserDashboardChartsProps) {
  const { t } = useLanguage();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Grafik 1: Tren Bulanan & Histogram Pengajuan Pembayaran / PO */}
      <ChartCard
        className="lg:col-span-2"
        title={t("dashboard:user_dashboard.chart_activity_title", "Aktivitas PO & Pengajuan Pembayaran")}
        subtitle={
          activityChartType === "histogram"
            ? t("dashboard:user_dashboard.chart_histogram_desc", "Histogram sebaran nominal seluruh PO pembelian dan pengajuan klaim Anda.")
            : t("dashboard:user_dashboard.chart_activity_desc", "Perbandingan bulanan nilai PO pembelian, klaim diajukan, dan dana dicairkan.")
        }
        controls={
          <ChartTypeSwitcher
            value={activityChartType}
            onChange={(val) => setActivityChartType(val)}
            options={[
              {
                value: "column",
                label: t("dashboard:charts.types.column", "Kolom"),
                title: t("dashboard:charts.types.column_title", "Column Chart"),
                icon: BarChart3Icon,
              },
              {
                value: "area",
                label: t("dashboard:charts.types.area", "Area"),
                title: t("dashboard:charts.types.area_title", "Area Chart"),
                icon: ActivityIcon,
              },
              {
                value: "histogram",
                label: t("dashboard:charts.types.histogram", "Histogram"),
                title: t("dashboard:charts.types.histogram_title", "Histogram"),
                icon: BarChart2Icon,
              },
            ]}
          />
        }
        legend={
          <ChartLegendRow
            series={[
              {
                key: "poTotal",
                label: t("dashboard:user_dashboard.legend_po", "PO Pembelian"),
                color: "#8b5cf6",
              },
              {
                key: "reqTotal",
                label: t("dashboard:user_dashboard.legend_req", "Pengajuan Dana"),
                color: "#f59e0b",
              },
              {
                key: "paidTotal",
                label: t("dashboard:user_dashboard.disbursed", "Dicairkan"),
                color: "#10b981",
              },
            ]}
            hiddenKeys={hiddenActivitySeries}
            onToggleSeries={toggleActivitySeries}
          />
        }
        footer={
          <ChartSummaryFooter
            items={[
              {
                label: t("dashboard:user_dashboard.total_po_val", "Total Nilai PO"),
                value: formatRupiah(totalPoNominal),
                valueClass: "text-violet-600 dark:text-violet-400",
              },
              {
                label: t("dashboard:user_dashboard.total_req_val", "Total Diajukan"),
                value: formatRupiah(totalReqNominal),
                valueClass: "text-amber-600 dark:text-amber-400",
              },
              {
                label: t("dashboard:user_dashboard.total_paid_val", "Sudah Dicairkan"),
                value: formatRupiah(totalPaidNominal),
                valueClass: "text-emerald-600 dark:text-emerald-400",
              },
            ]}
          />
        }
      >
        {activityChartType === "histogram" ? (
          <HistogramChart
            bins={userTxHistogram.bins}
            average={userTxHistogram.average}
            median={userTxHistogram.median}
            totalCount={userTxHistogram.totalCount}
            unitLabel={t("dashboard:user_dashboard.unit_docs", "Dokumen")}
            accentColor="#0B43C8"
            emptyTitle={t("dashboard:user_dashboard.no_claims_tx", "Belum Ada Transaksi Pengajuan")}
            emptySubtitle={t("dashboard:user_dashboard.no_claims_tx_desc", "Histogram distribusi nominal otomatis muncul setelah Anda membuat PO pembelian atau pengajuan pembayaran.")}
          />
        ) : (
          <MultiSeriesChart
            chartType={activityChartType}
            data={userMonthlyData}
            series={[
              {
                key: "poTotal",
                label: t("dashboard:user_dashboard.legend_po", "PO Pembelian"),
                color: "#8b5cf6",
                textClass: "text-violet-600 dark:text-violet-400",
              },
              {
                key: "reqTotal",
                label: t("dashboard:user_dashboard.legend_req", "Pengajuan Dana"),
                color: "#f59e0b",
                textClass: "text-amber-600 dark:text-amber-400",
              },
              {
                key: "paidTotal",
                label: t("dashboard:user_dashboard.disbursed", "Dicairkan"),
                color: "#10b981",
                textClass: "text-emerald-600 dark:text-emerald-400",
              },
            ]}
            hiddenKeys={hiddenActivitySeries}
            formatValue={formatRupiah}
            formatShortValue={formatCompactRupiah}
            emptyTitle={t("dashboard:user_dashboard.no_claims_history", "Belum Ada Riwayat Pengajuan")}
            emptySubtitle={t("dashboard:user_dashboard.no_claims_history_desc", "Grafik bulanan otomatis tampil setelah PO pembelian atau pengajuan pembayaran tercatat.")}
          />
        )}
      </ChartCard>

      {/* Grafik 2: Status Klaim Pembayaran & Porsi Bagi Hasil */}
      <ChartCard
        title={
          compDataset === "claims"
            ? t("dashboard:user_dashboard.chart_claims_title", "Status Klaim Pembayaran")
            : t("dashboard:user_dashboard.chart_sharing_title", "Alokasi Bagi Hasil Proyek")
        }
        titleClassName="text-xs sm:text-sm font-bold"
        subtitle={
          compDataset === "claims"
            ? t("dashboard:user_dashboard.chart_claims_desc", "Proporsi nominal pengajuan pembayaran per status.")
            : t("dashboard:user_dashboard.chart_sharing_desc", "Alokasi nominal hak bagi hasil per proyek.")
        }
        controls={
          <ChartTypeSwitcher
            value={compDataset}
            onChange={(val) => setCompDataset(val as "claims" | "sharing")}
            options={[
              {
                value: "claims",
                label: t("dashboard:user_dashboard.tab_claims", "Klaim"),
                title: t("dashboard:user_dashboard.tab_claims", "Klaim"),
              },
              {
                value: "sharing",
                label: t("dashboard:user_dashboard.tab_sharing", "Bagi Hasil"),
                title: t("dashboard:user_dashboard.tab_sharing", "Bagi Hasil"),
              },
            ]}
          />
        }
        legend={
          <ChartLegendRow
            series={
              compDataset === "claims"
                ? [
                    {
                      key: "paid",
                      label: t("dashboard:user_dashboard.disbursed", "Dicairkan"),
                      color: "#10b981",
                    },
                    {
                      key: "submitted",
                      label: t("dashboard:user_dashboard.status_submitted_short", "Menunggu"),
                      color: "#0ea5e9",
                    },
                    {
                      key: "rejected",
                      label: t("dashboard:user_dashboard.status_rejected_short", "Revisi"),
                      color: "#f43f5e",
                    },
                  ]
                : [
                    {
                      key: "sharing",
                      label: t("dashboard:user_dashboard.tab_sharing", "Bagi Hasil"),
                      color: "#10b981",
                    },
                    {
                      key: "project",
                      label: t("projects:title", "Proyek"),
                      color: "#0B43C8",
                    },
                  ]
            }
          />
        }
        footer={
          <ChartValueFooter
            label={
              compDataset === "claims"
                ? t("dashboard:user_dashboard.total_claims", "Total Klaim")
                : t("dashboard:user_dashboard.total_sharing", "Total Bagi Hasil")
            }
            value={formatRupiah(
              compDataset === "claims" ? totalReqNominal : totalMyShare,
            )}
          />
        }
      >
        <CompositionChart
          chartType="donut"
          slices={compDataset === "claims" ? claimStatusSlices : sharingSlices}
          centerLabel={
            compDataset === "claims"
              ? t("dashboard:user_dashboard.total_claims", "Total Klaim")
              : t("dashboard:user_dashboard.total_sharing", "Total Bagi Hasil")
          }
          centerValue={formatCompactRupiah(
            compDataset === "claims" ? totalReqNominal : totalMyShare,
          )}
          formatValue={formatRupiah}
          emptyTitle={
            compDataset === "claims"
              ? t("dashboard:user_dashboard.no_claims_empty", "Belum Ada Pengajuan Pembayaran")
              : t("dashboard:user_dashboard.no_sharing_empty", "Belum Ada Alokasi Bagi Hasil")
          }
          emptySubtitle={
            compDataset === "claims"
              ? t("dashboard:user_dashboard.no_claims_empty_desc", "Proporsi status pengajuan dana tampil setelah Anda mengajukan klaim pembayaran.")
              : t("dashboard:user_dashboard.no_sharing_empty_desc", "Grafik porsi bagi hasil muncul setelah proyek selesai difinalisasi.")
          }
        />
      </ChartCard>
    </div>
  );
}
