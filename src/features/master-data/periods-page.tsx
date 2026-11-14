import * as React from "react";
import {
  ArrowUpDownIcon,
  EyeIcon,
  ListTodoIcon,
  LockIcon,
  LockOpenIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  ScaleIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import {
  createPeriod,
  deletePeriod,
  getCompanyProfile,
  listAccounts,
  listPeriods,
  reopenPeriod,
} from "@/lib/data-service";
import {
  formatDateID,
  formatDateTimeID,
  formatRupiah,
} from "@/lib/formatters";
import {
  createManualOrAdjustmentJournal,
  deleteJournals,
  listJournalsWithLines,
  runOptionalReversingEntries,
  runPeriodClosingBook,
} from "@/lib/operations-service";
import { cn } from "@/lib/utils";
import type {
  AccountRow,
  CompanyProfileRow,
  JournalLineRow,
  JournalRow,
  PeriodRow,
} from "@/types/database.types";

export interface PeriodsPageProps {
  hideHeader?: boolean;
  externalPeriodFilter?: string;
  externalStartDate?: string;
  externalEndDate?: string;
}

export function PeriodsPage({
  hideHeader = false,
  externalPeriodFilter,
  externalStartDate,
  externalEndDate,
}: PeriodsPageProps = {}) {
  const [periods, setPeriods] = React.useState<PeriodRow[]>([]);
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Modal Buka Periode
  const [createOpen, setCreateOpen] = React.useState(false);
  const [year, setYear] = React.useState(2027);
  const [month, setMonth] = React.useState("2");
  const [creating, setCreating] = React.useState(false);

  // Targets Tutup / Buka / Hapus Periode
  const [closeTarget, setCloseTarget] = React.useState<PeriodRow | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<PeriodRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PeriodRow | null>(null);

  // Dialog Jurnal Pembalik Opsional
  const [reverseOpen, setReverseOpen] = React.useState(false);
  const [sourcePeriodId, setSourcePeriodId] = React.useState("");
  const [reversingDate, setReversingDate] = React.useState("2027-01-01");
  const [runningReverse, setRunningReverse] = React.useState(false);

  // Jurnal Penutup Controls & States
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedClosingIds, setSelectedClosingIds] = React.useState<string[]>([]);
  const [selectedDetailJournal, setSelectedDetailJournal] = React.useState<JournalRow | null>(null);

  // Modal Catat Jurnal Penutup Manual
  const [manualClosingOpen, setManualClosingOpen] = React.useState(false);
  const [manualDate, setManualDate] = React.useState(
    externalEndDate || new Date().toISOString().slice(0, 10),
  );
  const [manualDescription, setManualDescription] = React.useState(
    "Jurnal Penutup Manual Akhir Periode",
  );
  const [debitLines, setDebitLines] = React.useState<Array<{ accountId: string; amount: number }>>([
    { accountId: "", amount: 0 },
  ]);
  const [creditLines, setCreditLines] = React.useState<Array<{ accountId: string; amount: number }>>([
    { accountId: "", amount: 0 },
  ]);
  const [postingManual, setPostingManual] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [periodsData, jrnRes, accs, comp] = await Promise.all([
        listPeriods(),
        listJournalsWithLines(),
        listAccounts(),
        getCompanyProfile(),
      ]);
      setPeriods(periodsData);
      setJournals(jrnRes.journals);
      setLines(jrnRes.lines);
      setAccounts(accs);
      setCompany(comp);
      if (periodsData[0]) {
        setSourcePeriodId((prev) => prev || periodsData[0]!.id);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat data periode & jurnal.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const postableAccounts = React.useMemo(
    () => accounts.filter((a) => a.is_postable && a.is_active),
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
    if (externalPeriodFilter && externalPeriodFilter !== "all" && externalPeriodFilter !== "ALL") {
      filtered = filtered.filter((j) => j.period_id === externalPeriodFilter);
    }
    if (externalStartDate && externalEndDate) {
      filtered = filtered.filter(
        (j) => j.journal_date >= externalStartDate && j.journal_date <= externalEndDate,
      );
    }
    return filtered.sort((a, b) => {
      const cmp = a.journal_date.localeCompare(b.journal_date);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [journals, externalPeriodFilter, externalStartDate, externalEndDate, sortOrder]);

  const totalDebit = debitLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalCredit = creditLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createPeriod(year, Number(month));
      toast.success("Periode akuntansi baru berhasil dibuka.");
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membuat periode.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRunReverse(e: React.FormEvent) {
    e.preventDefault();
    if (!sourcePeriodId) return;
    setRunningReverse(true);
    try {
      const count = await runOptionalReversingEntries(
        sourcePeriodId,
        reversingDate,
      );
      toast.success(
        count > 0
          ? `${count} jurnal pembalik awal periode berhasil diterbitkan.`
          : "Tidak ada jurnal penyesuaian yang ditandai pembalik pada periode asal (0 jurnal diterbitkan).",
      );
      setReverseOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal menjalankan jurnal pembalik.",
      );
    } finally {
      setRunningReverse(false);
    }
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
      toast.error("Kunci jurnal sedang aktif sesuai standar SAK. Buka kunci terlebih dahulu di portal Super Admin.");
      return;
    }
    try {
      await deleteJournals(selectedClosingIds);
      toast.success(`${selectedClosingIds.length} entri jurnal penutup berhasil dihapus.`);
      setSelectedClosingIds([]);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus entri jurnal penutup.");
    }
  }

  async function handlePostManualClosing(e: React.FormEvent) {
    e.preventDefault();
    if (!isBalanced) {
      toast.error("Total Debit dan Kredit jurnal penutup harus seimbang dan tidak boleh kosong.");
      return;
    }
    const validDebits = debitLines.filter((l) => l.accountId && l.amount > 0);
    const validCredits = creditLines.filter((l) => l.accountId && l.amount > 0);
    if (validDebits.length === 0 || validCredits.length === 0) {
      toast.error("Lengkapi akun debit dan kredit jurnal penutup.");
      return;
    }

    setPostingManual(true);
    try {
      const linesInput = [
        ...validDebits.map((d) => ({
          accountId: d.accountId,
          description: manualDescription,
          debit: d.amount,
          credit: 0,
        })),
        ...validCredits.map((c) => ({
          accountId: c.accountId,
          description: manualDescription,
          debit: 0,
          credit: c.amount,
        })),
      ];

      await createManualOrAdjustmentJournal({
        journalDate: manualDate,
        journalType: "closing",
        description: manualDescription,
        projectId: null,
        autoReverseNextPeriod: false,
        lines: linesInput,
      });

      toast.success("Jurnal penutup manual berhasil dibukukan.");
      setManualClosingOpen(false);
      setDebitLines([{ accountId: "", amount: 0 }]);
      setCreditLines([{ accountId: "", amount: 0 }]);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memposting jurnal penutup manual.");
    } finally {
      setPostingManual(false);
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
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 px-6 py-4">
          <div className="space-y-1 min-w-0">
            <CardTitle>
              Jurnal Penutup
            </CardTitle>
            <CardDescription>
              Historis entri jurnal penutup akun nominal yang tersimpan pada sistem pembukuan.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              size="sm"
              onClick={() => setManualClosingOpen(true)}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer gap-1.5 shadow-2xs"
            >
              <PlusIcon className="size-3.5" />
              <span>Catat Jurnal Penutup Manual</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer gap-1.5"
            >
              <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
              <span>Urutan: {sortOrder === "asc" ? "Terlama" : "Terbaru"}</span>
            </Button>

            {!isEditMode ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer gap-1.5 text-primary dark:text-cyan-400 border-primary/30 hover:bg-primary/10"
              >
                <PencilIcon className="size-3.5" />
                <span>Edit</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedClosingIds([]);
                  }}
                  className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={selectedClosingIds.length === 0}
                  onClick={handleDeleteClosingEntries}
                  className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer gap-1.5"
                >
                  <Trash2Icon className="size-3.5" />
                  <span>Hapus Pilihan ({selectedClosingIds.length})</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isEditMode && (
                    <TableHead className="w-12 text-center align-middle px-3">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={
                            closingJournals.length > 0 &&
                            selectedClosingIds.length === closingJournals.length
                          }
                          indeterminate={
                            selectedClosingIds.length > 0 &&
                            selectedClosingIds.length < closingJournals.length
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClosingIds(closingJournals.map((j) => j.id));
                            } else {
                              setSelectedClosingIds([]);
                            }
                          }}
                          aria-label="Pilih semua jurnal penutup"
                        />
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-center font-semibold text-xs sm:text-sm">Tanggal</TableHead>
                  <TableHead className="text-center font-semibold text-xs sm:text-sm">Deskripsi</TableHead>
                  <TableHead className="text-center font-semibold text-xs sm:text-sm">Ref</TableHead>
                  <TableHead className="text-center font-semibold text-xs sm:text-sm">Debit</TableHead>
                  <TableHead className="text-center font-semibold text-xs sm:text-sm">Kredit</TableHead>
                  <TableHead className="text-center font-semibold text-xs sm:text-sm">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closingJournals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isEditMode ? 7 : 6}
                      className="px-6 py-12 text-center text-muted-foreground text-xs sm:text-sm"
                    >
                      Belum ada jurnal penutup aktual pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  closingJournals.map((j) => {
                    const jLines = linesByJournal.get(j.id) ?? [];
                    const totalJDebit = jLines.reduce((s, l) => s + l.debit, 0);
                    const totalJCredit = jLines.reduce((s, l) => s + l.credit, 0);

                    return (
                      <TableRow key={j.id} className="hover:bg-muted/30">
                        {isEditMode && (
                          <TableCell className="align-top text-center px-3 py-3.5">
                            <Checkbox
                              checked={selectedClosingIds.includes(j.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedClosingIds((prev) =>
                                    prev.includes(j.id) ? prev : [...prev, j.id],
                                  );
                                } else {
                                  setSelectedClosingIds((prev) =>
                                    prev.filter((id) => id !== j.id),
                                  );
                                }
                              }}
                              className="mt-0.5"
                              aria-label={`Pilih jurnal penutup ${j.journal_number}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs text-center whitespace-nowrap">
                          {formatDateID(j.journal_date)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold text-foreground">{j.description}</div>
                          <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                            {j.journal_number}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center text-muted-foreground">
                          {jLines[0]
                            ? accounts.find((a) => a.id === jLines[0]?.account_id)?.code ?? "-"
                            : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-foreground pr-6">
                          {formatRupiah(totalJDebit)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-foreground pr-6">
                          {formatRupiah(totalJCredit)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedDetailJournal(j)}
                            className="size-8 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground"
                            title="Lihat Rincian Jurnal Penutup"
                          >
                            <EyeIcon className="size-4" />
                            <span className="sr-only">Rincian</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Card Daftar Periode Bulanan */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70">
          <CardTitle>
            Daftar Periode Bulanan
          </CardTitle>
          <CardDescription>
            Status terbuka mengizinkan pencatatan dan posting jurnal transaksi pada bulan bersangkutan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 py-8 px-6 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat daftar periode...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center font-semibold text-xs sm:text-sm">Periode</TableHead>
                    <TableHead className="text-center font-semibold text-xs sm:text-sm">Rentang Tanggal</TableHead>
                    <TableHead className="text-center font-semibold text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-center font-semibold text-xs sm:text-sm">Riwayat Tutup / Buka Kembali</TableHead>
                    <TableHead className="text-center font-semibold text-xs sm:text-sm">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-xs sm:text-sm text-foreground text-center">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-xs text-center whitespace-nowrap text-muted-foreground">
                        {formatDateID(p.start_date)} &ndash; {formatDateID(p.end_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge
                          tone={p.status === "open" ? "success" : "warning"}
                          label={p.status === "open" ? "Periode Terbuka" : "Periode Ditutup"}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-center text-muted-foreground">
                        {p.status === "closed" && p.closed_at
                          ? `Ditutup: ${formatDateTimeID(p.closed_at)}`
                          : p.reopen_reason
                            ? `Dibuka kembali (${formatDateTimeID(p.reopened_at)}): "${p.reopen_reason}"`
                            : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 -my-1.5">
                          {p.status === "open" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setCloseTarget(p)}
                              className="size-8 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all cursor-pointer shadow-2xs"
                              title="Tutup Buku & Periode"
                            >
                              <LockIcon className="size-4" />
                              <span className="sr-only">Tutup Buku &amp; Periode</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setReopenTarget(p)}
                              className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer shadow-2xs"
                              title="Buka Kembali Periode"
                            >
                              <LockOpenIcon className="size-4" />
                              <span className="sr-only">Buka Kembali Periode</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setDeleteTarget(p)}
                            className="size-8 rounded-lg text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 dark:text-rose-400 dark:hover:text-rose-300 transition-all cursor-pointer shadow-2xs"
                            title="Hapus Periode"
                          >
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">Hapus Periode</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Buka Periode Baru */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buka Periode Akuntansi Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="p-year" required>Tahun Buku</FieldLabel>
                  <Input
                    id="p-year"
                    type="number"
                    min={2024}
                    max={2100}
                    required
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </Field>
                <Field>
                  <FieldLabel required>Bulan</FieldLabel>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="1">01 — Januari</SelectItem>
                        <SelectItem value="2">02 — Februari</SelectItem>
                        <SelectItem value="3">03 — Maret</SelectItem>
                        <SelectItem value="4">04 — April</SelectItem>
                        <SelectItem value="5">05 — Mei</SelectItem>
                        <SelectItem value="6">06 — Juni</SelectItem>
                        <SelectItem value="7">07 — Juli</SelectItem>
                        <SelectItem value="8">08 — Agustus</SelectItem>
                        <SelectItem value="9">09 — September</SelectItem>
                        <SelectItem value="10">10 — Oktober</SelectItem>
                        <SelectItem value="11">11 — November</SelectItem>
                        <SelectItem value="12">12 — Desember</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Spinner data-icon="inline-start" /> : null}
                  Buka Periode
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Jurnal Pembalik Opsional */}
      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Jalankan Jurnal Pembalik Awal Periode</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRunReverse}>
            <FieldGroup>
              <Field>
                <FieldLabel required>Periode Asal AJP</FieldLabel>
                <Select
                  value={sourcePeriodId}
                  onValueChange={setSourcePeriodId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih periode asal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({formatDateID(p.start_date)} – {formatDateID(p.end_date)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="rev-date" required>Tanggal Efektif Pembalik</FieldLabel>
                <DatePicker
                  id="rev-date"
                  required
                  value={reversingDate}
                  onChange={setReversingDate}
                />
              </Field>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReverseOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={runningReverse}>
                  {runningReverse ? <Spinner data-icon="inline-start" /> : null}
                  Jalankan Pembalik
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Catat Jurnal Penutup Manual */}
      <Dialog open={manualClosingOpen} onOpenChange={setManualClosingOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Catat Jurnal Penutup Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePostManualClosing} className="space-y-5">
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel required>Tanggal Jurnal</FieldLabel>
                  <DatePicker value={manualDate} onChange={setManualDate} />
                </Field>
                <Field>
                  <FieldLabel required>Deskripsi Transaksi Penutup</FieldLabel>
                  <Input
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    required
                    placeholder="Penutupan akun nominal akhir periode..."
                  />
                </Field>
              </div>

              {/* Grid 2 Kolom: Sisi Debit & Sisi Kredit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* Sisi Debit */}
                <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-border/60">
                    <span className="text-xs font-bold text-foreground tracking-wide">
                      Sisi Debit
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDebitLines((prev) => [...prev, { accountId: "", amount: 0 }])
                      }
                      className="h-7 text-xs font-semibold text-primary dark:text-cyan-400 gap-1"
                    >
                      <PlusIcon className="size-3" /> Tambah Akun
                    </Button>
                  </div>
                  {debitLines.map((line, idx) => (
                    <div key={idx} className="space-y-2 p-2.5 rounded-xl border border-border/60 bg-card">
                      <Select
                        value={line.accountId}
                        onValueChange={(val) => {
                          const updated = [...debitLines];
                          updated[idx]!.accountId = val;
                          setDebitLines(updated);
                        }}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Pilih Akun Debit..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {postableAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.code}: {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        placeholder="Nominal Debit (Rp)"
                        value={line.amount || 0}
                        onValueChange={(val) => {
                          const updated = [...debitLines];
                          updated[idx]!.amount = val;
                          setDebitLines(updated);
                        }}
                        className="text-xs"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 text-xs font-bold">
                    <span>Total Debit:</span>
                    <span className="text-primary dark:text-cyan-400">{formatRupiah(totalDebit)}</span>
                  </div>
                </div>

                {/* Sisi Kredit */}
                <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-border/60">
                    <span className="text-xs font-bold text-foreground tracking-wide">
                      Sisi Kredit
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCreditLines((prev) => [...prev, { accountId: "", amount: 0 }])
                      }
                      className="h-7 text-xs font-semibold text-primary dark:text-cyan-400 gap-1"
                    >
                      <PlusIcon className="size-3" /> Tambah Akun
                    </Button>
                  </div>
                  {creditLines.map((line, idx) => (
                    <div key={idx} className="space-y-2 p-2.5 rounded-xl border border-border/60 bg-card">
                      <Select
                        value={line.accountId}
                        onValueChange={(val) => {
                          const updated = [...creditLines];
                          updated[idx]!.accountId = val;
                          setCreditLines(updated);
                        }}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Pilih Akun Kredit..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {postableAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.code}: {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        placeholder="Nominal Kredit (Rp)"
                        value={line.amount || 0}
                        onValueChange={(val) => {
                          const updated = [...creditLines];
                          updated[idx]!.amount = val;
                          setCreditLines(updated);
                        }}
                        className="text-xs"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 text-xs font-bold">
                    <span>Total Kredit:</span>
                    <span className="text-primary dark:text-cyan-400">{formatRupiah(totalCredit)}</span>
                  </div>
                </div>
              </div>

              {/* Status Keseimbangan */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border text-xs font-semibold mt-3",
                  isBalanced
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
                )}
              >
                <div className="flex items-center gap-2">
                  <ScaleIcon className="size-4" />
                  <span>
                    {isBalanced ? "Jurnal Seimbang (Balanced)" : "Jurnal Belum Seimbang (Selisih Debit - Kredit)"}
                  </span>
                </div>
                <span>Selisih: {formatRupiah(Math.abs(totalDebit - totalCredit))}</span>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualClosingOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={!isBalanced || postingManual}>
                  {postingManual ? <Spinner data-icon="inline-start" /> : null}
                  Rekam Transaksi
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detail Rincian Jurnal Penutup */}
      <Dialog
        open={Boolean(selectedDetailJournal)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailJournal(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi Jurnal Penutup</DialogTitle>
          </DialogHeader>
          {selectedDetailJournal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs">
                <div>
                  <span className="text-muted-foreground block">Nomor Jurnal</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedDetailJournal.journal_number}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tanggal Transaksi</span>
                  <span className="font-semibold text-foreground">
                    {formatDateID(selectedDetailJournal.journal_date)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Deskripsi</span>
                  <span className="font-medium text-foreground">
                    {selectedDetailJournal.description}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center font-semibold text-xs">Akun</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Debit</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Kredit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(linesByJournal.get(selectedDetailJournal.id) ?? []).map((l) => {
                      const acc = accounts.find((a) => a.id === l.account_id);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">
                            <span className="font-mono font-semibold text-primary dark:text-cyan-400">
                              {acc?.code}
                            </span>{" "}
                            &ndash; {acc?.name}
                          </TableCell>
                          <TableCell className="text-xs text-right pr-6 font-medium">
                            {l.debit > 0 ? formatRupiah(l.debit) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right pr-6 font-medium">
                            {l.credit > 0 ? formatRupiah(l.credit) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        description={`Masukkan alasan pembukaan kembali periode ${reopenTarget?.name}. Tindakan ini akan dicatat dalam jejak audit kepatuhan SAK.`}
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
    </div>
  );
}
