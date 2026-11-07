import * as React from "react";
import { DownloadIcon, FileSpreadsheetIcon } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

type ActiveReportTab =
  | "buku_besar"
  | "neraca_saldo"
  | "laba_rugi"
  | "neraca"
  | "arus_kas";

export function AccountingReportsPage() {
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [activeTab, setActiveTab] =
    React.useState<ActiveReportTab>("laba_rugi");
  const [startDate, setStartDate] = React.useState("2026-11-01");
  const [endDate, setEndDate] = React.useState("2027-01-31");
  const [projectFilter, setProjectFilter] = React.useState("ALL");
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] =
    React.useState("");

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
        const firstPostable = accs.find((a) => a.is_postable);
        if (firstPostable) {
          setSelectedLedgerAccountId(firstPostable.id);
        }
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

  const selectedAccount = React.useMemo(
    () => postableAccounts.find((a) => a.id === selectedLedgerAccountId),
    [postableAccounts, selectedLedgerAccountId],
  );

  const ledgerRows = React.useMemo(() => {
    if (!selectedAccount) return [];
    return buildGeneralLedger(selectedAccount, journals, lines, projects, {
      startDate,
      endDate,
      projectId: effectiveProjectId,
    });
  }, [selectedAccount, journals, lines, projects, startDate, endDate, effectiveProjectId]);

  const trialBalance = React.useMemo(
    () =>
      buildTrialBalance(accounts, journals, lines, {
        endDate,
        projectId: effectiveProjectId,
      }),
    [accounts, journals, lines, endDate, effectiveProjectId],
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

  async function handleExportActivePdf() {
    if (!company) return;
    const periodLabel = `${formatDateID(startDate)} s.d. ${formatDateID(endDate)}`;

    if (activeTab === "neraca") {
      const tableRows: string[][] = [
        ...balanceSheet.assets.map((a) => ["Aset", `${a.code} - ${a.name}`, formatRupiah(a.amount)]),
        ...balanceSheet.contractAssets.map((ca) => [
          "Aset Kontrak (Selisih WIP > Penagihan)",
          `${ca.projectCode} - ${ca.projectName}`,
          formatRupiah(ca.netContractPosition),
        ]),
        ...balanceSheet.liabilities.map((l) => [
          "Liabilitas",
          `${l.code} - ${l.name}`,
          formatRupiah(l.amount),
        ]),
        ...balanceSheet.contractLiabilities.map((cl) => [
          "Liabilitas Kontrak (Penagihan > WIP)",
          `${cl.projectCode} - ${cl.projectName}`,
          formatRupiah(Math.abs(cl.netContractPosition)),
        ]),
        ...balanceSheet.equities.map((eq) => [
          "Ekuitas",
          `${eq.code} - ${eq.name}`,
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
        tableRows,
        summaryRows: [
          { label: "TOTAL ASET", value: formatRupiah(balanceSheet.totalAssets) },
          {
            label: "TOTAL LIABILITAS + EKUITAS",
            value: formatRupiah(balanceSheet.totalLiabilitiesAndEquity),
          },
        ],
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
          `${r.code} - ${r.name}`,
          formatRupiah(r.amount),
        ]),
        ...incomeStatement.directExpenses.map((e) => [
          "Beban Langsung Proyek",
          `${e.code} - ${e.name}`,
          formatRupiah(e.amount),
        ]),
        ...incomeStatement.sharedExpenses.map((s) => [
          "Beban Operasional Bersama",
          `${s.code} - ${s.name}`,
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
    const bytes = await generateDocumentPdf({
      docTitle: `BUKU BESAR AKUN ${selectedAccount?.code ?? ""}`,
      docSubtitle: `${selectedAccount?.name ?? ""} (${periodLabel})`,
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
      tableRows: ledgerRows.map((r) => [
        formatDateID(r.journalDate),
        `${r.journalNumber} - ${r.description}`,
        formatRupiah(r.debit),
        formatRupiah(r.credit),
        formatRupiah(r.runningBalance),
      ]),
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    });
    downloadPdfBytes(bytes, `Buku_Besar_${selectedAccount?.code ?? "GL"}.pdf`);
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

    await downloadExcelSheet({
      fileName: `Buku_Besar_${selectedAccount?.code ?? "GL"}.xlsx`,
      sheetName: "Buku Besar",
      columns: [
        { header: "Tanggal", width: 14 },
        { header: "No. Jurnal", width: 20 },
        { header: "Proyek", width: 16 },
        { header: "Uraian", width: 36 },
        { header: "Debit", width: 18 },
        { header: "Kredit", width: 18 },
        { header: "Saldo Berjalan", width: 20 },
      ],
      rows: ledgerRows.map((r) => [
        formatDateID(r.journalDate),
        r.journalNumber,
        r.projectCode ?? "-",
        r.description,
        r.debit,
        r.credit,
        r.runningBalance,
      ]),
    });
    await recordExportLog("GENERAL_LEDGER", "EXCEL", `${startDate}..${endDate}`);
    toast.success("Buku Besar berhasil diekspor ke Excel.");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        <span>Menyusun laporan keuangan berbasis akrual SAK...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Laporan Keuangan Akrual Standar SAK
          </h1>
          <p className="text-sm text-muted-foreground">
            Buku Besar, Neraca Saldo, Laba Rugi, Neraca (dengan Aset Kontrak
            &amp; Liabilitas Kontrak per Proyek), dan Arus Kas Metode Langsung.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportActivePdf()}
          >
            <DownloadIcon data-icon="inline-start" />
            Unduh PDF Laporan Aktif
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportActiveExcel()}
          >
            <FileSpreadsheetIcon data-icon="inline-start" />
            Ekspor Excel (.xlsx)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parameter Periode &amp; Proyek</CardTitle>
          <CardDescription>
            Neraca dihitung kumulatif s.d. Tanggal Akhir; Laba Rugi, Arus Kas,
            dan Buku Besar dihitung pada rentang Tanggal Mulai s.d. Tanggal
            Akhir.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="rep-start">Tanggal Mulai</FieldLabel>
            <Input
              id="rep-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="rep-end">Tanggal Akhir / Per Tanggal</FieldLabel>
            <Input
              id="rep-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Filter Proyek (Laba Rugi / Buku Besar / NS)</FieldLabel>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">Seluruh Entitas Altvira</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ActiveReportTab)}
      >
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="laba_rugi">Laba Rugi</TabsTrigger>
          <TabsTrigger value="neraca">
            Neraca (Aset/Liabilitas Kontrak)
          </TabsTrigger>
          <TabsTrigger value="arus_kas">Arus Kas</TabsTrigger>
          <TabsTrigger value="neraca_saldo">Neraca Saldo</TabsTrigger>
          <TabsTrigger value="buku_besar">Buku Besar</TabsTrigger>
        </TabsList>

        {/* 1. Laba Rugi */}
        <TabsContent value="laba_rugi">
          <Card>
            <CardHeader>
              <CardTitle>
                Laporan Laba Rugi Basis Akrual ({formatDateID(startDate)} –{" "}
                {formatDateID(endDate)})
              </CardTitle>
              <CardDescription>
                Memisahkan beban langsung proyek dan beban operasional bersama
                (FR-AK6).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Komponen / Akun SAK</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell colSpan={2}>PENDAPATAN USAHA</TableCell>
                  </TableRow>
                  {incomeStatement.revenues.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-xs text-muted-foreground"
                      >
                        Belum ada pendapatan diakui pada rentang tanggal ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    incomeStatement.revenues.map((r) => (
                      <TableRow key={r.code}>
                        <TableCell className="text-xs">
                          <span className="font-mono">{r.code}</span> — {r.name}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatRupiah(r.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-semibold">
                    <TableCell>Total Pendapatan</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(incomeStatement.totalRevenue)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell colSpan={2}>BEBAN LANGSUNG PROYEK</TableCell>
                  </TableRow>
                  {incomeStatement.directExpenses.map((e) => (
                    <TableRow key={e.code}>
                      <TableCell className="text-xs">
                        <span className="font-mono">{e.code}</span> — {e.name}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        ({formatRupiah(e.amount)})
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>LABA KOTOR</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(incomeStatement.grossProfit)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell colSpan={2}>BEBAN OPERASIONAL BERSAMA</TableCell>
                  </TableRow>
                  {incomeStatement.sharedExpenses.map((s) => (
                    <TableRow key={s.code}>
                      <TableCell className="text-xs">
                        <span className="font-mono">{s.code}</span> — {s.name}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        ({formatRupiah(s.amount)})
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell>LABA (RUGI) BERSIH PERIODE BERJALAN</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(incomeStatement.netProfit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Neraca SAK */}
        <TabsContent value="neraca">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Laporan Posisi Keuangan / Neraca per {formatDateID(endDate)}
                </CardTitle>
                <CardDescription>
                  Menyajikan selisih bersih Jasa dalam Proses (WIP) dan
                  Penagihan atas Kontrak per proyek sebagai Aset Kontrak atau
                  Liabilitas Kontrak (PRD Bagian 7.1).
                </CardDescription>
              </div>
              <StatusBadge
                tone={balanceSheet.isBalanced ? "success" : "destructive"}
                label={
                  balanceSheet.isBalanced
                    ? "Neraca Seimbang"
                    : "Selisih Neraca"
                }
              />
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold">ASET</h3>
                <Table>
                  <TableBody>
                    {balanceSheet.assets.map((a) => (
                      <TableRow key={a.code}>
                        <TableCell className="text-xs">
                          <span className="font-mono">{a.code}</span> — {a.name}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatRupiah(a.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {balanceSheet.contractAssets.map((ca) => (
                      <TableRow key={ca.projectId} className="bg-muted/30">
                        <TableCell className="text-xs">
                          <div className="font-semibold">
                            Aset Kontrak — {ca.projectCode} ({ca.projectName})
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Jasa dlm Proses {formatRupiah(ca.wipBalance)} &minus;
                            Penagihan Kontrak {formatRupiah(ca.billingsBalance)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {formatRupiah(ca.netContractPosition)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted font-bold">
                      <TableCell>TOTAL ASET</TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(balanceSheet.totalAssets)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold">LIABILITAS &amp; EKUITAS</h3>
                <Table>
                  <TableBody>
                    {balanceSheet.liabilities.map((l) => (
                      <TableRow key={l.code}>
                        <TableCell className="text-xs">
                          <span className="font-mono">{l.code}</span> — {l.name}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatRupiah(l.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {balanceSheet.contractLiabilities.map((cl) => (
                      <TableRow key={cl.projectId} className="bg-muted/30">
                        <TableCell className="text-xs">
                          <div className="font-semibold">
                            Liabilitas Kontrak — {cl.projectCode} (
                            {cl.projectName})
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Penagihan Kontrak {formatRupiah(cl.billingsBalance)}{" "}
                            &minus; Jasa dlm Proses {formatRupiah(cl.wipBalance)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {formatRupiah(Math.abs(cl.netContractPosition))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {balanceSheet.equities.map((eq) => (
                      <TableRow key={eq.code}>
                        <TableCell className="text-xs">
                          <span className="font-mono">{eq.code}</span> —{" "}
                          {eq.name}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatRupiah(eq.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {balanceSheet.currentUnclosedEarnings !== 0 ? (
                      <TableRow>
                        <TableCell className="text-xs italic">
                          Laba/Rugi Periode Berjalan (Belum Ditutup)
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatRupiah(balanceSheet.currentUnclosedEarnings)}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    <TableRow className="bg-muted font-bold">
                      <TableCell>TOTAL LIABILITAS &amp; EKUITAS</TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(balanceSheet.totalLiabilitiesAndEquity)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Arus Kas */}
        <TabsContent value="arus_kas">
          <Card>
            <CardHeader>
              <CardTitle>
                Laporan Arus Kas ({formatDateID(startDate)} –{" "}
                {formatDateID(endDate)})
              </CardTitle>
              <CardDescription>
                Klasifikasi aktivitas Operasi, Investasi, dan Pendanaan secara
                langsung dari mutasi akun Kas &amp; Bank (FR-AK8).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      Saldo Kas &amp; Bank Awal Periode
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRupiah(cashFlow.beginningCash)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 text-xs">
                      Penerimaan Kas dari Pelanggan (Operasi)
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatRupiah(cashFlow.operatingInflow)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 text-xs">
                      Pembayaran Kas kepada Vendor &amp; Operasional
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      ({formatRupiah(cashFlow.operatingOutflow)})
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold">
                    <TableCell>Arus Kas Bersih Aktivitas Operasi</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(cashFlow.netOperating)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Arus Kas Bersih Aktivitas Investasi</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(cashFlow.netInvesting)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Arus Kas Bersih Aktivitas Pendanaan</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(cashFlow.netFinancing)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold">
                    <TableCell>Kenaikan / (Penurunan) Bersih Kas</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(cashFlow.netChangeInCash)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted font-bold">
                    <TableCell>SALDO KAS &amp; BANK AKHIR PERIODE</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(cashFlow.endingCash)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Neraca Saldo */}
        <TabsContent value="neraca_saldo">
          <Card>
            <CardHeader>
              <CardTitle>
                Neraca Saldo per {formatDateID(endDate)}
              </CardTitle>
              <CardDescription>
                Ringkasan mutasi dan saldo akhir seluruh akun buku besar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trialBalance.rows.length === 0 ? (
                <EmptyState
                  title="Belum ada saldo akun terposting"
                  description="Posting jurnal pada periode ini untuk menampilkan Neraca Saldo."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Akun</TableHead>
                      <TableHead>Kelompok</TableHead>
                      <TableHead className="text-right">Mutasi Debit</TableHead>
                      <TableHead className="text-right">
                        Mutasi Kredit
                      </TableHead>
                      <TableHead className="text-right">Saldo Debit</TableHead>
                      <TableHead className="text-right">Saldo Kredit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.rows.map((r) => (
                      <TableRow key={r.accountId}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {r.code}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {r.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ACCOUNT_TYPE_LABELS[r.accountType]}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatRupiah(r.totalDebit)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatRupiah(r.totalCredit)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {r.endingDebit > 0
                            ? formatRupiah(r.endingDebit)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {r.endingCredit > 0
                            ? formatRupiah(r.endingCredit)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted font-bold">
                      <TableCell colSpan={3}>TOTAL NERACA SALDO</TableCell>
                      <TableCell className="text-right text-xs">
                        {formatRupiah(trialBalance.sumDebit)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatRupiah(trialBalance.sumCredit)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatRupiah(trialBalance.sumEndingDebit)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatRupiah(trialBalance.sumEndingCredit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Buku Besar */}
        <TabsContent value="buku_besar">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Buku Besar per Akun (General Ledger)</CardTitle>
                <CardDescription>
                  Mutasi kronologis beserta saldo berjalan sesuai saldo normal
                  akun.
                </CardDescription>
              </div>
              <div className="w-full sm:w-80">
                <Select
                  value={selectedLedgerAccountId}
                  onValueChange={setSelectedLedgerAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun buku besar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {postableAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {ledgerRows.length === 0 ? (
                <EmptyState
                  title="Tidak ada mutasi pada akun ini"
                  description="Pilih akun lain atau perluas rentang tanggal laporan."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>No. Jurnal</TableHead>
                      <TableHead>Proyek</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Kredit</TableHead>
                      <TableHead className="text-right">
                        Saldo Berjalan
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerRows.map((r, idx) => (
                      <TableRow key={`${r.journalId}-${idx}`}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateID(r.journalDate)}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {r.journalNumber}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.projectCode ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.description}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {r.debit > 0 ? formatRupiah(r.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {r.credit > 0 ? formatRupiah(r.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {formatRupiah(r.runningBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

