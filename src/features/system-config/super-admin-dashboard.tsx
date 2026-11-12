import * as React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChart3Icon,
  BarChartHorizontalIcon,
  BookOpenIcon,
  CircleDotIcon,
  PieChartIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import {
  ChartCardFooter,
  ChartTypeSwitcher,
  CompositionChart,
  MultiSeriesChart,
  type CompositionChartKind,
} from "@/components/shared/dashboard-charts";
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
import {
  getCompanyProfile,
  listAccounts,
  listAuditLogs,
  listProfiles,
} from "@/lib/data-service";
import { formatDateTimeID } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  AccountRow,
  AuditLogRow,
  CompanyProfileRow,
  ProfileRow,
} from "@/types/database.types";

export function SuperAdminDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [allLogs, setAllLogs] = React.useState<AuditLogRow[]>([]);
  const [recentLogs, setRecentLogs] = React.useState<AuditLogRow[]>([]);

  const [auditViewMode, setAuditViewMode] = React.useState<"daily" | "entity">("daily");
  const [auditChartType, setAuditChartType] = React.useState<
    "column" | "bar" | "line" | "area"
  >("column");
  const [compDataset, setCompDataset] = React.useState<"roles" | "coa">("roles");
  const [compChartType, setCompChartType] =
    React.useState<CompositionChartKind>("donut");

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [p, c, accs, logs] = await Promise.all([
          listProfiles(),
          getCompanyProfile(),
          listAccounts(),
          listAuditLogs(),
        ]);
        setProfiles(p);
        setCompany(c);
        setAccounts(accs);
        setAllLogs(logs);
        setRecentLogs(logs.slice(0, 8));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal memuat ringkasan sistem.",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat ringkasan sistem...</span>
      </div>
    );
  }

  const activeUsers = profiles.filter((u) => u.is_active).length;

  // Agregasi jejak audit harian & per entitas
  const auditDailyMap = new Map<
    string,
    { insert: number; update: number; delete: number }
  >();
  const auditEntityMap = new Map<
    string,
    { insert: number; update: number; delete: number }
  >();

  let totalInserts = 0;
  let totalUpdates = 0;
  let totalDeletes = 0;

  for (const log of allLogs) {
    const act = log.action.toUpperCase();
    const isIns = act === "INSERT";
    const isUpd = act === "UPDATE";
    const isDel = act === "DELETE";
    if (isIns) totalInserts += 1;
    else if (isUpd) totalUpdates += 1;
    else if (isDel) totalDeletes += 1;

    const dateKey = log.created_at.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      const cur = auditDailyMap.get(dateKey) ?? {
        insert: 0,
        update: 0,
        delete: 0,
      };
      if (isIns) cur.insert += 1;
      else if (isUpd) cur.update += 1;
      else if (isDel) cur.delete += 1;
      auditDailyMap.set(dateKey, cur);
    }

    const entName = log.entity_name || "lainnya";
    const entCur = auditEntityMap.get(entName) ?? {
      insert: 0,
      update: 0,
      delete: 0,
    };
    if (isIns) entCur.insert += 1;
    else if (isUpd) entCur.update += 1;
    else if (isDel) entCur.delete += 1;
    auditEntityMap.set(entName, entCur);
  }

  const auditDailyData = [...auditDailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([dateKey, val]) => {
      const [, m = "", d = ""] = dateKey.split("-");
      return {
        key: dateKey,
        label: `${d}/${m}`,
        values: val,
      };
    });

  const auditEntityData = [...auditEntityMap.entries()]
    .sort(
      ([, a], [, b]) =>
        b.insert + b.update + b.delete - (a.insert + a.update + a.delete),
    )
    .slice(0, 6)
    .map(([entity, val]) => ({
      key: entity,
      label: entity,
      values: val,
    }));

  // Komposisi peran pengguna & tipe bagan akun SAK
  let superAdminRoles = 0;
  let adminRoles = 0;
  let userRoles = 0;
  for (const p of profiles) {
    const roleList =
      Array.isArray(p.roles) && p.roles.length > 0 ? p.roles : [p.role];
    if (roleList.includes("super_admin")) superAdminRoles += 1;
    if (roleList.includes("admin")) adminRoles += 1;
    if (roleList.includes("user")) userRoles += 1;
  }

  const roleCompositionSlices = [
    {
      label: "Super Admin",
      value: superAdminRoles,
      color: "#0B43C8",
      dotClass: "bg-primary",
    },
    {
      label: "Bendahara",
      value: adminRoles,
      color: "#10b981",
      dotClass: "bg-emerald-500",
    },
    {
      label: "Anggota Tim",
      value: userRoles,
      color: "#0ea5e9",
      dotClass: "bg-sky-500",
    },
  ];

  const coaCompositionSlices = [
    {
      label: "Aset",
      value: accounts.filter((a) => a.account_type === "asset").length,
      color: "#0B43C8",
      dotClass: "bg-primary",
    },
    {
      label: "Liabilitas",
      value: accounts.filter((a) => a.account_type === "liability").length,
      color: "#f59e0b",
      dotClass: "bg-amber-500",
    },
    {
      label: "Ekuitas",
      value: accounts.filter((a) => a.account_type === "equity").length,
      color: "#8b5cf6",
      dotClass: "bg-violet-500",
    },
    {
      label: "Pendapatan",
      value: accounts.filter((a) => a.account_type === "revenue").length,
      color: "#10b981",
      dotClass: "bg-emerald-500",
    },
    {
      label: "Beban",
      value: accounts.filter((a) => a.account_type === "expense").length,
      color: "#f43f5e",
      dotClass: "bg-rose-500",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dasbor Pengelola Sistem
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Pantau kesehatan sistem, aktivitas pengguna internal, dan konfigurasi master aplikasi.
          </p>
        </div>
      </div>

      {/* 4 Kartu KPI Utama (Proper Case + Ikon Semantik) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Pengguna Internal
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {activeUsers}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / {profiles.length} Aktif
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Akses peran aktif dan terverifikasi
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
            <UsersIcon className="size-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Status Perpajakan
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
              {company?.pkp_enabled ? "PKP Aktif" : "Non-PKP"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {company?.pkp_enabled
                ? `Tarif PPN ${company.ppn_rate}% berlaku pada invoice`
                : "Faktur diterbitkan tanpa PPN"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldCheckIcon className="size-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Bagan Akun Keuangan
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {accounts.length} Akun
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Standar Akuntansi Keuangan SAK
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <BookOpenIcon className="size-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Jejak Audit Terbaru
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {allLogs.length} Log
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Rekaman audit aktivitas tersimpan
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <ActivityIcon className="size-5" />
          </div>
        </Card>
      </div>

      {/* Baris Grafik Visualisasi Sistem */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Grafik 1: Aktivitas Audit Sistem (Harian vs Entitas) */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden lg:col-span-2 flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle>Aktivitas Audit &amp; Perubahan Data</CardTitle>
              <CardDescription>
                {auditViewMode === "daily"
                  ? "Frekuensi operasi tambah, ubah, dan hapus data per hari."
                  : "Distribusi operasi audit berdasarkan entitas sistem teraktif."}
              </CardDescription>
            </div>
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setAuditViewMode("daily")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  auditViewMode === "daily"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Harian
              </button>
              <button
                type="button"
                onClick={() => setAuditViewMode("entity")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  auditViewMode === "entity"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Entitas
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between gap-5">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-emerald-500" />
                Tambah (Insert)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-primary" />
                Ubah (Update)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-rose-500" />
                Hapus (Delete)
              </span>
            </div>

            <MultiSeriesChart
              chartType={auditChartType}
              data={auditViewMode === "daily" ? auditDailyData : auditEntityData}
              series={[
                {
                  key: "insert",
                  label: "Tambah",
                  color: "#10b981",
                  textClass: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  key: "update",
                  label: "Ubah",
                  color: "#0B43C8",
                  textClass: "text-primary dark:text-sky-400",
                },
                {
                  key: "delete",
                  label: "Hapus",
                  color: "#f43f5e",
                  textClass: "text-rose-600 dark:text-rose-400",
                },
              ]}
              formatValue={(v) => `${v} Log`}
              formatShortValue={(v) => `${v}`}
              emptyTitle="Belum Ada Aktivitas Audit"
              emptySubtitle="Grafik tren audit otomatis muncul saat aktivitas pengguna dan perubahan data terekam."
            />

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <div>
                <p className="text-[11px] text-muted-foreground">Operasi Tambah</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                  {totalInserts} Log
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Operasi Ubah</p>
                <p className="text-xs sm:text-sm font-bold text-primary dark:text-sky-400 tabular-nums mt-0.5">
                  {totalUpdates} Log
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Operasi Hapus</p>
                <p className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                  {totalDeletes} Log
                </p>
              </div>
            </div>
          </CardContent>
          <ChartCardFooter>
            <ChartTypeSwitcher
              value={auditChartType}
              onChange={setAuditChartType}
              options={[
                { value: "column", label: "Column", icon: BarChart3Icon },
                { value: "bar", label: "Bar", icon: BarChartHorizontalIcon },
                { value: "line", label: "Line", icon: TrendingUpIcon },
                { value: "area", label: "Area", icon: ActivityIcon },
              ]}
            />
          </ChartCardFooter>
        </Card>

        {/* Grafik 2: Komposisi Peran Pengguna & Bagan Akun SAK */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <CardTitle>Komposisi Master Sistem</CardTitle>
              <CardDescription>
                {compDataset === "roles"
                  ? "Sebaran hak akses peran pengguna internal."
                  : "Struktur klasifikasi bagan akun SAK."}
              </CardDescription>
            </div>
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setCompDataset("roles")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  compDataset === "roles"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Peran
              </button>
              <button
                type="button"
                onClick={() => setCompDataset("coa")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45",
                  compDataset === "coa"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Bagan Akun
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between gap-5">
            <CompositionChart
              chartType={compChartType}
              slices={
                compDataset === "roles"
                  ? roleCompositionSlices
                  : coaCompositionSlices
              }
              centerLabel={
                compDataset === "roles" ? "Pengguna Aktif" : "Total Akun"
              }
              centerValue={
                compDataset === "roles"
                  ? `${activeUsers} Orang`
                  : `${accounts.length} Akun`
              }
              formatValue={(v) =>
                compDataset === "roles" ? `${v} Akun` : `${v} COA`
              }
              emptyTitle="Belum Ada Data Master"
              emptySubtitle="Proporsi akan muncul otomatis saat pengguna atau bagan akun tersedia."
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

      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              Jejak Audit Terbaru
            </CardTitle>
            <CardDescription>
              Setiap perubahan konfigurasi, master data, dan status periode tercatat otomatis.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/super-admin/audit-trail">
              Semua Audit
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Waktu</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Peran Pelaku</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Aksi</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Entitas</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">ID Rekaman</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0">
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                        <ActivityIcon className="size-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Belum Ada Jejak Audit
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Rekaman perubahan konfigurasi dan transaksi akan tampil otomatis di sini.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="pl-6 pr-3 whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatDateTimeID(log.created_at)}
                    </TableCell>
                    <TableCell className="px-3 text-center font-medium">
                      {log.actor_role ?? "sistem"}
                    </TableCell>
                    <TableCell className="px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge tone="info" label={log.action} />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 font-mono font-medium">
                      {log.entity_name}
                    </TableCell>
                    <TableCell className="pl-2 pr-6 font-mono text-muted-foreground truncate max-w-44">
                      {log.entity_id}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

