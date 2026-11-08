import * as React from "react";
import {
  FileSpreadsheetIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, type SemanticTone } from "@/components/shared/status-badge";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { listAccounts, listPeriods, listProjects } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateID, formatRupiah, roundRupiah } from "@/lib/formatters";
import {
  createCorrectionJournalEntry,
  createManualOrAdjustmentJournal,
  listJournalsWithLines,
  recordExportLog,
} from "@/lib/operations-service";
import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
  JournalType,
  PeriodRow,
  ProjectRow,
} from "@/types/database.types";

const JOURNAL_TYPE_LABELS: Record<
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

interface DraftLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

export function JournalsPage() {
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [periods, setPeriods] = React.useState<PeriodRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [periodFilter, setPeriodFilter] = React.useState("ALL");
  const [projectFilter, setProjectFilter] = React.useState("ALL");
  const [typeFilter, setTypeFilter] = React.useState("ALL");

  // Form Jurnal Baru (Umum / Penyesuaian)
  const [createOpen, setCreateOpen] = React.useState(false);
  const [journalDate, setJournalDate] = React.useState("2026-11-30");
  const [journalType, setJournalType] = React.useState<"general" | "adjustment">(
    "general",
  );
  const [projectId, setProjectId] = React.useState("none");
  const [description, setDescription] = React.useState("");
  const [autoReverse, setAutoReverse] = React.useState(false);
  const [draftLines, setDraftLines] = React.useState<DraftLine[]>([]);
  const [posting, setPosting] = React.useState(false);

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
      const [jRes, accs, prjRes, pers] = await Promise.all([
        listJournalsWithLines(),
        listAccounts(),
        listProjects(),
        listPeriods(),
      ]);
      setJournals(jRes.journals);
      setLines(jRes.lines);
      setAccounts(accs);
      setProjects(prjRes.projects);
      setPeriods(pers);
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

  const selectedProjectObj =
    projectId !== "none" ? projectMap.get(projectId) : undefined;
  const canUseAutoReverse =
    journalType === "adjustment" &&
    (!selectedProjectObj ||
      selectedProjectObj.revenue_method === "two_term_accrual");

  function openNewJournal() {
    const firstAcc = postableAccounts[0]?.id ?? "";
    const secondAcc = postableAccounts[1]?.id ?? firstAcc;
    setJournalDate("2026-11-30");
    setJournalType("general");
    setProjectId("none");
    setDescription("");
    setAutoReverse(false);
    setDraftLines([
      { accountId: firstAcc, description: "", debit: 0, credit: 0 },
      { accountId: secondAcc, description: "", debit: 0, credit: 0 },
    ]);
    setCreateOpen(true);
  }

  function updateDraftLine(idx: number, patch: Partial<DraftLine>) {
    setDraftLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)),
    );
  }

  const totalDraftDebit = draftLines.reduce(
    (s, l) => s + roundRupiah(l.debit),
    0,
  );
  const totalDraftCredit = draftLines.reduce(
    (s, l) => s + roundRupiah(l.credit),
    0,
  );
  const isDraftBalanced =
    totalDraftDebit > 0 && totalDraftDebit === totalDraftCredit;

  async function handlePostJournal(e: React.FormEvent) {
    e.preventDefault();
    if (!isDraftBalanced) {
      toast.error(
        "Jurnal belum seimbang: Total Debit wajib sama dengan Total Kredit dan bernilai di atas Rp0.",
      );
      return;
    }
    setPosting(true);
    try {
      await createManualOrAdjustmentJournal({
        journalDate,
        journalType,
        description,
        projectId: projectId === "none" ? null : projectId,
        autoReverseNextPeriod: canUseAutoReverse ? autoReverse : false,
        lines: draftLines
          .filter((l) => l.debit > 0 || l.credit > 0)
          .map((l) => ({
            accountId: l.accountId,
            description: l.description.trim() || description.trim(),
            debit: roundRupiah(l.debit),
            credit: roundRupiah(l.credit),
          })),
      });
      toast.success("Jurnal berhasil diposting ke Buku Besar.");
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memposting jurnal.",
      );
    } finally {
      setPosting(false);
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
        `Jurnal koreksi resmi atas ${correctTarget.journal_number} berhasil diposting.`,
      );
      setCorrectTarget(null);
      setCorrectionReason("");
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menerbitkan jurnal koreksi.",
      );
    } finally {
      setCorrecting(false);
    }
  }

  const filteredJournals = React.useMemo(() => {
    return journals.filter((j) => {
      if (periodFilter !== "ALL" && j.period_id !== periodFilter) return false;
      if (projectFilter !== "ALL" && j.project_id !== projectFilter) return false;
      if (typeFilter !== "ALL" && j.journal_type !== typeFilter) return false;
      return true;
    });
  }, [journals, periodFilter, projectFilter, typeFilter]);

  async function handleExportExcel() {
    const exportRows: Array<Array<string | number>> = [];
    for (const j of filteredJournals) {
      const jLines = lines
        .filter((l) => l.journal_id === j.id)
        .sort((a, b) => a.line_no - b.line_no);
      const prj = j.project_id ? projectMap.get(j.project_id) : undefined;
      for (const l of jLines) {
        const acc = accountMap.get(l.account_id);
        exportRows.push([
          j.journal_number,
          formatDateID(j.journal_date),
          JOURNAL_TYPE_LABELS[j.journal_type].label,
          prj ? prj.code : "-",
          acc ? `${acc.code}: ${acc.name}` : "-",
          l.description || j.description,
          l.debit,
          l.credit,
        ]);
      }
    }

    await downloadExcelSheet({
      fileName: "Jurnal_Akuntansi_Altcycles.xlsx",
      sheetName: "Jurnal Akuntansi",
      columns: [
        { header: "No. Jurnal", width: 20 },
        { header: "Tanggal", width: 14 },
        { header: "Jenis Jurnal", width: 24 },
        { header: "Proyek", width: 16 },
        { header: "Akun SAK", width: 32 },
        { header: "Uraian", width: 36 },
        { header: "Debit (Rp)", width: 18 },
        { header: "Kredit (Rp)", width: 18 },
      ],
      rows: exportRows,
    });
    await recordExportLog("JOURNALS", "EXCEL", periodFilter);
    toast.success("Jurnal akuntansi berhasil diekspor ke Excel (.xlsx).");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Jurnal Umum, Penyesuaian, &amp; Koreksi
          </h1>
          <p className="text-sm text-muted-foreground">
            Jurnal terposting bersifat permanen. Perbaikan dilakukan melalui Jurnal Koreksi resmi dengan tautan audit ke jurnal asal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportExcel()}
          >
            <FileSpreadsheetIcon data-icon="inline-start" />
            Ekspor Excel
          </Button>
          <Button type="button" onClick={openNewJournal}>
            <PlusIcon data-icon="inline-start" />
            Entri Jurnal Baru
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Daftar Jurnal</CardTitle>
          <CardDescription>
            Saring berdasarkan periode buku, proyek, atau sumber/jenis jurnal.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel>Periode Akuntansi</FieldLabel>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">Semua Periode</SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Proyek</FieldLabel>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">Semua Proyek</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code}: {p.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Jenis Jurnal</FieldLabel>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">Semua Jenis</SelectItem>
                  {Object.entries(JOURNAL_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner />
            <span>Memuat buku jurnal...</span>
          </div>
        ) : filteredJournals.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                title="Belum ada jurnal pada filter ini"
                description="Gunakan tombol Entri Jurnal Baru atau ubah saringan periode/proyek."
              />
            </CardContent>
          </Card>
        ) : (
          filteredJournals.map((j) => {
            const jLines = lines
              .filter((l) => l.journal_id === j.id)
              .sort((a, b) => a.line_no - b.line_no);
            const prj = j.project_id ? projectMap.get(j.project_id) : undefined;
            const meta = JOURNAL_TYPE_LABELS[j.journal_type];
            const sumD = jLines.reduce((s, l) => s + l.debit, 0);
            const sumC = jLines.reduce((s, l) => s + l.credit, 0);

            return (
              <Card key={j.id}>
                <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold">
                        {j.journal_number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Tanggal: {formatDateID(j.journal_date)}
                      </span>
                      <StatusBadge tone={meta.tone} label={meta.label} />
                      <StatusBadge tone="success" label="Terposting (Kekal)" />
                      {prj ? (
                        <StatusBadge tone="outline" label={prj.code} />
                      ) : null}
                      {j.auto_reverse_next_period ? (
                        <StatusBadge
                          tone="warning"
                          label={
                            j.is_reversed
                              ? "Telah Dibalik"
                              : "Siap Pembalik Awal Periode"
                          }
                        />
                      ) : null}
                    </div>
                    <CardDescription className="text-foreground">
                      {j.description}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCorrectionDate(j.journal_date);
                      setCorrectionReason("");
                      setCorrectTarget(j);
                    }}
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    Buat Jurnal Koreksi
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode &amp; Nama Akun SAK</TableHead>
                        <TableHead>Uraian Baris</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Kredit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jLines.map((l) => {
                        const acc = accountMap.get(l.account_id);
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="text-xs font-medium">
                              <span className="font-mono">
                                {acc?.code ?? "-"}
                              </span>{" "}
                              : {acc?.name ?? "Akun"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {l.description || "-"}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">
                              {l.debit > 0 ? formatRupiah(l.debit) : "-"}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">
                              {l.credit > 0 ? formatRupiah(l.credit) : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell colSpan={2} className="text-xs">
                          Total Seimbang
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatRupiah(sumD)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatRupiah(sumC)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog Entri Jurnal Umum / Penyesuaian */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Buat &amp; Posting Jurnal Baru</DialogTitle>
            <DialogDescription>
              Setiap jurnal wajib seimbang antara Debit dan Kredit dalam Rupiah bulat penuh.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePostJournal}>
            <FieldGroup>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="j-date">Tanggal Jurnal</FieldLabel>
                  <Input
                    id="j-date"
                    type="date"
                    required
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Jenis Jurnal</FieldLabel>
                  <Select
                    value={journalType}
                    onValueChange={(v) =>
                      setJournalType(v as "general" | "adjustment")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="general">Jurnal Umum</SelectItem>
                        <SelectItem value="adjustment">
                          Jurnal Penyesuaian (AJP)
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Tag Proyek (Opsional)</FieldLabel>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          Biaya Bersama / Umum
                        </SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code}: {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="j-desc">Keterangan Jurnal</FieldLabel>
                <Input
                  id="j-desc"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Penyesuaian beban sewa kantor bersama bulan berjalan"
                />
              </Field>

              {journalType === "adjustment" ? (
                <Field orientation="horizontal">
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="j-rev">
                      Tandai untuk Jurnal Pembalik Awal Periode Berikutnya (Opsional)
                    </FieldLabel>
                    <FieldDescription>
                      Hanya diizinkan pada akrual lintas tahun / proyek 2 termin;
                      otomatis dinonaktifkan pada proyek 1 termin &amp; Progress
                      Billing &ge; 3 termin.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="j-rev"
                    disabled={!canUseAutoReverse}
                    checked={canUseAutoReverse && autoReverse}
                    onCheckedChange={setAutoReverse}
                  />
                </Field>
              ) : null}

              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    Baris Ayat Jurnal
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraftLines((prev) => [
                        ...prev,
                        {
                          accountId: postableAccounts[0]?.id ?? "",
                          description: "",
                          debit: 0,
                          credit: 0,
                        },
                      ])
                    }
                  >
                    <PlusIcon data-icon="inline-start" />
                    Tambah Baris
                  </Button>
                </div>

                <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
                  {draftLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="grid items-end gap-2 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-5">
                        <Select
                          value={line.accountId}
                          onValueChange={(v) =>
                            updateDraftLine(idx, { accountId: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih akun" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {postableAccounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.code}: {a.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          placeholder="Catatan baris"
                          value={line.description}
                          onChange={(e) =>
                            updateDraftLine(idx, {
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Debit"
                          value={line.debit || ""}
                          onChange={(e) =>
                            updateDraftLine(idx, {
                              debit: Number(e.target.value),
                              credit:
                                Number(e.target.value) > 0 ? 0 : line.credit,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-1 sm:col-span-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Kredit"
                          value={line.credit || ""}
                          onChange={(e) =>
                            updateDraftLine(idx, {
                              credit: Number(e.target.value),
                              debit:
                                Number(e.target.value) > 0 ? 0 : line.debit,
                            })
                          }
                        />
                        {draftLines.length > 2 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Hapus baris"
                            onClick={() =>
                              setDraftLines((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            <Trash2Icon className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
                  <div className="flex gap-4 font-semibold">
                    <span>Total Debit: {formatRupiah(totalDraftDebit)}</span>
                    <span>Total Kredit: {formatRupiah(totalDraftCredit)}</span>
                  </div>
                  <StatusBadge
                    tone={isDraftBalanced ? "success" : "destructive"}
                    label={
                      isDraftBalanced
                        ? "Seimbang: Siap Posting"
                        : "Belum Seimbang (Debit \u2260 Kredit)"
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={posting || !isDraftBalanced}>
                  {posting ? <Spinner data-icon="inline-start" /> : null}
                  Posting Jurnal ke Buku Besar
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Jurnal Koreksi Resmi (BR-2) */}
      <Dialog
        open={Boolean(correctTarget)}
        onOpenChange={(open) => {
          if (!open) setCorrectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Buat Jurnal Koreksi atas {correctTarget?.journal_number}
            </DialogTitle>
            <DialogDescription>
              Jurnal terposting tidak dapat diubah atau dihapus secara manual. Sistem akan menerbitkan jurnal koreksi resmi dengan tautan audit ke jurnal asal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCorrection}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="corr-date">Tanggal Jurnal Koreksi</FieldLabel>
                <Input
                  id="corr-date"
                  type="date"
                  required
                  value={correctionDate}
                  onChange={(e) => setCorrectionDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="corr-reason">
                  Alasan Koreksi (Minimal 5 Karakter)
                </FieldLabel>
                <Textarea
                  id="corr-reason"
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Contoh: Koreksi salah pilih akun beban pada pencatatan sebelumnya..."
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCorrectTarget(null)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={correcting}>
                  {correcting ? <Spinner data-icon="inline-start" /> : null}
                  Posting Jurnal Koreksi
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

