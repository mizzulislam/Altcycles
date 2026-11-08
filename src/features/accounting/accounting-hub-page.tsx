import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarRangeIcon,
  FileBarChart2Icon,
  FileSpreadsheetIcon,
  LandmarkIcon,
  ScaleIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import { formatRupiah } from "@/lib/formatters";
import { listAccounts, listProjects } from "@/lib/data-service";
import { listJournalsWithLines } from "@/lib/operations-service";
import { buildIncomeStatement, buildBalanceSheet } from "@/lib/accounting-engine";
import type { AccountRow, JournalRow, JournalLineRow, ProjectRow } from "@/types/database.types";

export function AccountingHubPage() {
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [journalData, setJournalData] = React.useState<{
    journals: JournalRow[];
    lines: JournalLineRow[];
  }>({ journals: [], lines: [] });

  React.useEffect(() => {
    async function loadData() {
      try {
        const [accList, projResult, jnlResult] = await Promise.all([
          listAccounts(),
          listProjects(),
          listJournalsWithLines(),
        ]);
        setAccounts(accList);
        setProjects(projResult.projects);
        setJournalData(jnlResult);
      } catch (err) {
        console.error("Gagal memuat ringkasan akuntansi:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const incomeStatement = React.useMemo(() => {
    return buildIncomeStatement(accounts, journalData.journals, journalData.lines);
  }, [accounts, journalData]);

  const balanceSheet = React.useMemo(() => {
    return buildBalanceSheet(accounts, journalData.journals, journalData.lines, projects);
  }, [accounts, journalData, projects]);

  const discrepancy = Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndEquity);

  const MODULES = [
    {
      title: "Laporan Keuangan SAK",
      description:
        "Laporan resmi Laba Rugi, Posisi Keuangan (Neraca), Arus Kas Langsung, Neraca Saldo, dan Buku Besar komprehensif berstandar SAK.",
      path: "/admin/akuntansi/laporan",
      icon: FileBarChart2Icon,
      badge: "5 Laporan",
      accent: "from-blue-600 to-indigo-600 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Jurnal Umum & Koreksi",
      description:
        "Pencatatan transaksi double-entry debit-kredit berimbang, entri penyesuaian, dan rekonsiliasi kas/bank.",
      path: "/admin/akuntansi/jurnal",
      icon: FileSpreadsheetIcon,
      badge: `${journalData.journals.length} Jurnal`,
      accent: "from-emerald-600 to-teal-600 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Periode & Tutup Buku",
      description:
        "Kontrol tahun buku aktif, penguncian mutasi transaksi bulanan/tahunan, dan jurnal penutup saldo nominal.",
      path: "/admin/akuntansi/periode",
      icon: CalendarRangeIcon,
      badge: "Kontrol Periode",
      accent: "from-amber-600 to-orange-600 text-amber-600 dark:text-amber-400",
    },
    {
      title: "Bagan Akun (COA SAK)",
      description:
        "Struktur 33 akun akuntansi terstandardisasi SAK: Aset, Liabilitas, Ekuitas, Pendapatan, HPP, Beban Operasional, dan Pajak.",
      path: "/admin/akuntansi/akun",
      icon: BookOpenIcon,
      badge: `${accounts.length} Akun`,
      accent: "from-purple-600 to-pink-600 text-purple-600 dark:text-purple-400",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman Pembungkus */}
      <div className="flex flex-col gap-1 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Pusat Pembukuan & Akuntansi SAK
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistem akuntansi berpasangan (*double-entry*) berbasis akrual, pembukuan jurnal, dan laporan keuangan komprehensif.
          </p>
        </div>
      </div>

      {/* Ringkasan Finansial Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Aset */}
        <Card className="rounded-2xl border border-border/60 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Aset (Aktiva)
            </CardTitle>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <LandmarkIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
              {formatRupiah(balanceSheet.totalAssets)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Aset lancar & aset tetap per saat ini
            </p>
          </CardContent>
        </Card>

        {/* Laba Bersih Berjalan */}
        <Card className="rounded-2xl border border-border/60 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Laba Bersih Berjalan
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUpIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${
                incomeStatement.netProfit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatRupiah(incomeStatement.netProfit)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pendapatan dikurangi HPP & beban usaha
            </p>
          </CardContent>
        </Card>

        {/* Liabilitas & Ekuitas */}
        <Card className="rounded-2xl border border-border/60 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Keseimbangan Neraca
            </CardTitle>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <ScaleIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
              {balanceSheet.isBalanced ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Seimbang (Balance)
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">
                  Selisih: {formatRupiah(discrepancy)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Aset = Kewajiban + Modal Ekuitas
            </p>
          </CardContent>
        </Card>

        {/* Jurnal Terbukukan */}
        <Card className="rounded-2xl border border-border/60 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Volume Transaksi
            </CardTitle>
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <WalletIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
              {journalData.journals.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                Jurnal
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {accounts.length} akun terdaftar dalam bagan COA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid Sub-Modul Navigasi Utama (Halaman Pembungkus) */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">
          Sub-Modul Pembukuan & Laporan
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.path}
                to={mod.path}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                      <Icon className="size-5 text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {mod.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {mod.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <span>Buka Modul</span>
                  <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
