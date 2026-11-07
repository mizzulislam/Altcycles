import * as React from "react";
import { AlertTriangleIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { listAccounts, listProjects } from "@/lib/data-service";
import { formatRupiah } from "@/lib/formatters";
import {
  getProjectBudgetComparison,
  saveProjectBudget,
} from "@/lib/operations-service";
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
  const overThresholdRows = rows.filter((r) => r.is_over_threshold);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "admin"
              ? "Budgeting & Pengendalian Anggaran Proyek"
              : "Anggaran vs Realisasi Proyek Saya"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sesuai aturan BR-8, kolom realisasi dihitung ketat hanya dari jurnal
            akuntansi yang telah terposting (pengajuan draf tidak mengurangi
            realisasi).
          </p>
        </div>
        {mode === "admin" && selectedProjectId ? (
          <Button type="button" onClick={openBudgetEditor}>
            <PlusIcon data-icon="inline-start" />
            Atur Alokasi Anggaran
          </Button>
        ) : null}
      </div>

      {projects.length > 0 ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Pilih Proyek:</span>
          <div className="w-80">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {overThresholdRows.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>Peringatan Ambang Serapan Anggaran (FR-BU4)</AlertTitle>
          <AlertDescription>
            Terdapat {overThresholdRows.length} pos beban yang telah melampaui
            ambang peringatan serapan anggaran.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pagu Anggaran</CardDescription>
            <CardTitle className="text-xl">{formatRupiah(totalBudget)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Realisasi Jurnal Terposting (BR-8)</CardDescription>
            <CardTitle className="text-xl">{formatRupiah(totalActual)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sisa Anggaran Tersedia</CardDescription>
            <CardTitle className="text-xl">
              {formatRupiah(totalRemaining)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perbandingan Anggaran vs Realisasi per Akun Beban</CardTitle>
          <CardDescription>
            Persentase serapan dan status ambang batas peringatan setiap akun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat data anggaran...</span>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Anggaran proyek belum disusun"
              description={
                mode === "admin"
                  ? "Klik Atur Alokasi Anggaran untuk menetapkan pagu per akun beban."
                  : "Admin belum menetapkan pagu anggaran untuk proyek ini."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode &amp; Nama Akun</TableHead>
                  <TableHead>Pagu Anggaran</TableHead>
                  <TableHead>Realisasi Terposting</TableHead>
                  <TableHead>Sisa Anggaran</TableHead>
                  <TableHead>Serapan (%)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.account_id}>
                    <TableCell className="font-medium">
                      <span className="font-mono text-xs">{r.account_code}</span>{" "}
                      — {r.account_name}
                    </TableCell>
                    <TableCell>{formatRupiah(r.allocated_amount)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatRupiah(r.realized_amount)}
                    </TableCell>
                    <TableCell>{formatRupiah(r.remaining_amount)}</TableCell>
                    <TableCell>{r.absorption_pct}%</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Susun / Perbarui Anggaran Proyek</DialogTitle>
            <DialogDescription>
              Tetapkan alokasi Rupiah bulat per akun beban dan ambang batas
              peringatan serapan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBudget}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bdg-thr">
                  Ambang Peringatan Serapan (%)
                </FieldLabel>
                <Input
                  id="bdg-thr"
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={thresholdPct}
                  onChange={(e) => setThresholdPct(Number(e.target.value))}
                />
              </Field>
              <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                {expenseAccounts.map((acc) => (
                  <Field key={acc.id}>
                    <FieldLabel htmlFor={`alloc-${acc.id}`}>
                      {acc.code} — {acc.name}
                    </FieldLabel>
                    <Input
                      id={`alloc-${acc.id}`}
                      type="number"
                      min={0}
                      value={allocations[acc.id] ?? 0}
                      onChange={(e) =>
                        setAllocations((prev) => ({
                          ...prev,
                          [acc.id]: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
              <DialogFooter>
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
