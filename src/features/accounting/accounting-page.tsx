import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArchiveIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  FileBarChart2Icon,
  FolderTreeIcon,
  RotateCcwIcon,
  ScaleIcon,
  ScrollTextIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { JournalsPage, JOURNAL_TYPE_LABELS } from "@/features/accounting/journals-page";
import { AccountingReportsPage } from "@/features/accounting/reports-page";
import { PeriodsPage } from "@/features/master-data/periods-page";
import { CoaAccountsPage } from "@/features/master-data/coa-accounts-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { listPeriods, listProjects } from "@/lib/data-service";
import { formatDateID } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { PeriodRow, ProjectRow } from "@/types/database.types";

export type AccountingTabId =
  | "jurnal"
  | "buku_besar"
  | "neraca_saldo"
  | "penyesuaian"
  | "laporan"
  | "tutup_buku"
  | "coa";

interface AccountingTabDef {
  id: AccountingTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const ACCOUNTING_TABS: AccountingTabDef[] = [
  {
    id: "jurnal",
    label: "Jurnal Umum",
    icon: BookOpenIcon,
    description: "Catatan transaksi kronologis, entri jurnal baru & ekspor",
  },
  {
    id: "buku_besar",
    label: "Buku Besar",
    icon: ScrollTextIcon,
    description: "Mutasi debit-kredit dan saldo berjalan per akun COA SAK",
  },
  {
    id: "neraca_saldo",
    label: "Neraca Saldo",
    icon: ScaleIcon,
    description: "Verifikasi keseimbangan total debit vs kredit (balancing check)",
  },
  {
    id: "penyesuaian",
    label: "Jurnal Penyesuaian",
    icon: SlidersHorizontalIcon,
    description: "Penyesuaian akrual, penyusutan aset & jurnal koreksi ber-audit trail",
  },
  {
    id: "laporan",
    label: "Laporan Keuangan",
    icon: FileBarChart2Icon,
    description: "Laporan Laba Rugi, Posisi Keuangan (Neraca) & Arus Kas Langsung",
  },
  {
    id: "tutup_buku",
    label: "Tutup Buku",
    icon: ArchiveIcon,
    description: "Kunci periode buku, jurnal penutup otomatis & jurnal pembalik",
  },
  {
    id: "coa",
    label: "Bagan Akun (CoA)",
    icon: FolderTreeIcon,
    description: "Daftar bagan akun standar SAK (Chart of Accounts)",
  },
];

export type PeriodPreset = "all" | "this_month" | "last_month" | "this_year" | "custom";

interface ActivePeriodFilter {
  preset: PeriodPreset;
  startDate?: string;
  endDate?: string;
  selectedPeriodId?: string;
  label: string;
}

function calculatePresetDates(preset: PeriodPreset): { startDate?: string; endDate?: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  if (preset === "this_month") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const monthName = start.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return { startDate: startStr, endDate: endStr, label: monthName };
  }

  if (preset === "last_month") {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const monthName = start.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return { startDate: startStr, endDate: endStr, label: monthName };
  }

  if (preset === "this_year") {
    const startStr = `${year}-01-01`;
    const endStr = `${year}-12-31`;
    return { startDate: startStr, endDate: endStr, label: `Tahun ${year}` };
  }

  return { label: "Semua Periode" };
}

