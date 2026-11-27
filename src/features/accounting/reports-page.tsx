import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutGridIcon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { TOOLBAR_BUTTON_CLASS } from "@/components/shared/toolbar-button";
import { PageLoader } from "@/components/ui/loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildBalanceSheet,
  buildCashFlowStatement,
  buildGeneralLedger,
  buildIncomeStatement,
  buildTrialBalance,
} from "@/lib/accounting-engine";
import {
  getCompanyProfile,
  listAccounts,
  listProjects,
} from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { listJournalsWithLines } from "@/lib/operations-service";
import type {
  AccountRow,
  CompanyProfileRow,
  JournalLineRow,
  JournalRow,
  ProjectRow,
} from "@/types/database.types";
import {
  exportReportToCsv,
  exportReportToExcel,
  exportReportToPdf,
  type ReportExportData,
} from "./reports/reports-export-handlers";
import {
  IncomeStatementCard,
  IncomeStatementView,
} from "./reports/income-statement-view";
import {
  EquityStatementCard,
  EquityStatementView,
} from "./reports/equity-statement-view";
import {
  BalanceSheetCard,
  BalanceSheetView,
} from "./reports/balance-sheet-view";
import {
  CashFlowCard,
  CashFlowView,
} from "./reports/cash-flow-view";
import { TrialBalanceView } from "./reports/trial-balance-view";
import { GeneralLedgerView } from "./reports/general-ledger-view";
import { ReportsPrintContent } from "./reports/reports-print-content";
import { PageHeader } from "@/components/shared/page-header";

export type ActiveReportTab =
  | "buku_besar"
  | "neraca_saldo"
  | "laba_rugi"
  | "ekuitas"
  | "neraca"
  | "arus_kas";

export interface AccountingReportsPageProps {
  mode?: "all" | "ledger" | "trial_balance" | "statements";
  hideHeader?: boolean;
  initialTab?: ActiveReportTab;
  externalStartDate?: string;
  externalEndDate?: string;
  externalProjectFilter?: string;
}

