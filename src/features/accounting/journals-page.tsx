import { type SemanticTone } from "@/components/shared/status-badge";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateID } from "@/lib/formatters";
import { getLocalizedPeriodName } from "@/lib/glossary";
import type { JournalType } from "@/types/database.types";
import { JournalsPrintContent } from "./components/journals-print-content";
import { JournalsTable } from "./components/journals-table";
import { JournalsAccountingAssumptions } from "./components/journals-accounting-assumptions";
import { JournalsToolbarControls } from "./components/journals-toolbar-controls";
import { JournalsActionDialogs } from "./components/journals-action-dialogs";
import { useJournalsPageState } from "./components/use-journals-page-state";
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

export function JournalsPage(props: JournalsPageProps = {}) {
  const {
    filterMode = "all",
    externalStartDate,
    externalEndDate,
  } = props;

  const state = useJournalsPageState(props);
  const {
    t,
    language,
    lines,
    accounts,
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
  } = state;

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

  return (
    <div className="flex flex-col gap-6">
      {filterMode === "adjusting" && <JournalsAccountingAssumptions />}

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
            <JournalsToolbarControls
              filterMode={filterMode}
              sortedJournals={sortedJournals}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSortChange={(key, dir) => {
                setSortKey(key);
                setSortOrder(dir);
              }}
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              selectedJournalIds={selectedJournalIds}
              setSelectedJournalIds={setSelectedJournalIds}
              setIsBatchDeleteDialogOpen={setIsBatchDeleteDialogOpen}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
              onOpenNewJournal={openNewJournal}
            />
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

      <JournalsActionDialogs
        filterMode={filterMode}
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        editingJournal={editingJournal}
        setEditingJournal={setEditingJournal}
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
        onSubmitJournal={handlePostJournal}
        correctTarget={correctTarget}
        setCorrectTarget={setCorrectTarget}
        correctionDate={correctionDate}
        setCorrectionDate={setCorrectionDate}
        correctionReason={correctionReason}
        setCorrectionReason={setCorrectionReason}
        correcting={correcting}
        onSubmitCorrection={handleCreateCorrection}
        detailJournal={detailJournal}
        setDetailJournal={setDetailJournal}
        lines={lines}
        accountMap={accountMap}
        onOpenEditJournal={openEditJournal}
        deleteTargetJournal={deleteTargetJournal}
        setDeleteTargetJournal={setDeleteTargetJournal}
        onDeleteSingle={handleDeleteSingle}
        isBatchDeleteDialogOpen={isBatchDeleteDialogOpen}
        setIsBatchDeleteDialogOpen={setIsBatchDeleteDialogOpen}
        selectedJournalIds={selectedJournalIds}
        onDeleteBatch={handleDeleteBatch}
      />

      <JournalsPrintContent
        printAreaId={printAreaId}
        company={company}
        printDocTitle={printDocTitle}
        periodLabel={printPeriodLabel}
        sortedJournals={sortedJournals}
        lines={lines}
        accountMap={accountMap}
      />
    </div>
  );
}
