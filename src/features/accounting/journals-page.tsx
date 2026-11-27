import * as React from "react";
import {
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { type SemanticTone } from "@/components/shared/status-badge";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { TableSortMenu } from "@/components/shared/table-sort-menu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  getCompanyProfile,
  listAccounts,
  listProjects,
} from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { JournalsPrintContent } from "./components/journals-print-content";
import { JournalsTable } from "./components/journals-table";
import { formatDateID, roundRupiah } from "@/lib/formatters";
import {
  getLocalizedPeriodName,
} from "@/lib/glossary";
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
  const { t, language } = useLanguage();
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
  const [sortKey, setSortKey] = React.useState<"date" | "number" | "description">("date");
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
        t(
          "accounting:journals.toast_lock_edit",
          "Kunci jurnal sedang aktif. Untuk mengedit atau menghapus transaksi jurnal, Super Admin perlu membuka kunci jurnal di menu Pengaturan & Kontrol Akuntansi.",
        ),
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
        t(
          "accounting:journals.toast_unbalanced",
          "Jurnal belum seimbang: Total Debit wajib sama dengan Total Kredit dan bernilai di atas Rp0.",
        ),
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
          t("accounting:journals.toast_updated", {
            number: editingJournal.journal_number,
            defaultValue: `Jurnal ${editingJournal.journal_number} berhasil diperbarui.`,
          }),
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
        toast.success(
          t(
            "accounting:journals.toast_posted",
            "Jurnal berhasil diposting ke Buku Besar.",
          ),
        );
      }
      setCreateOpen(false);
      setEditingJournal(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:journals.toast_save_error", "Gagal menyimpan jurnal."),
      );
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteSingle(journal: JournalRow) {
    if (journalLockEnabled) {
      toast.error(
        t(
          "accounting:journals.toast_lock_delete",
          "Kunci jurnal sedang aktif. Jurnal tidak dapat dihapus saat kunci jurnal aktif. Hubungi Super Admin di Pengaturan & Kontrol Akuntansi untuk membuka mode testing.",
        ),
      );
      return;
    }
    try {
      await deleteJournals([journal.id]);
      toast.success(
        t("accounting:journals.toast_deleted", {
          number: journal.journal_number,
          defaultValue: `Jurnal ${journal.journal_number} berhasil dihapus.`,
        }),
      );
      setSelectedJournalIds((prev) => prev.filter((id) => id !== journal.id));
      setDeleteTargetJournal(null);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("accounting:journals.toast_delete_error", "Gagal menghapus jurnal."),
      );
    }
  }

  async function handleDeleteBatch() {
    if (selectedJournalIds.length === 0) return;
    if (journalLockEnabled) {
      toast.error(
        t(
          "accounting:journals.toast_lock_delete",
          "Kunci jurnal sedang aktif. Jurnal tidak dapat dihapus saat kunci jurnal aktif. Hubungi Super Admin di Pengaturan & Kontrol Akuntansi untuk membuka mode testing.",
        ),
      );
      return;
    }
    try {
      await deleteJournals(selectedJournalIds);
      toast.success(
        t("accounting:journals.toast_batch_deleted", {
          count: selectedJournalIds.length,
          defaultValue: `${selectedJournalIds.length} transaksi jurnal berhasil dihapus.`,
        }),
      );
      setSelectedJournalIds([]);
      setIsBatchDeleteDialogOpen(false);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t(
              "accounting:journals.toast_batch_delete_error",
              "Gagal menghapus jurnal pilihan.",
            ),
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
        t("accounting:journals.toast_correction_posted", {
          number: correctTarget.journal_number,
          defaultValue: `Jurnal koreksi resmi atas ${correctTarget.journal_number} berhasil diposting.`,
        }),
      );
      setCorrectTarget(null);
      setCorrectionReason("");
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t(
              "accounting:journals.toast_correction_error",
              "Gagal menerbitkan jurnal koreksi.",
            ),
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
      let cmp = 0;
      if (sortKey === "date") {
        cmp =
          a.journal_date.localeCompare(b.journal_date) ||
          a.journal_number.localeCompare(b.journal_number);
      } else if (sortKey === "number") {
        cmp = a.journal_number.localeCompare(b.journal_number);
      } else if (sortKey === "description") {
        cmp = a.description.localeCompare(b.description);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredJournals, sortKey, sortOrder]);

  const printAreaId = `altcycles-journal-print-${filterMode}`;

  const printPeriodLabel =
    externalStartDate && externalEndDate
      ? getLocalizedPeriodName(
          `${formatDateID(externalStartDate)} s.d. ${formatDateID(externalEndDate)}`,
          language,
        )
      : periodFilter === "ALL"
        ? t("accounting:journals.all_periods", "Semua Periode")
        : getLocalizedPeriodName(periodFilter, language);

  const printDocTitle =
    filterMode === "adjusting"
      ? t("accounting:journals.print_adj_title", "Jurnal Penyesuaian & Koreksi")
      : t("accounting:journals.print_gen_title", "Jurnal Umum");

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
    <JournalsPrintContent
      printAreaId={printAreaId}
      company={company}
      printDocTitle={printDocTitle}
      periodLabel={printPeriodLabel}
      sortedJournals={sortedJournals}
      lines={lines}
      accountMap={accountMap}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Penerapan Asumsi Akuntansi Keuangan - Tampil pada Tab Jurnal Penyesuaian (Splitz Style) */}
      {filterMode === "adjusting" && (
        <Card className="p-5 border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontalIcon className="size-4 text-primary dark:text-cyan-400" />
            <h3 className="font-bold text-sm text-foreground">
              {t("accounting:journals.assumptions_title", "Penerapan Asumsi Akuntansi Keuangan")}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">
                  {t("accounting:journals.assumption_periodicity", "Periodisitas (Periodicity)")}
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t(
                  "accounting:journals.assumption_periodicity_desc",
                  "Membagi aktivitas ekonomi entitas ke dalam periode waktu bulanan/tahunan untuk penyajian laporan yang tepat waktu dan relevan.",
                )}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">
                  {t("accounting:journals.assumption_deferral", "Penangguhan (Deferral)")}
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t(
                  "accounting:journals.assumption_deferral_desc",
                  "Pendapatan diterima dimuka dicatat sebagai kewajiban dan direalisasikan bertahap menjadi pendapatan pada periode manfaat.",
                )}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">
                  {t("accounting:journals.assumption_accrual", "Asas Akrual (Accrual Basis)")}
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t(
                  "accounting:journals.assumption_accrual_desc",
                  "Mencatat pengaruh transaksi pada periode terjadinya, bukan sekadar saat kas diterima atau dikeluarkan, guna mencerminkan posisi keuangan yang andal.",
                )}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">
                  {t("accounting:journals.assumption_depreciation", "Depresiasi (Depreciation)")}
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t(
                  "accounting:journals.assumption_depreciation_desc",
                  "Mengalokasikan harga perolehan aset tetap secara berkala ke Beban Penyusutan berpasangan dengan Akumulasi Penyusutan.",
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={
            filterMode === "adjusting"
              ? t("accounting:journals.adj_book", "Buku Jurnal Penyesuaian (AJP)")
              : t("accounting:journals.daily_book", "Buku Jurnal Harian")
          }
          description={
            filterMode === "adjusting"
              ? t(
                  "accounting:journals.adj_subtitle",
                  "Kelola penyesuaian akrual, amortisasi, dan penerbitan jurnal koreksi transaksi dengan jejak audit.",
                )
              : t(
                  "accounting:journals.general_subtitle",
                  "Daftar historis seluruh transaksi akuntansi keuangan secara kronologis.",
                )
          }
          controls={
            <div className="flex flex-wrap items-center gap-2.5">
              <TableSortMenu
                options={[
                  { key: "date", label: t("accounting:journals.col_date", "Tanggal Transaksi") },
                  { key: "number", label: t("accounting:journals.col_number", "Nomor Bukti") },
                  { key: "description", label: t("accounting:journals.col_desc", "Keterangan") },
                ]}
                selectedKey={sortKey}
                sortDirection={sortOrder}
                onSortChange={(key, dir) => {
                  setSortKey(key as any);
                  setSortOrder(dir);
                }}
                defaultKey="date"
                defaultDirection="desc"
              />

              {sortedJournals.length === 0 && !isEditMode ? null : !isEditMode ? (
                <ActionTooltip content={t("common:action.edit", "Edit")}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditMode(true)}
                    className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs hover:bg-muted/70 hover:border-primary/40 text-primary"
                    aria-label={t("common:action.edit", "Edit")}
                  >
                    <PencilIcon className="size-4" />
                    <span className="sr-only">{t("common:action.edit", "Edit")}</span>
                  </Button>
                </ActionTooltip>
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
                    className="h-9 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {t("common:action.cancel", "Batal")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsBatchDeleteDialogOpen(true)}
                    disabled={selectedJournalIds.length === 0}
                    className="h-9 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {t("common:action.delete_selected", "Hapus Pilihan")} ({selectedJournalIds.length})
                  </Button>
                </div>
              )}

              <ExportDownloadMenu
                label={t("common:action.export_download", "Unduh / Ekspor")}
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                onExportCsv={handleExportCsv}
                size="icon"
              />

              <ActionTooltip
                content={
                  filterMode === "adjusting"
                    ? t("accounting:journals.btn_record_adj", "Catat Jurnal Penyesuaian")
                    : t("accounting:journals.btn_record", "Catat Transaksi")
                }
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={openNewJournal}
                  className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs hover:bg-muted/70 hover:border-primary/40 text-primary"
                  aria-label={
                    filterMode === "adjusting"
                      ? t("accounting:journals.btn_record_adj", "Catat Jurnal Penyesuaian")
                      : t("accounting:journals.btn_record", "Catat Transaksi")
                  }
                >
                  <PlusIcon className="size-4" />
                  <span className="sr-only">
                    {filterMode === "adjusting"
                      ? t("accounting:journals.btn_record_adj", "Catat Jurnal Penyesuaian")
                      : t("accounting:journals.btn_record", "Catat Transaksi")}
                  </span>
                </Button>
              </ActionTooltip>
            </div>
          }
        />
        <CardContent className="p-0">
          <JournalsTable
            loading={loading}
            sortedJournals={sortedJournals}
            lines={lines}
            accounts={accounts}
            isEditMode={isEditMode}
            filterMode={filterMode}
            selectedJournalIds={selectedJournalIds}
            setSelectedJournalIds={setSelectedJournalIds}
            onOpenDetail={(j) => {
              setDetailJournal(j);
            }}
            onOpenEdit={openEditJournal}
            onOpenCorrection={(j) => {
              setCorrectTarget(j);
            }}
            onDeleteSingle={handleDeleteSingle}
          />
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
        title={t("accounting:journals.delete_single_title", "Hapus Transaksi Jurnal?")}
        description={t("accounting:journals.delete_single_desc", {
          number: deleteTargetJournal?.journal_number ?? "",
          defaultValue: `Apakah Anda yakin ingin menghapus jurnal ${deleteTargetJournal?.journal_number ?? ""}? Seluruh baris debit dan kredit terkait akan dihapus dari buku besar. Tindakan ini tidak dapat dibatalkan.`,
        })}
        confirmLabel={t("accounting:journals.delete_single_confirm", "Ya, Hapus Jurnal")}
        destructive
        onConfirm={() =>
          deleteTargetJournal ? handleDeleteSingle(deleteTargetJournal) : Promise.resolve()
        }
      />

      {/* Konfirmasi Hapus Pilihan / Batch */}
      <ConfirmActionDialog
        open={isBatchDeleteDialogOpen}
        onOpenChange={setIsBatchDeleteDialogOpen}
        title={t("accounting:journals.delete_batch_title", {
          count: selectedJournalIds.length,
          defaultValue: `Hapus ${selectedJournalIds.length} Transaksi Terpilih?`,
        })}
        description={t("accounting:journals.delete_batch_desc", {
          count: selectedJournalIds.length,
          defaultValue: `Apakah Anda yakin ingin menghapus secara massal ${selectedJournalIds.length} transaksi jurnal yang dipilih? Seluruh data mutasi dan baris buku besar terkait akan dihapus permanen.`,
        })}
        confirmLabel={t("accounting:journals.delete_batch_confirm", {
          count: selectedJournalIds.length,
          defaultValue: `Ya, Hapus (${selectedJournalIds.length}) Jurnal`,
        })}
        destructive
        onConfirm={handleDeleteBatch}
      />

      {/* Komponen Portal Cetak A4 Standar Altcycles */}
      {journalPrintContent}
    </div>
  );
}

