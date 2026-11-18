import * as React from "react";
import {
  PencilIcon,
  RotateCcwIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
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
  bulkUpdateDocSequencesResetPeriod,
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

const RESET_PERIOD_KEYS: Record<DocSequenceRow["reset_period"], string> = {
  monthly: "settings:admin_settings.reset_monthly",
  yearly: "settings:admin_settings.reset_yearly",
  never: "settings:admin_settings.reset_never",
};

function previewSequenceFormat(seq: Pick<DocSequenceRow, "prefix_pattern" | "padding_digits">): string {
  const sampleOrder = String(1).padStart(Math.max(2, Math.min(6, seq.padding_digits)), "0");
  return seq.prefix_pattern
    .replaceAll("{{tahun}}", "2026")
    .replaceAll("{{bulan}}", "11")
    .replaceAll("{{urut}}", sampleOrder);
}

export function AdminSettingsPage() {
  const { t } = useLanguage();
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

  const [confirmMasterPolicy, setConfirmMasterPolicy] = React.useState<{
    open: boolean;
    period: "monthly" | "yearly";
    applyStandard2027Prefix: boolean;
  }>({
    open: false,
    period: "monthly",
    applyStandard2027Prefix: false,
  });
  const [savingMasterPolicy, setSavingMasterPolicy] = React.useState(false);

  const allYearly =
    sequences.length > 0 && sequences.every((s) => s.reset_period === "yearly");
  const allMonthly =
    sequences.length > 0 && sequences.every((s) => s.reset_period === "monthly");
  const currentGlobalResetPeriod: "monthly" | "yearly" | "custom" = allYearly
    ? "yearly"
    : allMonthly
      ? "monthly"
      : "custom";

  async function handleApplyMasterPolicy() {
    setSavingMasterPolicy(true);
    try {
      await bulkUpdateDocSequencesResetPeriod(confirmMasterPolicy.period, {
        applyStandard2027Prefix: confirmMasterPolicy.applyStandard2027Prefix,
      });
      toast.success(
        confirmMasterPolicy.period === "yearly"
          ? "Kebijakan penomoran berhasil dialihkan ke Mode Tahunan (Standar 2027)."
          : "Kebijakan penomoran berhasil disetel ke Mode Bulanan (Aktif 2026).",
      );
      setConfirmMasterPolicy((prev) => ({ ...prev, open: false }));
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui kebijakan penomoran.",
      );
    } finally {
      setSavingMasterPolicy(false);
    }
  }

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
        <span>{t("settings:admin_settings.loading")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t("settings:admin_settings.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
          {t("settings:admin_settings.subtitle")}
        </p>
      </div>

      {/* Master Switch Kebijakan Periode Reset Penomoran (Konflik 2 & Standar 2027) */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg font-bold">
                {t("settings:admin_settings.policy_card_title")}
              </CardTitle>
              <StatusBadge
                tone={
                  currentGlobalResetPeriod === "yearly"
                    ? "info"
                    : currentGlobalResetPeriod === "monthly"
                      ? "success"
                      : "warning"
                }
                label={
                  currentGlobalResetPeriod === "yearly"
                    ? t("settings:admin_settings.policy_status_yearly")
                    : currentGlobalResetPeriod === "monthly"
                      ? t("settings:admin_settings.policy_status_monthly")
                      : t("settings:admin_settings.policy_status_custom")
                }
              />
            </div>
            <CardDescription>
              {t("settings:admin_settings.policy_card_desc")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Opsi 1: Bulanan (2026) */}
            <div
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                currentGlobalResetPeriod === "monthly"
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/70 bg-muted/10"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {t("settings:admin_settings.mode_monthly")}
                  </span>
                  {currentGlobalResetPeriod === "monthly" && (
                    <StatusBadge
                      tone="success"
                      label={t("settings:admin_settings.active_badge")}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("settings:admin_settings.mode_monthly_desc")}
                </p>
                <div className="rounded-lg bg-background/80 border border-border/50 px-3 py-1.5 font-mono text-xs text-foreground font-medium">
                  {t("settings:admin_settings.sample_monthly")}
                </div>
              </div>
              <Button
                type="button"
                variant={currentGlobalResetPeriod === "monthly" ? "secondary" : "outline"}
                disabled={currentGlobalResetPeriod === "monthly" || savingMasterPolicy}
                onClick={() =>
                  setConfirmMasterPolicy({
                    open: true,
                    period: "monthly",
                    applyStandard2027Prefix: false,
                  })
                }
                className="w-full rounded-xl text-xs h-9 cursor-pointer"
              >
                {t("settings:admin_settings.btn_apply_monthly")}
              </Button>
            </div>

            {/* Opsi 2: Tahunan (2027) */}
            <div
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                currentGlobalResetPeriod === "yearly"
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/70 bg-muted/10"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {t("settings:admin_settings.mode_yearly")}
                  </span>
                  {currentGlobalResetPeriod === "yearly" && (
                    <StatusBadge
                      tone="info"
                      label={t("settings:admin_settings.active_badge")}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("settings:admin_settings.mode_yearly_desc")}
                </p>
                <div className="rounded-lg bg-background/80 border border-border/50 px-3 py-1.5 font-mono text-xs text-foreground font-medium">
                  {t("settings:admin_settings.sample_yearly")}
                </div>
              </div>
              <Button
                type="button"
                variant={currentGlobalResetPeriod === "yearly" ? "secondary" : "default"}
                disabled={currentGlobalResetPeriod === "yearly" || savingMasterPolicy}
                onClick={() =>
                  setConfirmMasterPolicy({
                    open: true,
                    period: "yearly",
                    applyStandard2027Prefix: true,
                  })
                }
                className="w-full rounded-xl text-xs h-9 cursor-pointer"
              >
                {t("settings:admin_settings.btn_apply_yearly")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 1: Format Penomoran Dokumen */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              {t("settings:admin_settings.sequences_card_title")}
            </CardTitle>
            <CardDescription>
              {t("settings:admin_settings.sequences_card_desc")}
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
                {t("common:action.cancel")}
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
                {t("settings:admin_settings.btn_edit")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_code", "Kode")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_doc_type", "Jenis Dokumen")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_pattern", "Pola Nomor")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_sample_output", "Contoh Output")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_digits", "Digit")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_reset", "Periode Reset")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_last_sequence", "Urutan Terakhir")}</TableHead>
                {isEditingSeq && (
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_actions", "Aksi")}</TableHead>
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
                          label={t(RESET_PERIOD_KEYS[seq.reset_period])}
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
                          {t("settings:admin_settings.status_unused")}
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
            {t("settings:admin_settings.templates_card_title")}
          </CardTitle>
          <CardDescription>
            {t("settings:admin_settings.templates_card_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_code")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_doc_type")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_version")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_notes")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("settings:admin_settings.col_actions")}</TableHead>
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
              {t("settings:admin_settings.edit_format_title", {
                type: editingSeq?.doc_type,
              })}
            </DialogTitle>
          </DialogHeader>
          {editingSeq ? (
            <form onSubmit={handleSaveSequenceModal}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="seq-pat" required>
                    {t("settings:admin_settings.field_pattern")}
                  </FieldLabel>
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
                    {t("settings:admin_settings.field_pattern_desc")}
                  </FieldDescription>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="seq-dig" required>
                      {t("settings:admin_settings.field_digits")}
                    </FieldLabel>
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
                    <FieldLabel required>
                      {t("settings:admin_settings.field_reset_period")}
                    </FieldLabel>
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
                          <SelectItem value="monthly">
                            {t("settings:admin_settings.reset_monthly")}
                          </SelectItem>
                          <SelectItem value="yearly">
                            {t("settings:admin_settings.reset_yearly")}
                          </SelectItem>
                          <SelectItem value="never">
                            {t("settings:admin_settings.reset_never")}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t("settings:admin_settings.preview_generated")}
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
                    {t("settings:admin_settings.btn_default")}
                  </Button>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingSeq(null)}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                  >
                    {t("common:action.cancel")}
                  </Button>
                  <Button type="submit" disabled={savingSeq} className="cursor-pointer">
                    {savingSeq ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
                    {t("settings:admin_settings.btn_save_format")}
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
              {t("settings:admin_settings.edit_tmpl_title", {
                type: editingTemplate?.doc_type,
              })}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate ? (
            <form onSubmit={handleSaveTemplateModal}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="tmpl-json" required>
                    {t("settings:admin_settings.field_placeholder_json")}
                  </FieldLabel>
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
                  <FieldLabel htmlFor="tmpl-notes">
                    {t("settings:admin_settings.field_footer_notes")}
                  </FieldLabel>
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
                    {t("common:action.cancel")}
                  </Button>
                  <Button type="submit" disabled={savingTmpl} className="cursor-pointer">
                    {savingTmpl ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
                    {t("settings:admin_settings.btn_save_template")}
                  </Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmMasterPolicy.open}
        onOpenChange={(open) =>
          setConfirmMasterPolicy((prev) => ({ ...prev, open }))
        }
        title={
          confirmMasterPolicy.period === "yearly"
            ? t("settings:admin_settings.confirm_policy_yearly_title")
            : t("settings:admin_settings.confirm_policy_monthly_title")
        }
        description={
          confirmMasterPolicy.period === "yearly"
            ? t("settings:admin_settings.confirm_policy_yearly_desc")
            : t("settings:admin_settings.confirm_policy_monthly_desc")
        }
        confirmLabel={
          savingMasterPolicy
            ? t("settings:admin_settings.confirm_policy_applying")
            : confirmMasterPolicy.period === "yearly"
              ? t("settings:admin_settings.btn_apply_yearly")
              : t("settings:admin_settings.btn_apply_monthly")
        }
        onConfirm={handleApplyMasterPolicy}
      />
    </div>
  );
}

