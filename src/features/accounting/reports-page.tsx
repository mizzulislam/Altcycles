import * as React from "react";
import { cn } from "@/lib/utils";
import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  LayoutGridIcon,
  ScaleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
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
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import {
  ACCOUNT_TYPE_LABELS,
  formatDateID,
  formatRupiah,
} from "@/lib/formatters";
import {
  listJournalsWithLines,
  recordExportLog,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type {
  AccountRow,
  CompanyProfileRow,
  JournalLineRow,
  JournalRow,
  ProjectRow,
} from "@/types/database.types";

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

  const [balanceType, setBalanceType] = React.useState<"unadjusted" | "adjusted">("adjusted");

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

  // Helper format mata uang ala akuntansi profesional (Splitz Style)
  const formatCurrency = (
    amount: number,
    forceNegativeStyle = false,
    colorClass = "",
  ) => {
    const isNegative = amount < 0 || forceNegativeStyle;
    const absVal = Math.abs(amount);
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(absVal);

    if (isNegative) {
      return (
        <span
          className={cn(
            "inline-flex justify-between items-center w-[125px] shrink-0 pl-2 font-semibold",
            colorClass || "text-foreground",
          )}
        >
          <span className="text-muted-foreground font-normal mr-1">(Rp</span>
          <span>
            {formatted}
            <span className="text-muted-foreground font-normal">)</span>
          </span>
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex justify-between items-center w-[125px] shrink-0 pl-2 font-semibold",
          colorClass || "text-foreground",
        )}
      >
        <span className="text-muted-foreground font-normal mr-2">Rp</span>
        <span>{formatted}</span>
      </span>
    );
  };

  async function handleExportActivePdf() {
    if (!company) return;
    const periodLabel = `${formatDateID(startDate)} s.d. ${formatDateID(endDate)}`;

    if (activeTab === "neraca") {
      const tableRows: string[][] = [
        ...balanceSheet.assets.map((a) => ["Aset", a.name, formatRupiah(a.amount)]),
        ...balanceSheet.contractAssets.map((ca) => [
          "Aset Kontrak (Selisih WIP > Penagihan)",
          ca.projectName,
          formatRupiah(ca.netContractPosition),
        ]),
        ...balanceSheet.liabilities.map((l) => [
          "Liabilitas",
          l.name,
          formatRupiah(l.amount),
        ]),
        ...balanceSheet.contractLiabilities.map((cl) => [
          "Liabilitas Kontrak (Penagihan > WIP)",
          cl.projectName,
          formatRupiah(Math.abs(cl.netContractPosition)),
        ]),
        ...balanceSheet.equities.map((eq) => [
          "Ekuitas",
          eq.name,
          formatRupiah(eq.amount),
        ]),
        ...(balanceSheet.currentUnclosedEarnings !== 0
          ? [
              [
                "Ekuitas",
                "Laba/Rugi Periode Berjalan (Belum Ditutup)",
                formatRupiah(balanceSheet.currentUnclosedEarnings),
              ],
            ]
          : []),
      ];

      const bytes = await generateDocumentPdf({
        docTitle: "LAPORAN POSISI KEUANGAN (NERACA SAK)",
        docSubtitle: `Per Tanggal ${formatDateID(endDate)}`,
        docNumber: `RPT-BS/${endDate.replace(/-/g, "")}`,
        docDate: endDate,
        company,
        tableColumns: [
          { header: "Kelompok", widthRatio: 0.3 },
          { header: "Akun / Posisi Kontrak Proyek", widthRatio: 0.45 },
          { header: "Saldo (IDR)", widthRatio: 0.25, align: "right" },
        ],
        summaryRows: [
          { label: "TOTAL ASET", value: formatRupiah(balanceSheet.totalAssets) },
          {
            label: "TOTAL LIABILITAS + EKUITAS",
            value: formatRupiah(balanceSheet.totalLiabilitiesAndEquity),
          },
        ],
        tableRows,
        rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      });
      downloadPdfBytes(bytes, `Neraca_SAK_${endDate}.pdf`);
      await recordExportLog("BALANCE_SHEET", "PDF", endDate);
      toast.success("Laporan Neraca PDF berhasil diunduh.");
      return;
    }

    if (activeTab === "laba_rugi") {
      const tableRows: string[][] = [
        ...incomeStatement.revenues.map((r) => [
          "Pendapatan",
          r.name,
          formatRupiah(r.amount),
        ]),
        ...incomeStatement.directExpenses.map((e) => [
          "Beban Langsung Proyek",
          e.name,
          formatRupiah(e.amount),
        ]),
        ...incomeStatement.sharedExpenses.map((s) => [
          "Beban Operasional Bersama",
          s.name,
          formatRupiah(s.amount),
        ]),
      ];

      const bytes = await generateDocumentPdf({
        docTitle: "LAPORAN LABA RUGI BASIS AKRUAL",
        docSubtitle: periodLabel,
        docNumber: `RPT-IS/${endDate.replace(/-/g, "")}`,
        docDate: endDate,
        company,
        tableColumns: [
          { header: "Kategori", widthRatio: 0.3 },
          { header: "Akun SAK", widthRatio: 0.45 },
          { header: "Jumlah (IDR)", widthRatio: 0.25, align: "right" },
        ],
        tableRows,
        summaryRows: [
          {
            label: "Total Pendapatan",
            value: formatRupiah(incomeStatement.totalRevenue),
          },
          {
            label: "Laba Kotor",
            value: formatRupiah(incomeStatement.grossProfit),
          },
          {
            label: "LABA BERSIH",
            value: formatRupiah(incomeStatement.netProfit),
          },
        ],
        rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      });
      downloadPdfBytes(bytes, `Laba_Rugi_${startDate}_${endDate}.pdf`);
      await recordExportLog("INCOME_STATEMENT", "PDF", periodLabel);
      toast.success("Laporan Laba Rugi PDF berhasil diunduh.");
      return;
    }

    if (activeTab === "ekuitas") {
      const tableRows: string[][] = [
        ["Laba Ditahan", "Saldo Laba Ditahan Awal", formatRupiah(beginningRetainedEarnings)],
        ["Laba Ditahan", "Ditambah: Laba Bersih Periode Berjalan", formatRupiah(incomeStatement.netProfit)],
        ["Laba Ditahan", "Dikurangi: Prive Pemilik (Dividen)", formatRupiah(dividends)],
        ["Laba Ditahan", "Saldo Laba Ditahan Akhir", formatRupiah(endingRetainedEarnings)],
        ["Modal Disetor", "Modal Disetor Pemilik", formatRupiah(modalDisetorBalance)],
      ];

      const bytes = await generateDocumentPdf({
        docTitle: "LAPORAN PERUBAHAN EKUITAS",
        docSubtitle: periodLabel,
        docNumber: `RPT-EQ/${endDate.replace(/-/g, "")}`,
        docDate: endDate,
        company,
        tableColumns: [
          { header: "Komponen", widthRatio: 0.35 },
          { header: "Pos Ekuitas", widthRatio: 0.4 },
          { header: "Jumlah (IDR)", widthRatio: 0.25, align: "right" },
        ],
        tableRows,
        summaryRows: [
          {
            label: "TOTAL EKUITAS AKHIR",
            value: formatRupiah(totalEndingEquity),
          },
        ],
        rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      });
      downloadPdfBytes(bytes, `Perubahan_Ekuitas_${startDate}_${endDate}.pdf`);
      await recordExportLog("EQUITY_STATEMENT", "PDF", periodLabel);
      toast.success("Laporan Perubahan Ekuitas PDF berhasil diunduh.");
      return;
    }

    if (activeTab === "neraca_saldo") {
      const bytes = await generateDocumentPdf({
        docTitle: "NERACA SALDO (TRIAL BALANCE)",
        docSubtitle: `Per ${formatDateID(endDate)}`,
        docNumber: `RPT-TB/${endDate.replace(/-/g, "")}`,
        docDate: endDate,
        company,
        tableColumns: [
          { header: "Kode & Akun", widthRatio: 0.5 },
          { header: "Saldo Debit", widthRatio: 0.25, align: "right" },
          { header: "Saldo Kredit", widthRatio: 0.25, align: "right" },
        ],
        tableRows: trialBalance.rows.map((r) => [
          `${r.code} - ${r.name}`,
          formatRupiah(r.endingDebit),
          formatRupiah(r.endingCredit),
        ]),
        summaryRows: [
          {
            label: "Total Saldo Debit",
            value: formatRupiah(trialBalance.sumEndingDebit),
          },
          {
            label: "Total Saldo Kredit",
            value: formatRupiah(trialBalance.sumEndingCredit),
          },
        ],
        rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      });
      downloadPdfBytes(bytes, `Neraca_Saldo_${endDate}.pdf`);
      await recordExportLog("TRIAL_BALANCE", "PDF", endDate);
      toast.success("Neraca Saldo PDF berhasil diunduh.");
      return;
    }

    if (activeTab === "arus_kas") {
      const bytes = await generateDocumentPdf({
        docTitle: "LAPORAN ARUS KAS METODE LANGSUNG",
        docSubtitle: periodLabel,
        docNumber: `RPT-CF/${endDate.replace(/-/g, "")}`,
        docDate: endDate,
        company,
        tableColumns: [
          { header: "Komponen Arus Kas", widthRatio: 0.65 },
          { header: "Nominal (IDR)", widthRatio: 0.35, align: "right" },
        ],
        tableRows: [
          ["Saldo Kas Awal Periode", formatRupiah(cashFlow.beginningCash)],
          ["Penerimaan Kas Operasi", formatRupiah(cashFlow.operatingInflow)],
          ["Pengeluaran Kas Operasi", formatRupiah(-cashFlow.operatingOutflow)],
          ["Arus Kas Bersih Operasi", formatRupiah(cashFlow.netOperating)],
          ["Arus Kas Bersih Investasi", formatRupiah(cashFlow.netInvesting)],
          ["Arus Kas Bersih Pendanaan", formatRupiah(cashFlow.netFinancing)],
          ["Kenaikan / Penurunan Bersih Kas", formatRupiah(cashFlow.netChangeInCash)],
        ],
        summaryRows: [
          {
            label: "SALDO KAS AKHIR PERIODE",
            value: formatRupiah(cashFlow.endingCash),
          },
        ],
        rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      });
      downloadPdfBytes(bytes, `Arus_Kas_${startDate}_${endDate}.pdf`);
      await recordExportLog("CASH_FLOW", "PDF", periodLabel);
      toast.success("Laporan Arus Kas PDF berhasil diunduh.");
      return;
    }

    // Buku Besar
    const exportAccount = selectedAccount ?? allLedgers[0]?.account ?? postableAccounts[0];
    const exportRows = selectedAccount
      ? ledgerRows
      : (allLedgers[0]?.rows ?? []);

    const bytes = await generateDocumentPdf({
      docTitle: `BUKU BESAR AKUN ${exportAccount?.code ?? ""}`,
      docSubtitle: `${exportAccount?.name ?? ""} (${periodLabel})`,
      docNumber: `RPT-GL/${endDate.replace(/-/g, "")}`,
      docDate: endDate,
      company,
      tableColumns: [
        { header: "Tanggal", widthRatio: 0.16 },
        { header: "No. Jurnal & Uraian", widthRatio: 0.39 },
        { header: "Debit", widthRatio: 0.15, align: "right" },
        { header: "Kredit", widthRatio: 0.15, align: "right" },
        { header: "Saldo", widthRatio: 0.15, align: "right" },
      ],
      tableRows: exportRows.map((r) => [
        formatDateID(r.journalDate),
        `${r.journalNumber} - ${r.description}`,
        formatRupiah(r.debit),
        formatRupiah(r.credit),
        formatRupiah(r.runningBalance),
      ]),
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    });
    downloadPdfBytes(bytes, `Buku_Besar_${exportAccount?.code ?? "GL"}.pdf`);
    await recordExportLog("GENERAL_LEDGER", "PDF", periodLabel);
    toast.success("Buku Besar PDF berhasil diunduh.");
  }

  async function handleExportActiveExcel() {
    if (activeTab === "neraca") {
      await downloadExcelSheet({
        fileName: `Neraca_SAK_${endDate}.xlsx`,
        sheetName: "Neraca SAK",
        columns: [
          { header: "Kelompok", width: 28 },
          { header: "Kode / Proyek", width: 18 },
          { header: "Nama Akun / Proyek", width: 34 },
          { header: "Nominal (Rp)", width: 20 },
        ],
        rows: [
          ...balanceSheet.assets.map((a) => ["Aset", a.code, a.name, a.amount]),
          ...balanceSheet.contractAssets.map((ca) => [
            "Aset Kontrak",
            ca.projectCode,
            ca.projectName,
            ca.netContractPosition,
          ]),
          ["TOTAL ASET", "", "", balanceSheet.totalAssets],
          ...balanceSheet.liabilities.map((l) => [
            "Liabilitas",
            l.code,
            l.name,
            l.amount,
          ]),
          ...balanceSheet.contractLiabilities.map((cl) => [
            "Liabilitas Kontrak",
            cl.projectCode,
            cl.projectName,
            Math.abs(cl.netContractPosition),
          ]),
          ...balanceSheet.equities.map((e) => ["Ekuitas", e.code, e.name, e.amount]),
          [
            "Ekuitas",
            "-",
            "Laba/Rugi Periode Berjalan (Belum Ditutup)",
            balanceSheet.currentUnclosedEarnings,
          ],
          [
            "TOTAL LIABILITAS + EKUITAS",
            "",
            "",
            balanceSheet.totalLiabilitiesAndEquity,
          ],
        ],
      });
      await recordExportLog("BALANCE_SHEET", "EXCEL", endDate);
      toast.success("Neraca berhasil diekspor ke Excel.");
      return;
    }

    if (activeTab === "laba_rugi") {
      await downloadExcelSheet({
        fileName: `Laba_Rugi_${startDate}_${endDate}.xlsx`,
        sheetName: "Laba Rugi",
        columns: [
          { header: "Kategori", width: 26 },
          { header: "Kode Akun", width: 14 },
          { header: "Nama Akun", width: 34 },
          { header: "Nominal (Rp)", width: 20 },
        ],
        rows: [
          ...incomeStatement.revenues.map((r) => [
            "Pendapatan",
            r.code,
            r.name,
            r.amount,
          ]),
          ["Subtotal Pendapatan", "", "", incomeStatement.totalRevenue],
          ...incomeStatement.directExpenses.map((e) => [
            "Beban Langsung",
            e.code,
            e.name,
            e.amount,
          ]),
          ["Laba Kotor", "", "", incomeStatement.grossProfit],
          ...incomeStatement.sharedExpenses.map((s) => [
            "Beban Bersama",
            s.code,
            s.name,
            s.amount,
          ]),
          ["LABA BERSIH", "", "", incomeStatement.netProfit],
        ],
      });
      await recordExportLog("INCOME_STATEMENT", "EXCEL", `${startDate}..${endDate}`);
      toast.success("Laporan Laba Rugi berhasil diekspor ke Excel.");
      return;
    }

    if (activeTab === "ekuitas") {
      await downloadExcelSheet({
        fileName: `Perubahan_Ekuitas_${startDate}_${endDate}.xlsx`,
        sheetName: "Perubahan Ekuitas",
        columns: [
          { header: "Komponen Ekuitas", width: 38 },
          { header: "Nominal (Rp)", width: 22 },
        ],
        rows: [
          ["Saldo Laba Ditahan Awal Periode", beginningRetainedEarnings],
          ["Ditambah: Laba Bersih Periode Berjalan", incomeStatement.netProfit],
          ["Dikurangi: Prive Pemilik (Dividen)", -dividends],
          ["Saldo Laba Ditahan Akhir Periode", endingRetainedEarnings],
          ["Modal Disetor Pemilik", modalDisetorBalance],
          ["TOTAL EKUITAS AKHIR PERIODE", totalEndingEquity],
        ],
      });
      await recordExportLog("EQUITY_STATEMENT", "EXCEL", `${startDate}..${endDate}`);
      toast.success("Laporan Perubahan Ekuitas berhasil diekspor ke Excel.");
      return;
    }

    if (activeTab === "neraca_saldo") {
      await downloadExcelSheet({
        fileName: `Neraca_Saldo_${endDate}.xlsx`,
        sheetName: "Neraca Saldo",
        columns: [
          { header: "Kode Akun", width: 14 },
          { header: "Nama Akun", width: 32 },
          { header: "Kelompok", width: 16 },
          { header: "Mutasi Debit", width: 18 },
          { header: "Mutasi Kredit", width: 18 },
          { header: "Saldo Akhir Debit", width: 18 },
          { header: "Saldo Akhir Kredit", width: 18 },
        ],
        rows: trialBalance.rows.map((r) => [
          r.code,
          r.name,
          ACCOUNT_TYPE_LABELS[r.accountType],
          r.totalDebit,
          r.totalCredit,
          r.endingDebit,
          r.endingCredit,
        ]),
      });
      await recordExportLog("TRIAL_BALANCE", "EXCEL", endDate);
      toast.success("Neraca Saldo berhasil diekspor ke Excel.");
      return;
    }

    if (activeTab === "arus_kas") {
      await downloadExcelSheet({
        fileName: `Arus_Kas_${startDate}_${endDate}.xlsx`,
        sheetName: "Arus Kas",
        columns: [
          { header: "Uraian Komponen Arus Kas", width: 38 },
          { header: "Nominal (Rp)", width: 22 },
        ],
        rows: [
          ["Saldo Kas Awal Periode", cashFlow.beginningCash],
          ["Penerimaan Kas Aktivitas Operasi", cashFlow.operatingInflow],
          ["Pengeluaran Kas Aktivitas Operasi", -cashFlow.operatingOutflow],
          ["Arus Kas Bersih Aktivitas Operasi", cashFlow.netOperating],
          ["Arus Kas Bersih Aktivitas Investasi", cashFlow.netInvesting],
          ["Arus Kas Bersih Aktivitas Pendanaan", cashFlow.netFinancing],
          ["Perubahan Bersih Kas", cashFlow.netChangeInCash],
          ["Saldo Kas Akhir Periode", cashFlow.endingCash],
        ],
      });
      await recordExportLog("CASH_FLOW", "EXCEL", `${startDate}..${endDate}`);
      toast.success("Laporan Arus Kas berhasil diekspor ke Excel.");
      return;
    }

    // Buku Besar
    const exportRows = isAllAccounts
      ? allLedgers.flatMap((l) =>
          l.rows.map((r) => [
            formatDateID(r.journalDate),
            r.journalNumber,
            `${l.account.code} - ${l.account.name}`,
            r.projectCode ?? "-",
            r.description,
            r.debit,
            r.credit,
            r.runningBalance,
          ]),
        )
      : ledgerRows.map((r) => [
          formatDateID(r.journalDate),
          r.journalNumber,
          selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "-",
          r.projectCode ?? "-",
          r.description,
          r.debit,
          r.credit,
          r.runningBalance,
        ]);

    await downloadExcelSheet({
      fileName: `Buku_Besar_${selectedAccount ? selectedAccount.code : "Kompilasi"}_${endDate}.xlsx`,
      sheetName: "Buku Besar",
      columns: [
        { header: "Tanggal", width: 14 },
        { header: "No. Jurnal", width: 20 },
        { header: "Akun", width: 28 },
        { header: "Proyek", width: 16 },
        { header: "Uraian", width: 36 },
        { header: "Debit", width: 18 },
        { header: "Kredit", width: 18 },
        { header: "Saldo Berjalan", width: 20 },
      ],
      rows: exportRows,
    });
    await recordExportLog("GENERAL_LEDGER", "EXCEL", `${startDate}..${endDate}`);
    toast.success("Buku Besar berhasil diekspor ke Excel.");
  }

  async function handleExportCsv() {
    if (activeTab === "neraca") {
      downloadCsvFile(
        `Neraca_SAK_${endDate}.csv`,
        ["Kelompok", "Kode / Proyek", "Nama Akun / Proyek", "Nominal"],
        [
          ...balanceSheet.assets.map((a) => ["Aset", a.code, a.name, a.amount]),
          ...balanceSheet.contractAssets.map((ca) => [
            "Aset Kontrak",
            ca.projectCode,
            ca.projectName,
            ca.netContractPosition,
          ]),
          ["TOTAL ASET", "", "", balanceSheet.totalAssets],
          ...balanceSheet.liabilities.map((l) => [
            "Liabilitas",
            l.code,
            l.name,
            l.amount,
          ]),
          ...balanceSheet.contractLiabilities.map((cl) => [
            "Liabilitas Kontrak",
            cl.projectCode,
            cl.projectName,
            Math.abs(cl.netContractPosition),
          ]),
          ...balanceSheet.equities.map((e) => ["Ekuitas", e.code, e.name, e.amount]),
          [
            "Ekuitas",
            "-",
            "Laba/Rugi Periode Berjalan (Belum Ditutup)",
            balanceSheet.currentUnclosedEarnings,
          ],
          [
            "TOTAL LIABILITAS + EKUITAS",
            "",
            "",
            balanceSheet.totalLiabilitiesAndEquity,
          ],
        ],
      );
      await recordExportLog("BALANCE_SHEET", "CSV", endDate);
      toast.success("Neraca berhasil diekspor ke CSV.");
      return;
    }

    if (activeTab === "laba_rugi") {
      downloadCsvFile(
        `Laba_Rugi_${startDate}_${endDate}.csv`,
        ["Kategori", "Kode Akun", "Nama Akun", "Nominal"],
        [
          ...incomeStatement.revenues.map((r) => [
            "Pendapatan",
            r.code,
            r.name,
            r.amount,
          ]),
          ["Subtotal Pendapatan", "", "", incomeStatement.totalRevenue],
          ...incomeStatement.directExpenses.map((e) => [
            "Beban Langsung",
            e.code,
            e.name,
            e.amount,
          ]),
          ["Laba Kotor", "", "", incomeStatement.grossProfit],
          ...incomeStatement.sharedExpenses.map((s) => [
            "Beban Bersama",
            s.code,
            s.name,
            s.amount,
          ]),
          ["LABA BERSIH", "", "", incomeStatement.netProfit],
        ],
      );
      await recordExportLog("INCOME_STATEMENT", "CSV", `${startDate}..${endDate}`);
      toast.success("Laporan Laba Rugi berhasil diekspor ke CSV.");
      return;
    }

    if (activeTab === "neraca_saldo") {
      downloadCsvFile(
        `Neraca_Saldo_${endDate}.csv`,
        [
          "Kode Akun",
          "Nama Akun",
          "Kelompok",
          "Mutasi Debit",
          "Mutasi Kredit",
          "Saldo Akhir Debit",
          "Saldo Akhir Kredit",
        ],
        trialBalance.rows.map((r) => [
          r.code,
          r.name,
          ACCOUNT_TYPE_LABELS[r.accountType],
          r.totalDebit,
          r.totalCredit,
          r.endingDebit,
          r.endingCredit,
        ]),
      );
      await recordExportLog("TRIAL_BALANCE", "CSV", endDate);
      toast.success("Neraca Saldo berhasil diekspor ke CSV.");
      return;
    }

    if (activeTab === "arus_kas") {
      downloadCsvFile(
        `Arus_Kas_${startDate}_${endDate}.csv`,
        ["Uraian Komponen Arus Kas", "Nominal"],
        [
          ["Saldo Kas Awal Periode", cashFlow.beginningCash],
          ["Penerimaan Kas Aktivitas Operasi", cashFlow.operatingInflow],
          ["Pengeluaran Kas Aktivitas Operasi", -cashFlow.operatingOutflow],
          ["Arus Kas Bersih Aktivitas Operasi", cashFlow.netOperating],
          ["Arus Kas Bersih Aktivitas Investasi", cashFlow.netInvesting],
          ["Arus Kas Bersih Aktivitas Pendanaan", cashFlow.netFinancing],
          ["Perubahan Bersih Kas", cashFlow.netChangeInCash],
          ["Saldo Kas Akhir Periode", cashFlow.endingCash],
        ],
      );
      await recordExportLog("CASH_FLOW", "CSV", `${startDate}..${endDate}`);
      toast.success("Laporan Arus Kas berhasil diekspor ke CSV.");
      return;
    }

    const exportCsvRows = isAllAccounts
      ? allLedgers.flatMap((l) =>
          l.rows.map((r) => [
            formatDateID(r.journalDate),
            r.journalNumber,
            `${l.account.code} - ${l.account.name}`,
            r.projectCode ?? "-",
            r.description,
            r.debit,
            r.credit,
            r.runningBalance,
          ]),
        )
      : ledgerRows.map((r) => [
          formatDateID(r.journalDate),
          r.journalNumber,
          selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "-",
          r.projectCode ?? "-",
          r.description,
          r.debit,
          r.credit,
          r.runningBalance,
        ]);

    downloadCsvFile(
      `Buku_Besar_${selectedAccount?.code ?? "Kompilasi"}.csv`,
      [
        "Tanggal",
        "No. Jurnal",
        "Akun",
        "Proyek",
        "Uraian",
        "Debit",
        "Kredit",
        "Saldo Berjalan",
      ],
      exportCsvRows,
    );
    await recordExportLog("GENERAL_LEDGER", "CSV", `${startDate}..${endDate}`);
    toast.success("Buku Besar berhasil diekspor ke CSV.");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        <span>Menyusun laporan keuangan berbasis akrual SAK...</span>
      </div>
    );
  }

  const isBalanced =
    Math.abs(trialBalance.sumEndingDebit - trialBalance.sumEndingCredit) < 1;
  const balanceDifference = Math.abs(
    trialBalance.sumEndingDebit - trialBalance.sumEndingCredit,
  );

  const formatSplitzCurrency = (val: number) => {
    if (val === 0) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex justify-between items-center w-full min-w-[90px]">
        <span className="text-muted-foreground/70 mr-2 text-xs">Rp</span>
        <span className="font-semibold text-foreground">
          {new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(val)}
        </span>
      </div>
    );
  };

  const formatDateSplitz = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // 4 Kartu Ringkasan Laporan Keuangan (Splitz Design & Layout)
  const incomeStatementCard = (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Laporan Operasional
          </span>
          <h2 className="text-lg font-bold text-foreground mt-0.5">Laporan Laba Rugi</h2>
          <p className="text-xs text-muted-foreground mt-1">Mengukur kinerja keuangan operasional Altcycles</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              Pendapatan (Revenues)
            </div>
            <div className="space-y-1">
              {incomeStatement.revenues.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1 pl-1">Tidak ada pendapatan tercatat</p>
              ) : (
                incomeStatement.revenues.map((r) => (
                  <div key={r.code} className="flex justify-between items-center py-1 pl-1 border-b border-border/40 text-xs">
                    <span className="text-muted-foreground truncate font-medium">{r.name}</span>
                    {formatCurrency(r.amount)}
                  </div>
                ))
              )}
              <div className="flex justify-between items-center py-1.5 pl-1 text-xs font-bold text-foreground border-t border-border/70 mt-1">
                <span>Total Pendapatan</span>
                <span className="text-primary dark:text-cyan-400">{formatCurrency(incomeStatement.totalRevenue)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              Beban Operasional (Expenses)
            </div>
            <div className="space-y-1">
              {[...incomeStatement.directExpenses, ...incomeStatement.sharedExpenses].length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1 pl-1">Tidak ada beban tercatat</p>
              ) : (
                [...incomeStatement.directExpenses, ...incomeStatement.sharedExpenses].map((e) => (
                  <div key={e.code} className="flex justify-between items-center py-1 pl-1 border-b border-border/40 text-xs">
                    <span className="text-muted-foreground truncate font-medium">{e.name}</span>
                    {formatCurrency(e.amount, true)}
                  </div>
                ))
              )}
              <div className="flex justify-between items-center py-1.5 pl-1 text-xs font-bold text-foreground border-t border-border/70 mt-1">
                <span>Total Beban</span>
                <span>{formatCurrency(incomeStatement.totalDirectExpense + incomeStatement.totalSharedExpense, true)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center py-2.5 pl-1 border-t border-b-2 border-border/80 text-foreground">
        <span className="font-bold text-xs uppercase tracking-wide">
          {incomeStatement.netProfit >= 0 ? "Laba Bersih (Net Income)" : "Rugi Bersih (Net Loss)"}
        </span>
        <span>
          {formatCurrency(incomeStatement.netProfit, false, "text-xs font-bold text-primary dark:text-cyan-400")}
        </span>
      </div>
    </div>
  );

  const retainedEarningsCard = (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Ekuitas Mutasi
          </span>
          <h2 className="text-lg font-bold text-foreground mt-0.5">Perubahan Ekuitas</h2>
          <p className="text-xs text-muted-foreground mt-1">Mutasi laba ditahan dan modal selama periode berjalan</p>
        </div>

        <div className="space-y-4">
          <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
            Laba Ditahan (Retained Earnings)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Saldo Laba Ditahan Awal</span>
              {formatCurrency(beginningRetainedEarnings)}
            </div>
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Ditambah: Laba Bersih Periode Ini</span>
              <span>{formatCurrency(incomeStatement.netProfit, false, "text-xs font-bold text-primary dark:text-cyan-400")}</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Dikurangi: Prive Pemilik (Dividen)</span>
              {formatCurrency(dividends, true)}
            </div>
            <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
              <span>Laba Ditahan Akhir</span>
              <span>{formatCurrency(endingRetainedEarnings)}</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              Modal Disetor Pemilik
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Modal Disetor Altvira</span>
                {formatCurrency(modalDisetorBalance)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center py-2.5 pl-1 border-t border-b-2 border-border/80 text-foreground">
        <span className="font-bold text-xs uppercase tracking-wide">Total Ekuitas Akhir</span>
        <span>
          {formatCurrency(totalEndingEquity, false, "text-xs font-bold text-primary dark:text-cyan-400")}
        </span>
      </div>
    </div>
  );

  const balanceSheetCard = (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Posisi Keuangan
            </span>
            <h2 className="text-lg font-bold text-foreground mt-0.5">Neraca (Balance Sheet)</h2>
            <p className="text-xs text-muted-foreground mt-1">Ringkasan aset, kewajiban, dan ekuitas Altcycles</p>
          </div>
          <ScaleIcon className="size-5 text-muted-foreground mt-1" />
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              ASET (HARTA)
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Aset Lancar (Kas &amp; Piutang)</span>
                {formatCurrency(balanceSheet.assets.reduce((s, a) => s + a.amount, 0))}
              </div>
              {balanceSheet.contractAssets.length > 0 && (
                <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Aset Kontrak SAK (WIP &gt; Tagihan)</span>
                  {formatCurrency(balanceSheet.contractAssets.reduce((s, a) => s + a.netContractPosition, 0))}
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
                <span>TOTAL ASET</span>
                <span>{formatCurrency(balanceSheet.totalAssets, false, "text-xs font-bold text-foreground")}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              KEWAJIBAN (HUTANG)
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Kewajiban Berjalan &amp; Pajak</span>
                {formatCurrency(balanceSheet.liabilities.reduce((s, l) => s + l.amount, 0))}
              </div>
              {balanceSheet.contractLiabilities.length > 0 && (
                <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Liabilitas Kontrak (Tagihan &gt; WIP)</span>
                  {formatCurrency(balanceSheet.contractLiabilities.reduce((s, l) => s + Math.abs(l.netContractPosition), 0))}
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
                <span>Total Kewajiban</span>
                <span>{formatCurrency(balanceSheet.liabilities.reduce((s, l) => s + l.amount, 0) + balanceSheet.contractLiabilities.reduce((s, l) => s + Math.abs(l.netContractPosition), 0))}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-foreground font-bold text-xs uppercase tracking-wider mb-2 pl-1">
              MODAL (EKUITAS)
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Modal Disetor &amp; Ekuitas</span>
                {formatCurrency(modalDisetorBalance)}
              </div>
              <div className="flex justify-between items-center py-1 pl-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Laba Ditahan Akhir</span>
                {formatCurrency(endingRetainedEarnings)}
              </div>
              <div className="flex justify-between items-center py-1.5 pl-1 font-bold text-foreground border-t border-border/70 mt-1">
                <span>Total Ekuitas</span>
                <span>{formatCurrency(totalEndingEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center py-2.5 pl-1 border-t border-b-2 border-border/80 text-foreground font-bold text-xs">
        <span className="uppercase tracking-wide">Total Kewajiban &amp; Modal</span>
        <span>
          {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, false, "text-xs font-bold text-foreground")}
        </span>
      </div>
    </div>
  );

  const cashFlowCard = (
    <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[560px] w-full">
      <div>
        <div className="border-b border-border/60 pb-3 mb-4">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Pergerakan Kas
          </span>
          <h2 className="text-lg font-bold text-foreground mt-0.5">Laporan Arus Kas</h2>
          <p className="text-xs text-muted-foreground mt-1">Ringkasan arus kas masuk dan keluar berdasarkan aktivitas</p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">Kas Bersih dari Aktivitas Operasi</span>
            {formatCurrency(cashFlow.netOperating, cashFlow.netOperating < 0)}
          </div>
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">Kas Bersih dari Aktivitas Investasi</span>
            {formatCurrency(cashFlow.netInvesting, cashFlow.netInvesting < 0)}
          </div>
          <div className="flex justify-between items-center py-1.5 pl-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium truncate">Kas Bersih dari Aktivitas Pendanaan</span>
            {formatCurrency(cashFlow.netFinancing, cashFlow.netFinancing < 0)}
          </div>
          <div className="flex justify-between items-center py-2 pl-1 border-t border-border/70 text-foreground font-bold mt-1">
            <span className="uppercase tracking-wide">Kenaikan / Penurunan Kas</span>
            {formatCurrency(cashFlow.netChangeInCash, cashFlow.netChangeInCash < 0, "text-xs font-bold text-foreground")}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-1.5 border-t border-border/70 pt-3 text-xs">
        <div className="flex justify-between items-center py-1 pl-1">
          <span className="text-muted-foreground font-medium">Saldo Kas Awal</span>
          {formatCurrency(cashFlow.beginningCash, cashFlow.beginningCash < 0)}
        </div>
        <div className="flex justify-between items-center py-2 pl-1 border-t border-b-2 border-border/80 text-foreground">
          <span className="font-bold uppercase tracking-wide">Saldo Kas Akhir</span>
          {formatCurrency(cashFlow.endingCash, cashFlow.endingCash < 0, "text-xs font-bold text-primary dark:text-cyan-400")}
        </div>
      </div>
    </div>
  );

  const detailedRetainedEarnings = (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70">
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-lg font-bold text-foreground">
            Laporan Perubahan Ekuitas per {formatDateID(endDate)}
          </CardTitle>
          <CardDescription>
            Menyajikan mutasi laba ditahan dan saldo modal disetor selama periode{" "}
            <span className="font-semibold text-foreground">
              {formatDateID(startDate)} &minus; {formatDateID(endDate)}
            </span>
            .
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-center font-semibold text-xs sm:text-sm">Komponen Ekuitas</TableHead>
                <TableHead className="w-56 text-center font-semibold text-xs sm:text-sm">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/20 font-bold border-t border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  Akumulasi Laba Ditahan (Retained Earnings)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  Saldo Laba Ditahan Awal Periode
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                  {formatRupiah(beginningRetainedEarnings)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  Ditambah: Laba Bersih Periode Berjalan (dari Laba Rugi)
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-semibold text-primary dark:text-cyan-400">
                  {formatRupiah(incomeStatement.netProfit)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  Dikurangi: Prive Pemilik / Dividen
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  ({formatRupiah(dividends)})
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">
                  Saldo Laba Ditahan Akhir Periode
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatRupiah(endingRetainedEarnings)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/20 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  Modal Disetor Pemilik
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground pl-8">
                  Modal Disetor Altvira
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                  {formatRupiah(modalDisetorBalance)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/50 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground">
                  TOTAL EKUITAS AKHIR PERIODE
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatRupiah(totalEndingEquity)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const detailedIncomeStatement = (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70">
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-lg font-bold text-foreground">
            Laporan Laba Rugi Basis Akrual
          </CardTitle>
          <CardDescription>
            Penyajian terstruktur beban langsung proyek dan beban operasional bersama periode{" "}
            <span className="font-semibold text-foreground">
              {formatDateID(startDate)} &minus; {formatDateID(endDate)}
            </span>
            .
          </CardDescription>
          {projectFilter !== "ALL" && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary dark:text-cyan-400">
                Proyek: {projects.find((p) => p.id === projectFilter)?.name ?? projectFilter}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-center px-6 font-semibold text-xs text-foreground/80">Komponen / Akun SAK</TableHead>
                <TableHead className="w-56 text-center pr-6 font-semibold text-xs text-foreground/80">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30 font-bold border-t border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  Pendapatan Usaha
                </TableCell>
              </TableRow>
              {incomeStatement.revenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic">
                    Belum ada pendapatan diakui pada rentang tanggal ini.
                  </TableCell>
                </TableRow>
              ) : (
                incomeStatement.revenues.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="px-6 text-xs text-foreground pl-8">
                      {r.name}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                      {formatRupiah(r.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">Total Pendapatan</TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatRupiah(incomeStatement.totalRevenue)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/30 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  Beban Langsung Proyek
                </TableCell>
              </TableRow>
              {incomeStatement.directExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic">
                    Belum ada beban langsung proyek pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                incomeStatement.directExpenses.map((e) => (
                  <TableRow key={e.code}>
                    <TableCell className="px-6 text-xs text-foreground pl-8">
                      {e.name}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs text-foreground">
                      ({formatRupiah(e.amount)})
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">Laba Kotor</TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatRupiah(incomeStatement.grossProfit)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/30 font-bold border-t-2 border-border/80">
                <TableCell colSpan={2} className="px-6 text-xs text-foreground">
                  Beban Operasional Bersama
                </TableCell>
              </TableRow>
              {incomeStatement.sharedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic">
                    Belum ada beban operasional bersama pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                incomeStatement.sharedExpenses.map((s) => (
                  <TableRow key={s.code}>
                    <TableCell className="px-6 text-xs text-foreground pl-8">
                      {s.name}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs text-foreground">
                      ({formatRupiah(s.amount)})
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/50 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground">
                  Laba (Rugi) Bersih Periode Berjalan
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatRupiah(incomeStatement.netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const detailedBalanceSheet = (() => {
    const currentAssets = balanceSheet.assets.filter(
      (a) => a.code.startsWith("1-1") || a.code.startsWith("1-2"),
    );
    const fixedAssets = balanceSheet.assets.filter(
      (a) => !a.code.startsWith("1-1") && !a.code.startsWith("1-2"),
    );
    const totalCurrentAssets =
      currentAssets.reduce((s, a) => s + a.amount, 0) +
      balanceSheet.contractAssets.reduce((s, ca) => s + ca.netContractPosition, 0);
    const totalFixedAssets = fixedAssets.reduce((s, a) => s + a.amount, 0);

    const currentLiabilities = balanceSheet.liabilities.filter((l) =>
      l.code.startsWith("2-1"),
    );
    const longTermLiabilities = balanceSheet.liabilities.filter(
      (l) => !l.code.startsWith("2-1"),
    );
    const totalCurrentLiabilities =
      currentLiabilities.reduce((s, l) => s + l.amount, 0) +
      balanceSheet.contractLiabilities.reduce(
        (s, cl) => s + Math.abs(cl.netContractPosition),
        0,
      );
    const totalLongTermLiabilities = longTermLiabilities.reduce(
      (s, l) => s + l.amount,
      0,
    );
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
    const totalEquity =
      balanceSheet.equities.reduce((s, eq) => s + eq.amount, 0) +
      balanceSheet.currentUnclosedEarnings;

    const formatBalanceAmount = (amount: number) => {
      if (amount < 0) return `(${formatRupiah(Math.abs(amount))})`;
      return formatRupiah(amount);
    };

    return (
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-lg font-bold text-foreground">
              Laporan Posisi Keuangan (Neraca SAK) per {formatDateID(endDate)}
            </CardTitle>
            <CardDescription>
              Menyajikan posisi Aset, Liabilitas, Ekuitas, serta Aset/Liabilitas Kontrak proyek secara akrual.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge
              tone={balanceSheet.isBalanced ? "success" : "destructive"}
              label={
                balanceSheet.isBalanced
                  ? "Neraca Seimbang"
                  : "Selisih Neraca"
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-center px-6 font-semibold text-xs text-foreground/80">
                    Komponen / Akun SAK
                  </TableHead>
                  <TableHead className="w-56 text-center pr-6 font-semibold text-xs text-foreground/80">
                    Nominal
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ASET */}
                <TableRow className="bg-muted/30 font-bold border-t border-border/80">
                  <TableCell colSpan={2} className="px-6 text-xs text-foreground font-bold uppercase tracking-wider">
                    ASET (HARTA)
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/10 font-bold">
                  <TableCell colSpan={2} className="px-6 text-xs text-foreground pl-8 font-bold">
                    ASET LANCAR
                  </TableCell>
                </TableRow>
                {currentAssets.length === 0 && balanceSheet.contractAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                      Belum ada aset lancar pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {currentAssets.map((a) => (
                      <TableRow key={a.code}>
                        <TableCell className="px-6 text-xs text-foreground pl-12">
                          {a.name}
                        </TableCell>
                        <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                          {formatBalanceAmount(a.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {balanceSheet.contractAssets.map((ca) => (
                      <TableRow key={ca.projectId} className="bg-primary/5">
                        <TableCell className="px-6 text-xs pl-12">
                          <div className="font-semibold text-foreground">
                            Aset Kontrak: {ca.projectName}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            WIP {formatRupiah(ca.wipBalance)} &minus; Penagihan {formatRupiah(ca.billingsBalance)}
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                          {formatBalanceAmount(ca.netContractPosition)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                  <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                    Total Aset Lancar
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                    {formatBalanceAmount(totalCurrentAssets)}
                  </TableCell>
                </TableRow>

                <TableRow className="bg-muted/10 font-bold border-t border-border/70">
                  <TableCell colSpan={2} className="px-6 text-xs text-foreground pl-8 font-bold">
                    ASET TETAP
                  </TableCell>
                </TableRow>
                {fixedAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                      Tidak ada aset tetap
                    </TableCell>
                  </TableRow>
                ) : (
                  fixedAssets.map((a) => (
                    <TableRow key={a.code}>
                      <TableCell className="px-6 text-xs text-foreground pl-12">
                        {a.name}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                        {formatBalanceAmount(a.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                  <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                    Total Aset Tetap (Net)
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                    {formatBalanceAmount(totalFixedAssets)}
                  </TableCell>
                </TableRow>

                <TableRow className="bg-muted/40 font-bold border-t-2 border-b-2 border-border/80">
                  <TableCell className="px-6 text-xs font-bold text-foreground uppercase tracking-wide">
                    TOTAL ASET
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                    {formatBalanceAmount(balanceSheet.totalAssets)}
                  </TableCell>
                </TableRow>

                {/* LIABILITAS */}
                <TableRow className="bg-muted/30 font-bold border-t-2 border-border/80">
                  <TableCell colSpan={2} className="px-6 text-xs text-foreground font-bold uppercase tracking-wider">
                    LIABILITAS (KEWAJIBAN)
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/10 font-bold">
                  <TableCell colSpan={2} className="px-6 text-xs text-foreground pl-8 font-bold">
                    LIABILITAS JANGKA PENDEK
                  </TableCell>
                </TableRow>
                {currentLiabilities.length === 0 && balanceSheet.contractLiabilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                      Belum ada liabilitas jangka pendek pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {currentLiabilities.map((l) => (
                      <TableRow key={l.code}>
                        <TableCell className="px-6 text-xs text-foreground pl-12">
                          {l.name}
                        </TableCell>
                        <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                          {formatBalanceAmount(l.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {balanceSheet.contractLiabilities.map((cl) => (
                      <TableRow key={cl.projectId} className="bg-primary/5">
                        <TableCell className="px-6 text-xs pl-12">
                          <div className="font-semibold text-foreground">
                            Liabilitas Kontrak: {cl.projectName}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Penagihan {formatRupiah(cl.billingsBalance)} &minus; WIP {formatRupiah(cl.wipBalance)}
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                          {formatBalanceAmount(Math.abs(cl.netContractPosition))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                  <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                    Total Liabilitas Jangka Pendek
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                    {formatBalanceAmount(totalCurrentLiabilities)}
                  </TableCell>
                </TableRow>

                <TableRow className="bg-muted/10 font-bold border-t border-border/70">
                  <TableCell colSpan={2} className="px-6 text-xs text-foreground pl-8 font-bold">
                    LIABILITAS JANGKA PANJANG
                  </TableCell>
                </TableRow>
                {longTermLiabilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                      Tidak ada liabilitas jangka panjang
                    </TableCell>
                  </TableRow>
                ) : (
                  longTermLiabilities.map((l) => (
                    <TableRow key={l.code}>
                      <TableCell className="px-6 text-xs text-foreground pl-12">
                        {l.name}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                        {formatBalanceAmount(l.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                  <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                    Total Liabilitas Jangka Panjang
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                    {formatBalanceAmount(totalLongTermLiabilities)}
                  </TableCell>
                </TableRow>

                <TableRow className="bg-muted/25 font-bold border-t border-border/70">
                  <TableCell className="px-6 text-xs font-bold text-foreground pl-8">
                    Total Liabilitas
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                    {formatBalanceAmount(totalLiabilities)}
                  </TableCell>
                </TableRow>

                {/* EKUITAS */}
                <TableRow className="bg-muted/30 font-bold border-t-2 border-border/80">
                  <TableCell colSpan={2} className="px-6 text-xs text-foreground font-bold uppercase tracking-wider">
                    EKUITAS (MODAL)
                  </TableCell>
                </TableRow>
                {balanceSheet.equities.length === 0 && balanceSheet.currentUnclosedEarnings === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="px-6 text-xs text-muted-foreground italic pl-12">
                      Belum ada akun ekuitas pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {balanceSheet.equities.map((eq) => (
                      <TableRow key={eq.code}>
                        <TableCell className="px-6 text-xs text-foreground pl-12">
                          {eq.name}
                        </TableCell>
                        <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                          {formatBalanceAmount(eq.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {balanceSheet.currentUnclosedEarnings !== 0 ? (
                      <TableRow>
                        <TableCell className="px-6 text-xs italic text-muted-foreground pl-12">
                          Laba (Rugi) Periode Berjalan (Belum Ditutup)
                        </TableCell>
                        <TableCell className="pr-6 text-right text-xs font-medium text-foreground">
                          {formatBalanceAmount(balanceSheet.currentUnclosedEarnings)}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </>
                )}
                <TableRow className="bg-muted/20 font-bold border-t border-border/70">
                  <TableCell className="px-6 text-xs text-foreground pl-8 font-bold">
                    Total Ekuitas
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                    {formatBalanceAmount(totalEquity)}
                  </TableCell>
                </TableRow>

                {/* TOTAL LIABILITAS & EKUITAS */}
                <TableRow className="bg-muted/50 font-bold border-t-2 border-b-4 border-double border-border/90">
                  <TableCell className="px-6 text-xs font-bold text-foreground uppercase tracking-wide">
                    TOTAL LIABILITAS DAN EKUITAS
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                    {formatBalanceAmount(balanceSheet.totalLiabilitiesAndEquity)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  })();

  const detailedCashFlow = (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border/70">
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-lg font-bold text-foreground">
            Laporan Arus Kas Metode Langsung
          </CardTitle>
          <CardDescription>
            Klasifikasi aktivitas Operasi, Investasi, dan Pendanaan secara langsung dari mutasi kas periode{" "}
            <span className="font-semibold text-foreground">
              {formatDateID(startDate)} &minus; {formatDateID(endDate)}
            </span>
            .
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableBody>
              <TableRow className="bg-muted/20">
                <TableCell className="px-6 py-3 font-semibold text-xs text-foreground">
                  Saldo Kas &amp; Bank Awal Periode
                </TableCell>
                <TableCell className="pr-6 text-right font-bold text-xs text-foreground">
                  {formatRupiah(cashFlow.beginningCash)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-10 text-xs text-foreground">
                  Penerimaan Kas dari Pelanggan (Operasi)
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.operatingInflow)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-10 text-xs text-foreground">
                  Pembayaran Kas kepada Vendor &amp; Beban Operasional
                </TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  ({formatRupiah(cashFlow.operatingOutflow)})
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/10 font-semibold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">Arus Kas Bersih Aktivitas Operasi</TableCell>
                <TableCell className="pr-6 text-right text-xs font-semibold text-foreground">
                  {formatRupiah(cashFlow.netOperating)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground">Arus Kas Bersih Aktivitas Investasi</TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.netInvesting)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="px-6 text-xs text-foreground">Arus Kas Bersih Aktivitas Pendanaan</TableCell>
                <TableCell className="pr-6 text-right text-xs text-foreground">
                  {formatRupiah(cashFlow.netFinancing)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/20 font-semibold border-t border-border/70">
                <TableCell className="px-6 text-xs text-foreground">Kenaikan / (Penurunan) Bersih Kas</TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-foreground">
                  {formatRupiah(cashFlow.netChangeInCash)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/40 font-bold border-t-2 border-b-4 border-double border-border/90">
                <TableCell className="px-6 text-xs font-bold text-foreground">
                  Saldo Kas &amp; Bank Akhir Periode
                </TableCell>
                <TableCell className="pr-6 text-right text-xs font-bold text-primary dark:text-cyan-400">
                  {formatRupiah(cashFlow.endingCash)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const trialBalanceView = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Neraca Saldo
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
            Daftar seluruh saldo akhir akun untuk memastikan total Debit dan Kredit seimbang.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <ExportDownloadMenu
            label="Unduh / Ekspor"
            onExportExcel={handleExportActiveExcel}
            onExportPdf={handleExportActivePdf}
            onExportCsv={handleExportCsv}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {/* Status Bar & Selector Sebelum/Setelah Penyesuaian (Splitz Feature) */}
        <div
          className={cn(
            "p-4 border-b border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-4",
            isBalanced
              ? "bg-primary/10 border-primary/20 text-primary dark:text-cyan-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-500",
          )}
        >
          <div className="flex items-center">
            {isBalanced ? (
              <>
                <CheckCircle2Icon className="size-5 text-primary dark:text-cyan-400 mr-2 shrink-0" />
                <span className="text-primary dark:text-cyan-300 font-semibold text-sm">
                  Buku Kas Seimbang (Balanced)
                </span>
              </>
            ) : (
              <>
                <AlertCircleIcon className="size-5 text-rose-500 mr-2 shrink-0" />
                <span className="text-rose-700 dark:text-rose-300 font-semibold text-sm">
                  Peringatan: Terdapat selisih antara Debit dan Kredit ({formatRupiah(balanceDifference)})!
                </span>
              </>
            )}
          </div>

          {/* Selector Sebelum Penyesuaian vs Setelah Penyesuaian */}
          <div className="flex bg-muted/40 p-1 rounded-xl border border-border/70 shadow-xs text-xs font-semibold self-start md:self-auto">
            <button
              type="button"
              onClick={() => setBalanceType("unadjusted")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                balanceType === "unadjusted"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sebelum Penyesuaian
            </button>
            <button
              type="button"
              onClick={() => setBalanceType("adjusted")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                balanceType === "adjusted"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Setelah Penyesuaian
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border/80 text-foreground/80 text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 font-semibold whitespace-nowrap text-center w-36">No. Akun</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Nama Akun</th>
                <th className="px-6 py-4 font-semibold text-center w-60 sm:w-72">Debit</th>
                <th className="px-6 py-4 font-semibold text-center w-60 sm:w-72">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {trialBalance.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    Belum ada data neraca saldo pada periode terpilih.
                  </td>
                </tr>
              ) : (
                trialBalance.rows.map((item) => (
                  <tr key={item.accountId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-xs text-center text-foreground">
                      {item.code}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-foreground font-medium">
                      {item.name}
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs">
                      {formatSplitzCurrency(item.endingDebit)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs">
                      {formatSplitzCurrency(item.endingCredit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-muted/30 border-t-2 border-border/80 font-bold">
              <tr>
                <td colSpan={2} className="px-6 py-4 text-right font-bold text-xs text-foreground">
                  Total Keseluruhan:
                </td>
                <td className="px-6 py-4 text-right font-bold text-xs text-foreground">
                  {formatSplitzCurrency(trialBalance.sumEndingDebit)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-xs text-foreground">
                  {formatSplitzCurrency(trialBalance.sumEndingCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  const ledgerView = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Buku Besar
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
            Melihat rincian mutasi (Debit/Kredit) dan Saldo Akhir per Akun tunggal.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <ExportDownloadMenu
            label="Unduh / Ekspor"
            onExportExcel={handleExportActiveExcel}
            onExportPdf={handleExportActivePdf}
            onExportCsv={handleExportCsv}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-foreground mb-2">Pilih Akun</label>
          <Select
            value={selectedLedgerAccountId || "ALL"}
            onValueChange={setSelectedLedgerAccountId}
          >
            <SelectTrigger className="w-full h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Pilih Semua Akun" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectGroup>
                <SelectItem value="ALL" className="font-semibold text-primary dark:text-cyan-400">
                  Pilih Semua Akun
                </SelectItem>
                {postableAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* View Semua Akun (Splitz Exact Style) */}
        {isAllAccounts ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-primary/10 border border-primary/25 p-4 rounded-xl">
              <div>
                <h3 className="font-semibold text-primary dark:text-cyan-400 text-sm sm:text-base">
                  Buku Besar: Semua Akun
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Diklasifikasikan per akun dengan tabel masing-masing (Urutan Terlama ke Terbaru).
                </p>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-primary dark:text-cyan-400 shrink-0">
                {allLedgers.length} akun aktif
              </div>
            </div>

            {allLedgers.map((item) => (
              <div
                key={item.account.id}
                className="border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-card"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-border/70 p-4 bg-muted/30">
                  <div>
                    <h4 className="font-bold text-foreground text-base sm:text-lg">
                      {item.account.code} - {item.account.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tipe: {ACCOUNT_TYPE_LABELS[item.account.account_type] ?? item.account.account_type} | Saldo Normal:{" "}
                      {["asset", "expense"].includes(item.account.account_type) ? "Debit" : "Kredit"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-semibold text-muted-foreground block">Saldo Akhir</span>
                    <div className="text-lg sm:text-xl font-bold text-primary dark:text-cyan-400">
                      Rp {new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(item.endingBalance)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 border-b border-border/70 text-foreground/80 text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-center w-32">Tanggal</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Keterangan</th>
                        <th className="px-6 py-4 font-semibold text-center w-48 sm:w-56">Debit</th>
                        <th className="px-6 py-4 font-semibold text-center w-48 sm:w-56">Kredit</th>
                        <th className="px-6 py-4 font-semibold text-center w-52 sm:w-60">Saldo Berjalan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-foreground">
                      {item.rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            Belum ada mutasi untuk akun ini pada periode terpilih.
                          </td>
                        </tr>
                      ) : (
                        item.rows.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateSplitz(entry.journalDate)}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-foreground">
                              {entry.description}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs">
                              {formatSplitzCurrency(entry.debit)}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs">
                              {formatSplitzCurrency(entry.credit)}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs font-semibold text-foreground">
                              {formatSplitzCurrency(entry.runningBalance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {allLedgers.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                Belum ada mutasi untuk semua akun pada periode terpilih.
              </div>
            )}
          </div>
        ) : selectedAccount ? (
          /* View Akun Tunggal (Splitz Single Account View) */
          <div>
            <div className="mb-4 flex justify-between items-center bg-primary/10 border border-primary/20 p-4 rounded-xl">
              <div>
                <h3 className="font-semibold text-primary dark:text-cyan-400 text-sm sm:text-base">
                  Saldo Akhir: {selectedAccount.name}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Perhitungan berjalan menyesuaikan Saldo Normal (
                  {["asset", "expense"].includes(selectedAccount.account_type) ? "Debit" : "Kredit"})
                </p>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-primary dark:text-cyan-400">
                Rp {new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(selectedLedgerEndingBalance)}
              </div>
            </div>

            <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 border-b border-border/70 text-foreground/80 text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap text-center w-32">Tanggal</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Keterangan</th>
                      <th className="px-6 py-4 font-semibold text-center w-48 sm:w-56">Debit</th>
                      <th className="px-6 py-4 font-semibold text-center w-48 sm:w-56">Kredit</th>
                      <th className="px-6 py-4 font-semibold text-center w-52 sm:w-60">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-foreground">
                    {ledgerRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          Belum ada mutasi untuk akun ini pada periode terpilih.
                        </td>
                      </tr>
                    ) : (
                      ledgerRows.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateSplitz(entry.journalDate)}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-foreground">
                            {entry.description}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs">
                            {formatSplitzCurrency(entry.debit)}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs">
                            {formatSplitzCurrency(entry.credit)}
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs font-semibold text-foreground">
                            {formatSplitzCurrency(entry.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {!hideHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0 max-w-xl">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Laporan Keuangan Akrual Standar SAK
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Sajikan laporan posisi keuangan, laba rugi, arus kas, dan neraca saldo berbasis akrual standar SAK.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
            <ExportDownloadMenu
              onExportExcel={handleExportActiveExcel}
              onExportPdf={handleExportActivePdf}
              onExportCsv={handleExportCsv}
            />
          </div>
        </div>
      )}

      {hideHeader && mode === "statements" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Laporan Keuangan SAK
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
              Laporan Laba/Rugi, Perubahan Ekuitas, Neraca, dan Arus Kas.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <ExportDownloadMenu
              label="Unduh / Ekspor"
              onExportExcel={handleExportActiveExcel}
              onExportPdf={handleExportActivePdf}
              onExportCsv={handleExportCsv}
            />
          </div>
        </div>
      )}

      {mode === "statements" ? (
        <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-6">
          {/* Top Bar with Segmented Selector & Layout Toggle */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-5">
            <div className="flex items-center gap-3">
              {layoutMode === "single" ? (
                <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl p-1 shadow-2xs">
                  <div className="flex items-center gap-1 px-1">
                    {[
                      { label: "Laba Rugi", value: "laba_rugi" },
                      { label: "Perubahan Ekuitas", value: "ekuitas" },
                      { label: "Neraca", value: "neraca" },
                      { label: "Arus Kas", value: "arus_kas" },
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value as ActiveReportTab)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                          activeTab === tab.value
                            ? "bg-primary text-primary-foreground shadow-xs dark:bg-primary dark:text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground pl-1">
                  Menampilkan Semua Laporan (4 Dokumen)
                </span>
              )}
            </div>

            {/* Toggle Layout Mode */}
            <div className="flex items-center gap-1 bg-background border border-border/80 rounded-xl p-1 shadow-2xs self-end md:self-auto">
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  layoutMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-xs dark:bg-primary dark:text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                )}
              >
                <LayoutGridIcon className="size-3.5" />
                <span>Semua Laporan</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("single")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  layoutMode === "single"
                    ? "bg-primary text-primary-foreground shadow-xs dark:bg-primary dark:text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                )}
              >
                <BookOpenIcon className="size-3.5" />
                <span>Satu Halaman</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          {layoutMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
              {incomeStatementCard}
              {retainedEarningsCard}
              {balanceSheetCard}
              {cashFlowCard}
            </div>
          ) : (
            <div className="w-full">
              {activeTab === "laba_rugi" && detailedIncomeStatement}
              {activeTab === "ekuitas" && detailedRetainedEarnings}
              {activeTab === "neraca" && detailedBalanceSheet}
              {activeTab === "arus_kas" && detailedCashFlow}
            </div>
          )}
        </div>
      ) : mode === "trial_balance" ? (
        trialBalanceView
      ) : mode === "ledger" ? (
        ledgerView
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
                  Laba Rugi
                </TabsTrigger>
                <TabsTrigger value="ekuitas" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  Perubahan Ekuitas
                </TabsTrigger>
                <TabsTrigger value="neraca" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  Neraca SAK
                </TabsTrigger>
                <TabsTrigger value="arus_kas" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  Arus Kas
                </TabsTrigger>
                <TabsTrigger value="neraca_saldo" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  Neraca Saldo
                </TabsTrigger>
                <TabsTrigger value="buku_besar" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold">
                  Buku Besar
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
            {detailedIncomeStatement}
          </TabsContent>

          {/* 2. Perubahan Ekuitas */}
          <TabsContent value="ekuitas" className="space-y-4">
            {detailedRetainedEarnings}
          </TabsContent>

          {/* 3. Neraca SAK */}
          <TabsContent value="neraca" className="space-y-4">
            {detailedBalanceSheet}
          </TabsContent>

          {/* 4. Arus Kas */}
          <TabsContent value="arus_kas" className="space-y-4">
            {detailedCashFlow}
          </TabsContent>

          {/* 5. Neraca Saldo */}
          <TabsContent value="neraca_saldo" className="mt-0 space-y-6">
            {trialBalanceView}
          </TabsContent>

          {/* 6. Buku Besar */}
          <TabsContent value="buku_besar" className="mt-0 space-y-6">
            {ledgerView}
          </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

