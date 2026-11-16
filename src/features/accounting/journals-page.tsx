import * as React from "react";
import {
  ArrowUpDownIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { type SemanticTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/ui/empty";
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
  listProjects,
} from "@/lib/data-service";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { AccountingPrintLayout } from "@/features/accounting/components/accounting-print-layout";
import { formatAccountRef, formatDateID, roundRupiah } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  createCorrectionJournalEntry,
  createManualOrAdjustmentJournal,
  deleteJournals,
  listJournalsWithLines,
  updateJournal,
} from "@/lib/operations-service";
import type {
  AccountRow,
  CompanyProfileRow,
  JournalLineRow,
  JournalRow,
  JournalType,
  ProjectRow,
} from "@/types/database.types";
import {
  JournalEntryDialog,
  type DraftLineEntry,
} from "./components/journal-entry-dialog";
import { JournalCorrectionDialog } from "./components/journal-correction-dialog";
import { JournalDetailDialog } from "./components/journal-detail-dialog";
import {
  exportJournalsToCsv,
  exportJournalsToExcel,
  exportJournalsToPdf,
} from "./components/journals-export-handlers";

export const JOURNAL_TYPE_LABELS: Record<
  JournalType,
  { label: string; tone: SemanticTone }
> = {
  general: { label: "Jurnal Umum", tone: "secondary" },
  adjustment: { label: "Jurnal Penyesuaian", tone: "info" },
  correction: { label: "Jurnal Koreksi", tone: "warning" },
  closing: { label: "Jurnal Penutup", tone: "outline" },
  reversing: { label: "Jurnal Pembalik", tone: "secondary" },
  auto_invoice: { label: "Otomatis: Invoice", tone: "info" },
  auto_receipt: { label: "Otomatis: Penerimaan Kas", tone: "success" },
  auto_expense: { label: "Otomatis: Beban PA", tone: "warning" },
  auto_payment: { label: "Otomatis: Pelunasan PA", tone: "success" },
  progress_billing: { label: "Progress Billing", tone: "info" },
  elimination: { label: "Eliminasi Selesai 100%", tone: "success" },
  profit_sharing: { label: "Bagi Hasil Proyek", tone: "info" },
};

function formatJournalDate(val: string | null | undefined): string {
  if (!val) return "-";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const parts = val.split("-");
  const y = parts[0];
  const mStr = parts[1];
  const d = parts[2];
  if (y && mStr && d) {
    const monthIdx = parseInt(mStr, 10) - 1;
    const m = months[monthIdx] ?? mStr;
    return `${d}/${m}/${y}`;
  }
  return formatDateID(val);
}

export interface JournalsPageProps {
  initialTypeFilter?: string;
  hideHeader?: boolean;
  filterMode?: "all" | "adjusting";
  externalPeriodFilter?: string;
  externalStartDate?: string;
  externalEndDate?: string;
  externalProjectFilter?: string;
  externalTypeFilter?: string;
}

