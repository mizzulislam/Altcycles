import * as React from "react";
import { FlaskConicalIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
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
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getCompanyProfile,
  listDocSequences,
  listDocTemplates,
  purgeTestData,
  setJournalLockStatus,
  updateCompanyProfile,
  updateDocSequence,
  updateDocTemplate,
} from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import type {
  CompanyProfileRow,
  DocSequenceCounterRow,
  DocSequenceRow,
  DocTemplateRow,
} from "@/types/database.types";

export function SystemConfigPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(true);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [sequences, setSequences] = React.useState<DocSequenceRow[]>([]);
  const [counters, setCounters] = React.useState<DocSequenceCounterRow[]>([]);
  const [templates, setTemplates] = React.useState<DocTemplateRow[]>([]);
  const [savingCompany, setSavingCompany] = React.useState(false);
  const [pendingPkpState, setPendingPkpState] = React.useState<boolean | null>(
    null,
  );
  const [confirmPurgeOpen, setConfirmPurgeOpen] = React.useState(false);
  const [purging, setPurging] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [comp, seqData, tmpls] = await Promise.all([
        getCompanyProfile(),
        listDocSequences(),
        listDocTemplates(),
      ]);
      setCompany(comp);
      setSequences(seqData.sequences);
      setCounters(seqData.counters);
      setTemplates(tmpls);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat konfigurasi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSavingCompany(true);
    try {
      const updated = await updateCompanyProfile({
        company_name: company.company_name,
        legal_entity_name: company.legal_entity_name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        logo_storage_path: company.logo_storage_path,
        bank_name: company.bank_name,
        bank_account_number: company.bank_account_number,
        bank_account_holder: company.bank_account_holder,
        signer_name: company.signer_name,
        signer_title: company.signer_title,
        ppn_rate: company.ppn_rate,
      });
      setCompany(updated);
      toast.success("Identitas dan rekening perusahaan berhasil disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSavingCompany(false);
    }
  }

  async function handleSaveSequence(seq: DocSequenceRow) {
    try {
      await updateDocSequence(seq.doc_type, {
        prefix_pattern: seq.prefix_pattern,
        padding_digits: seq.padding_digits,
        reset_period: seq.reset_period,
      });
      toast.success(`Format penomoran ${seq.doc_type} disimpan.`);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan format nomor.",
      );
    }
  }

  async function handlePurgeTestData() {
    setPurging(true);
    try {
      const res = await purgeTestData();
      toast.success(res.message || "Data pengujian berhasil dibersihkan.");
      setConfirmPurgeOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal membersihkan data testing.",
      );
    } finally {
      setPurging(false);
    }
  }

  async function handleSaveTemplate(
    tmpl: DocTemplateRow,
    rawJson: string,
    footerNotes: string,
  ) {
    try {
      const parsed = JSON.parse(rawJson) as Record<
        string,
        string | number | boolean
      >;
      await updateDocTemplate(tmpl.doc_type, {
        default_placeholders: parsed,
        footer_notes: footerNotes,
      });
      toast.success(`Template ${tmpl.doc_type} diperbarui.`);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Format JSON placeholder tidak valid.",
      );
    }
  }

  if (loading || !company) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>{t("settings:company.loading")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings:admin_settings.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("settings:admin_settings.subtitle")}
        </p>
      </div>

      <Tabs defaultValue="identitas">
        <TabsList>
          <TabsTrigger value="identitas">{t("settings:company.tab_identity")}</TabsTrigger>
          <TabsTrigger value="pajak">{t("settings:company.tab_tax_pkp")}</TabsTrigger>
          <TabsTrigger value="akuntansi">{t("settings:master_readonly.tab_controls")}</TabsTrigger>
          <TabsTrigger value="penomoran">{t("settings:admin_settings.sequences_card_title")}</TabsTrigger>
          <TabsTrigger value="template">{t("settings:admin_settings.templates_card_title")}</TabsTrigger>
        </TabsList>

        {/* TAB 1: IDENTITAS & REKENING */}
        <TabsContent value="identitas">
          <Card>
            <CardHeaderWithInfo
              title={t("settings:company.identity_card_title")}
              description={t("settings:company.identity_card_desc")}
            />
            <CardContent>
              <form onSubmit={handleSaveCompany}>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="cp-name" required>
                        {t("settings:company.name")}
                      </FieldLabel>
                      <Input
                        id="cp-name"
                        required
                        value={company.company_name}
                        onChange={(e) =>
                          setCompany({ ...company, company_name: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="cp-legal" required>
                        {t("settings:company.brand_name")}
                      </FieldLabel>
                      <Input
                        id="cp-legal"
                        required
                        value={company.legal_entity_name}
                        onChange={(e) =>
                          setCompany({
                            ...company,
                            legal_entity_name: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="cp-addr" required>
                      {t("settings:company.address")}
                    </FieldLabel>
                    <Textarea
                      id="cp-addr"
                      required
                      value={company.address}
                      onChange={(e) =>
                        setCompany({ ...company, address: e.target.value })
                      }
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="cp-email" required>
                        {t("settings:company.email")}
                      </FieldLabel>
                      <Input
                        id="cp-email"
                        type="email"
                        required
                        value={company.email}
                        onChange={(e) =>
                          setCompany({ ...company, email: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="cp-phone" required>
                        {t("settings:company.phone")}
                      </FieldLabel>
                      <Input
                        id="cp-phone"
                        required
                        value={company.phone}
                        onChange={(e) =>
                          setCompany({ ...company, phone: e.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <FieldSet>
                    <FieldLegend>{t("settings:company.accounts_card_title")}</FieldLegend>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="cp-bank" required>
                          {t("settings:company.bank_name")}
                        </FieldLabel>
                        <Input
                          id="cp-bank"
                          required
                          value={company.bank_name}
                          onChange={(e) =>
                            setCompany({ ...company, bank_name: e.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="cp-accno" required>
                          {t("settings:company.bank_account_number")}
                        </FieldLabel>
                        <Input
                          id="cp-accno"
                          required
                          value={company.bank_account_number}
                          onChange={(e) =>
                            setCompany({
                              ...company,
                              bank_account_number: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="cp-holder" required>
                          {t("settings:company.bank_account_holder")}
                        </FieldLabel>
                        <Input
                          id="cp-holder"
                          required
                          value={company.bank_account_holder}
                          onChange={(e) =>
                            setCompany({
                              ...company,
                              bank_account_holder: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                  </FieldSet>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="cp-signer" required>
                        {t("settings:company.default_signer_name")}
                      </FieldLabel>
                      <Input
                        id="cp-signer"
                        required
                        value={company.signer_name}
                        onChange={(e) =>
                          setCompany({ ...company, signer_name: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="cp-title" required>
                        {t("settings:company.signer_title")}
                      </FieldLabel>
                      <Input
                        id="cp-title"
                        required
                        value={company.signer_title}
                        onChange={(e) =>
                          setCompany({ ...company, signer_title: e.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <div>
                    <Button type="submit" disabled={savingCompany}>
                      {savingCompany ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <SaveIcon data-icon="inline-start" />
                      )}
                      {t("common:action.save")}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PENGATURAN PAJAK */}
        <TabsContent value="pajak">
          <Card>
            <CardHeaderWithInfo
              title={t("settings:company.tax_card_title")}
              description={t("settings:company.tax_card_desc")}
            />
            <CardContent className="flex flex-col gap-5">
              <Alert variant={company.pkp_enabled ? "warning" : "info"}>
                <AlertTitle>
                  {company.pkp_enabled
                    ? t("settings:company.badge_pkp_active", { rate: company.ppn_rate })
                    : t("settings:company.badge_non_pkp")}
                </AlertTitle>
                <AlertDescription>
                  {company.pkp_enabled
                    ? t("settings:company.pkp_desc_active", { rate: company.ppn_rate })
                    : t("settings:company.pkp_desc_inactive")}
                </AlertDescription>
              </Alert>

              <FieldSet>
                <FieldLegend>{t("settings:company.tax_pkp_title")}</FieldLegend>
                <Field orientation="horizontal">
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="sw-pkp">
                      {t("settings:company.enable_pkp_label")}
                    </FieldLabel>
                    <FieldDescription>
                      {t("settings:company.enable_pkp_desc", { name: company.company_name })}
                    </FieldDescription>
                  </div>
                  <Switch
                    id="sw-pkp"
                    checked={company.pkp_enabled}
                    onCheckedChange={(checked) => setPendingPkpState(checked)}
                  />
                </Field>

                <Field className="max-w-xs" data-disabled={!company.pkp_enabled}>
                  <FieldLabel htmlFor="ppn-rate">
                    {t("settings:company.default_vat_rate")}
                  </FieldLabel>
                  <NumberInput
                    id="ppn-rate"
                    allowDecimal
                    maxDecimals={2}
                    min={0}
                    max={100}
                    disabled={!company.pkp_enabled}
                    value={company.ppn_rate}
                    onValueChange={(ppn_rate) =>
                      setCompany({
                        ...company,
                        ppn_rate,
                      })
                    }
                  />
                </Field>
              </FieldSet>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MODE TESTING & KONTROL AKUNTANSI */}
        <TabsContent value="akuntansi">
          <Card>
            <CardHeaderWithInfo
              title={
                <span className="inline-flex items-center gap-2">
                  <FlaskConicalIcon className="size-5 text-amber-500 shrink-0" />
                  <span>Mode Testing / Sandbox Sistem</span>
                </span>
              }
              description="Bungkus kontrol pengujian integritas akuntansi dan pencatatan dokumen. Saat mode testing aktif, transaksi jurnal dapat diedit/dihapus untuk pengujian dan nomor urut dokumen dapat dibersihkan."
            />
            <CardContent className="flex flex-col gap-5">
              <Alert variant={company.journal_lock_enabled === false ? "warning" : "info"}>
                <AlertTitle>
                  {company.journal_lock_enabled === false
                    ? "Mode Testing Sedang Aktif"
                    : "Mode Normal (Produksi) Aktif"}
                </AlertTitle>
                <AlertDescription>
                  {company.journal_lock_enabled === false
                    ? "Sistem berada dalam mode sandbox/testing. Transaksi jurnal tidak dikunci secara permanen sehingga dapat diedit atau dihapus. Anda dapat membersihkan data transaksi testing dan mereset penomoran dokumen di bawah."
                    : "Sistem berada dalam mode operasional resmi. Seluruh jurnal transaksi terkunci otomatis (Strict Immutability) untuk menjamin kepatuhan audit PSAK/IFRS Altvira."}
                </AlertDescription>
              </Alert>

              <FieldSet>
                <FieldLegend>Status Mode Testing Sistem</FieldLegend>
                <Field orientation="horizontal">
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="sw-testing-mode">
                      Aktifkan Sandbox / Mode Testing
                    </FieldLabel>
                    <FieldDescription>
                      Buka kunci transaksi jurnal sementara untuk keperluan simulasi pembukuan dan pengujian fungsional sistem.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="sw-testing-mode"
                    checked={company.journal_lock_enabled === false}
                    onCheckedChange={async (enableTesting) => {
                      try {
                        const nextLock = !enableTesting;
                        await setJournalLockStatus(nextLock);
                        setCompany((prev) =>
                          prev ? { ...prev, journal_lock_enabled: nextLock } : prev,
                        );
                        if (enableTesting) {
                          toast.warning("Mode Testing diaktifkan. Kunci jurnal dibuka untuk pengujian.");
                        } else {
                          toast.success("Mode Normal (Produksi) aktif. Seluruh jurnal terkunci otomatis.");
                        }
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Gagal memperbarui status mode testing.",
                        );
                      }
                    }}
                  />
                </Field>

                {company.journal_lock_enabled === false && (
                  <div className="mt-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-destructive">
                        Bersihkan Data Pengujian & Reset Counter Dokumen
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Hapus seluruh counter urutan dokumen testing dan kembalikan urutan penomoran ke awal tanpa mempengaruhi format pola penomoran dokumen.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={purging}
                      onClick={() => setConfirmPurgeOpen(true)}
                      className="rounded-xl h-8 px-3 text-xs gap-1.5 shrink-0"
                    >
                      <RotateCcwIcon className="size-3.5" />
                      Bersihkan Data Testing
                    </Button>
                  </div>
                )}
              </FieldSet>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: PENOMORAN DOKUMEN */}
        <TabsContent value="penomoran" className="flex flex-col gap-6">
          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeaderWithInfo
              title={t("settings:admin_settings.sequences_card_title")}
              description={t("settings:admin_settings.sequences_card_desc")}
            />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                      {t("settings:admin_settings.col_code")}
                    </TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                      {t("settings:admin_settings.col_doc_type")}
                    </TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                      {t("settings:admin_settings.col_pattern")}
                    </TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                      {t("settings:admin_settings.col_digits")}
                    </TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                      {t("settings:admin_settings.col_reset")}
                    </TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                      {t("settings:admin_settings.col_last_sequence")}
                    </TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">
                      {t("settings:admin_settings.col_actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequences.map((seq, idx) => {
                    const latestCounter = counters
                      .filter((c) => c.doc_type === seq.doc_type)
                      .sort((a, b) => b.period_key.localeCompare(a.period_key))[0];
                    return (
                      <TableRow key={seq.doc_type}>
                        <TableCell className="pl-6 pr-3 py-3 text-center font-mono font-semibold whitespace-nowrap">
                          {seq.doc_type}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs sm:text-sm">{seq.label}</TableCell>
                        <TableCell className="px-3 py-3 min-w-56">
                          <Input
                            value={seq.prefix_pattern}
                            onChange={(e) => {
                              const copy = [...sequences];
                              const current = copy[idx];
                              if (current) {
                                copy[idx] = {
                                  ...current,
                                  prefix_pattern: e.target.value,
                                };
                                setSequences(copy);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-3 w-20">
                          <Input
                            type="number"
                            min={2}
                            max={6}
                            value={seq.padding_digits}
                            onChange={(e) => {
                              const copy = [...sequences];
                              const current = copy[idx];
                              if (current) {
                                copy[idx] = {
                                  ...current,
                                  padding_digits: Number(e.target.value),
                                };
                                setSequences(copy);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-3 w-36">
                          <Select
                            value={seq.reset_period}
                            onValueChange={(val) => {
                              const copy = [...sequences];
                              const current = copy[idx];
                              if (current) {
                                copy[idx] = {
                                  ...current,
                                  reset_period: val as DocSequenceRow["reset_period"],
                                };
                                setSequences(copy);
                              }
                            }}
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
                        </TableCell>
                        <TableCell className="px-3 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                          {latestCounter ? (
                            <StatusBadge
                              tone="secondary"
                              label={`${latestCounter.period_key}: #${latestCounter.last_number}`}
                            />
                          ) : (
                            t("settings:admin_settings.status_unused")
                          )}
                        </TableCell>
                        <TableCell className="pl-2 pr-6 py-3 text-center whitespace-nowrap">
                          <div className="flex justify-center items-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={t("settings:admin_settings.btn_save_format")}
                              onClick={() => void handleSaveSequence(seq)}
                              className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <SaveIcon className="size-4" />
                              <span className="sr-only">{t("common:action.save")}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: TEMPLATE & PLACEHOLDER */}
        <TabsContent value="template">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((tmpl) => (
              <TemplateEditorCard
                key={tmpl.doc_type}
                template={tmpl}
                onSave={handleSaveTemplate}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={pendingPkpState !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPkpState(null);
        }}
        title={
          pendingPkpState
            ? t("settings:company.confirm_pkp_activate_title")
            : t("settings:company.confirm_pkp_deactivate_title")
        }
        description={
          pendingPkpState
            ? t("settings:company.confirm_pkp_activate_desc")
            : t("settings:company.confirm_pkp_deactivate_desc")
        }
        onConfirm={async () => {
          if (pendingPkpState === null) return;
          const updated = await updateCompanyProfile({
            pkp_enabled: pendingPkpState,
          });
          setCompany(updated);
          toast.success(t("settings:company.toast_tax_updated"));
        }}
      />

      <ConfirmActionDialog
        open={confirmPurgeOpen}
        onOpenChange={setConfirmPurgeOpen}
        title="Bersihkan Data Pengujian & Reset Penomoran?"
        description="Aksi ini akan menghapus seluruh data nomor urut dokumen hasil testing sebelumnya dan mengembalikan urutan penomoran ke awal. Format penomoran dokumen tetap dipertahankan. Gunakan aksi ini hanya saat mode sandbox/testing aktif."
        confirmLabel={purging ? "Membersihkan..." : "Ya, Bersihkan Data"}
        destructive
        onConfirm={handlePurgeTestData}
      />
    </div>
  );
}

function TemplateEditorCard({
  template,
  onSave,
}: {
  template: DocTemplateRow;
  onSave: (
    tmpl: DocTemplateRow,
    rawJson: string,
    footerNotes: string,
  ) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [jsonText, setJsonText] = React.useState(() =>
    JSON.stringify(template.default_placeholders, null, 2),
  );
  const [notes, setNotes] = React.useState(template.footer_notes ?? "");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{template.title}</CardTitle>
          <StatusBadge tone="outline" label={`v${template.version}`} />
        </div>
        <CardDescription>
          {t("settings:admin_settings.col_code")}: <code>{template.doc_type}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`json-${template.doc_type}`}>
              {t("settings:admin_settings.field_placeholder_json")}
            </FieldLabel>
            <Textarea
              id={`json-${template.doc_type}`}
              className="font-mono text-xs min-h-28"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`note-${template.doc_type}`}>
              {t("settings:admin_settings.field_footer_notes")}
            </FieldLabel>
            <Textarea
              id={`note-${template.doc_type}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onSave(template, jsonText, notes)}
            >
              {t("settings:admin_settings.btn_save_template")}
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