export function AccountingReportsPage({
  mode = "all",
  hideHeader = false,
  initialTab,
  externalStartDate,
  externalEndDate,
  externalProjectFilter,
}: AccountingReportsPageProps = {}) {
  const { t } = useLanguage();
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  const defaultTab: ActiveReportTab =
    initialTab ??
    (mode === "ledger"
      ? "buku_besar"
      : mode === "trial_balance"
        ? "neraca_saldo"
        : "laba_rugi");
  const [activeTab, setActiveTab] = React.useState<ActiveReportTab>(defaultTab);
  const [layoutMode, setLayoutMode] = React.useState<"grid" | "single">("single");
  const [startDate, setStartDate] = React.useState(externalStartDate || "2026-11-01");
  const [endDate, setEndDate] = React.useState(externalEndDate || "2027-01-31");
  const [projectFilter, setProjectFilter] = React.useState(externalProjectFilter || "ALL");
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] =
    React.useState("ALL");
  const [balanceType, setBalanceType] = React.useState<"unadjusted" | "adjusted">("adjusted");

  React.useEffect(() => {
    if (externalStartDate) setStartDate(externalStartDate);
    if (externalEndDate) setEndDate(externalEndDate);
    if (externalProjectFilter) setProjectFilter(externalProjectFilter);
  }, [externalStartDate, externalEndDate, externalProjectFilter]);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accs, jRes, prjRes, comp] = await Promise.all([
          listAccounts(),
          listJournalsWithLines(),
          listProjects(),
          getCompanyProfile(),
        ]);
        setAccounts(accs);
        setJournals(jRes.journals);
        setLines(jRes.lines);
        setProjects(prjRes.projects);
        setCompany(comp);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Gagal memuat laporan keuangan.",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const postableAccounts = React.useMemo(
    () => accounts.filter((a) => a.is_postable),
    [accounts],
  );

  const effectiveProjectId =
    projectFilter === "ALL" ? undefined : projectFilter;

  const isAllAccounts =
    !selectedLedgerAccountId || selectedLedgerAccountId === "ALL";

  const selectedAccount = React.useMemo(
    () =>
      isAllAccounts
        ? undefined
        : postableAccounts.find((a) => a.id === selectedLedgerAccountId),
    [isAllAccounts, postableAccounts, selectedLedgerAccountId],
  );

  const ledgerRows = React.useMemo(() => {
    if (!selectedAccount) return [];
    return buildGeneralLedger(selectedAccount, journals, lines, projects, {
      startDate,
      endDate,
      projectId: effectiveProjectId,
    });
  }, [selectedAccount, journals, lines, projects, startDate, endDate, effectiveProjectId]);

  const selectedLedgerEndingBalance =
    ledgerRows.length > 0 ? (ledgerRows[ledgerRows.length - 1]?.runningBalance ?? 0) : 0;

  const allLedgers = React.useMemo(() => {
    return postableAccounts
      .map((acc) => {
        const rows = buildGeneralLedger(acc, journals, lines, projects, {
          startDate,
          endDate,
          projectId: effectiveProjectId,
        });
        const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
        const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);
        const endingBalance =
          rows.length > 0 ? (rows[rows.length - 1]?.runningBalance ?? 0) : 0;
        return {
          account: acc,
          rows,
          totalDebit,
          totalCredit,
          endingBalance,
        };
      })
      .filter((item) => item.rows.length > 0);
  }, [postableAccounts, journals, lines, projects, startDate, endDate, effectiveProjectId]);

  const filteredJournalsForTB = React.useMemo(() => {
    if (balanceType === "unadjusted") {
      return journals.filter((j) => j.journal_type !== "adjustment");
    }
    return journals;
  }, [journals, balanceType]);

  const trialBalance = React.useMemo(
    () =>
      buildTrialBalance(accounts, filteredJournalsForTB, lines, {
        endDate,
        projectId: effectiveProjectId,
      }),
    [accounts, filteredJournalsForTB, lines, endDate, effectiveProjectId],
  );

  const incomeStatement = React.useMemo(
    () =>
      buildIncomeStatement(accounts, journals, lines, {
        startDate,
        endDate,
        projectId: effectiveProjectId,
      }),
    [accounts, journals, lines, startDate, endDate, effectiveProjectId],
  );

  const balanceSheet = React.useMemo(
    () => buildBalanceSheet(accounts, journals, lines, projects, endDate),
    [accounts, journals, lines, projects, endDate],
  );

  const cashFlow = React.useMemo(
    () => buildCashFlowStatement(accounts, journals, lines, { startDate, endDate }),
    [accounts, journals, lines, startDate, endDate],
  );

  // Perhitungan Laporan Perubahan Ekuitas (Statement of Changes in Equity)
  const beginningRetainedEarnings = React.useMemo(() => {
    const retainedAcc = postableAccounts.find(
      (a) => a.system_tag === "retained_earnings" || a.code === "3-1201",
    );
    if (!retainedAcc) return 0;
    const pastLines = lines.filter((l) => {
      const j = journals.find((jrn) => jrn.id === l.journal_id);
      return (
        j &&
        j.status === "posted" &&
        j.journal_date < startDate &&
        l.account_id === retainedAcc.id
      );
    });
    return pastLines.reduce((s, l) => s + (l.credit - l.debit), 0);
  }, [postableAccounts, lines, journals, startDate]);

  const modalDisetorBalance = React.useMemo(() => {
    const modalAcc = postableAccounts.find((a) => a.code === "3-1101");
    if (!modalAcc) return 0;
    const allModalLines = lines.filter((l) => {
      const j = journals.find((jrn) => jrn.id === l.journal_id);
      return (
        j &&
        j.status === "posted" &&
        j.journal_date <= endDate &&
        l.account_id === modalAcc.id
      );
    });
    return allModalLines.reduce((s, l) => s + (l.credit - l.debit), 0);
  }, [postableAccounts, lines, journals, endDate]);

  const netIncome = incomeStatement.netProfit;
  const dividends = 0;
  const endingRetainedEarnings = beginningRetainedEarnings + netIncome - dividends;
  const totalEndingEquity = modalDisetorBalance + endingRetainedEarnings;

  const currentAssets = React.useMemo(
    () =>
      balanceSheet.assets.filter(
        (a) => a.code.startsWith("1-1") || a.code.startsWith("1-2"),
      ),
    [balanceSheet.assets],
  );
  const fixedAssets = React.useMemo(
    () =>
      balanceSheet.assets.filter(
        (a) => !a.code.startsWith("1-1") && !a.code.startsWith("1-2"),
      ),
    [balanceSheet.assets],
  );
  const totalCurrentAssets = React.useMemo(
    () =>
      currentAssets.reduce((s, a) => s + a.amount, 0) +
      balanceSheet.contractAssets.reduce((s, ca) => s + ca.netContractPosition, 0),
    [currentAssets, balanceSheet.contractAssets],
  );
  const totalFixedAssets = React.useMemo(
    () => fixedAssets.reduce((s, a) => s + a.amount, 0),
    [fixedAssets],
  );

  const currentLiabilities = React.useMemo(
    () => balanceSheet.liabilities.filter((l) => l.code.startsWith("2-1")),
    [balanceSheet.liabilities],
  );
  const longTermLiabilities = React.useMemo(
    () => balanceSheet.liabilities.filter((l) => !l.code.startsWith("2-1")),
    [balanceSheet.liabilities],
  );
  const totalCurrentLiabilities = React.useMemo(
    () =>
      currentLiabilities.reduce((s, l) => s + l.amount, 0) +
      balanceSheet.contractLiabilities.reduce(
        (s, cl) => s + Math.abs(cl.netContractPosition),
        0,
      ),
    [currentLiabilities, balanceSheet.contractLiabilities],
  );
  const totalLongTermLiabilities = React.useMemo(
    () => longTermLiabilities.reduce((s, l) => s + l.amount, 0),
    [longTermLiabilities],
  );
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  const totalEquity = React.useMemo(
    () =>
      balanceSheet.equities.reduce((s, eq) => s + eq.amount, 0) +
      balanceSheet.currentUnclosedEarnings,
    [balanceSheet.equities, balanceSheet.currentUnclosedEarnings],
  );

  const isBalanced =
    Math.abs(trialBalance.sumEndingDebit - trialBalance.sumEndingCredit) < 1;
  const balanceDifference = Math.abs(
    trialBalance.sumEndingDebit - trialBalance.sumEndingCredit,
  );

  const exportData: ReportExportData = {
    company,
    activeTab,
    mode,
    layoutMode,
    startDate,
    endDate,
    isAllAccounts,
    allLedgers,
    selectedAccount,
    selectedLedgerEndingBalance,
    ledgerRows,
    trialBalance,
    balanceType,
    incomeStatement,
    beginningRetainedEarnings,
    endingRetainedEarnings,
    dividends,
    balanceSheet,
    totalLiabilities,
    currentAssets,
    currentLiabilities,
    totalCurrentAssets,
    totalCurrentLiabilities,
    totalEquity,
    cashFlow,
    modalDisetorBalance,
    totalEndingEquity,
  };

  const handleExportActivePdf = async () => {
    await exportReportToPdf(exportData);
  };

  const handleExportActiveExcel = async () => {
    await exportReportToExcel(exportData);
  };

  const handleExportCsv = async () => {
    await exportReportToCsv(exportData);
  };

  if (loading) {
    return (
      <PageLoader
        message={t(
          "accounting:reports.loading",
          "Menyusun laporan keuangan berbasis akrual...",
        )}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!hideHeader && (
        <PageHeader
          title={t("accounting:reports.accrual_title", "Laporan Keuangan Akrual")}
          description={t(
            "accounting:reports.accrual_subtitle",
            "Sajikan laporan posisi keuangan, laba rugi, arus kas, dan neraca saldo berbasis akrual.",
          )}
        />
      )}

      {mode === "statements" ? (
        <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-6">
          <CardHeaderWithInfo
            title={t("accounting:reports.title", "Laporan Keuangan")}
            description={t(
              "accounting:reports.subtitle",
              "Laporan kinerja laba rugi, posisi keuangan, neraca saldo, dan arus kas.",
            )}
            headerClassName="px-0 py-0 pb-4 border-b border-border/60"
            controls={
              <div className="flex items-center gap-2">
                {/* Toggle Layout Mode (Icon Only) */}
                <div className="flex items-center gap-1 bg-muted/40 border border-border/70 rounded-xl p-1 shadow-xs">
                  <ActionTooltip content={t("accounting:reports.layout_all", "Semua Laporan")}>
                    <button
                      type="button"
                      onClick={() => setLayoutMode("grid")}
                      className={cn(
                        "size-7 flex items-center justify-center rounded-lg transition-all cursor-pointer",
                        layoutMode === "grid"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                      )}
                      aria-label={t("accounting:reports.layout_all", "Semua Laporan")}
                    >
                      <LayoutGridIcon className="size-3.5" />
                      <span className="sr-only">{t("accounting:reports.layout_all", "Semua Laporan")}</span>
                    </button>
                  </ActionTooltip>
                  <ActionTooltip content={t("accounting:reports.layout_single", "Satu Halaman")}>
                    <button
                      type="button"
                      onClick={() => setLayoutMode("single")}
                      className={cn(
                        "size-7 flex items-center justify-center rounded-lg transition-all cursor-pointer",
                        layoutMode === "single"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                      )}
                      aria-label={t("accounting:reports.layout_single", "Satu Halaman")}
                    >
                      <BookOpenIcon className="size-3.5" />
                      <span className="sr-only">{t("accounting:reports.layout_single", "Satu Halaman")}</span>
                    </button>
                  </ActionTooltip>
                </div>

                <ExportDownloadMenu
                  label={t("common:action.export_download", "Unduh / Ekspor")}
                  onExportExcel={handleExportActiveExcel}
                  onExportPdf={handleExportActivePdf}
                  onExportCsv={handleExportCsv}
                  size="icon"
                  mobileFloating
                />
              </div>
            }
          />

          {/* Content Area */}
          {layoutMode === "grid" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <IncomeStatementCard
                incomeStatement={incomeStatement}
                onDownload={() =>
                  void exportReportToPdf({
                    ...exportData,
                    activeTab: "laba_rugi",
                    layoutMode: "single",
                  })
                }
              />
              <EquityStatementCard
                beginningRetainedEarnings={beginningRetainedEarnings}
                netProfit={netIncome}
                dividends={dividends}
                endingRetainedEarnings={endingRetainedEarnings}
                modalDisetorBalance={modalDisetorBalance}
                totalEndingEquity={totalEndingEquity}
                onDownload={() =>
                  void exportReportToPdf({
                    ...exportData,
                    activeTab: "ekuitas",
                    layoutMode: "single",
                  })
                }
              />
              <BalanceSheetCard
                balanceSheet={balanceSheet}
                modalDisetorBalance={modalDisetorBalance}
                endingRetainedEarnings={endingRetainedEarnings}
                totalEndingEquity={totalEndingEquity}
                onDownload={() =>
                  void exportReportToPdf({
                    ...exportData,
                    activeTab: "neraca",
                    layoutMode: "single",
                  })
                }
              />
              <CashFlowCard
                cashFlow={cashFlow}
                onDownload={() =>
                  void exportReportToPdf({
                    ...exportData,
                    activeTab: "arus_kas",
                    layoutMode: "single",
                  })
                }
              />
            </div>
          ) : (
            <div className="w-full">
              {(() => {
                const reportNavigation = (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ActionTooltip content={t("common:action.previous", "Sebelumnya")}>
                      <button
                        type="button"
                        onClick={() => {
                          const tabs: ActiveReportTab[] = ["laba_rugi", "ekuitas", "neraca", "arus_kas"];
                          const idx = tabs.indexOf(activeTab);
                          const prevIdx = (idx - 1 + tabs.length) % tabs.length;
                          setActiveTab(tabs[prevIdx]!);
                        }}
                        className={TOOLBAR_BUTTON_CLASS}
                        aria-label={t("common:action.previous", "Laporan Sebelumnya")}
                      >
                        <ChevronLeftIcon className="size-4" />
                        <span className="sr-only">{t("common:action.previous", "Sebelumnya")}</span>
                      </button>
                    </ActionTooltip>
                    <ActionTooltip content={t("common:action.next", "Selanjutnya")}>
                      <button
                        type="button"
                        onClick={() => {
                          const tabs: ActiveReportTab[] = ["laba_rugi", "ekuitas", "neraca", "arus_kas"];
                          const idx = tabs.indexOf(activeTab);
                          const nextIdx = (idx + 1) % tabs.length;
                          setActiveTab(tabs[nextIdx]!);
                        }}
                        className={TOOLBAR_BUTTON_CLASS}
                        aria-label={t("common:action.next", "Laporan Selanjutnya")}
                      >
                        <ChevronRightIcon className="size-4" />
                        <span className="sr-only">{t("common:action.next", "Selanjutnya")}</span>
                      </button>
                    </ActionTooltip>
                  </div>
                );

                return (
                  <>
                    {activeTab === "laba_rugi" && (
                      <IncomeStatementView
                        incomeStatement={incomeStatement}
                        startDate={startDate}
                        endDate={endDate}
                        projectFilter={projectFilter}
                        projects={projects}
                        navigationControls={reportNavigation}
                      />
                    )}
                    {activeTab === "ekuitas" && (
                      <EquityStatementView
                        startDate={startDate}
                        endDate={endDate}
                        beginningRetainedEarnings={beginningRetainedEarnings}
                        netProfit={netIncome}
                        dividends={dividends}
                        endingRetainedEarnings={endingRetainedEarnings}
                        modalDisetorBalance={modalDisetorBalance}
                        totalEndingEquity={totalEndingEquity}
                        navigationControls={reportNavigation}
                      />
                    )}
                    {activeTab === "neraca" && (
                      <BalanceSheetView
                        balanceSheet={balanceSheet}
                        endDate={endDate}
                        navigationControls={reportNavigation}
                      />
                    )}
                    {activeTab === "arus_kas" && (
                      <CashFlowView
                        cashFlow={cashFlow}
                        startDate={startDate}
                        endDate={endDate}
                        navigationControls={reportNavigation}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      ) : mode === "trial_balance" ? (
        <TrialBalanceView
          trialBalance={trialBalance}
          balanceType={balanceType}
          setBalanceType={setBalanceType}
          isBalanced={isBalanced}
          balanceDifference={balanceDifference}
          onExportExcel={handleExportActiveExcel}
          onExportPdf={handleExportActivePdf}
          onExportCsv={handleExportCsv}
        />
      ) : mode === "ledger" ? (
        <GeneralLedgerView
          selectedLedgerAccountId={selectedLedgerAccountId}
          setSelectedLedgerAccountId={setSelectedLedgerAccountId}
          postableAccounts={postableAccounts}
          isAllAccounts={isAllAccounts}
          allLedgers={allLedgers}
          selectedAccount={selectedAccount}
          selectedLedgerEndingBalance={selectedLedgerEndingBalance}
          ledgerRows={ledgerRows}
          onExportExcel={handleExportActiveExcel}
          onExportPdf={handleExportActivePdf}
          onExportCsv={handleExportCsv}
        />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ActiveReportTab)}
          className="w-full space-y-4"
        >
          {mode === "all" ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-2 rounded-2xl border border-border/80 shadow-2xs">
              <TabsList className="flex h-auto w-auto flex-wrap justify-start gap-1.5 bg-transparent border-0 shadow-none p-0">
                <TabsTrigger value="laba_rugi" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  {t("accounting:reports.tab_income_statement", "Laba Rugi")}
                </TabsTrigger>
                <TabsTrigger value="ekuitas" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  {t("accounting:reports.tab_equity", "Perubahan Ekuitas")}
                </TabsTrigger>
                <TabsTrigger value="neraca" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  {t("accounting:reports.tab_balance_short", "Neraca")}
                </TabsTrigger>
                <TabsTrigger value="arus_kas" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  {t("accounting:reports.tab_cash_flow", "Arus Kas")}
                </TabsTrigger>
                <TabsTrigger value="neraca_saldo" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  {t("accounting:reports.tab_trial_balance", "Neraca Saldo")}
                </TabsTrigger>
                <TabsTrigger value="buku_besar" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  {t("accounting:reports.tab_general_ledger", "Buku Besar")}
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 self-end sm:self-auto px-2">
                <ExportDownloadMenu
                  onExportExcel={handleExportActiveExcel}
                  onExportPdf={handleExportActivePdf}
                  onExportCsv={handleExportCsv}
                />
              </div>
            </div>
          ) : null}

          {/* 1. Laba Rugi */}
          <TabsContent value="laba_rugi" className="space-y-4">
            <IncomeStatementView
              incomeStatement={incomeStatement}
              startDate={startDate}
              endDate={endDate}
              projectFilter={projectFilter}
              projects={projects}
            />
          </TabsContent>

          {/* 2. Perubahan Ekuitas */}
          <TabsContent value="ekuitas" className="space-y-4">
            <EquityStatementView
              startDate={startDate}
              endDate={endDate}
              beginningRetainedEarnings={beginningRetainedEarnings}
              netProfit={netIncome}
              dividends={dividends}
              endingRetainedEarnings={endingRetainedEarnings}
              modalDisetorBalance={modalDisetorBalance}
              totalEndingEquity={totalEndingEquity}
            />
          </TabsContent>

          {/* 3. Neraca */}
          <TabsContent value="neraca" className="space-y-4">
            <BalanceSheetView
              balanceSheet={balanceSheet}
              endDate={endDate}
            />
          </TabsContent>

          {/* 4. Arus Kas */}
          <TabsContent value="arus_kas" className="space-y-4">
            <CashFlowView
              cashFlow={cashFlow}
              startDate={startDate}
              endDate={endDate}
            />
          </TabsContent>

          {/* 5. Neraca Saldo */}
          <TabsContent value="neraca_saldo" className="mt-0 space-y-6">
            <TrialBalanceView
              trialBalance={trialBalance}
              balanceType={balanceType}
              setBalanceType={setBalanceType}
              isBalanced={isBalanced}
              balanceDifference={balanceDifference}
              onExportExcel={handleExportActiveExcel}
              onExportPdf={handleExportActivePdf}
              onExportCsv={handleExportCsv}
            />
          </TabsContent>

          {/* 6. Buku Besar */}
          <TabsContent value="buku_besar" className="mt-0 space-y-6">
            <GeneralLedgerView
              selectedLedgerAccountId={selectedLedgerAccountId}
              setSelectedLedgerAccountId={setSelectedLedgerAccountId}
              postableAccounts={postableAccounts}
              isAllAccounts={isAllAccounts}
              allLedgers={allLedgers}
              selectedAccount={selectedAccount}
              selectedLedgerEndingBalance={selectedLedgerEndingBalance}
              ledgerRows={ledgerRows}
              onExportExcel={handleExportActiveExcel}
              onExportPdf={handleExportActivePdf}
              onExportCsv={handleExportCsv}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Komponen Portal Cetak A4 Standar Altcycles */}
      <ReportsPrintContent
        company={company}
        activeTab={activeTab}
        mode={mode}
        layoutMode={layoutMode}
        startDate={startDate}
        endDate={endDate}
        isAllAccounts={isAllAccounts}
        allLedgers={allLedgers}
        selectedAccount={selectedAccount}
        postableAccounts={postableAccounts}
        selectedLedgerEndingBalance={selectedLedgerEndingBalance}
        ledgerRows={ledgerRows}
        trialBalance={trialBalance}
        balanceType={balanceType}
        isBalanced={isBalanced}
        incomeStatement={incomeStatement}
        beginningRetainedEarnings={beginningRetainedEarnings}
        netIncome={netIncome}
        dividends={dividends}
        endingRetainedEarnings={endingRetainedEarnings}
        modalDisetorBalance={modalDisetorBalance}
        totalEndingEquity={totalEndingEquity}
        currentAssets={currentAssets}
        fixedAssets={fixedAssets}
        totalCurrentAssets={totalCurrentAssets}
        totalFixedAssets={totalFixedAssets}
        currentLiabilities={currentLiabilities}
        longTermLiabilities={longTermLiabilities}
        totalCurrentLiabilities={totalCurrentLiabilities}
        totalLongTermLiabilities={totalLongTermLiabilities}
        totalLiabilities={totalLiabilities}
        totalEquity={totalEquity}
        balanceSheet={balanceSheet}
        cashFlow={cashFlow}
      />
    </div>
  );
}
