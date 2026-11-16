import * as React from "react";
import {
  ListTodoIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  deletePeriod,
  getCompanyProfile,
  listAccounts,
  listPeriods,
  reopenPeriod,
} from "@/lib/data-service";
import {
  deleteJournals,
  listJournalsWithLines,
  runPeriodClosingBook,
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
import { PeriodCreateDialog } from "@/features/master-data/components/period-create-dialog";
import { PeriodListTable } from "@/features/master-data/components/period-list-table";
import { PeriodManualClosingDialog } from "@/features/master-data/components/period-manual-closing-dialog";
import { PeriodReversingDialog } from "@/features/master-data/components/period-reversing-dialog";

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
  const [createOpen, setCreateOpen] = React.useState(false);
  const [closeTarget, setCloseTarget] = React.useState<PeriodRow | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<PeriodRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PeriodRow | null>(null);
  const [reverseOpen, setReverseOpen] = React.useState(false);

  // Closing journal table state
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
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
        err instanceof Error ? err.message : "Gagal memuat data periode.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
        "Kunci jurnal sedang aktif. Buka kunci terlebih dahulu di portal Super Admin.",
      );
      return;
    }
    setEditingClosingJournal(j);
    setManualClosingOpen(true);
  }

  async function handleConfirmClosePeriod() {
    if (!closeTarget) return;
    try {
      await runPeriodClosingBook(closeTarget.id);
      toast.success(
        company?.auto_closing_enabled
          ? `Periode ${closeTarget.name} berhasil ditutup dan jurnal penutup otomatis berhasil diposting.`
          : `Periode ${closeTarget.name} berhasil ditutup.`,
      );
      setCloseTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menutup periode.");
    }
  }

  async function handleConfirmReopenPeriod(reason?: string) {
    if (!reopenTarget || !reason) return;
    try {
      await reopenPeriod(reopenTarget.id, reason);
      toast.success(`Periode ${reopenTarget.name} berhasil dibuka kembali.`);
      setReopenTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka kembali periode.");
    }
  }

  async function handleConfirmDeletePeriod() {
    if (!deleteTarget) return;
    try {
      await deletePeriod(deleteTarget.id);
      toast.success(`Periode ${deleteTarget.name} berhasil dihapus.`);
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus periode.");
    }
  }

  async function handleDeleteClosingEntries() {
    if (selectedClosingIds.length === 0) return;
    if (company?.journal_lock_enabled) {
      toast.error("Kunci jurnal sedang aktif. Buka kunci terlebih dahulu di portal Super Admin.");
      return;
    }
    try {
      await deleteJournals(selectedClosingIds);
      toast.success(`${selectedClosingIds.length} entri jurnal penutup berhasil dihapus.`);
      setSelectedClosingIds([]);
      setIsBatchDeleteClosingOpen(false);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus entri jurnal penutup.");
    }
  }

  async function handleDeleteSingleClosing(journal: JournalRow) {
    if (company?.journal_lock_enabled) {
      toast.error("Kunci jurnal sedang aktif. Buka kunci terlebih dahulu di portal Super Admin.");
      return;
    }
    try {
      await deleteJournals([journal.id]);
      toast.success(`Jurnal penutup ${journal.journal_number} berhasil dihapus.`);
      setSelectedClosingIds((prev) => prev.filter((id) => id !== journal.id));
      setDeleteTargetClosing(null);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus jurnal penutup.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman Tab Tutup Buku */}
      {!hideHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 min-w-0 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Tutup Buku &amp; Periode Akuntansi
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              Daftar jurnal penutup aktual yang tersimpan di sistem serta kelola periode pembukuan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReverseOpen(true)}
              className="shrink-0 cursor-pointer"
            >
              <RotateCcwIcon className="size-4" />
              Jurnal Pembalik Opsional
            </Button>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="shrink-0 cursor-pointer shadow-xs"
            >
              <PlusIcon className="size-4" />
              Buka Periode Baru
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Tutup Buku (Closing the Books)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              Daftar jurnal penutup aktual yang tersimpan di sistem serta kontrol periode pembukuan.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReverseOpen(true)}
              className="h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer shadow-xs gap-1.5"
            >
              <RotateCcwIcon className="size-3.5" />
              <span>Jurnal Pembalik Opsional</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer shadow-xs gap-1.5"
            >
              <PlusIcon className="size-4" />
              <span>Buka Periode Baru</span>
            </Button>
          </div>
        </div>
      )}

      {/* 1. Alur & Langkah Jurnal Penutup (GAAP/IFRS) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-cyan-400 border border-primary/20">
              <ListTodoIcon className="size-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Alur &amp; Langkah Jurnal Penutup (GAAP/IFRS)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Panduan 4 tahap penutupan saldo akun nominal di akhir periode akuntansi.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[11px] font-semibold text-primary dark:text-cyan-400 shrink-0">
            4 Tahap Siklus Akhir
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-3.5 flex flex-col gap-2 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary dark:text-cyan-400 font-mono text-xs font-bold border border-primary/20">
                01
              </span>
              <span className="text-xs font-bold text-foreground">
                Tutup Pendapatan
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mendebit semua akun <span className="font-medium text-foreground">Pendapatan (Revenues)</span> dan mengkredit{" "}
              <span className="font-medium text-foreground">Ikhtisar Laba Rugi (3500)</span> sebesar total pendapatan.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-3.5 flex flex-col gap-2 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary dark:text-cyan-400 font-mono text-xs font-bold border border-primary/20">
                02
              </span>
              <span className="text-xs font-bold text-foreground">
                Tutup Beban
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mendebit <span className="font-medium text-foreground">Ikhtisar Laba Rugi (3500)</span> dan mengkredit semua akun{" "}
              <span className="font-medium text-foreground">Beban (Expenses)</span> sebesar total beban masing-masing.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-3.5 flex flex-col gap-2 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary dark:text-cyan-400 font-mono text-xs font-bold border border-primary/20">
                03
              </span>
              <span className="text-xs font-bold text-foreground">
                Ikhtisar ke Laba Ditahan
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Menutup saldo bersih Ikhtisar Laba Rugi ke <span className="font-medium text-foreground">Laba Ditahan (3201)</span>{" "}
              (laba: debit Ikhtisar &amp; kredit Laba Ditahan; rugi: sebaliknya).
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] p-3.5 flex flex-col gap-2 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary dark:text-cyan-400 font-mono text-xs font-bold border border-primary/20">
                04
              </span>
              <span className="text-xs font-bold text-foreground">
                Tutup Prive Pemilik
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mendebit <span className="font-medium text-foreground">Laba Ditahan (3201)</span> dan mengkredit akun{" "}
              <span className="font-medium text-foreground">Prive Pemilik (3301)</span> untuk menihilkan penarikan modal.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Banner Status Tutup Buku Otomatis */}
      {company?.auto_closing_enabled ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-card p-4 sm:px-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheckIcon className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Tutup Buku Otomatis Diaktifkan
              </h4>
              <p className="text-xs mt-0.5 text-muted-foreground leading-relaxed">
                Sistem dikonfigurasi untuk memposting jurnal penutup otomatis berbasis GAAP/IFRS secara terintegrasi saat periode ditutup. Anda tetap dapat mencatat penyesuaian penutup manual di bawah.
              </p>
            </div>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <StatusBadge tone="success" label="Mode Otomatis" />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:px-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldAlertIcon className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Tutup Buku Otomatis Dinonaktifkan
              </h4>
              <p className="text-xs mt-0.5 text-muted-foreground leading-relaxed">
                Tutup buku otomatis saat ini dinonaktifkan di Pengaturan Super Admin.
              </p>
            </div>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <StatusBadge tone="warning" label="Mode Manual" />
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
      />

      {/* 4. Card Daftar Periode Bulanan */}
      <PeriodListTable
        periods={periods}
        loading={loading}
        onClosePeriod={setCloseTarget}
        onReopenPeriod={setReopenTarget}
        onDeletePeriod={setDeleteTarget}
      />

      {/* Modal Buka Periode Baru */}
      <PeriodCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={reload}
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

      {/* Dialog Konfirmasi Tutup Periode */}
      <ConfirmActionDialog
        open={Boolean(closeTarget)}
        onOpenChange={(open) => {
          if (!open) setCloseTarget(null);
        }}
        title={`Konfirmasi Tutup Periode: ${closeTarget?.name ?? ""}`}
        description={
          company?.auto_closing_enabled
            ? `Apakah Anda yakin ingin menutup periode pembukuan ${closeTarget?.name}? Karena Tutup Buku Otomatis aktif, sistem akan menghitung saldo nominal dan memposting 4 langkah jurnal penutup GAAP/IFRS secara otomatis.`
            : `Apakah Anda yakin ingin menutup periode pembukuan ${closeTarget?.name}? Tindakan ini akan mengunci pencatatan transaksi pada periode terkait.`
        }
        confirmLabel="Ya, Tutup Buku & Periode"
        onConfirm={handleConfirmClosePeriod}
      />

      {/* Dialog Konfirmasi Buka Kembali Periode */}
      <ConfirmActionDialog
        open={Boolean(reopenTarget)}
        onOpenChange={(open) => {
          if (!open) setReopenTarget(null);
        }}
        title={`Buka Kembali Periode: ${reopenTarget?.name ?? ""}`}
        description={`Masukkan alasan pembukaan kembali periode ${reopenTarget?.name}. Tindakan ini akan dicatat dalam jejak audit kepatuhan.`}
        confirmLabel="Buka Kembali Periode"
        requireReason
        reasonPlaceholder="Contoh: Perbaikan jurnal penyesuaian..."
        onConfirm={handleConfirmReopenPeriod}
      />

      {/* Dialog Konfirmasi Hapus Periode */}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus Periode: ${deleteTarget?.name ?? ""}`}
        description={`Apakah Anda yakin ingin menghapus periode "${deleteTarget?.name}"? Periode yang sudah memiliki transaksi jurnal pembukuan tidak dapat dihapus.`}
        confirmLabel="Ya, Hapus Periode"
        destructive
        onConfirm={handleConfirmDeletePeriod}
      />

      {/* Dialog Konfirmasi Hapus 1 Jurnal Penutup */}
      <ConfirmActionDialog
        open={Boolean(deleteTargetClosing)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetClosing(null);
        }}
        title={`Hapus Jurnal Penutup: ${deleteTargetClosing?.journal_number ?? ""}`}
        description={`Apakah Anda yakin ingin menghapus jurnal penutup "${deleteTargetClosing?.description ?? ""}"?`}
        confirmLabel="Ya, Hapus Jurnal"
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
        title={`Hapus ${selectedClosingIds.length} Jurnal Penutup Pilihan`}
        description={`Apakah Anda yakin ingin menghapus ${selectedClosingIds.length} entri jurnal penutup yang dipilih secara permanen?`}
        confirmLabel={`Ya, Hapus (${selectedClosingIds.length})`}
        destructive
        onConfirm={handleDeleteClosingEntries}
      />
    </div>
  );
}

export default PeriodsPage;