export function JournalsPage({
  initialTypeFilter = "ALL",
  hideHeader: _hideHeader = false,
  filterMode = "all",
  externalPeriodFilter,
  externalStartDate,
  externalEndDate,
  externalProjectFilter,
  externalTypeFilter,
}: JournalsPageProps = {}) {
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [periodFilter] = React.useState("ALL");
  const [projectFilter] = React.useState("ALL");
  const [typeFilter] = React.useState(
    filterMode === "adjusting" ? "adjustment" : initialTypeFilter,
  );
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Form Jurnal Baru & Edit (Umum / Penyesuaian)
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingJournal, setEditingJournal] = React.useState<JournalRow | null>(
    null,
  );
  const [journalDate, setJournalDate] = React.useState("2026-11-30");
  const [journalType, setJournalType] = React.useState<"general" | "adjustment">(
    "general",
  );
  const [description, setDescription] = React.useState("");
  const [autoReverse, setAutoReverse] = React.useState(false);
  const [draftDebits, setDraftDebits] = React.useState<DraftLineEntry[]>([
    { accountId: "", amount: "" },
  ]);
  const [draftCredits, setDraftCredits] = React.useState<DraftLineEntry[]>([
    { accountId: "", amount: "" },
  ]);
  const [posting, setPosting] = React.useState(false);

  // Mode Edit Riwayat & Aksi Baris (Splitz style)
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedJournalIds, setSelectedJournalIds] = React.useState<string[]>(
    [],
  );
  const [journalLockEnabled, setJournalLockEnabled] = React.useState(true);
  const [detailJournal, setDetailJournal] = React.useState<JournalRow | null>(
    null,
  );
  const [deleteTargetJournal, setDeleteTargetJournal] =
    React.useState<JournalRow | null>(null);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] =
    React.useState(false);

  // Dialog Jurnal Koreksi Resmi (BR-2)
  const [correctTarget, setCorrectTarget] = React.useState<JournalRow | null>(
    null,
  );
  const [correctionDate, setCorrectionDate] = React.useState("2026-11-30");
  const [correctionReason, setCorrectionReason] = React.useState("");
  const [correcting, setCorrecting] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, accs, prjRes, comp] = await Promise.all([
        listJournalsWithLines(),
        listAccounts(),
        listProjects(),
        getCompanyProfile(),
      ]);
      setJournals(jRes.journals);
      setLines(jRes.lines);
      setAccounts(accs);
      setProjects(prjRes.projects);
      setCompany(comp);
      setJournalLockEnabled(comp.journal_lock_enabled !== false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat daftar jurnal.",
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
    () => accounts.filter((a) => a.is_active && a.is_postable),
    [accounts],
  );
  const accountMap = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const canUseAutoReverse = journalType === "adjustment";

  function openNewJournal() {
    setEditingJournal(null);
    const firstAcc = postableAccounts[0]?.id ?? "";
    const secondAcc = postableAccounts[1]?.id ?? firstAcc;
    setJournalDate("2026-11-30");
    setJournalType(filterMode === "adjusting" ? "adjustment" : "general");
    setDescription("");
    setAutoReverse(false);
    setDraftDebits([{ accountId: firstAcc, amount: "" }]);
    setDraftCredits([{ accountId: secondAcc, amount: "" }]);
    setCreateOpen(true);
  }

  function openEditJournal(j: JournalRow) {
    if (journalLockEnabled) {
      toast.error(
        "Kunci jurnal sedang aktif. Untuk mengedit atau menghapus transaksi jurnal, Super Admin perlu membuka kunci jurnal di menu Pengaturan & Kontrol Akuntansi.",
      );
      return;
    }
    setEditingJournal(j);
    setJournalDate(j.journal_date);
    setJournalType(j.journal_type === "adjustment" ? "adjustment" : "general");
    setDescription(j.description || "");
    setAutoReverse(Boolean(j.auto_reverse_next_period));

    const jLines = lines
      .filter((l) => l.journal_id === j.id)
      .sort((a, b) => a.line_no - b.line_no);
    const debLines = jLines.filter((l) => l.debit > 0);
    const credLines = jLines.filter((l) => l.credit > 0);

    setDraftDebits(
      debLines.length > 0
        ? debLines.map((l) => ({
            accountId: l.account_id,
            amount: String(l.debit),
          }))
        : [{ accountId: postableAccounts[0]?.id ?? "", amount: "" }],
    );
    setDraftCredits(
      credLines.length > 0
        ? credLines.map((l) => ({
            accountId: l.account_id,
            amount: String(l.credit),
          }))
        : [
            {
              accountId:
                postableAccounts[1]?.id ?? postableAccounts[0]?.id ?? "",
              amount: "",
            },
          ],
    );
    setCreateOpen(true);
  }

  function addDebitRow() {
    setDraftDebits((prev) => [
      ...prev,
      { accountId: postableAccounts[0]?.id ?? "", amount: "" },
    ]);
  }

  function removeDebitRow(idx: number) {
    if (draftDebits.length > 1) {
      setDraftDebits((prev) => prev.filter((_, i) => i !== idx));
    }
  }

  function updateDebitRow(idx: number, patch: Partial<DraftLineEntry>) {
    setDraftDebits((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
  }

  function addCreditRow() {
    setDraftCredits((prev) => [
      ...prev,
      {
        accountId: postableAccounts[1]?.id ?? postableAccounts[0]?.id ?? "",
        amount: "",
      },
    ]);
  }

  function removeCreditRow(idx: number) {
    if (draftCredits.length > 1) {
      setDraftCredits((prev) => prev.filter((_, i) => i !== idx));
    }
  }

  function updateCreditRow(idx: number, patch: Partial<DraftLineEntry>) {
    setDraftCredits((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
  }

  const totalDraftDebit = draftDebits.reduce(
    (s, d) => s + (Number(d.amount) || 0),
    0,
  );
  const totalDraftCredit = draftCredits.reduce(
    (s, c) => s + (Number(c.amount) || 0),
    0,
  );
  const isDraftBalanced =
    totalDraftDebit > 0 && Math.abs(totalDraftDebit - totalDraftCredit) < 1;
  const balanceDiff = Math.abs(totalDraftDebit - totalDraftCredit);

  async function handlePostJournal(e: React.FormEvent) {
    e.preventDefault();
    if (!isDraftBalanced) {
      toast.error(
        "Jurnal belum seimbang: Total Debit wajib sama dengan Total Kredit dan bernilai di atas Rp0.",
      );
      return;
    }
    setPosting(true);
    try {
      const linesPayload = [
        ...draftDebits
          .filter((d) => d.accountId && Number(d.amount) > 0)
          .map((d) => ({
            accountId: d.accountId,
            description: description.trim(),
            debit: roundRupiah(Number(d.amount)),
            credit: 0,
          })),
        ...draftCredits
          .filter((c) => c.accountId && Number(c.amount) > 0)
          .map((c) => ({
            accountId: c.accountId,
            description: description.trim(),
            debit: 0,
            credit: roundRupiah(Number(c.amount)),
          })),
      ];

      if (editingJournal) {
        await updateJournal({
          journalId: editingJournal.id,
          journalDate,
          journalType,
          description,
          projectId: editingJournal.project_id,
          autoReverseNextPeriod: canUseAutoReverse ? autoReverse : false,
          lines: linesPayload,
        });
        toast.success(
          `Jurnal ${editingJournal.journal_number} berhasil diperbarui.`,
        );
      } else {
        await createManualOrAdjustmentJournal({
          journalDate,
          journalType,
          description,
          projectId: null,
          autoReverseNextPeriod: canUseAutoReverse ? autoReverse : false,
          lines: linesPayload,
        });
        toast.success("Jurnal berhasil diposting ke Buku Besar.");
      }
      setCreateOpen(false);
      setEditingJournal(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan jurnal.",
      );
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteSingle(journal: JournalRow) {
    if (journalLockEnabled) {
      toast.error(
        "Kunci jurnal sedang aktif. Jurnal tidak dapat dihapus saat kunci jurnal aktif. Hubungi Super Admin di Pengaturan & Kontrol Akuntansi untuk membuka mode testing.",
      );
      return;
    }
    try {
      await deleteJournals([journal.id]);
      toast.success(`Jurnal ${journal.journal_number} berhasil dihapus.`);
      setSelectedJournalIds((prev) => prev.filter((id) => id !== journal.id));
      setDeleteTargetJournal(null);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus jurnal.",
      );
    }
  }

  async function handleDeleteBatch() {
    if (selectedJournalIds.length === 0) return;
    if (journalLockEnabled) {
      toast.error(
        "Kunci jurnal sedang aktif. Jurnal tidak dapat dihapus saat kunci jurnal aktif. Hubungi Super Admin di Pengaturan & Kontrol Akuntansi untuk membuka mode testing.",
      );
      return;
    }
    try {
      await deleteJournals(selectedJournalIds);
      toast.success(
        `${selectedJournalIds.length} transaksi jurnal berhasil dihapus.`,
      );
      setSelectedJournalIds([]);
      setIsBatchDeleteDialogOpen(false);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus jurnal pilihan.",
      );
    }
  }

  async function handleCreateCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!correctTarget) return;
    setCorrecting(true);
    try {
      await createCorrectionJournalEntry({
        originalJournalId: correctTarget.id,
        correctionDate,
        reason: correctionReason,
      });
      toast.success(
        `Jurnal koreksi resmi atas ${correctTarget.journal_number} berhasil diposting.`,
      );
      setCorrectTarget(null);
      setCorrectionReason("");
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menerbitkan jurnal koreksi.",
      );
    } finally {
      setCorrecting(false);
    }
  }

  const filteredJournals = React.useMemo(() => {
    return journals.filter((j) => {
      const activePeriod =
        externalPeriodFilter && externalPeriodFilter !== "all"
          ? externalPeriodFilter
          : periodFilter;
      if (
        activePeriod !== "ALL" &&
        activePeriod !== "all" &&
        j.period_id !== activePeriod
      ) {
        return false;
      }
      if (externalStartDate && j.journal_date < externalStartDate) return false;
      if (externalEndDate && j.journal_date > externalEndDate) return false;

      const activePrj = externalProjectFilter ?? projectFilter;
      if (activePrj !== "ALL" && j.project_id !== activePrj) return false;

      // Pemisahan Tab AJP vs Jurnal Umum
      if (filterMode === "adjusting") {
        // Tab Jurnal Penyesuaian: HANYA menampilkan jurnal bertipe penyesuaian (adjustment)
        if (j.journal_type !== "adjustment") return false;
      } else {
        // Tab Jurnal Umum
        const activeType = externalTypeFilter ?? typeFilter;
        if (activeType === "ALL") {
          // Default Jurnal Umum: tampilkan seluruh transaksi umum harian operasional (bukan penyesuaian)
          if (j.journal_type === "adjustment") return false;
        } else if (j.journal_type !== activeType) {
          return false;
        }
      }

      return true;
    });
  }, [
    journals,
    filterMode,
    periodFilter,
    externalPeriodFilter,
    externalStartDate,
    externalEndDate,
    projectFilter,
    externalProjectFilter,
    typeFilter,
    externalTypeFilter,
  ]);

  const sortedJournals = React.useMemo(() => {
    return [...filteredJournals].sort((a, b) => {
      if (sortOrder === "asc") {
        return (
          a.journal_date.localeCompare(b.journal_date) ||
          a.journal_number.localeCompare(b.journal_number)
        );
      }
      return (
        b.journal_date.localeCompare(a.journal_date) ||
        b.journal_number.localeCompare(a.journal_number)
      );
    });
  }, [filteredJournals, sortOrder]);

  const printAreaId = `altcycles-journal-print-${filterMode}`;

  const printPeriodLabel =
    externalStartDate && externalEndDate
      ? `${formatDateID(externalStartDate)} s.d. ${formatDateID(externalEndDate)}`
      : periodFilter === "ALL"
        ? "Semua Periode"
        : periodFilter;

  const printDocTitle =
    filterMode === "adjusting"
      ? "Jurnal Penyesuaian & Koreksi"
      : "Jurnal Umum";

  async function handleExportPdf() {
    await exportJournalsToPdf({
      company,
      filterMode,
      sortedJournals,
      lines,
      accountMap,
      periodFilter,
      printPeriodLabel,
    });
  }

  async function handleExportExcel() {
    await exportJournalsToExcel({
      filteredJournals,
      lines,
      accountMap,
      projectMap,
      periodFilter,
    });
  }

  async function handleExportCsv() {
    await exportJournalsToCsv({
      sortedJournals,
      lines,
      accountMap,
      filterMode,
      periodFilter,
    });
  }

  const journalPrintContent = (
    <AccountingPrintLayout
      printAreaId={printAreaId}
      company={company}
      docTitle={printDocTitle}
      periodLabel={printPeriodLabel}
    >
      <table className="print-table">
        <colgroup>
          <col style={{ width: "12%" }} />
          <col style={{ width: "38%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "21%" }} />
          <col style={{ width: "21%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="print-center">Tanggal</th>
            <th className="print-center">Deskripsi</th>
            <th className="print-center">Ref</th>
            <th className="print-center">Debit</th>
            <th className="print-center">Kredit</th>
          </tr>
        </thead>
        <tbody>
          {sortedJournals.length === 0 ? (
            <tr>
              <td colSpan={5} className="print-center" style={{ padding: "28px", color: "#6b7280" }}>
                Belum ada transaksi pada periode ini.
              </td>
            </tr>
          ) : (
            sortedJournals.map((j) => {
              const jLines = lines
                .filter((l) => l.journal_id === j.id)
                .sort((a, b) => a.line_no - b.line_no);
              const debitLines = jLines.filter((l) => l.debit > 0);
              const creditLines = jLines.filter((l) => l.credit > 0);
              const journalRows = [...debitLines, ...creditLines];

              return (
                <tr key={j.id} className="align-top">
                  <td className="print-center whitespace-nowrap">
                    {formatDateID(j.journal_date)}
                  </td>
                  <td>
                    <div className="print-deskripsi-wrap">
                      {debitLines.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`d-${idx}`} className="print-account-debit">
                            {acc?.name ?? "Akun Debit"}
                          </div>
                        );
                      })}
                      {creditLines.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`c-${idx}`} className="print-account-credit">
                            {acc?.name ?? "Akun Kredit"}
                          </div>
                        );
                      })}
                    </div>
                    {j.description && (
                      <div className="print-memo">
                        ({j.description})
                      </div>
                    )}
                  </td>
                  <td className="print-center">
                    <div className="print-ref-wrap">
                      {journalRows.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`r-${idx}`} className="print-ref-item">
                            {formatAccountRef(acc?.code)}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="print-amount-wrap">
                      {journalRows.map((row, idx) => {
                        if (row.debit > 0) {
                          return (
                            <div key={`deb-${idx}`} className="print-amount-row">
                              <span className="print-currency">Rp</span>
                              <span className="print-val">{row.debit.toLocaleString("id-ID")}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={`deb-blank-${idx}`} className="print-amount-row print-blank" aria-hidden="true">
                            <span className="print-currency">Rp</span>
                            <span className="print-val">0</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="print-amount-wrap">
                      {journalRows.map((row, idx) => {
                        if (row.credit > 0) {
                          return (
                            <div key={`cred-${idx}`} className="print-amount-row">
                              <span className="print-currency">Rp</span>
                              <span className="print-val">{Math.abs(row.credit).toLocaleString("id-ID")}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={`cred-blank-${idx}`} className="print-amount-row print-blank" aria-hidden="true">
                            <span className="print-currency">Rp</span>
                            <span className="print-val">0</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </AccountingPrintLayout>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {filterMode === "adjusting"
              ? "Riwayat Jurnal Penyesuaian & Koreksi"
              : "Riwayat Jurnal Umum"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
            {filterMode === "adjusting"
              ? "Kelola penyesuaian akrual, amortisasi, dan penerbitan jurnal koreksi transaksi dengan jejak audit."
              : "Daftar historis seluruh transaksi akuntansi keuangan secara kronologis."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <ExportDownloadMenu
            label="Unduh / Ekspor"
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
          />
          <Button
            type="button"
            onClick={openNewJournal}
            className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer shadow-xs gap-2"
          >
            <PlusIcon className="size-4" />
            <span>{filterMode === "adjusting" ? "Catat Jurnal Penyesuaian" : "Catat Transaksi"}</span>
          </Button>
        </div>
      </div>

      {/* Penerapan Asumsi Akuntansi Keuangan - Tampil pada Tab Jurnal Penyesuaian (Splitz Style) */}
      {filterMode === "adjusting" && (
        <Card className="p-5 border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontalIcon className="size-4 text-primary dark:text-cyan-400" />
            <h3 className="font-bold text-sm text-foreground">
              Penerapan Asumsi Akuntansi Keuangan
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">Periodisitas (Periodicity)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Membagi aktivitas ekonomi entitas ke dalam periode waktu bulanan/tahunan untuk penyajian laporan yang tepat waktu dan relevan.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">Penangguhan (Deferral)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pendapatan diterima dimuka dicatat sebagai kewajiban dan direalisasikan bertahap menjadi pendapatan pada periode manfaat.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">Asas Akrual (Accrual Basis)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mencatat pengaruh transaksi pada periode terjadinya, bukan sekadar saat kas diterima atau dikeluarkan, guna mencerminkan posisi keuangan yang andal.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">Depresiasi (Depreciation)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mengalokasikan harga perolehan aset tetap secara berkala ke Beban Penyusutan berpasangan dengan Akumulasi Penyusutan.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4.5 border-b border-border/60 gap-3">
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            {filterMode === "adjusting"
              ? "Buku Jurnal Penyesuaian (AJP)"
              : "Buku Jurnal Harian"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="gap-1.5 text-xs font-medium cursor-pointer shrink-0"
            >
              <ArrowUpDownIcon className="size-3.5" />
              <span>Urutan: {sortOrder === "asc" ? "Terlama" : "Terbaru"}</span>
            </Button>

            {sortedJournals.length === 0 && !isEditMode ? null : !isEditMode ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="gap-1.5 text-xs font-medium cursor-pointer text-primary dark:text-sky-400 bg-primary/10 hover:bg-primary/15 border-primary/25 transition-colors shadow-xs"
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
                    setSelectedJournalIds([]);
                  }}
                  className="text-xs font-medium cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBatchDeleteDialogOpen(true)}
                  disabled={selectedJournalIds.length === 0}
                  className="text-xs font-medium cursor-pointer"
                >
                  Hapus Pilihan ({selectedJournalIds.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="w-full min-w-[680px] table-fixed">
            <TableHeader className="bg-muted/30">
              <TableRow>
                {isEditMode && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          sortedJournals.length > 0 &&
                          selectedJournalIds.length === sortedJournals.length
                        }
                        indeterminate={
                          selectedJournalIds.length > 0 &&
                          selectedJournalIds.length < sortedJournals.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedJournalIds(
                              sortedJournals.map((j) => j.id),
                            );
                          } else {
                            setSelectedJournalIds([]);
                          }
                        }}
                        aria-label="Pilih semua transaksi"
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead
                  className={cn(
                    "text-center pl-6 pr-3 font-semibold text-xs sm:text-sm text-foreground/80",
                    isEditMode ? "w-[120px]" : "w-[140px]",
                  )}
                >
                  Tanggal
                </TableHead>
                <TableHead className="text-center px-4 font-semibold text-xs sm:text-sm text-foreground/80">
                  Deskripsi
                </TableHead>
                <TableHead
                  className={cn(
                    "text-center font-semibold text-xs sm:text-sm text-foreground/80",
                    isEditMode ? "w-[82px]" : "w-[110px]",
                  )}
                >
                  Ref
                </TableHead>
                <TableHead
                  className={cn(
                    "text-center px-4 font-semibold text-xs sm:text-sm text-foreground/80",
                    isEditMode ? "w-[155px]" : "w-[195px]",
                  )}
                >
                  Debit
                </TableHead>
                <TableHead
                  className={cn(
                    "text-center pl-4 pr-6 font-semibold text-xs sm:text-sm text-foreground/80",
                    isEditMode ? "w-[155px]" : "w-[195px]",
                  )}
                >
                  Kredit
                </TableHead>
                {isEditMode && (
                  <TableHead className="w-[112px] text-center pr-6 font-semibold text-xs sm:text-sm text-foreground/80">
                    Aksi
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isEditMode ? 7 : 5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Spinner />
                        <span>Memuat buku jurnal...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedJournals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isEditMode ? 7 : 5}
                      className="h-36 text-center text-muted-foreground"
                    >
                      <EmptyState
                        title={
                          filterMode === "adjusting"
                            ? "Belum ada Ayat Jurnal Penyesuaian (AJP)"
                            : "Belum ada transaksi jurnal umum pada periode ini"
                        }
                        description={
                          filterMode === "adjusting"
                            ? "Gunakan tombol 'Catat Jurnal Penyesuaian' untuk menambahkan penyesuaian beban akrual, amortisasi, atau pengakuan pendapatan sewa/jasa di muka."
                            : "Gunakan tombol 'Catat Transaksi' atau sesuaikan saringan periode dan proyek."
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedJournals.map((j) => {
                    const jLines = lines
                      .filter((l) => l.journal_id === j.id)
                      .sort((a, b) => a.line_no - b.line_no);
                    const debitLines = jLines.filter((l) => l.debit > 0);
                    const creditLines = jLines.filter((l) => l.credit > 0);
                    const journalRows = [...debitLines, ...creditLines];

                    return (
                      <TableRow
                        key={j.id}
                        className="hover:bg-muted/20 border-b border-border/60 transition-colors"
                      >
                        {/* Checkbox Kolom Pilihan saat Edit Mode */}
                        {isEditMode && (
                          <TableCell className="align-top py-4 text-center px-3">
                            <Checkbox
                              checked={selectedJournalIds.includes(j.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedJournalIds([
                                    ...selectedJournalIds,
                                    j.id,
                                  ]);
                                } else {
                                  setSelectedJournalIds(
                                    selectedJournalIds.filter(
                                      (id) => id !== j.id,
                                    ),
                                  );
                                }
                              }}
                              className="mt-0.5"
                              aria-label={`Pilih transaksi ${j.journal_number}`}
                            />
                          </TableCell>
                        )}

                        {/* TANGGAL: Left-up / top-left alignment */}
                        <TableCell className="align-top py-4 pl-6 pr-3 text-left whitespace-nowrap">
                          <span className="font-medium text-xs sm:text-sm text-foreground">
                            {formatJournalDate(j.journal_date)}
                          </span>
                        </TableCell>

                        {/* DESKRIPSI */}
                        <TableCell className="align-top py-4 px-4 min-w-0">
                          <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                            {debitLines.map((row, idx) => {
                              const acc = accountMap.get(row.account_id);
                              return (
                                <div
                                  key={`d-${idx}`}
                                  className="text-foreground font-medium min-h-5 flex items-center whitespace-normal break-words"
                                >
                                  {acc?.name ?? "Akun Debit"}
                                </div>
                              );
                            })}
                            {creditLines.map((row, idx) => {
                              const acc = accountMap.get(row.account_id);
                              return (
                                <div
                                  key={`c-${idx}`}
                                  className="text-foreground font-medium min-h-5 flex items-center pl-6 whitespace-normal break-words"
                                >
                                  {acc?.name ?? "Akun Kredit"}
                                </div>
                              );
                            })}
                          </div>
                          {/* Keterangan di bawah baris kredit (membungkus rapi 2 baris jika panjang) */}
                          <div className="mt-2 max-w-[54ch] text-xs leading-relaxed text-blue-600 dark:text-cyan-400 italic font-medium whitespace-normal break-words">
                            ({j.description})
                          </div>
                        </TableCell>

                        {/* REF - seragam font sistem (tanpa font-mono) */}
                        <TableCell className="align-top py-4 text-center whitespace-nowrap">
                          <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                            {journalRows.map((row, idx) => {
                              const acc = accountMap.get(row.account_id);
                              return (
                                <div
                                  key={`ref-${idx}`}
                                  className="text-muted-foreground min-h-5 flex items-center justify-center text-xs tabular-nums"
                                >
                                  {formatAccountRef(acc?.code)}
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>

                        {/* DEBIT - seragam font sistem (tanpa font-mono) */}
                        <TableCell className="align-top py-4 px-4 text-right whitespace-nowrap">
                          <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                            {journalRows.map((row, idx) => {
                              if (row.debit > 0) {
                                return (
                                  <div
                                    key={`deb-${idx}`}
                                    className="text-foreground font-medium flex justify-between w-full min-h-5 items-center text-xs tabular-nums"
                                  >
                                    <span className="text-muted-foreground mr-2 font-normal">
                                      Rp
                                    </span>
                                    <span>
                                      {row.debit.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={`deb-blank-${idx}`}
                                  className="text-transparent select-none flex justify-between w-full min-h-5 items-center text-xs"
                                >
                                  <span>Rp</span>
                                  <span>-</span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>

                        {/* KREDIT - seragam font sistem (tanpa font-mono) */}
                        <TableCell className="align-top py-4 pl-4 pr-6 text-right whitespace-nowrap">
                          <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                            {journalRows.map((row, idx) => {
                              if (row.credit > 0) {
                                return (
                                  <div
                                    key={`cred-${idx}`}
                                    className="text-foreground font-medium flex justify-between w-full min-h-5 items-center text-xs tabular-nums"
                                  >
                                    <span className="text-muted-foreground mr-2 font-normal">
                                      Rp
                                    </span>
                                    <span>
                                      {row.credit.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={`cred-blank-${idx}`}
                                  className="text-transparent select-none flex justify-between w-full h-5 items-center text-xs"
                                >
                                  <span>Rp</span>
                                  <span>-</span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>

                        {/* AKSI - Kolom baru saat mode edit aktif: 3 button (Lihat, Edit, Hapus) */}
                        {isEditMode && (
                          <TableCell className="align-top py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailJournal(j)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/20"
                                title="Lihat detail transaksi"
                                aria-label="Lihat detail transaksi"
                              >
                                <EyeIcon className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditJournal(j)}
                                className="p-1.5 text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-sky-500/20"
                                title="Edit transaksi"
                                aria-label="Edit transaksi"
                              >
                                <PencilIcon className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetJournal(j)}
                                className="p-1.5 text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                                title="Hapus transaksi"
                                aria-label="Hapus transaksi"
                              >
                                <Trash2Icon className="size-4" />
                              </button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      {/* Dialog Entri Jurnal Umum / Penyesuaian */}
      <JournalEntryDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditingJournal(null);
        }}
        editingJournal={editingJournal}
        filterMode={filterMode}
        journalDate={journalDate}
        setJournalDate={setJournalDate}
        journalType={journalType}
        setJournalType={setJournalType}
        description={description}
        setDescription={setDescription}
        autoReverse={autoReverse}
        setAutoReverse={setAutoReverse}
        draftDebits={draftDebits}
        addDebitRow={addDebitRow}
        removeDebitRow={removeDebitRow}
        updateDebitRow={updateDebitRow}
        draftCredits={draftCredits}
        addCreditRow={addCreditRow}
        removeCreditRow={removeCreditRow}
        updateCreditRow={updateCreditRow}
        postableAccounts={postableAccounts}
        totalDraftDebit={totalDraftDebit}
        totalDraftCredit={totalDraftCredit}
        isDraftBalanced={isDraftBalanced}
        balanceDiff={balanceDiff}
        posting={posting}
        onSubmit={handlePostJournal}
        onCancel={() => {
          setCreateOpen(false);
          setEditingJournal(null);
        }}
      />

      {/* Dialog Jurnal Koreksi Resmi (BR-2) */}
      <JournalCorrectionDialog
        open={Boolean(correctTarget)}
        onOpenChange={(open) => {
          if (!open) setCorrectTarget(null);
        }}
        correctTarget={correctTarget}
        correctionDate={correctionDate}
        setCorrectionDate={setCorrectionDate}
        correctionReason={correctionReason}
        setCorrectionReason={setCorrectionReason}
        correcting={correcting}
        onSubmit={handleCreateCorrection}
        onCancel={() => setCorrectTarget(null)}
      />

      {/* Dialog Detail Jurnal (Icon Lihat) */}
      <JournalDetailDialog
        detailJournal={detailJournal}
        onClose={() => setDetailJournal(null)}
        lines={lines}
        accountMap={accountMap}
        onEdit={(target) => openEditJournal(target)}
      />

      {/* Konfirmasi Hapus Single (Icon Hapus) */}
      <ConfirmActionDialog
        open={Boolean(deleteTargetJournal)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetJournal(null);
        }}
        title="Hapus Transaksi Jurnal?"
        description={`Apakah Anda yakin ingin menghapus jurnal ${deleteTargetJournal?.journal_number ?? ""}? Seluruh baris debit dan kredit terkait akan dihapus dari buku besar. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Jurnal"
        destructive
        onConfirm={() =>
          deleteTargetJournal ? handleDeleteSingle(deleteTargetJournal) : Promise.resolve()
        }
      />

      {/* Konfirmasi Hapus Pilihan / Batch */}
      <ConfirmActionDialog
        open={isBatchDeleteDialogOpen}
        onOpenChange={setIsBatchDeleteDialogOpen}
        title={`Hapus ${selectedJournalIds.length} Transaksi Terpilih?`}
        description={`Apakah Anda yakin ingin menghapus secara massal ${selectedJournalIds.length} transaksi jurnal yang dipilih? Seluruh data mutasi dan baris buku besar terkait akan dihapus permanen.`}
        confirmLabel={`Ya, Hapus (${selectedJournalIds.length}) Jurnal`}
        destructive
        onConfirm={handleDeleteBatch}
      />

      {/* Komponen Portal Cetak A4 Standar Altcycles */}
      {journalPrintContent}
    </div>
  );
}

