import * as React from "react";
import {
  ListTodoIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { CardHeaderTitleWithInfo } from "@/components/shared/card-header-with-info";
import {
  getCompanyProfile,
  listAccounts,
  listPeriods,
} from "@/lib/data-service";
import { getLocalizedTransactionDescription } from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
import {
  deleteJournals,
  listJournalsWithLines,
} from "@/lib/operations-service";
import { useRealtimeSync } from "@/lib/realtime-cache";
import type {
  AccountRow,
  CompanyProfileRow,
  JournalLineRow,
  JournalRow,
  PeriodRow,
} from "@/types/database.types";
import { PeriodClosingDetailDialog } from "@/features/master-data/components/period-closing-detail-dialog";
import { PeriodClosingTable } from "@/features/master-data/components/period-closing-table";
import { PeriodManualClosingDialog } from "@/features/master-data/components/period-manual-closing-dialog";
import { PeriodReversingDialog } from "@/features/master-data/components/period-reversing-dialog";
import { PageHeader } from "@/components/shared/page-header";

export interface PeriodsPageProps {
  hideHeader?: boolean;
  periodFilter?: string;
  startDate?: string;
  endDate?: string;
  externalPeriodFilter?: string;
  externalStartDate?: string;
  externalEndDate?: string;
}

export function PeriodsPage({
  hideHeader,
  periodFilter,
  startDate,
  endDate,
  externalPeriodFilter: extPeriod,
  externalStartDate: extStart,
  externalEndDate: extEnd,
}: PeriodsPageProps) {
  const { t, language: lang } = useLanguage();
  const activePeriodFilter = extPeriod ?? periodFilter;
  const activeStartDate = extStart ?? startDate;
  const activeEndDate = extEnd ?? endDate;
  const [periods, setPeriods] = React.useState<PeriodRow[]>([]);
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Dialog state
  const [reverseOpen, setReverseOpen] = React.useState(false);

  // Closing journal table state
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedClosingIds, setSelectedClosingIds] = React.useState<string[]>([]);
  const [selectedDetailJournal, setSelectedDetailJournal] = React.useState<JournalRow | null>(null);
  const [editingClosingJournal, setEditingClosingJournal] = React.useState<JournalRow | null>(null);
  const [deleteTargetClosing, setDeleteTargetClosing] = React.useState<JournalRow | null>(null);
  const [isBatchDeleteClosingOpen, setIsBatchDeleteClosingOpen] = React.useState(false);
  const [manualClosingOpen, setManualClosingOpen] = React.useState(false);

  const reload = React.useCallback(async () => {
    try {
      const [pData, jData, aData, cData] = await Promise.all([
        listPeriods(),
        listJournalsWithLines(),
        listAccounts(),
        getCompanyProfile(),
      ]);
      setPeriods(pData);
      setJournals(jData.journals);
      setLines(jData.lines);
      setAccounts(aData);
      setCompany(cData);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("accounting:closing.loading", "Gagal memuat data periode."),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeSync(reload);

  const postableAccounts = React.useMemo(
    () => accounts.filter((a) => a.is_postable && a.is_active),
    [accounts],
  );

  const accountMap = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const linesByJournal = React.useMemo(() => {
    const map = new Map<string, JournalLineRow[]>();
    for (const line of lines) {
      const arr = map.get(line.journal_id) ?? [];
      arr.push(line);
      map.set(line.journal_id, arr);
    }
    return map;
  }, [lines]);

  // Jurnal penutup yang tersimpan di sistem
  const closingJournals = React.useMemo(() => {
    let filtered = journals.filter((j) => j.journal_type === "closing");
    if (activePeriodFilter && activePeriodFilter !== "all" && activePeriodFilter !== "ALL") {
      filtered = filtered.filter((j) => j.period_id === activePeriodFilter);
    }
    if (activeStartDate && activeEndDate) {
      filtered = filtered.filter(
        (j) => j.journal_date >= activeStartDate && j.journal_date <= activeEndDate,
      );
    }
    return filtered.sort((a, b) => {
      const cmp = a.journal_date.localeCompare(b.journal_date);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [journals, activePeriodFilter, activeStartDate, activeEndDate, sortOrder]);

  function openNewManualClosing() {
    setEditingClosingJournal(null);
    setManualClosingOpen(true);
  }

  function openEditClosingJournal(j: JournalRow) {
    if (company?.journal_lock_enabled) {
      toast.error(
        t("accounting:closing.toast_lock_active", "Kunci jurnal sedang aktif. Buka kunci terlebih dahulu di portal Super Admin."),
      );
      return;
    }
    setEditingClosingJournal(j);
    setManualClosingOpen(true);
  }

  async function handleDeleteClosingEntries() {
    if (selectedClosingIds.length === 0) return;
    if (company?.journal_lock_enabled) {
      toast.error(
        t("accounting:closing.toast_lock_active", "Kunci jurnal sedang aktif. Buka kunci terlebih dahulu di portal Super Admin."),
      );
      return;
    }
    try {
      await deleteJournals(selectedClosingIds);
      toast.success(
        t("accounting:closing.toast_batch_deleted", {
          count: selectedClosingIds.length,
          defaultValue: `${selectedClosingIds.length} entri jurnal penutup berhasil dihapus.`,
        }),
      );
      setSelectedClosingIds([]);
      setIsBatchDeleteClosingOpen(false);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:closing.toast_delete_error", "Gagal menghapus entri jurnal penutup."),
      );
    }
  }

  async function handleDeleteSingleClosing(journal: JournalRow) {
    if (company?.journal_lock_enabled) {
      toast.error(
        t("accounting:closing.toast_lock_active", "Kunci jurnal sedang aktif. Buka kunci terlebih dahulu di portal Super Admin."),
      );
      return;
    }
    try {
      await deleteJournals([journal.id]);
      toast.success(
        t("accounting:closing.toast_single_deleted", {
          number: journal.journal_number,
          defaultValue: `Jurnal penutup ${journal.journal_number} berhasil dihapus.`,
        }),
      );
      setSelectedClosingIds((prev) => prev.filter((id) => id !== journal.id));
      setDeleteTargetClosing(null);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:closing.toast_delete_error", "Gagal menghapus jurnal penutup."),
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman Tab Tutup Buku */}
      {!hideHeader ? (
        <PageHeader
          title={t("accounting:closing.page_title", "Tutup Buku & Periode Akuntansi")}
          description={t(
            "accounting:closing.page_subtitle",
            "Daftar jurnal penutup aktual yang tersimpan di sistem serta kelola periode pembukuan.",
          )}
        />
      ) : null}

      {/* 1. Alur & Langkah Jurnal Penutup (GAAP/IFRS) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <ListTodoIcon className="size-4 text-primary dark:text-cyan-400 shrink-0" />
          <CardHeaderTitleWithInfo
            title={t("accounting:closing.flow_title", "Alur & Langkah Jurnal Penutup (GAAP/IFRS)")}
            description={t("accounting:closing.flow_subtitle", "Panduan 4 tahap penutupan saldo akun nominal di akhir periode akuntansi.")}
            titleClassName="text-sm font-bold text-foreground"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-3.5 flex flex-col gap-2 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary dark:text-cyan-400 font-mono text-xs font-bold border border-primary/20">
                01
              </span>
              <span className="text-xs font-bold text-foreground">
                {t("accounting:closing.step1_title", "Tutup Pendapatan")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("accounting:closing.step1_desc", "Mendebit semua akun Pendapatan (Revenues) dan mengkredit Ikhtisar Laba Rugi (3500) sebesar total pendapatan.")}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-3.5 flex flex-col gap-2 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary dark:text-cyan-400 font-mono text-xs font-bold border border-primary/20">
                02
              </span>
              <span className="text-xs font-bold text-foreground">
                {t("accounting:closing.step2_title", "Tutup Beban")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("accounting:closing.step2_desc", "Mendebit Ikhtisar Laba Rugi (3500) dan mengkredit semua akun Beban (Expenses) sebesar total beban masing-masing.")}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-3.5 flex flex-col gap-2 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary dark:text-cyan-400 font-mono text-xs font-bold border border-primary/20">
                03
              </span>
              <span className="text-xs font-bold text-foreground">
                {t("accounting:closing.step3_title", "Ikhtisar ke Laba Ditahan")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("accounting:closing.step3_desc", "Menutup saldo bersih Ikhtisar Laba Rugi ke Laba Ditahan (3201) (laba: debit Ikhtisar & kredit Laba Ditahan; rugi: sebaliknya).")}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-3.5 flex flex-col gap-2 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary dark:text-cyan-400 font-mono text-xs font-bold border border-primary/20">
                04
              </span>
              <span className="text-xs font-bold text-foreground">
                {t("accounting:closing.step4_title", "Tutup Prive Pemilik")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("accounting:closing.step4_desc", "Mendebit Laba Ditahan (3201) dan mengkredit akun Prive Pemilik (3301) untuk menihilkan penarikan modal.")}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Banner Status Tutup Buku Otomatis */}
      {company?.auto_closing_enabled ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-card p-4 sm:px-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <CardHeaderTitleWithInfo
              title={t("accounting:closing.auto_banner_on_title", "Tutup Buku Otomatis Diaktifkan")}
              description={t("accounting:closing.auto_banner_on_desc", "Sistem dikonfigurasi untuk memposting jurnal penutup otomatis berbasis GAAP/IFRS secara terintegrasi saat periode ditutup. Anda tetap dapat mencatat penyesuaian penutup manual di bawah.")}
              titleClassName="text-sm font-bold text-foreground"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:px-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <CardHeaderTitleWithInfo
              title={t("accounting:closing.auto_banner_off_title", "Tutup Buku Otomatis Dinonaktifkan")}
              description={t("accounting:closing.auto_banner_off_desc", "Tutup buku otomatis saat ini dinonaktifkan di Pengaturan Super Admin.")}
              titleClassName="text-sm font-bold text-foreground"
            />
          </div>
        </div>
      )}

      {/* 3. Card Tabel Jurnal Penutup */}
      <PeriodClosingTable
        closingJournals={closingJournals}
        linesByJournal={linesByJournal}
        accountMap={accountMap}
        loading={loading}
        sortOrder={sortOrder}
        onToggleSortOrder={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        selectedClosingIds={selectedClosingIds}
        setSelectedClosingIds={setSelectedClosingIds}
        onOpenManualClosing={openNewManualClosing}
        onEditClosingJournal={openEditClosingJournal}
        onViewDetailJournal={setSelectedDetailJournal}
        onDeleteSingleClosing={setDeleteTargetClosing}
        onOpenBatchDelete={() => setIsBatchDeleteClosingOpen(true)}
        onOpenReversing={() => setReverseOpen(true)}
      />

      {/* Modal Jurnal Pembalik Opsional */}
      <PeriodReversingDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        periods={periods}
        onSuccess={reload}
      />

      {/* Modal Catat / Edit Jurnal Penutup Manual */}
      <PeriodManualClosingDialog
        open={manualClosingOpen}
        onOpenChange={setManualClosingOpen}
        editingJournal={editingClosingJournal}
        postableAccounts={postableAccounts}
        linesByJournal={linesByJournal}
        defaultDate={activeEndDate || new Date().toISOString().slice(0, 10)}
        onSuccess={reload}
      />

      {/* Modal Detail Rincian Jurnal Penutup */}
      <PeriodClosingDetailDialog
        journal={selectedDetailJournal}
        onClose={() => setSelectedDetailJournal(null)}
        accounts={accounts}
        linesByJournal={linesByJournal}
      />

      {/* Dialog Konfirmasi Hapus 1 Jurnal Penutup */}
      <ConfirmActionDialog
        open={Boolean(deleteTargetClosing)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetClosing(null);
        }}
        title={t("accounting:closing.delete_single_title", {
          number: deleteTargetClosing?.journal_number ?? "",
          defaultValue: `Hapus Jurnal Penutup: ${deleteTargetClosing?.journal_number ?? ""}`,
        })}
        description={t("accounting:closing.delete_single_desc", {
          desc: getLocalizedTransactionDescription(deleteTargetClosing?.description ?? "", lang),
          defaultValue: `Apakah Anda yakin ingin menghapus jurnal penutup "${deleteTargetClosing?.description ?? ""}"?`,
        })}
        confirmLabel={t("accounting:closing.delete_single_confirm", "Ya, Hapus Jurnal")}
        destructive
        onConfirm={() =>
          deleteTargetClosing
            ? handleDeleteSingleClosing(deleteTargetClosing)
            : Promise.resolve()
        }
      />

      {/* Dialog Konfirmasi Hapus Batch Jurnal Penutup */}
      <ConfirmActionDialog
        open={isBatchDeleteClosingOpen}
        onOpenChange={setIsBatchDeleteClosingOpen}
        title={t("accounting:closing.delete_batch_title", {
          count: selectedClosingIds.length,
          defaultValue: `Hapus ${selectedClosingIds.length} Jurnal Penutup Pilihan`,
        })}
        description={t("accounting:closing.delete_batch_desc", {
          count: selectedClosingIds.length,
          defaultValue: `Apakah Anda yakin ingin menghapus ${selectedClosingIds.length} entri jurnal penutup yang dipilih secara permanen?`,
        })}
        confirmLabel={t("accounting:closing.delete_batch_confirm", {
          count: selectedClosingIds.length,
          defaultValue: `Ya, Hapus (${selectedClosingIds.length})`,
        })}
        destructive
        onConfirm={handleDeleteClosingEntries}
      />
    </div>
  );
}

export default PeriodsPage;
