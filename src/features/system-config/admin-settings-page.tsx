import * as React from "react";
import {
  PencilIcon,
  RotateCcwIcon,
  SaveIcon,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  listDocSequences,
  listDocTemplates,
  updateDocSequence,
  updateDocTemplate,
} from "@/lib/data-service";
import { DEMO_SEQUENCES } from "@/lib/demo-seed";
import type {
  DocSequenceCounterRow,
  DocSequenceRow,
  DocTemplateRow,
} from "@/types/database.types";

const RESET_PERIOD_LABELS: Record<DocSequenceRow["reset_period"], string> = {
  monthly: "Bulanan",
  yearly: "Tahunan",
  never: "Tanpa Reset",
};

function previewSequenceFormat(seq: Pick<DocSequenceRow, "prefix_pattern" | "padding_digits">): string {
  const sampleOrder = String(1).padStart(Math.max(2, Math.min(6, seq.padding_digits)), "0");
  return seq.prefix_pattern
    .replaceAll("{{tahun}}", "2026")
    .replaceAll("{{bulan}}", "11")
    .replaceAll("{{urut}}", sampleOrder);
}

export function AdminSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [sequences, setSequences] = React.useState<DocSequenceRow[]>([]);
  const [counters, setCounters] = React.useState<DocSequenceCounterRow[]>([]);
  const [templates, setTemplates] = React.useState<DocTemplateRow[]>([]);

  const [isEditingSeq, setIsEditingSeq] = React.useState(false);
  const [editingSeq, setEditingSeq] = React.useState<DocSequenceRow | null>(null);
  const [savingSeq, setSavingSeq] = React.useState(false);

  const [editingTemplate, setEditingTemplate] = React.useState<DocTemplateRow | null>(null);
  const [tmplJsonText, setTmplJsonText] = React.useState("");
  const [tmplFooterNotes, setTmplFooterNotes] = React.useState("");
  const [savingTmpl, setSavingTmpl] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [seqData, tmpls] = await Promise.all([
        listDocSequences(),
        listDocTemplates(),
      ]);
      setSequences(seqData.sequences);
      setCounters(seqData.counters);
      setTemplates(tmpls);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat pengaturan administrasi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSaveSequenceModal(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSeq) return;
    setSavingSeq(true);
    try {
      await updateDocSequence(editingSeq.doc_type, {
        prefix_pattern: editingSeq.prefix_pattern.trim(),
        padding_digits: Math.max(2, Math.min(6, Number(editingSeq.padding_digits) || 3)),
        reset_period: editingSeq.reset_period,
      });
      toast.success(`Format penomoran ${editingSeq.doc_type} berhasil diperbarui.`);
      setEditingSeq(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan format penomoran.",
      );
    } finally {
      setSavingSeq(false);
    }
  }

  function handleRestoreDefaultSequence(docType: DocSequenceRow["doc_type"]) {
    const def = DEMO_SEQUENCES.find((d) => d.doc_type === docType);
    if (!def || !editingSeq) return;
    setEditingSeq({
      ...editingSeq,
      prefix_pattern: def.prefix_pattern,
      padding_digits: def.padding_digits,
      reset_period: def.reset_period,
    });
    toast.info(`Pola default ${docType} dimuat ke form. Klik Simpan untuk menerapkan.`);
  }

  async function handleSaveTemplateModal(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTemplate) return;
    setSavingTmpl(true);
    try {
      const parsed = JSON.parse(tmplJsonText) as Record<
        string,
        string | number | boolean
      >;
      await updateDocTemplate(editingTemplate.doc_type, {
        default_placeholders: parsed,
        footer_notes: tmplFooterNotes,
      });
      toast.success(`Template dokumen ${editingTemplate.doc_type} diperbarui.`);
      setEditingTemplate(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Format JSON placeholder tidak valid.",
      );
    } finally {
      setSavingTmpl(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat pengaturan administrasi...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Administrasi &amp; Format Penomoran Dokumen
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          Atur format penomoran otomatis dokumen resmi dan template standar perusahaan.
        </p>
      </div>

      {/* Card 1: Format Penomoran Dokumen */}
      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              Format Penomoran Dokumen Otomatis
            </CardTitle>
            <CardDescription>
              Klik tombol <strong>Edit</strong> untuk menyesuaikan pola <code>{"{{tahun}}"}</code>, <code>{"{{bulan}}"}</code>, <code>{"{{urut}}"}</code>, digit urut, maupun periode reset.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditingSeq ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingSeq(false)}
                className="h-9 rounded-xl px-3.5 text-xs font-medium cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                Batal
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingSeq(true)}
                className="h-9 gap-1.5 rounded-xl text-xs font-medium cursor-pointer text-blue-600 dark:text-sky-400 bg-blue-50/80 dark:bg-sky-500/10 hover:bg-blue-100/80 dark:hover:bg-sky-500/20 border-blue-200/80 dark:border-sky-500/20 transition-colors shadow-2xs"
              >
                <PencilIcon className="size-3.5" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Jenis Dokumen</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Pola Nomor</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Contoh Output</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Digit</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Periode Reset</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Urutan Terakhir</TableHead>
                {isEditingSeq && (
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Aksi</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.map((seq) => {
                const latestCounter = counters
                  .filter((c) => c.doc_type === seq.doc_type)
                  .sort((a, b) => b.period_key.localeCompare(a.period_key))[0];
                return (
                  <TableRow key={seq.doc_type}>
                    <TableCell className="pl-6 pr-3 py-3.5 align-top text-center font-mono text-xs sm:text-sm leading-5 font-bold whitespace-nowrap">
                      {seq.doc_type}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 align-top text-xs sm:text-sm leading-5 font-medium text-foreground">
                      {seq.label}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 align-top font-mono text-xs sm:text-sm leading-5 text-muted-foreground whitespace-nowrap">
                      {seq.prefix_pattern}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 align-top font-mono text-xs sm:text-sm leading-5 text-primary dark:text-cyan-400 whitespace-nowrap">
                      {previewSequenceFormat(seq)}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 align-top text-center text-xs sm:text-sm leading-5 tabular-nums whitespace-nowrap">
                      {seq.padding_digits} digit
                    </TableCell>
                    <TableCell className="px-3 py-3.5 align-top text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge
                          tone="info"
                          label={RESET_PERIOD_LABELS[seq.reset_period]}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3.5 align-top text-center whitespace-nowrap">
                      {latestCounter ? (
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone="secondary"
                            label={`${latestCounter.period_key}: #${latestCounter.last_number}`}
                          />
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm leading-5 text-muted-foreground">
                          Belum dipakai
                        </span>
                      )}
                    </TableCell>
                    {isEditingSeq && (
                      <TableCell className="pl-2 pr-6 py-3.5 align-top text-center whitespace-nowrap">
                        <div className="flex justify-center items-center -my-1.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title={`Sesuaikan format nomor ${seq.doc_type}`}
                            onClick={() => setEditingSeq({ ...seq })}
                            className="size-8 rounded-lg text-sky-600 hover:text-sky-500 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer"
                          >
                            <PencilIcon className="size-4" />
                            <span className="sr-only">Edit Format {seq.doc_type}</span>
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card 2: Template & Placeholder Standar Dokumen */}
      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70">
          <CardTitle className="text-base sm:text-lg font-bold">
            Template &amp; Catatan Standar Dokumen
          </CardTitle>
          <CardDescription>
            Kelola placeholder default dan catatan footer ketentuan hukum tiap jenis dokumen (Lampiran A.0–A.8).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Template</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Versi</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Catatan Ketentuan</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tmpl) => (
                <TableRow key={tmpl.doc_type}>
                  <TableCell className="pl-6 pr-3 py-3.5 align-top text-center font-mono text-xs sm:text-sm leading-5 font-bold whitespace-nowrap">
                    {tmpl.doc_type}
                  </TableCell>
                  <TableCell className="px-3 py-3.5 align-top text-xs sm:text-sm leading-5 font-medium text-foreground">
                    {tmpl.title}
                  </TableCell>
                  <TableCell className="px-3 py-3.5 align-top text-center whitespace-nowrap">
                    <div className="inline-flex items-center min-h-5 -my-px">
                      <StatusBadge tone="outline" label={`v${tmpl.version}`} />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3.5 align-top text-xs sm:text-sm leading-5 text-muted-foreground max-w-md">
                    <p className="line-clamp-2">{tmpl.footer_notes ?? "-"}</p>
                  </TableCell>
                  <TableCell className="pl-2 pr-6 py-3.5 align-top text-center whitespace-nowrap">
                    <div className="flex justify-center items-center -my-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title={`Edit template ${tmpl.doc_type}`}
                        onClick={() => {
                          setEditingTemplate(tmpl);
                          setTmplJsonText(
                            JSON.stringify(tmpl.default_placeholders, null, 2),
                          );
                          setTmplFooterNotes(tmpl.footer_notes ?? "");
                        }}
                        className="size-8 rounded-lg text-sky-600 hover:text-sky-500 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer"
                      >
                        <PencilIcon className="size-4" />
                        <span className="sr-only">Edit Template {tmpl.doc_type}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Edit Format Penomoran Dokumen */}
      <Dialog
        open={Boolean(editingSeq)}
        onOpenChange={(open) => {
          if (!open) setEditingSeq(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Format Nomor {editingSeq?.doc_type}
            </DialogTitle>
          </DialogHeader>
          {editingSeq ? (
            <form onSubmit={handleSaveSequenceModal}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="seq-pat" required>Pola Penomoran</FieldLabel>
                  <Input
                    id="seq-pat"
                    required
                    value={editingSeq.prefix_pattern}
                    onChange={(e) =>
                      setEditingSeq({
                        ...editingSeq,
                        prefix_pattern: e.target.value,
                      })
                    }
                    className="font-mono text-xs sm:text-sm"
                  />
                  <FieldDescription className="text-[11px]">
                    Wajib memuat <code>{"{{urut}}"}</code>. Variabel lain yang tersedia:{" "}
                    <code>{"{{tahun}}"}</code> dan <code>{"{{bulan}}"}</code>.
                  </FieldDescription>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="seq-dig" required>Jumlah Digit Urut (2–6)</FieldLabel>
                    <Input
                      id="seq-dig"
                      type="number"
                      min={2}
                      max={6}
                      required
                      value={editingSeq.padding_digits}
                      onChange={(e) =>
                        setEditingSeq({
                          ...editingSeq,
                          padding_digits: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>Periode Reset Pencacah</FieldLabel>
                    <Select
                      value={editingSeq.reset_period}
                      onValueChange={(val) =>
                        setEditingSeq({
                          ...editingSeq,
                          reset_period: val as DocSequenceRow["reset_period"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="monthly">Bulanan</SelectItem>
                          <SelectItem value="yearly">Tahunan</SelectItem>
                          <SelectItem value="never">Tanpa Reset</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Pratinjau Nomor Dihasilkan:
                    </p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-primary dark:text-cyan-400">
                      {previewSequenceFormat(editingSeq)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreDefaultSequence(editingSeq.doc_type)}
                    className="h-8 text-xs gap-1.5 rounded-lg cursor-pointer"
                  >
                    <RotateCcwIcon className="size-3.5" />
                    Default
                  </Button>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingSeq(null)}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={savingSeq} className="cursor-pointer">
                    {savingSeq ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
                    Simpan Format
                  </Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Template Dokumen */}
      <Dialog
        open={Boolean(editingTemplate)}
        onOpenChange={(open) => {
          if (!open) setEditingTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Edit Template {editingTemplate?.doc_type}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate ? (
            <form onSubmit={handleSaveTemplateModal}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="tmpl-json" required>Placeholder Default (JSON)</FieldLabel>
                  <Textarea
                    id="tmpl-json"
                    required
                    rows={6}
                    value={tmplJsonText}
                    onChange={(e) => setTmplJsonText(e.target.value)}
                    className="font-mono text-xs"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="tmpl-notes">Catatan Ketentuan Bawah Dokumen</FieldLabel>
                  <Textarea
                    id="tmpl-notes"
                    rows={3}
                    value={tmplFooterNotes}
                    onChange={(e) => setTmplFooterNotes(e.target.value)}
                    className="text-xs sm:text-sm"
                  />
                </Field>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingTemplate(null)}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={savingTmpl} className="cursor-pointer">
                    {savingTmpl ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
                    Simpan Template
                  </Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

