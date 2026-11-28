import * as React from "react";
import { toast } from "sonner";
import {
  getCompanyProfile,
  listAccounts,
  listProjects,
} from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { roundRupiah } from "@/lib/formatters";
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
  ProjectRow,
} from "@/types/database.types";
import type { DraftLineEntry } from "./journal-entry-dialog";
import type { JournalsPageProps } from "../journals-page";

export function useJournalsPageState(props: JournalsPageProps = {}) {
  const {
    initialTypeFilter = "ALL",
    filterMode = "all",
    externalPeriodFilter,
    externalStartDate,
    externalEndDate,
    externalProjectFilter,
    externalTypeFilter,
  } = props;

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
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

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

  // Mode Edit Riwayat & Aksi Baris
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

      if (filterMode === "adjusting") {
        if (j.journal_type !== "adjustment") return false;
      } else {
        const activeType = externalTypeFilter ?? typeFilter;
        if (activeType === "ALL") {
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

  return {
    t,
    language,
    journals,
    lines,
    accounts,
    projects,
    company,
    loading,
    periodFilter,
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder,
    createOpen,
    setCreateOpen,
    editingJournal,
    setEditingJournal,
    journalDate,
    setJournalDate,
    journalType,
    setJournalType,
    description,
    setDescription,
    autoReverse,
    setAutoReverse,
    draftDebits,
    draftCredits,
    posting,
    isEditMode,
    setIsEditMode,
    selectedJournalIds,
    setSelectedJournalIds,
    journalLockEnabled,
    detailJournal,
    setDetailJournal,
    deleteTargetJournal,
    setDeleteTargetJournal,
    isBatchDeleteDialogOpen,
    setIsBatchDeleteDialogOpen,
    correctTarget,
    setCorrectTarget,
    correctionDate,
    setCorrectionDate,
    correctionReason,
    setCorrectionReason,
    correcting,
    postableAccounts,
    accountMap,
    projectMap,
    openNewJournal,
    openEditJournal,
    addDebitRow,
    removeDebitRow,
    updateDebitRow,
    addCreditRow,
    removeCreditRow,
    updateCreditRow,
    totalDraftDebit,
    totalDraftCredit,
    isDraftBalanced,
    balanceDiff,
    handlePostJournal,
    handleDeleteSingle,
    handleDeleteBatch,
    handleCreateCorrection,
    filteredJournals,
    sortedJournals,
    reload,
  };
}
