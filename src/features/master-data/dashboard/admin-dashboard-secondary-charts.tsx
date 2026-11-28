import { Link } from "react-router-dom";
import { ActivityIcon, BarChart3Icon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  ChartSummaryFooter,
  ChartTypeSwitcher,
  HistogramChart,
  MultiSeriesChart,
  type buildRupiahHistogramBins,
} from "@/components/shared/dashboard-charts";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { TruncatedTooltipText } from "@/components/shared/page-header";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { formatCompactRupiah, formatRupiah } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { AgingBucketItem, ProjectBillingStat } from "./dashboard-types";

export interface AdminDashboardSecondaryChartsProps {
  txFreqMode: "area" | "histogram";
  setTxFreqMode: (val: "area" | "histogram") => void;
  journalHistogram: ReturnType<typeof buildRupiahHistogramBins>;
  totalTxCount: number;
  avgTxPerMonth: number;
  txFreqChartData: Array<{
    key: string;
    label: string;
    values: {
      count: number;
    };
  }>;
  agingBuckets: AgingBucketItem[];
  projectBillingStats: ProjectBillingStat[];
  outstandingReceivable: number;
}

export function AdminDashboardSecondaryCharts({
  txFreqMode,
  setTxFreqMode,
  journalHistogram,
  totalTxCount,
  avgTxPerMonth,
  txFreqChartData,
  agingBuckets,
  projectBillingStats,
  outstandingReceivable,
}: AdminDashboardSecondaryChartsProps) {
  const { t } = useLanguage();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Kartu 1: Frekuensi Transaksi (B2) */}
      <ChartCard
        title={t("dashboard:charts.tx_frequency_title", "Frekuensi Transaksi")}
        subtitle={t(
          "dashboard:charts.tx_frequency_subtitle",
          "Jumlah jurnal terposting per bulan kalender.",
        )}
        controls={
          <ChartTypeSwitcher
            value={txFreqMode}
            onChange={(val) => setTxFreqMode(val as "area" | "histogram")}
            options={[
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
                icon: BarChart3Icon,
              },
            ]}
          />
        }
        footer={
          txFreqMode === "histogram" ? (
            <ChartSummaryFooter
              items={[
                {
                  label: t("dashboard:charts.sample_count", "Jumlah Sampel"),
                  value: `${journalHistogram.totalCount} ${t("dashboard:charts.unit_journals", "Jurnal")}`,
                },
                {
                  label: t("dashboard:charts.average_amount", "Rata-Rata"),
                  value: formatRupiah(journalHistogram.average),
                },
                {
                  label: t("dashboard:charts.median_amount", "Median"),
                  value: formatRupiah(journalHistogram.median),
                },
              ]}
            />
          ) : (
            <ChartSummaryFooter
              items={[
                {
                  label: t("dashboard:charts.total_tx", "Total Transaksi"),
                  value: `${totalTxCount} ${t("dashboard:charts.tx_unit", "Jurnal")}`,
                },
                {
                  label: t("dashboard:charts.avg_monthly_tx", "Rata-Rata / Bulan"),
                  value: `${avgTxPerMonth} ${t("dashboard:charts.tx_unit", "Jurnal")}`,
                  valueClass: "text-primary dark:text-cyan-400",
                },
              ]}
            />
          )
        }
      >
        {txFreqMode === "histogram" ? (
          <HistogramChart
            bins={journalHistogram.bins}
            average={journalHistogram.average}
            median={journalHistogram.median}
            totalCount={journalHistogram.totalCount}
            unitLabel={t("dashboard:charts.unit_journals", "Jurnal")}
            accentColor="#0B43C8"
            emptyTitle={t("dashboard:charts.empty_trends_title", "Belum Ada Data Jurnal Terposting")}
            emptySubtitle={t("dashboard:charts.empty_trends_desc", "Histogram sebaran nominal muncul otomatis setelah transaksi dicatat.")}
            showFooter={false}
          />
        ) : (
          <MultiSeriesChart
            chartType="area"
            data={txFreqChartData}
            series={[
              {
                key: "count",
                label: t("dashboard:charts.tx_unit", "Jurnal"),
                color: "#0B43C8",
                textClass: "text-primary dark:text-sky-400",
              },
            ]}
            formatValue={(v) => `${v} ${t("dashboard:charts.tx_unit", "Jurnal")}`}
            formatShortValue={(v) => `${v}`}
            emptyTitle={t("dashboard:charts.empty_trends_title", "Belum Ada Transaksi")}
            emptySubtitle={t("dashboard:charts.empty_trends_desc", "Visualisasi frekuensi transaksi akan muncul otomatis setelah jurnal dibukukan.")}
          />
        )}
      </ChartCard>

      {/* Kartu 3: Penagihan & Umur Piutang */}
      <ChartCard
        title={t("dashboard:charts.billing_title", "Realisasi Penagihan & Piutang")}
        subtitle={t(
          "dashboard:charts.billing_subtitle",
          "Perbandingan nilai kontrak terhadap invoice terbit serta sebaran jatuh tempo.",
        )}
        controls={
          <Link
            to="/admin/penagihan"
            className="text-xs font-semibold text-primary dark:text-sky-400 hover:underline shrink-0"
          >
            {t("dashboard:charts.link_manage_invoices", "Kelola Tagihan")}
          </Link>
        }
        footer={
          <ChartSummaryFooter
            items={agingBuckets.map((b) => ({
              tooltip: `${b.label}: ${formatCompactRupiah(b.amount)}`,
              label: (
                <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap min-w-0">
                  <span className={cn("size-2 rounded-full shrink-0", b.dotColor)} />
                  <TruncatedTooltipText
                    as="span"
                    tooltipText={b.label}
                    className="text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap truncate min-w-0 block"
                  >
                    {b.label}
                  </TruncatedTooltipText>
                </div>
              ),
              value: formatCompactRupiah(b.amount),
              valueClass: b.amount > 0 ? "text-foreground" : "text-muted-foreground",
            }))}
          />
        }
      >
        <div className="flex flex-col justify-center flex-1 space-y-5 py-2">
          {projectBillingStats.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              {t("dashboard:charts.empty_projects_billing", "Belum ada proyek klien aktif untuk dianalisis.")}
            </p>
          ) : (
            <div className="space-y-3">
              {projectBillingStats.map((pb) => (
                <div key={pb.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <Link
                      to={`/admin/proyek/${pb.id}`}
                      className="font-semibold text-foreground hover:text-primary min-w-0 flex-1"
                    >
                      <TruncatedTooltipText
                        as="span"
                        tooltipText={`${pb.code} \u2014 ${pb.name}`}
                      >
                        {pb.code} &mdash; {pb.name}
                      </TruncatedTooltipText>
                    </Link>
                    <span className="text-muted-foreground shrink-0 tabular-nums text-[11px]">
                      {formatCompactRupiah(pb.billed)} / {formatCompactRupiah(pb.contract)} ({pb.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-none bg-muted/60 overflow-hidden">
                    <div
                      style={{ width: `${pb.pct}%` }}
                      className="h-full rounded-none bg-primary transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Progress Bar Umur Piutang */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {t("dashboard:charts.aging_title", "Sebaran Umur Piutang")}
              </span>
              <span className="text-muted-foreground tabular-nums text-[11px]">
                Total: {formatRupiah(outstandingReceivable)}
              </span>
            </div>
            <div className="flex h-2 w-full rounded-none bg-muted/50 overflow-hidden gap-0.5">
              {outstandingReceivable > 0
                ? agingBuckets.map((b) =>
                    b.amount > 0 ? (
                      <ActionTooltip
                        key={b.label}
                        content={`${b.label}: ${formatRupiah(b.amount)}`}
                        side="top"
                      >
                        <div
                          style={{
                            width: `${Math.max(4, (b.amount / outstandingReceivable) * 100)}%`,
                          }}
                          className={cn("h-full rounded-none", b.color)}
                        />
                      </ActionTooltip>
                    ) : null,
                  )
                : null}
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
