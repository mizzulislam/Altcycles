import * as React from "react";
import {
  AlertTriangleIcon,
  FolderKanbanIcon,
  PiggyBankIcon,
  PlusIcon,
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
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
  const [expenseAccounts, setExpenseAccounts] = React.useState<AccountRow[]>([]);
  const [rows, setRows] = React.useState<BudgetComparisonRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [editOpen, setEditOpen] = React.useState(false);
  const [thresholdPct, setThresholdPct] = React.useState(80);
  const [allocations, setAllocations] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);

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

  function openBudgetEditor() {
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.account_id] = r.allocated_amount;
    }
    if (rows[0]) setThresholdPct(rows[0].alert_threshold_pct);
    setAllocations(map);
    setEditOpen(true);
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
    if (r.remaining_amount < 0) return "Melebihi Pagu";
    if (r.is_over_threshold) return `>= ${r.alert_threshold_pct}% Ambang`;
    return "Aman";
  }

  async function handleExportExcel() {
    const projectCode = (selectedProject?.code ?? "PRJ").replace(/\//g, "-");
    await downloadExcelSheet({
      fileName: `Anggaran_Proyek_${projectCode}.xlsx`,
      sheetName: "Anggaran vs Realisasi",
      columns: [
        { header: "Kode Akun", width: 16 },
        { header: "Nama Akun Beban", width: 34 },
        { header: "Pagu Anggaran (Rp)", width: 22 },
        { header: "Realisasi Terposting (Rp)", width: 22 },
        { header: "Sisa Anggaran (Rp)", width: 22 },
        { header: "Serapan (%)", width: 14 },
        { header: "Status", width: 20 },
      ],
      rows: rows.map((r) => [
        r.account_code,
        r.account_name,
        r.allocated_amount,
        r.realized_amount,
        r.remaining_amount,
        r.absorption_pct,
        budgetStatusLabel(r),
      ]),
    });
    await recordExportLog("PROJECT_BUDGET", "EXCEL", selectedProject?.code);
    toast.success("Perbandingan anggaran proyek berhasil diekspor ke Excel (.xlsx).");
  }

  async function handleExportPdf() {
    const comp = await getCompanyProfile();
    const projectLabel = selectedProject
      ? `${selectedProject.code} - ${selectedProject.name}`
      : "-";
    const projectCode = (selectedProject?.code ?? "PRJ").replace(/\//g, "-");
    const bytes = await generateDocumentPdf({
      docTitle: "LAPORAN ANGGARAN VS REALISASI PROYEK",
      docSubtitle: `Proyek: ${projectLabel}`,
      docNumber: `BDG-${projectCode}/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      metaRows: [
        { label: "Total Pagu Anggaran", value: formatRupiah(totalBudget) },
        { label: "Realisasi Terposting", value: formatRupiah(totalActual) },
        { label: "Sisa Anggaran", value: formatRupiah(totalRemaining) },
      ],
      tableColumns: [
        { header: "Akun Beban", widthRatio: 0.34 },
        { header: "Pagu", widthRatio: 0.16, align: "right" },
        { header: "Realisasi", widthRatio: 0.16, align: "right" },
        { header: "Sisa", widthRatio: 0.16, align: "right" },
        { header: "Serapan", widthRatio: 0.08, align: "right" },
        { header: "Status", widthRatio: 0.10 },
      ],
      tableRows: rows.map((r) => [
        `${r.account_code} - ${r.account_name}`,
        formatRupiah(r.allocated_amount),
        formatRupiah(r.realized_amount),
        formatRupiah(r.remaining_amount),
        `${r.absorption_pct}%`,
        budgetStatusLabel(r),
      ]),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, `Anggaran_Proyek_${projectCode}.pdf`);
    await recordExportLog("PROJECT_BUDGET", "PDF", selectedProject?.code);
    toast.success("Perbandingan anggaran proyek berhasil diekspor ke PDF (.pdf).");
  }

  async function handleExportCsv() {
    const projectCode = (selectedProject?.code ?? "PRJ").replace(/\//g, "-");
    downloadCsvFile(
      `Anggaran_Proyek_${projectCode}.csv`,
      [
        "Kode Akun",
        "Nama Akun Beban",
        "Pagu Anggaran (Rp)",
        "Realisasi Terposting (Rp)",
        "Sisa Anggaran (Rp)",
        "Serapan (%)",
        "Status",
      ],
      rows.map((r) => [
        r.account_code,
        r.account_name,
        r.allocated_amount,
        r.realized_amount,
        r.remaining_amount,
        r.absorption_pct,
        budgetStatusLabel(r),
      ]),
    );
    await recordExportLog("PROJECT_BUDGET", "CSV", selectedProject?.code);
    toast.success("Perbandingan anggaran proyek berhasil diekspor ke CSV (.csv).");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mode === "admin"
              ? "Budgeting & Pengendalian Anggaran Proyek"
              : "Anggaran vs Realisasi Proyek Saya"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {mode === "admin"
              ? "Kendalikan pagu anggaran belanja dan pantau realisasi pengeluaran proyek."
              : "Pantau pagu anggaran belanja dan realisasi pengeluaran proyek yang ditugaskan."}
          </p>
        </div>
        {mode === "admin" && selectedProjectId ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ExportDownloadMenu
              label="Unduh / Ekspor"
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />
            <Button
              type="button"
              onClick={openBudgetEditor}
              className="shrink-0 cursor-pointer shadow-2xs"
            >
              <PlusIcon className="size-4" />
              <span>Atur Alokasi Anggaran</span>
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
                  Proyek Aktif
                </span>
                <div className="w-full sm:max-w-lg min-w-0">
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs sm:text-sm">
                      <SelectValue placeholder="Pilih proyek" />
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
                Total Serapan:{" "}
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
          <AlertTitle>Peringatan Ambang Serapan Anggaran</AlertTitle>
          <AlertDescription>
            Terdapat {overThresholdRows.length} pos beban yang telah melampaui
            ambang peringatan serapan anggaran.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Ringkasan KPI Anggaran Proyek */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Total Pagu Anggaran
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalBudget)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {rows.length > 0
                ? `Tersebar pada ${rows.length} akun beban proyek`
                : "Belum ada pos anggaran ditetapkan"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Realisasi Beban Terposting
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalActual)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
              Serapan {totalAbsorptionPct}% dari pagu berjalan
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <TrendingUpIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Sisa Anggaran Tersedia
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
                ? "Realisasi melebihi pagu anggaran"
                : "Saldo anggaran yang masih dapat digunakan"}
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
        <CardHeader className="px-6 py-4 border-b border-border/70">
          <CardTitle>
            Perbandingan Anggaran vs Realisasi per Akun Beban
          </CardTitle>
          <CardDescription>
            Persentase serapan dan status ambang batas peringatan setiap akun.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat data anggaran...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode &amp; Nama Akun</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">Pagu Anggaran</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">Realisasi Terposting</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">Sisa Anggaran</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-28">Serapan (%)</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-36">Status</TableHead>
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
                          Anggaran Proyek Belum Disusun
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                          {mode === "admin"
                            ? "Klik tombol Atur Alokasi Anggaran di kanan atas untuk menetapkan pagu per akun beban."
                            : "Admin belum menetapkan pagu anggaran untuk proyek ini."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.account_id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        <span className="font-mono font-semibold text-muted-foreground">
                          {r.account_code}
                        </span>{" "}
                        &mdash; {r.account_name}
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
                            <StatusBadge tone="destructive" label="Melebihi Pagu" />
                          ) : r.is_over_threshold ? (
                            <StatusBadge
                              tone="warning"
                              label={`>= ${r.alert_threshold_pct}% Ambang`}
                            />
                          ) : (
                            <StatusBadge tone="success" label="Aman" />
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
            <DialogTitle>Susun / Perbarui Anggaran Proyek</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="min-w-0">
            <FieldGroup className="gap-4">
              <div className="grid gap-3.5 sm:grid-cols-2 sm:items-end">
                <Field>
                  <FieldLabel htmlFor="bdg-thr" required>
                    Ambang Peringatan Serapan (%)
                  </FieldLabel>
                  <NumberInput
                    id="bdg-thr"
                    allowDecimal={false}
                    min={1}
                    max={100}
                    required
                    value={thresholdPct}
                    onValueChange={setThresholdPct}
                  />
                  <FieldDescription>
                    Sistem memberi peringatan otomatis saat realisasi mencapai ambang ini.
                  </FieldDescription>
                </Field>
                <div className="rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Total Pagu Anggaran Disusun
                  </p>
                  <p className="text-base sm:text-lg font-bold tracking-tight text-foreground tabular-nums mt-0.5">
                    {formatRupiah(draftAllocatedTotal)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/15 p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground pb-1 border-b border-border/60">
                  <span>Alokasi per Akun Beban</span>
                  <span className="text-muted-foreground font-medium">Pagu (Rp)</span>
                </div>
                <div className="flex max-h-64 flex-col gap-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {expenseAccounts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Belum ada akun beban aktif pada Bagan Akun SAK.
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
                          title={`${acc.code}: ${acc.name}`}
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {acc.code}
                          </span>{" "}
                          &mdash; {acc.name}
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
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <DialogFooter className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Anggaran
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
