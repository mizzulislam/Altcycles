import * as React from "react";
import { SaveIcon } from "lucide-react";
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
  updateCompanyProfile,
  updateDocSequence,
  updateDocTemplate,
} from "@/lib/data-service";
import type {
  CompanyProfileRow,
  DocSequenceCounterRow,
  DocSequenceRow,
  DocTemplateRow,
} from "@/types/database.types";

export function SystemConfigPage() {
  const [loading, setLoading] = React.useState(true);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [sequences, setSequences] = React.useState<DocSequenceRow[]>([]);
  const [counters, setCounters] = React.useState<DocSequenceCounterRow[]>([]);
  const [templates, setTemplates] = React.useState<DocTemplateRow[]>([]);
  const [savingCompany, setSavingCompany] = React.useState(false);
  const [pendingPkpState, setPendingPkpState] = React.useState<boolean | null>(
    null,
  );

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
        <span>Memuat pengaturan sistem...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Konfigurasi Perusahaan, Pajak, &amp; Dokumen
        </h1>
        <p className="text-sm text-muted-foreground">
          Diatur satu kali oleh Super Admin dan digunakan secara seragam pada
          seluruh template PDF Lampiran A.
        </p>
      </div>

      <Tabs defaultValue="identitas">
        <TabsList>
          <TabsTrigger value="identitas">Identitas &amp; Rekening</TabsTrigger>
          <TabsTrigger value="pajak">Pengaturan Pajak (PKP)</TabsTrigger>
          <TabsTrigger value="penomoran">Penomoran Dokumen</TabsTrigger>
          <TabsTrigger value="template">Template &amp; Placeholder</TabsTrigger>
        </TabsList>

        {/* TAB 1: IDENTITAS & REKENING */}
        <TabsContent value="identitas">
          <Card>
            <CardHeader>
              <CardTitle>Kop Surat, Rekening Bank, &amp; Penandatangan</CardTitle>
              <CardDescription>
                Data ini otomatis tercantum pada Quotation, Invoice, Kuitansi,
                BAKP, UAT, BAST, dan PO Pembelian.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany}>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="cp-name">Nama Unit Usaha</FieldLabel>
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
                      <FieldLabel htmlFor="cp-legal">Badan Hukum</FieldLabel>
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
                    <FieldLabel htmlFor="cp-addr">Alamat Lengkap Kop</FieldLabel>
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
                      <FieldLabel htmlFor="cp-email">Email Resmi</FieldLabel>
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
                      <FieldLabel htmlFor="cp-phone">Telepon</FieldLabel>
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
                    <FieldLegend>Rekening Penerimaan Pembayaran Klien</FieldLegend>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="cp-bank">Nama Bank</FieldLabel>
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
                        <FieldLabel htmlFor="cp-accno">Nomor Rekening</FieldLabel>
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
                        <FieldLabel htmlFor="cp-holder">Atas Nama</FieldLabel>
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
                      <FieldLabel htmlFor="cp-signer">
                        Nama Penandatangan Default
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
                      <FieldLabel htmlFor="cp-title">
                        Jabatan Penandatangan
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
                      Simpan Identitas Perusahaan
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
            <CardHeader>
              <CardTitle>Status Pengusaha Kena Pajak (PKP) &amp; Modul Pajak</CardTitle>
              <CardDescription>
                Sesuai aturan bisnis BR-22: selama Altvira belum PKP, seluruh
                invoice diterbitkan tanpa PPN dan modul pajak dinonaktifkan
                secara default.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Alert variant={company.pkp_enabled ? "warning" : "info"}>
                <AlertTitle>
                  Status Saat Ini:{" "}
                  {company.pkp_enabled
                    ? "PKP Aktif (Modul PPN Diaktifkan)"
                    : "Belum PKP — Invoice Tanpa PPN (Default)"}
                </AlertTitle>
                <AlertDescription>
                  {company.pkp_enabled
                    ? `PPN ${company.ppn_rate}% akan dihitung pada dokumen penagihan baru.`
                    : "Invoice mencantumkan keterangan resmi bahwa harga tidak dikenakan PPN karena perusahaan belum dikukuhkan sebagai PKP."}
                </AlertDescription>
              </Alert>

              <FieldSet>
                <FieldLegend>Kontrol Aktivasi Pajak</FieldLegend>
                <Field orientation="horizontal">
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="sw-pkp">
                      Aktifkan Status PKP &amp; Perhitungan PPN
                    </FieldLabel>
                    <FieldDescription>
                      Aktifkan hanya setelah PT Representasi Mitra Mandiri resmi
                      dikukuhkan sebagai PKP.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="sw-pkp"
                    checked={company.pkp_enabled}
                    onCheckedChange={(checked) => setPendingPkpState(checked)}
                  />
                </Field>

                <Field className="max-w-xs" data-disabled={!company.pkp_enabled}>
                  <FieldLabel htmlFor="ppn-rate">Tarif PPN Default (%)</FieldLabel>
                  <Input
                    id="ppn-rate"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    disabled={!company.pkp_enabled}
                    value={company.ppn_rate}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        ppn_rate: Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </FieldSet>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PENOMORAN DOKUMEN */}
        <TabsContent value="penomoran">
          <Card>
            <CardHeader>
              <CardTitle>Format Penomoran Dokumen Berurutan (Lampiran A.0)</CardTitle>
              <CardDescription>
                Gunakan variabel <code>{"{{tahun}}"}</code>,{" "}
                <code>{"{{bulan}}"}</code>, dan wajib{" "}
                <code>{"{{urut}}"}</code>. Nomor PO Klien dibuat terpisah dengan
                kode acak 6 karakter (<code>PO-YYYYMM-XXXXXX</code>).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Dokumen</TableHead>
                    <TableHead>Pola Nomor</TableHead>
                    <TableHead>Digit</TableHead>
                    <TableHead>Reset</TableHead>
                    <TableHead>Urutan Terakhir</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequences.map((seq, idx) => {
                    const latestCounter = counters
                      .filter((c) => c.doc_type === seq.doc_type)
                      .sort((a, b) => b.period_key.localeCompare(a.period_key))[0];
                    return (
                      <TableRow key={seq.doc_type}>
                        <TableCell className="font-mono font-semibold">
                          {seq.doc_type}
                        </TableCell>
                        <TableCell>{seq.label}</TableCell>
                        <TableCell className="min-w-64">
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
                        <TableCell className="w-20">
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
                        <TableCell className="w-36">
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
                                <SelectItem value="monthly">Bulanan</SelectItem>
                                <SelectItem value="yearly">Tahunan</SelectItem>
                                <SelectItem value="never">Tanpa Reset</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {latestCounter ? (
                            <StatusBadge
                              tone="secondary"
                              label={`${latestCounter.period_key}: #${latestCounter.last_number}`}
                            />
                          ) : (
                            "Belum dipakai"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleSaveSequence(seq)}
                          >
                            Simpan
                          </Button>
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
            ? "Aktifkan Status PKP & Modul Pajak?"
            : "Nonaktifkan Kembali Status PKP?"
        }
        description={
          pendingPkpState
            ? "Setelah diaktifkan, dokumen penagihan baru akan menyertakan perhitungan PPN. Perubahan ini dicatat pada Audit Trail."
            : "Invoice baru akan kembali diterbitkan tanpa PPN sesuai status belum PKP."
        }
        onConfirm={async () => {
          if (pendingPkpState === null) return;
          const updated = await updateCompanyProfile({
            pkp_enabled: pendingPkpState,
          });
          setCompany(updated);
          toast.success("Status pengaturan pajak berhasil diperbarui.");
        }}
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
          Kode: <code>{template.doc_type}</code> — Nilai default untuk isian{" "}
          <code>[kurung siku]</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`json-${template.doc_type}`}>
              Placeholder Default (JSON)
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
              Catatan Ketentuan Bawah Dokumen
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
              Simpan Template {template.doc_type}
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

