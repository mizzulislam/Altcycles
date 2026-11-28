import type { FormEvent } from "react";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { useLanguage } from "@/lib/i18n";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
} from "@/types/database.types";
import {
  JournalEntryDialog,
  type DraftLineEntry,
} from "./journal-entry-dialog";
import { JournalCorrectionDialog } from "./journal-correction-dialog";
import { JournalDetailDialog } from "./journal-detail-dialog";

export interface JournalsActionDialogsProps {
  filterMode: "all" | "adjusting";
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  editingJournal: JournalRow | null;
  setEditingJournal: (j: JournalRow | null) => void;
  journalDate: string;
  setJournalDate: (val: string) => void;
  journalType: "general" | "adjustment";
  setJournalType: (val: "general" | "adjustment") => void;
  description: string;
  setDescription: (val: string) => void;
  autoReverse: boolean;
  setAutoReverse: (val: boolean) => void;
  draftDebits: DraftLineEntry[];
  addDebitRow: () => void;
  removeDebitRow: (idx: number) => void;
  updateDebitRow: (idx: number, patch: Partial<DraftLineEntry>) => void;
  draftCredits: DraftLineEntry[];
  addCreditRow: () => void;
  removeCreditRow: (idx: number) => void;
  updateCreditRow: (idx: number, patch: Partial<DraftLineEntry>) => void;
  postableAccounts: AccountRow[];
  totalDraftDebit: number;
  totalDraftCredit: number;
  isDraftBalanced: boolean;
  balanceDiff: number;
  posting: boolean;
  onSubmitJournal: (e: FormEvent) => Promise<void>;
  correctTarget: JournalRow | null;
  setCorrectTarget: (j: JournalRow | null) => void;
  correctionDate: string;
  setCorrectionDate: (val: string) => void;
  correctionReason: string;
  setCorrectionReason: (val: string) => void;
  correcting: boolean;
  onSubmitCorrection: (e: FormEvent) => Promise<void>;
  detailJournal: JournalRow | null;
  setDetailJournal: (j: JournalRow | null) => void;
  lines: JournalLineRow[];
  accountMap: Map<string, AccountRow>;
  onOpenEditJournal: (j: JournalRow) => void;
  deleteTargetJournal: JournalRow | null;
  setDeleteTargetJournal: (j: JournalRow | null) => void;
  onDeleteSingle: (j: JournalRow) => Promise<void>;
  isBatchDeleteDialogOpen: boolean;
  setIsBatchDeleteDialogOpen: (open: boolean) => void;
  selectedJournalIds: string[];
  onDeleteBatch: () => Promise<void>;
}

export function JournalsActionDialogs(props: JournalsActionDialogsProps) {
  const {
    filterMode,
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
    addDebitRow,
    removeDebitRow,
    updateDebitRow,
    draftCredits,
    addCreditRow,
    removeCreditRow,
    updateCreditRow,
    postableAccounts,
    totalDraftDebit,
    totalDraftCredit,
    isDraftBalanced,
    balanceDiff,
    posting,
    onSubmitJournal,
    correctTarget,
    setCorrectTarget,
    correctionDate,
    setCorrectionDate,
    correctionReason,
    setCorrectionReason,
    correcting,
    onSubmitCorrection,
    detailJournal,
    setDetailJournal,
    lines,
    accountMap,
    onOpenEditJournal,
    deleteTargetJournal,
    setDeleteTargetJournal,
    onDeleteSingle,
    isBatchDeleteDialogOpen,
    setIsBatchDeleteDialogOpen,
    selectedJournalIds,
    onDeleteBatch,
  } = props;

  const { t } = useLanguage();

  return (
    <>
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
        onSubmit={onSubmitJournal}
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
        onSubmit={onSubmitCorrection}
        onCancel={() => setCorrectTarget(null)}
      />

      {/* Dialog Detail Jurnal (Icon Lihat) */}
      <JournalDetailDialog
        detailJournal={detailJournal}
        onClose={() => setDetailJournal(null)}
        lines={lines}
        accountMap={accountMap}
        onEdit={(target) => onOpenEditJournal(target)}
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
          deleteTargetJournal ? onDeleteSingle(deleteTargetJournal) : Promise.resolve()
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
        onConfirm={onDeleteBatch}
      />
    </>
  );
}