export function AccountingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as AccountingTabId | null;

  // Filter Periode, Proyek, & Jenis Jurnal Terpadu (Modal Dialog)
  const [isFilterModalOpen, setIsFilterModalOpen] = React.useState(false);
  const [dbPeriods, setDbPeriods] = React.useState<PeriodRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [periodFilter, setPeriodFilter] = React.useState<ActivePeriodFilter>({
    preset: "all",
    label: "Semua Periode",
  });
  const [customStartDate, setCustomStartDate] = React.useState("");
  const [customEndDate, setCustomEndDate] = React.useState("");
  const [projectFilter, setProjectFilter] = React.useState("ALL");
  const [typeFilter, setTypeFilter] = React.useState("ALL");

  React.useEffect(() => {
    Promise.all([listPeriods(), listProjects()])
      .then(([pers, prjRes]) => {
        setDbPeriods(pers);
        setProjects(prjRes.projects);
      })
      .catch(() => {});
  }, []);

  // Normalisasi alias tab lama jika ada
  const normalizedTab = React.useMemo<AccountingTabId>(() => {
    if (!rawTab) return "jurnal";
    if (rawTab === ("journal" as unknown)) return "jurnal";
    if (rawTab === ("ledger" as unknown)) return "buku_besar";
    if (rawTab === ("trial_balance" as unknown)) return "neraca_saldo";
    if (rawTab === ("adjusting" as unknown)) return "penyesuaian";
    if (rawTab === ("statements" as unknown)) return "laporan";
    if (rawTab === ("closing" as unknown)) return "tutup_buku";
    if (rawTab === ("coa" as unknown) || rawTab === ("accounts" as unknown)) return "coa";
    const found = ACCOUNTING_TABS.find((t) => t.id === rawTab);
    return found ? found.id : "jurnal";
  }, [rawTab]);

  const handleTabChange = (id: AccountingTabId) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  const applyPresetPeriod = (preset: PeriodPreset) => {
    const dates = calculatePresetDates(preset);
    setPeriodFilter({
      preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
      selectedPeriodId: undefined,
      label: dates.label,
    });
  };

  const applyDbPeriod = (p: PeriodRow) => {
    setPeriodFilter({
      preset: "custom",
      startDate: p.start_date,
      endDate: p.end_date,
      selectedPeriodId: p.id,
      label: p.name,
    });
  };

  const applyCustomPeriod = () => {
    if (!customStartDate || !customEndDate) {
      applyPresetPeriod("all");
      return;
    }
    setPeriodFilter({
      preset: "custom",
      startDate: customStartDate,
      endDate: customEndDate,
      selectedPeriodId: undefined,
      label: `${formatDateID(customStartDate)} - ${formatDateID(customEndDate)}`,
    });
  };

  const handleResetFilters = () => {
    applyPresetPeriod("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setProjectFilter("ALL");
    setTypeFilter("ALL");
  };

  const activeExtraFiltersCount =
    (projectFilter !== "ALL" ? 1 : 0) + (typeFilter !== "ALL" ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman Utama Siklus Akuntansi */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 min-w-0 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Siklus Akuntansi &amp; Laporan Keuangan SAK
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Kelola seluruh tahapan siklus akuntansi dan pembukuan keuangan berstandar SAK secara terpadu.
          </p>
        </div>
      </div>

      {/* Navigasi Tab Siklus Akuntansi & Button Filter */}
      <div className="bg-card rounded-2xl p-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-2xs border border-border/80 w-full">
        {/* Horizontal Scrollable Tabs */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {ACCOUNTING_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = normalizedTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
                title={tab.description}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Button Terpadu (Menampung Periode, Proyek, & Jenis Jurnal) */}
        <div className="shrink-0 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={cn(
              "w-full lg:w-auto inline-flex items-center justify-between lg:justify-start gap-2.5 rounded-xl border border-border/80 bg-background/90 dark:bg-card px-3.5 py-2 text-xs sm:text-sm font-semibold text-foreground transition-all duration-200 cursor-pointer shadow-2xs select-none",
              "hover:bg-muted/70 hover:border-primary/50",
              (periodFilter.preset !== "all" || projectFilter !== "ALL" || typeFilter !== "ALL") &&
                "border-primary/70 bg-primary/10 text-primary dark:text-cyan-400",
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-cyan-400">
                <CalendarDaysIcon className="size-3.5" />
              </span>
              <span className="text-muted-foreground text-xs font-normal">Filter:</span>
              <span className="font-semibold text-foreground truncate">{periodFilter.label}</span>
              {activeExtraFiltersCount > 0 && (
                <span className="rounded-full bg-primary/15 text-primary dark:text-cyan-400 px-1.5 py-0.5 text-[10px] font-bold">
                  +{activeExtraFiltersCount}
                </span>
              )}
            </div>
            <SlidersHorizontalIcon className="size-3.5 text-muted-foreground shrink-0 ml-1" />
          </button>

          {/* Modal Dialog Filter Terpadu (Lebar max-w-3xl lega seperti Modal Catat Transaksi) */}
          <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Saring Data Akuntansi &amp; Periode</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 pt-1 pb-1">
                {/* 1. Preset Waktu Cepat */}
                <div className="space-y-2.5">
                  <label className="text-xs sm:text-sm font-semibold text-foreground block">
                    Preset Waktu Cepat
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { label: "Semua Periode", value: "all" },
                      { label: "Bulan Ini", value: "this_month" },
                      { label: "Bulan Lalu", value: "last_month" },
                      { label: "Tahun Ini", value: "this_year" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => applyPresetPeriod(item.value as PeriodPreset)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center shadow-2xs",
                          periodFilter.preset === item.value && !periodFilter.selectedPeriodId
                            ? "border-primary bg-primary/15 text-primary shadow-xs dark:text-cyan-400 ring-1 ring-primary/30"
                            : "border-border/70 text-foreground hover:bg-muted/70 hover:border-border",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Kustom Rentang Tanggal (Lega 2 Kolom, Kalender Dropdown Proporsional seperti Modal Catat Transaksi) */}
                <div className="space-y-4 rounded-2xl border border-border/80 bg-card/60 p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-semibold text-foreground">
                      Kustom Rentang Tanggal
                    </label>
                    {(customStartDate || customEndDate) && (
                      <span className="text-xs font-semibold text-primary dark:text-cyan-400 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                        {customStartDate ? formatDateID(customStartDate) : "Awal"} &minus;{" "}
                        {customEndDate ? formatDateID(customEndDate) : "Akhir"}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground block">
                        Dari Tanggal (Mulai)
                      </span>
                      <DatePicker
                        value={customStartDate}
                        onChange={setCustomStartDate}
                        placeholder="Pilih tanggal mulai..."
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground block">
                        Sampai Tanggal (Selesai)
                      </span>
                      <DatePicker
                        value={customEndDate}
                        onChange={setCustomEndDate}
                        placeholder="Pilih tanggal selesai..."
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyCustomPeriod}
                    className="w-full h-9.5 text-xs sm:text-sm font-semibold cursor-pointer border-primary/30 text-primary dark:text-cyan-400 hover:bg-primary/10 rounded-xl"
                  >
                    Terapkan Rentang Kustom
                  </Button>
                </div>

                {/* 3. Filter Proyek & Jenis Jurnal (2 Kolom Sejajar Proporsional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-foreground block">
                      Entitas / Proyek
                    </label>
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="ALL">Semua Proyek (Seluruh Entitas Altvira)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code}: {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(normalizedTab === "jurnal" || normalizedTab === "penyesuaian") ? (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-semibold text-foreground block">
                        Jenis Jurnal
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
                      >
                        <option value="ALL">Semua Jenis Jurnal</option>
                        {Object.entries(JOURNAL_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-semibold text-foreground block">
                        Status Filter
                      </label>
                      <div className="h-10 rounded-xl border border-border/60 bg-muted/30 px-3 flex items-center text-xs sm:text-sm text-muted-foreground">
                        Aktif: {periodFilter.label}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Periode Buku Resmi (Jika Ada) */}
                {dbPeriods.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/70">
                    <label className="text-xs sm:text-sm font-semibold text-foreground block">
                      Periode Buku Resmi
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto pr-1">
                      {dbPeriods.map((p) => {
                        const isSelected = periodFilter.selectedPeriodId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyDbPeriod(p)}
                            className={cn(
                              "flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition-all cursor-pointer text-left shadow-2xs",
                              isSelected
                                ? "border-primary bg-primary/15 text-primary font-bold dark:text-cyan-400 ring-1 ring-primary/30"
                                : "border-border/70 text-foreground hover:bg-muted/60",
                            )}
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              {p.status === "open" ? "Aktif" : "Tutup"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t border-border/80 flex flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9.5 px-3.5 rounded-xl text-xs sm:text-sm cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                >
                  <RotateCcwIcon className="size-3.5 mr-1.5" />
                  Reset Filter
                </Button>
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFilterModalOpen(false)}
                    className="h-9.5 px-4 rounded-xl text-xs sm:text-sm cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsFilterModalOpen(false)}
                    className="h-9.5 px-4 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
                  >
                    Terapkan Filter
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Render Komponen Sesuai Siklus Aktif */}
      <div className="w-full">
        {normalizedTab === "jurnal" && (
          <JournalsPage
            hideHeader
            filterMode="all"
            externalPeriodFilter={periodFilter.selectedPeriodId || periodFilter.preset}
            externalStartDate={periodFilter.startDate}
            externalEndDate={periodFilter.endDate}
            externalProjectFilter={projectFilter}
            externalTypeFilter={typeFilter}
          />
        )}
        {normalizedTab === "buku_besar" && (
          <AccountingReportsPage
            hideHeader
            mode="ledger"
            externalStartDate={periodFilter.startDate}
            externalEndDate={periodFilter.endDate}
            externalProjectFilter={projectFilter}
          />
        )}
        {normalizedTab === "neraca_saldo" && (
          <AccountingReportsPage
            hideHeader
            mode="trial_balance"
            externalStartDate={periodFilter.startDate}
            externalEndDate={periodFilter.endDate}
            externalProjectFilter={projectFilter}
          />
        )}
        {normalizedTab === "penyesuaian" && (
          <JournalsPage
            hideHeader
            filterMode="adjusting"
            externalPeriodFilter={periodFilter.selectedPeriodId || periodFilter.preset}
            externalStartDate={periodFilter.startDate}
            externalEndDate={periodFilter.endDate}
            externalProjectFilter={projectFilter}
            externalTypeFilter={typeFilter}
          />
        )}
        {normalizedTab === "laporan" && (
          <AccountingReportsPage
            hideHeader
            mode="statements"
            externalStartDate={periodFilter.startDate}
            externalEndDate={periodFilter.endDate}
            externalProjectFilter={projectFilter}
          />
        )}
        {normalizedTab === "tutup_buku" && (
          <PeriodsPage
            hideHeader
            externalPeriodFilter={periodFilter.selectedPeriodId || periodFilter.preset}
            externalStartDate={periodFilter.startDate}
            externalEndDate={periodFilter.endDate}
          />
        )}
        {normalizedTab === "coa" && (
          <CoaAccountsPage hideHeader />
        )}
      </div>
    </div>
  );
}
