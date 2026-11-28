import {
  ActivityIcon,
  BarChart3Icon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  ChartLegendRow,
  ChartSummaryFooter,
  ChartTypeSwitcher,
  ChartValueFooter,
  CompositionChart,
  MultiSeriesChart,
  type MultiSeriesChartKind,
} from "@/components/shared/dashboard-charts";
import { ChartCard } from "@/components/shared/dashboard-chart-card";
import { formatCompactRupiah, formatRupiah } from "@/lib/formatters";

export interface AdminDashboardChartsRowProps {
  trendChartType: MultiSeriesChartKind;
  setTrendChartType: (val: MultiSeriesChartKind) => void;
  hiddenTrendSeries: Set<string>;
  toggleTrendSeries: (key: string) => void;
  incomeStatement: {
    totalRevenue: number;
    totalDirectExpense: number;
    totalSharedExpense: number;
    netProfit: number;
  };
  totalExpense: number;
  monthlyChartData: Array<{
    key: string;
    label: string;
    values: {
      revenue: number;
      expense: number;
      netCash: number;
    };
  }>;
  donutMode: "profit" | "cash";
  setDonutMode: (val: "profit" | "cash") => void;
  cashEndingBalance: number;
  donutSegments: Array<{
    label: string;
    value: number;
    color: string;
    dotClass: string;
  }>;
}

