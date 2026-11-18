import * as React from "react";
import {
  AlertTriangleIcon,
  ArrowUpDownIcon,
  FolderKanbanIcon,
  PencilIcon,
  PiggyBankIcon,
  PlusIcon,
  RotateCcwIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { downloadCsvFile } from "@/lib/csv-exporter";
import { getCompanyProfile, listAccounts, listProjects } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { getLocalizedAccountName } from "@/lib/glossary";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatRupiah } from "@/lib/formatters";
import {
  getProjectBudgetComparison,
  recordExportLog,
  saveProjectBudget,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type {
  AccountRow,
  BudgetComparisonRow,
  ProjectRow,
} from "@/types/database.types";

export function BudgetPage({ mode }: { mode: "user" | "admin" }) {
  const { t, language } = useLanguage();
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
  const [expenseAccounts, setExpenseAccounts] = React.useState<AccountRow[]>([]);
  const [rows, setRows] = React.useState<BudgetComparisonRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [editOpen, setEditOpen] = React.useState(false);
  const [isEditSource, setIsEditSource] = React.useState(false);
  const [thresholdPct, setThresholdPct] = React.useState(80);
  const [allocations, setAllocations] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const sortedRows = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortOrder === "asc") {
        return a.account_code.localeCompare(b.account_code);
      }
      return b.account_code.localeCompare(a.account_code);
    });
  }, [rows, sortOrder]);

  React.useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [prjRes, accs] = await Promise.all([listProjects(), listAccounts()]);
        setProjects(prjRes.projects);
        setExpenseAccounts(
          accs.filter(
            (a) => a.is_active && a.is_postable && a.account_type === "expense",
          ),
        );
        if (prjRes.projects[0]) {
          setSelectedProjectId(prjRes.projects[0].id);
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Gagal memuat daftar proyek anggaran.",
        );
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const loadComparison = React.useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const comp = await getProjectBudgetComparison(selectedProjectId);
      setRows(comp);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat anggaran.");
    }
  }, [selectedProjectId]);

  React.useEffect(() => {
    void loadComparison();
  }, [loadComparison]);

  function openBudgetEditor(isFromEdit = false) {
    setIsEditSource(isFromEdit);
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.account_id] = r.allocated_amount;
    }
    if (rows[0]) setThresholdPct(rows[0].alert_threshold_pct);
    setAllocations(map);
    setEditOpen(true);
  }

  function handleResetAllocations() {
    const resetMap: Record<string, number> = {};
    for (const acc of expenseAccounts) {
      resetMap[acc.id] = 0;
    }
    setAllocations(resetMap);
    toast.info(t("budgeting:modal_editor.toast_reset"));
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      await saveProjectBudget({
        projectId: selectedProjectId,
        alertThresholdPct: thresholdPct,
        lines: Object.entries(allocations).map(([accountId, allocatedAmount]) => ({
          accountId,
          allocatedAmount,
        })),
      });
      toast.success("Anggaran proyek berhasil disimpan.");
      setEditOpen(false);
      await loadComparison();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan anggaran.");
    } finally {
      setSaving(false);
    }
  }

  const totalBudget = rows.reduce((s, r) => s + r.allocated_amount, 0);
  const totalActual = rows.reduce((s, r) => s + r.realized_amount, 0);
  const totalRemaining = totalBudget - totalActual;
  const totalAbsorptionPct =
    totalBudget > 0 ? Math.round((totalActual / totalBudget) * 1000) / 10 : 0;
  const draftAllocatedTotal = Object.values(allocations).reduce(
    (s, val) => s + (Number.isFinite(val) ? val : 0),
    0,
  );
  const overThresholdRows = rows.filter((r) => r.is_over_threshold);
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  function budgetStatusLabel(r: BudgetComparisonRow): string {
    if (r.remaining_amount < 0) return t("budgeting:common.status_exceeds");
    if (r.is_over_threshold) return t("budgeting:common.status_threshold", { pct: r.alert_threshold_pct });
    return t("budgeting:common.status_safe");
  }

  async function handleExportExcel() {
    const projectCode = (selectedProject?.code ?? "PRJ").replace(/\//g, "-");
    await downloadExcelSheet({
      fileName: t("budgeting:export.excel_filename", { code: projectCode }),
      sheetName: t("budgeting:export.excel_sheet"),
      columns: [
        { header: t("budgeting:export.excel_col_code"), width: 16 },
        { header: t("budgeting:export.excel_col_name"), width: 34 },
        { header: t("budgeting:export.excel_col_ceiling"), width: 22 },
        { header: t("budgeting:export.excel_col_realization"), width: 22 },
        { header: t("budgeting:export.excel_col_remaining"), width: 22 },
        { header: t("budgeting:export.excel_col_absorption"), width: 14 },
        { header: t("budgeting:export.excel_col_status"), width: 20 },
      ],
      rows: rows.map((r) => [
        r.account_code,
        getLocalizedAccountName({ code: r.account_code, name: r.account_name }, language),
        r.allocated_amount,
        r.realized_amount,
        r.remaining_amount,
        r.absorption_pct,
        budgetStatusLabel(r),
      ]),
    });
    await recordExportLog("PROJECT_BUDGET", "EXCEL", selectedProject?.code);
    toast.success(t("budgeting:export.toast_excel_success"));
  }

  async function handleExportPdf() {
    const comp = await getCompanyProfile();
    const projectLabel = selectedProject
      ? `${selectedProject.code} - ${selectedProject.name}`
      : "-";
    const projectCode = (selectedProject?.code ?? "PRJ").replace(/\//g, "-");
    const bytes = await generateDocumentPdf({
      docTitle: t("budgeting:export.pdf_title"),
      docSubtitle: t("budgeting:export.pdf_subtitle", { project: projectLabel }),
      docNumber: `BDG-${projectCode}/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      orientation: "landscape",
      metaRows: [
        {
          label: t("budgeting:common.kpi_ceiling"),
          value: formatRupiah(totalBudget),
        },
        {
          label: t("budgeting:common.kpi_realization"),
          value: formatRupiah(totalActual),
        },
        {
          label: t("budgeting:common.kpi_remaining"),
          value: formatRupiah(totalRemaining),
        },
      ],
      tableColumns: [
        { header: t("budgeting:export.excel_col_name"), widthRatio: 0.26 },
        { header: t("budgeting:common.col_ceiling"), widthRatio: 0.16, align: "right" },
        { header: t("budgeting:common.col_realization"), widthRatio: 0.16, align: "right" },
        { header: t("budgeting:common.col_remaining"), widthRatio: 0.16, align: "right" },
        { header: t("budgeting:common.col_absorption"), widthRatio: 0.14, align: "center" },
        { header: t("budgeting:common.col_status"), widthRatio: 0.12, align: "center" },
      ],
      tableRows: rows.map((r) => [
        `${r.account_code} - ${getLocalizedAccountName({ code: r.account_code, name: r.account_name }, language)}`,
        formatRupiah(r.allocated_amount),
        formatRupiah(r.realized_amount),
        formatRupiah(r.remaining_amount),
        `${r.absorption_pct}%`,
        budgetStatusLabel(r),
      ]),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(
      bytes,
      t("budgeting:export.pdf_filename", { code: projectCode }),
    );
    await recordExportLog("PROJECT_BUDGET", "PDF", selectedProject?.code);
  }

  async function handleExportCsv() {
    const projectCode = (selectedProject?.code ?? "PRJ").replace(/\//g, "-");
    downloadCsvFile(
      t("budgeting:export.csv_filename", { code: projectCode }),
      [
        t("budgeting:export.excel_col_code"),
        t("budgeting:export.excel_col_name"),
        t("budgeting:export.excel_col_ceiling"),
        t("budgeting:export.excel_col_realization"),
        t("budgeting:export.excel_col_remaining"),
        t("budgeting:export.excel_col_absorption"),
        t("budgeting:export.excel_col_status"),
      ],
      rows.map((r) => [
        r.account_code,
        getLocalizedAccountName({ code: r.account_code, name: r.account_name }, language),
        r.allocated_amount,
        r.realized_amount,
        r.remaining_amount,
        r.absorption_pct,
        budgetStatusLabel(r),
      ]),
    );
    await recordExportLog("PROJECT_BUDGET", "CSV", selectedProject?.code);
    toast.success(t("budgeting:export.toast_csv_success"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mode === "admin"
              ? t("budgeting:admin.page_title")
              : t("budgeting:user.page_title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {mode === "admin"
              ? t("budgeting:admin.page_desc")
              : t("budgeting:user.page_desc")}
          </p>
        </div>
        {mode === "admin" && selectedProjectId ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ExportDownloadMenu
              label={t("common:action.export_download")}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />
            <Button
              type="button"
              onClick={() => openBudgetEditor(false)}
              className="shrink-0 cursor-pointer shadow-2xs"
            >
              <PlusIcon className="size-4" />
              <span>{t("budgeting:admin.btn_set_budget")}</span>
            </Button>
          </div>
        ) : null}
      </div>

      {projects.length > 0 ? (
        <Card className="rounded-2xl border-border/80 bg-card px-5 py-3.5 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
                <FolderKanbanIcon className="size-4" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-semibold text-foreground shrink-0">
                  {t("budgeting:common.active_project")}
                </span>
                <div className="w-full sm:max-w-lg min-w-0">
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs sm:text-sm">
                      <SelectValue placeholder={t("budgeting:common.select_project_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code}: {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {rows.length > 0 ? (
              <div className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {t("budgeting:common.total_absorption_label")}{" "}
                <span className="font-semibold text-foreground">
                  {totalAbsorptionPct}%
                </span>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {overThresholdRows.length > 0 ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>{t("budgeting:common.warning_threshold_title")}</AlertTitle>
          <AlertDescription>
            {t("budgeting:common.warning_threshold_desc", { count: overThresholdRows.length })}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Ringkasan KPI Anggaran Proyek */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("budgeting:common.kpi_ceiling")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalBudget)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {rows.length > 0
                ? t("budgeting:common.kpi_ceiling_desc_active", { count: rows.length })
                : t("budgeting:common.kpi_ceiling_desc_empty")}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("budgeting:common.kpi_realization")}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalActual)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
              {t("budgeting:common.kpi_realization_desc", { pct: totalAbsorptionPct })}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <TrendingUpIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("budgeting:common.kpi_remaining")}
            </p>
            <p
              className={`text-xl sm:text-2xl font-bold tracking-tight mt-1 tabular-nums ${
                totalRemaining < 0
                  ? "text-destructive"
                  : "text-foreground"
              }`}
            >
              {formatRupiah(totalRemaining)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalRemaining < 0
                ? t("budgeting:common.kpi_remaining_desc_negative")
                : t("budgeting:common.kpi_remaining_desc_positive")}
            </p>
          </div>
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
              totalRemaining < 0
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            }`}
          >
            <PiggyBankIcon className="size-5" />
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle>
              {t("budgeting:common.card_title")}
            </CardTitle>
            <CardDescription>
              {t("budgeting:common.card_desc")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold cursor-pointer shrink-0"
            >
              <ArrowUpDownIcon className="size-3.5" />
              <span>
                {t("common:action.order", "Urutan")}:{" "}
                {sortOrder === "asc"
                  ? t("common:action.oldest", "Terlama")
                  : t("common:action.newest", "Terbaru")}
              </span>
            </Button>
            {mode === "admin" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openBudgetEditor(true)}
                className="h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold cursor-pointer shrink-0 text-primary dark:text-sky-400 hover:text-primary dark:hover:text-sky-400"
              >
                <PencilIcon className="size-3.5" />
                <span>{t("common:action.edit", "Edit")}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>{t("budgeting:common.loading")}</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                    {t("budgeting:common.col_account")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">
                    {t("budgeting:common.col_ceiling")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">
                    {t("budgeting:common.col_realization")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">
                    {t("budgeting:common.col_remaining")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-28">
                    {t("budgeting:common.col_absorption")}
                  </TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-36">
                    {t("budgeting:common.col_status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <PiggyBankIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("budgeting:common.empty_title")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                          {mode === "admin"
                            ? t("budgeting:admin.empty_desc")
                            : t("budgeting:user.empty_desc")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.map((r) => (
                    <TableRow key={r.account_id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        <span className="font-mono font-semibold text-muted-foreground">
                          {r.account_code}
                        </span>{" "}
                        &mdash; {getLocalizedAccountName({ code: r.account_code, name: r.account_name }, language)}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={r.allocated_amount} />
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={r.realized_amount} />
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={r.remaining_amount} />
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap tabular-nums">
                        {r.absorption_pct}%
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          {r.remaining_amount < 0 ? (
                            <StatusBadge tone="destructive" label={t("budgeting:common.status_exceeds")} />
                          ) : r.is_over_threshold ? (
                            <StatusBadge
                              tone="warning"
                              label={t("budgeting:common.status_threshold", { pct: r.alert_threshold_pct })}
                            />
                          ) : (
                            <StatusBadge tone="success" label={t("budgeting:common.status_safe")} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("budgeting:modal_editor.title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="min-w-0">
            <FieldGroup className="gap-4">
              <div className="grid gap-3.5 sm:grid-cols-2 items-start">
                <Field>
                  <FieldLabel htmlFor="bdg-thr" required>
                    {t("budgeting:modal_editor.threshold_label")}
                  </FieldLabel>
                  <NumberInput
                    id="bdg-thr"
                    allowDecimal={false}
                    min={1}
                    max={100}
                    required
                    value={thresholdPct}
                    onValueChange={setThresholdPct}
                    className="h-9"
                  />
                  <FieldDescription>
                    {t("budgeting:modal_editor.threshold_desc")}
                  </FieldDescription>
                </Field>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {t("budgeting:modal_editor.planned_total_label")}
                  </span>
                  <div className="flex h-9 items-center justify-between rounded-xl border border-border/80 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 font-bold tracking-tight text-foreground tabular-nums text-sm sm:text-base shadow-2xs">
                    <span className="text-xs font-semibold text-muted-foreground">IDR</span>
                    <span>{formatRupiah(draftAllocatedTotal).replace(/^Rp\s?/, "")}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {t("budgeting:modal_editor.planned_total_desc")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/15 p-4 shadow-2xs">
                <div className="grid grid-cols-12 items-center text-xs font-semibold text-foreground pb-2 border-b border-border/60">
                  <span className="col-span-7">{t("budgeting:modal_editor.section_title")}</span>
                  <span className="col-span-5 text-right text-muted-foreground font-medium pr-1">
                    {t("budgeting:modal_editor.section_ceiling_label")}
                  </span>
                </div>
                <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto pr-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {expenseAccounts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      {t("budgeting:modal_editor.no_expense_accounts")}
                    </p>
                  ) : (
                    expenseAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="grid gap-2 sm:grid-cols-12 sm:items-center"
                      >
                        <label
                          htmlFor={`alloc-${acc.id}`}
                          className="sm:col-span-7 text-xs sm:text-sm font-medium text-foreground truncate"
                          title={`${acc.code}: ${getLocalizedAccountName(acc, language)}`}
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {acc.code}
                          </span>{" "}
                          &mdash; {getLocalizedAccountName(acc, language)}
                        </label>
                        <div className="sm:col-span-5">
                          <NumberInput
                            id={`alloc-${acc.id}`}
                            allowDecimal={false}
                            min={0}
                            value={allocations[acc.id] ?? 0}
                            onValueChange={(val) =>
                              setAllocations((prev) => ({
                                ...prev,
                                [acc.id]: val,
                              }))
                            }
                            className="h-9 tabular-nums text-right"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isEditSource ? (
                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between w-full gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetAllocations}
                    className="h-9 gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer text-xs sm:text-sm font-semibold"
                  >
                    <RotateCcwIcon className="size-3.5" />
                    <span>{t("budgeting:modal_editor.btn_reset")}</span>
                  </Button>
                  <div className="flex items-center gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditOpen(false)}
                      className="h-9 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
                    >
                      {t("budgeting:modal_editor.btn_cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="h-9 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
                    >
                      {saving ? <Spinner data-icon="inline-start" /> : null}
                      <span>{t("budgeting:modal_editor.btn_save")}</span>
                    </Button>
                  </div>
                </DialogFooter>
              ) : (
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                    className="h-9 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    {t("budgeting:modal_editor.btn_cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-9 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    {saving ? <Spinner data-icon="inline-start" /> : null}
                    <span>{t("budgeting:modal_editor.btn_save")}</span>
                  </Button>
                </DialogFooter>
              )}
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
