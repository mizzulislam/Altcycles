import * as React from "react";
import { Link } from "react-router-dom";
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChart2Icon,
  BarChart3Icon,
  BarChartHorizontalIcon,
  CircleDotIcon,
  CoinsIcon,
  FolderKanbanIcon,
  HandCoinsIcon,
  PieChartIcon,
  PiggyBankIcon,
  PlusIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  buildRupiahHistogramBins,
  ChartCardFooter,
  ChartTypeSwitcher,
  CompositionChart,
  HistogramChart,
  MultiSeriesChart,
  type CompositionChartKind,
} from "@/components/shared/dashboard-charts";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import { listProjects } from "@/lib/data-service";
import { formatDateID, formatRupiah } from "@/lib/formatters";
import {
  getProfitSharingBundle,
  listPaymentRequests,
  listPurchaseOrders,
} from "@/lib/operations-service";
import { cn } from "@/lib/utils";
import type {
  PaymentRequestRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";

const SHORT_MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function formatCompactRupiah(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000)} rb`;
  }
  return formatRupiah(amount);
}

const PROJECT_STATUS_LABELS: Record<
  string,
  { label: string; tone: "success" | "info" | "warning" | "secondary" }
> = {
  active: { label: "Aktif", tone: "success" },
  completed: { label: "Selesai", tone: "info" },
  on_hold: { label: "Ditunda", tone: "warning" },
};

export function UserDashboardPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [pos, setPos] = React.useState<PurchaseOrderRow[]>([]);
  const [requests, setRequests] = React.useState<PaymentRequestRow[]>([]);
  const [sharingLines, setSharingLines] = React.useState<ProfitSharingLineRow[]>([]);
  const [sharingResults, setSharingResults] = React.useState<ProfitSharingResultRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [activityChartType, setActivityChartType] = React.useState<
    "column" | "bar" | "line" | "area" | "histogram"
  >("column");
  const [compDataset, setCompDataset] = React.useState<"claims" | "sharing">("claims");
  const [compChartType, setCompChartType] =
    React.useState<CompositionChartKind>("donut");

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prjRes, poRes, paRes, psRes] = await Promise.all([
          listProjects(),
          listPurchaseOrders(),
          listPaymentRequests(),
          getProfitSharingBundle(),
        ]);
        setProjects(prjRes.projects);
        setPos(poRes.orders);
        setRequests(paRes.requests);
        setSharingLines(psRes.lines);
        setSharingResults(psRes.results);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat ringkasan portal anggota tim...</span>
      </div>
    );
  }

  const pendingPa = requests.filter((r) => r.status === "submitted").length;
  const approvedPa = requests.filter((r) => r.status === "approved").length;
  const paidPa = requests.filter((r) => r.status === "paid").length;
  const rejectedPa = requests.filter((r) => r.status === "rejected").length;
  const totalMyShare = sharingLines.reduce((s, l) => s + l.share_amount, 0);

  // Agregasi aktivitas bulanan PO Pembelian & Pengajuan Pembayaran
  const activityMonthMap = new Map<
    string,
    { poTotal: number; reqTotal: number; paidTotal: number }
  >();
  for (const po of pos) {
    const mk = po.po_date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mk)) continue;
    const cur = activityMonthMap.get(mk) ?? {
      poTotal: 0,
      reqTotal: 0,
      paidTotal: 0,
    };
    cur.poTotal += po.total_amount;
    activityMonthMap.set(mk, cur);
  }
  for (const req of requests) {
    const reqDate = req.submitted_at ?? req.created_at;
    const mk = reqDate.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mk)) continue;
    const cur = activityMonthMap.get(mk) ?? {
      poTotal: 0,
      reqTotal: 0,
      paidTotal: 0,
    };
    cur.reqTotal += req.amount;
    if (req.status === "paid") {
      cur.paidTotal += req.amount;
    }
    activityMonthMap.set(mk, cur);
  }

  const userMonthlyData = [...activityMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, values]) => {
      const [yStr = "", mStr = ""] = monthKey.split("-");
      const mIdx = Number(mStr) - 1;
      const monthName = SHORT_MONTHS_ID[mIdx] ?? mStr;
      return {
        key: monthKey,
        label: `${monthName} ${yStr.slice(2)}`,
        values,
      };
    });

  const totalPoNominal = pos.reduce((s, p) => s + p.total_amount, 0);
  const totalReqNominal = requests.reduce((s, r) => s + r.amount, 0);
  const totalPaidNominal = requests
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  const userTxHistogram = buildRupiahHistogramBins([
    ...pos.map((p) => p.total_amount),
    ...requests.map((r) => r.amount),
  ]);

  const claimStatusSlices = [
    {
      label: "Lunas Dicairkan",
      value: totalPaidNominal,
      count: paidPa,
      color: "#10b981",
      dotClass: "bg-emerald-500",
    },
    {
      label: "Disetujui / Siap Cair",
      value: requests
        .filter((r) => r.status === "approved")
        .reduce((s, r) => s + r.amount, 0),
      count: approvedPa,
      color: "#f59e0b",
      dotClass: "bg-amber-500",
    },
    {
      label: "Menunggu Admin",
      value: requests
        .filter((r) => r.status === "submitted")
        .reduce((s, r) => s + r.amount, 0),
      count: pendingPa,
      color: "#0ea5e9",
      dotClass: "bg-sky-500",
    },
    {
      label: "Perlu Revisi",
      value: requests
        .filter((r) => r.status === "rejected")
        .reduce((s, r) => s + r.amount, 0),
      count: rejectedPa,
      color: "#f43f5e",
      dotClass: "bg-rose-500",
    },
  ];

  const sharingPalette = [
    { color: "#10b981", dotClass: "bg-emerald-500" },
    { color: "#0B43C8", dotClass: "bg-primary" },
    { color: "#8b5cf6", dotClass: "bg-violet-500" },
    { color: "#f59e0b", dotClass: "bg-amber-500" },
    { color: "#0ea5e9", dotClass: "bg-sky-500" },
  ];

  const sharingSlices = sharingLines.map((line, idx) => {
    const res = sharingResults.find((r) => r.id === line.result_id);
    const prj = projects.find((p) => p.id === res?.project_id);
    const palette = sharingPalette[idx % sharingPalette.length] ?? {
      color: "#10b981",
      dotClass: "bg-emerald-500",
    };
    return {
      label: prj ? `${prj.code} — ${prj.name}` : `Proyek #${idx + 1}`,
      value: line.share_amount,
      color: palette.color,
      dotClass: palette.dotClass,
    };
  });

  const shortcuts = [
    {
      to: "/user/po",
      label: "PO Pembelian Vendor",
      desc: "Buat & pantau dokumen PO",
      icon: ShoppingCartIcon,
      tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
      badge: pos.length > 0 ? `${pos.length} PO` : null,
    },
    {
      to: "/user/pembayaran",
      label: "Pengajuan Pembayaran",
      desc: "Kirim klaim & lampiran bukti",
      icon: HandCoinsIcon,
      tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      badge: rejectedPa > 0 ? `${rejectedPa} Perlu Revisi` : pendingPa > 0 ? `${pendingPa} Proses` : null,
    },
    {
      to: "/user/anggaran",
      label: "Anggaran vs Realisasi",
      desc: "Pantau sisa pagu proyek",
      icon: PiggyBankIcon,
      tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      badge: projects.length > 0 ? `${projects.length} Proyek` : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dasbor Anggota Tim
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Selamat datang,{" "}
            <span className="font-semibold text-foreground">
              {profile?.full_name ?? "Rekan"}
            </span>
            . Pantau penugasan proyek, pembayaran, dan hak bagi hasil Anda.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            size="sm"
            asChild
            className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer gap-1.5 shadow-2xs"
          >
            <Link to="/user/pembayaran">
              <PlusIcon className="size-4" />
              <span>Ajukan Pembayaran</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Kartu KPI Utama */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Proyek Ditugaskan
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {projects.length} Proyek
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {projects.length > 0
                ? "Terdaftar sebagai pelaksana proyek"
                : "Belum ada penugasan aktif"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
            <FolderKanbanIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              PO Pembelian Vendor
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {pos.length} Dokumen
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {pos.length > 0
                ? "Dokumen pengadaan barang/jasa"
                : "Belum ada PO pembelian tercatat"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <ShoppingCartIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Pengajuan Pembayaran
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {requests.length} Pengajuan
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {pendingPa > 0
                ? `${pendingPa} menunggu persetujuan Admin`
                : approvedPa > 0
                  ? `${approvedPa} disetujui menunggu transfer`
                  : "Semua pengajuan telah diproses"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ReceiptTextIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Hak Bagi Hasil
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalMyShare)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {sharingLines.length > 0
                ? `Dari ${sharingLines.length} proyek diselesaikan`
                : "Belum ada alokasi bagi hasil"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CoinsIcon className="size-5" />
          </div>
        </Card>
      </div>

      {/* Pintasan Cepat Anggota Tim */}
      <div className="grid gap-3 sm:grid-cols-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-2xs transition-all duration-150 hover:border-primary/50 hover:bg-muted/30"
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-150 group-hover:scale-105",
                  item.tone,
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-semibold text-foreground block truncate">
                  {item.label}
                </span>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {item.desc}
                  </span>
                  {item.badge ? (
                    <span className="shrink-0 rounded-full bg-primary/12 text-primary dark:text-sky-400 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              </div>
              <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>

      {/* Baris Grafik Visualisasi Anggota Tim */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Grafik 1: Tren Bulanan & Histogram Pengajuan Pembayaran / PO */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden lg:col-span-2 flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle>Aktivitas PO &amp; Pengajuan Pembayaran</CardTitle>
              <CardDescription>
                {activityChartType === "histogram"
                  ? "Histogram sebaran nominal seluruh PO pembelian dan pengajuan klaim Anda."
                  : "Perbandingan bulanan nilai PO pembelian, klaim diajukan, dan dana dicairkan."}
              </CardDescription>
            </div>
            {activityChartType !== "histogram" ? (
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-violet-500" />
                  PO Pembelian
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-amber-500" />
                  Pengajuan Dana
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-emerald-500" />
                  Dana Dicairkan
                </span>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between gap-5">
            {activityChartType === "histogram" ? (
              <HistogramChart
                bins={userTxHistogram.bins}
                average={userTxHistogram.average}
                median={userTxHistogram.median}
                totalCount={userTxHistogram.totalCount}
                unitLabel="Dokumen"
                accentColor="#0B43C8"
                emptyTitle="Belum Ada Transaksi Pengajuan"
                emptySubtitle="Histogram distribusi nominal otomatis muncul setelah Anda membuat PO pembelian atau pengajuan pembayaran."
              />
            ) : (
              <MultiSeriesChart
                chartType={activityChartType}
                data={userMonthlyData}
                series={[
                  {
                    key: "poTotal",
                    label: "PO Pembelian",
                    color: "#8b5cf6",
                    textClass: "text-violet-600 dark:text-violet-400",
                  },
                  {
                    key: "reqTotal",
                    label: "Pengajuan Dana",
                    color: "#f59e0b",
                    textClass: "text-amber-600 dark:text-amber-400",
                  },
                  {
                    key: "paidTotal",
                    label: "Dicairkan",
                    color: "#10b981",
                    textClass: "text-emerald-600 dark:text-emerald-400",
                  },
                ]}
                formatValue={formatRupiah}
                formatShortValue={formatCompactRupiah}
                emptyTitle="Belum Ada Riwayat Pengajuan"
                emptySubtitle="Grafik bulanan otomatis tampil setelah PO pembelian atau pengajuan pembayaran tercatat."
              />
            )}

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <div>
                <p className="text-[11px] text-muted-foreground">Total Nilai PO</p>
                <p className="text-xs sm:text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums mt-0.5">
                  {formatRupiah(totalPoNominal)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total Diajukan</p>
                <p className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                  {formatRupiah(totalReqNominal)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Sudah Dicairkan</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                  {formatRupiah(totalPaidNominal)}
                </p>
              </div>
            </div>
          </CardContent>
          <ChartCardFooter>
            <ChartTypeSwitcher
              value={activityChartType}
              onChange={setActivityChartType}
              options={[
                { value: "column", label: "Column", icon: BarChart3Icon },
                { value: "bar", label: "Bar", icon: BarChartHorizontalIcon },
                { value: "line", label: "Line", icon: TrendingUpIcon },
                { value: "area", label: "Area", icon: ActivityIcon },
                { value: "histogram", label: "Histogram", icon: BarChart2Icon },
              ]}
            />
          </ChartCardFooter>
        </Card>

        {/* Grafik 2: Status Klaim Pembayaran & Porsi Bagi Hasil */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <CardTitle>Status Klaim &amp; Bagi Hasil</CardTitle>
              <CardDescription>
                {compDataset === "claims"
                  ? "Proporsi nominal pengajuan pembayaran per status."
                  : "Alokasi nominal hak bagi hasil per proyek."}
              </CardDescription>
            </div>
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setCompDataset("claims")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  compDataset === "claims"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Klaim
              </button>
              <button
                type="button"
                onClick={() => setCompDataset("sharing")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  compDataset === "sharing"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Bagi Hasil
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between gap-5">
            <CompositionChart
              chartType={compChartType}
              slices={compDataset === "claims" ? claimStatusSlices : sharingSlices}
              centerLabel={
                compDataset === "claims" ? "Total Klaim" : "Total Bagi Hasil"
              }
              centerValue={formatCompactRupiah(
                compDataset === "claims" ? totalReqNominal : totalMyShare,
              )}
              formatValue={formatRupiah}
              emptyTitle={
                compDataset === "claims"
                  ? "Belum Ada Pengajuan Pembayaran"
                  : "Belum Ada Alokasi Bagi Hasil"
              }
              emptySubtitle={
                compDataset === "claims"
                  ? "Proporsi status pengajuan dana tampil setelah Anda mengajukan klaim pembayaran."
                  : "Grafik porsi bagi hasil muncul setelah proyek selesai difinalisasi."
              }
            />
          </CardContent>
          <ChartCardFooter>
            <ChartTypeSwitcher
              value={compChartType}
              onChange={setCompChartType}
              options={[
                { value: "donut", label: "Donut", icon: CircleDotIcon },
                { value: "pie", label: "Pie", icon: PieChartIcon },
                { value: "bar", label: "Bar", icon: BarChartHorizontalIcon },
              ]}
            />
          </ChartCardFooter>
        </Card>
      </div>

      {/* Ringkasan Status Pengajuan (tampil ringkas jika sudah ada pengajuan) */}
      {requests.length > 0 ? (
        <Card className="rounded-2xl border-border/80 bg-card px-6 py-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">
              Progres Pengajuan Pembayaran Anda ({requests.length} total)
            </span>
            <Link
              to="/user/pembayaran"
              className="font-semibold text-primary dark:text-cyan-400 hover:underline"
            >
              Lihat Riwayat
            </Link>
          </div>
          <div className="flex h-2.5 w-full rounded-full bg-muted/50 overflow-hidden gap-0.5">
            {paidPa > 0 ? (
              <div
                style={{ width: `${(paidPa / requests.length) * 100}%` }}
                className="h-full bg-emerald-500"
                title={`Dibayar Lunas: ${paidPa}`}
              />
            ) : null}
            {approvedPa > 0 ? (
              <div
                style={{ width: `${(approvedPa / requests.length) * 100}%` }}
                className="h-full bg-amber-500"
                title={`Disetujui / Siap Cair: ${approvedPa}`}
              />
            ) : null}
            {pendingPa > 0 ? (
              <div
                style={{ width: `${(pendingPa / requests.length) * 100}%` }}
                className="h-full bg-sky-500"
                title={`Menunggu Admin: ${pendingPa}`}
              />
            ) : null}
            {rejectedPa > 0 ? (
              <div
                style={{ width: `${(rejectedPa / requests.length) * 100}%` }}
                className="h-full bg-rose-500"
                title={`Perlu Revisi: ${rejectedPa}`}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Lunas: <strong className="text-foreground">{paidPa}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              Siap Cair: <strong className="text-foreground">{approvedPa}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-sky-500" />
              Menunggu: <strong className="text-foreground">{pendingPa}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500" />
              Perlu Revisi: <strong className="text-foreground">{rejectedPa}</strong>
            </span>
          </div>
        </Card>
      ) : null}

      {/* Daftar Proyek Aktif Saya */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70">
          <CardTitle>Proyek Aktif Saya</CardTitle>
          <CardDescription>
            Daftar proyek di mana Anda terdaftar aktif sebagai pelaksana tugas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode Proyek</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Proyek</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Jadwal Pelaksanaan</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="p-0">
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                        <FolderKanbanIcon className="size-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Belum Ada Penugasan Proyek
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                        Anda belum terdaftar dalam proyek aktif mana pun. Hubungi Admin atau manajer proyek untuk penugasan tim.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((p) => {
                  const pMeta = PROJECT_STATUS_LABELS[p.status] ?? {
                    label: p.status,
                    tone: "secondary" as const,
                  };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-center font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {p.code}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {p.name}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap tabular-nums">
                        {formatDateID(p.start_date)} &ndash;{" "}
                        {formatDateID(p.target_end_date)}
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge tone={pMeta.tone} label={pMeta.label} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rincian Hak Bagi Hasil Saya */}
      {sharingLines.length > 0 ? (
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-border/70">
            <CardTitle>Rincian Hak Bagi Hasil Saya</CardTitle>
            <CardDescription>
              Daftar alokasi pembagian hasil dari proyek yang telah selesai dan disetujui.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Proyek</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Porsi (%)</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">Nominal Hak Bagi Hasil</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Status Perhitungan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharingLines.map((line) => {
                  const res = sharingResults.find((r) => r.id === line.result_id);
                  const prj = projects.find((p) => p.id === res?.project_id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {prj ? `${prj.code}: ${prj.name}` : "Proyek"}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 tabular-nums whitespace-nowrap">
                        {line.percentage}%
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={line.share_amount} />
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={res?.status === "finalized" ? "success" : "warning"}
                            label={
                              res?.status === "finalized"
                                ? "Difinalisasi & Terkunci"
                                : "Simulasi Draf"
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