export function AdminDashboardChartsRow({
  trendChartType,
  setTrendChartType,
  hiddenTrendSeries,
  toggleTrendSeries,
  incomeStatement,
  totalExpense,
  monthlyChartData,
  donutMode,
  setDonutMode,
  cashEndingBalance,
  donutSegments,
}: AdminDashboardChartsRowProps) {
  const { t } = useLanguage();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Grafik 1: Tren Pendapatan, Beban, & Arus Kas Bulanan */}
      <ChartCard
        className="lg:col-span-2"
        title={t("dashboard.charts.trends_title", "Tren Pendapatan, Beban, & Arus Kas")}
        subtitle={t(
          "dashboard.charts.trends_subtitle",
          "Perbandingan pergerakan keuangan bulanan berdasarkan jurnal terposting.",
        )}
        controls={
          <ChartTypeSwitcher
            value={(trendChartType as string) === "bar" ? "column" : trendChartType}
            onChange={(val) => setTrendChartType((val as string) === "bar" ? "column" : val)}
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
            ]}
          />
        }
        legend={
          <ChartLegendRow
            series={[
              {
                key: "revenue",
                label: t("dashboard:charts.revenue", "Pendapatan"),
                color: "#10b981",
              },
              {
                key: "expense",
                label: t("dashboard:charts.expense", "Beban"),
                color: "#f59e0b",
              },
              {
                key: "netCash",
                label: t("dashboard:charts.net_cash", "Kas Bersih"),
                color: "#0B43C8",
              },
            ]}
            hiddenKeys={hiddenTrendSeries}
            onToggleSeries={toggleTrendSeries}
          />
        }
        footer={
          <ChartSummaryFooter
            items={[
              {
                label: t("dashboard:charts.total_revenue", "Total Pendapatan"),
                value: formatRupiah(incomeStatement.totalRevenue),
                valueClass: "text-emerald-600 dark:text-emerald-400",
              },
              {
                label: t("dashboard:charts.total_expense", "Total Beban"),
                value: formatRupiah(totalExpense),
                valueClass: "text-amber-600 dark:text-amber-400",
              },
              {
                label: t("dashboard:charts.net_profit_loss", "Laba / Rugi Bersih"),
                value: (
                  <span className="inline-flex items-center gap-1">
                    {incomeStatement.netProfit >= 0 ? (
                      <TrendingUpIcon className="size-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <TrendingDownIcon className="size-3.5 text-rose-500 shrink-0" />
                    )}
                    {formatRupiah(incomeStatement.netProfit)}
                  </span>
                ),
                valueClass:
                  incomeStatement.netProfit >= 0
                    ? "text-foreground"
                    : "text-destructive",
              },
            ]}
          />
        }
      >
        <MultiSeriesChart
          chartType={(trendChartType as string) === "bar" ? "column" : trendChartType}
          data={monthlyChartData}
          series={[
            {
              key: "revenue",
              label: t("dashboard:charts.revenue", "Pendapatan"),
              color: "#10b981",
              textClass: "text-emerald-600 dark:text-emerald-400",
            },
            {
              key: "expense",
              label: t("dashboard:charts.expense", "Beban"),
              color: "#f59e0b",
              textClass: "text-amber-600 dark:text-amber-400",
            },
            {
              key: "netCash",
              label: t("dashboard:charts.net_cash", "Kas Bersih"),
              color: "#0B43C8",
              textClass: "text-primary dark:text-sky-400",
            },
          ]}
          hiddenKeys={hiddenTrendSeries}
          formatValue={formatRupiah}
          formatShortValue={formatCompactRupiah}
          emptyTitle={t("dashboard:charts.empty_trends_title", "Belum Ada Data Jurnal Terposting")}
          emptySubtitle={t(
            "dashboard:charts.empty_trends_desc",
            "Grafik tren bulanan otomatis muncul setelah transaksi pendapatan, beban, atau kas dicatat di buku jurnal.",
          )}
        />
      </ChartCard>

      {/* Grafik 2: Komposisi Keuangan (Pie 3D & Batang Horizontal Terintegrasi) */}
      <ChartCard
        title={
          donutMode === "profit"
            ? t("dashboard:charts.tab_profit_loss", "Komposisi Laba Rugi")
            : t("dashboard:charts.tab_cash_flow", "Komposisi Arus Kas")
        }
        titleClassName="text-xs sm:text-sm font-bold"
        subtitle={t(
          "dashboard.charts.composition_subtitle",
          "Proporsi struktur keuangan dan likuiditas kas.",
        )}
        controls={
          <ChartTypeSwitcher
            value={donutMode}
            onChange={(val) => setDonutMode(val as "profit" | "cash")}
            options={[
              {
                value: "profit",
                label: t("dashboard:charts.tab_profit_loss", "Laba Rugi"),
                title: t("dashboard:charts.tab_profit_loss", "Laba Rugi"),
              },
              {
                value: "cash",
                label: t("dashboard:charts.tab_cash_flow", "Arus Kas"),
                title: t("dashboard:charts.tab_cash_flow", "Arus Kas"),
              },
            ]}
          />
        }
        footer={
          <ChartValueFooter
            label={
              donutMode === "profit"
                ? t("dashboard:charts.center_net_profit", "Laba Bersih")
                : t("dashboard:charts.center_cash_balance", "Saldo Kas")
            }
            value={formatRupiah(
              donutMode === "profit"
                ? incomeStatement.netProfit
                : cashEndingBalance,
            )}
            trend={
              (donutMode === "profit" ? incomeStatement.netProfit : cashEndingBalance) >= 0
                ? "up"
                : "down"
            }
          />
        }
      >
        <CompositionChart
          chartType="pie3d"
          slices={donutSegments}
          centerLabel={
            donutMode === "profit"
              ? t("dashboard:charts.center_net_profit", "Laba Bersih")
              : t("dashboard:charts.center_cash_balance", "Saldo Kas")
          }
          centerValue={formatCompactRupiah(
            donutMode === "profit"
              ? incomeStatement.netProfit
              : cashEndingBalance,
          )}
          formatValue={formatRupiah}
          emptyTitle={t("dashboard:charts.empty_composition_title", "Belum Ada Komposisi Keuangan")}
          emptySubtitle={t(
            "dashboard:charts.empty_composition_desc",
            "Grafik proporsi otomatis terisi setelah transaksi dibukukan.",
          )}
        />
      </ChartCard>
    </div>
  );
}
