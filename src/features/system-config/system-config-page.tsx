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
  bulkUpdateDocSequencesResetPeriod,
  getCompanyProfile,
  listDocSequences,
  listDocTemplates,
  setJournalLockStatus,
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
          Atur profil identitas perusahaan, tarif pajak transaksi, dan format penomoran dokumen resmi.
        </p>
      </div>

      <Tabs defaultValue="identitas">
        <TabsList>
          <TabsTrigger value="identitas">Identitas &amp; Rekening</TabsTrigger>
          <TabsTrigger value="pajak">Pengaturan Pajak (PKP)</TabsTrigger>
          <TabsTrigger value="akuntansi">Kunci Jurnal</TabsTrigger>
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
                      <FieldLabel htmlFor="cp-name" required>Nama Unit Usaha</FieldLabel>
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
                      <FieldLabel htmlFor="cp-legal" required>Badan Hukum</FieldLabel>
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
                    <FieldLabel htmlFor="cp-addr" required>Alamat Lengkap Kop</FieldLabel>
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
                      <FieldLabel htmlFor="cp-email" required>Email Resmi</FieldLabel>
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
                      <FieldLabel htmlFor="cp-phone" required>Telepon</FieldLabel>
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
                        <FieldLabel htmlFor="cp-bank" required>Nama Bank</FieldLabel>
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
                        <FieldLabel htmlFor="cp-accno" required>Nomor Rekening</FieldLabel>
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
                        <FieldLabel htmlFor="cp-holder" required>Atas Nama</FieldLabel>
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
                      <FieldLabel htmlFor="cp-title" required>
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
                Selama entitas belum berstatus PKP, seluruh invoice diterbitkan tanpa PPN dan modul faktur pajak dinonaktifkan secara default.
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

        {/* TAB 3: KEBIJAKAN AKUNTANSI & KUNCI JURNAL */}
        <TabsContent value="akuntansi">
          <Card>
            <CardHeader>
              <CardTitle>Kebijakan Kunci Immutabilitas Jurnal &amp; Mode Pengujian (BR-2)</CardTitle>
              <CardDescription>
                Atur proteksi permanensi pencatatan jurnal akuntansi buku besar atau aktifkan mode pengujian untuk kebebasan edit dan hapus transaksi testing.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Alert variant={company.journal_lock_enabled !== false ? "info" : "warning"}>
                <AlertTitle>
                  Status Kunci Jurnal:{" "}
                  {company.journal_lock_enabled !== false
                    ? "Terkunci (Immutabilitas BR-2 Aktif)"
                    : "Terbuka (Mode Pengujian / Testing Transaksi Aktif)"}
                </AlertTitle>
                <AlertDescription>
                  {company.journal_lock_enabled !== false
                    ? "Jurnal yang sudah diposting bersifat permanen dan tidak dapat diedit atau dihapus secara langsung. Segala perubahan wajib diterbitkan melalui jurnal koreksi/penyesuaian (BR-2) dengan jejak audit resmi."
                    : "Perlindungan immutabilitas dinonaktifkan sementara. Anda dan tim Admin dapat mengedit serta menghapus transaksi jurnal yang sudah diposting langsung dari Buku Jurnal Harian."}
                </AlertDescription>
              </Alert>

              <FieldSet>
                <FieldLegend>Kontrol Penguncian Jurnal</FieldLegend>
                <Field orientation="horizontal">
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="sw-journal-lock">
                      Kunci Immutabilitas Jurnal Akuntansi (BR-2)
                    </FieldLabel>
                    <FieldDescription>
                      Aktifkan untuk mematuhi kaidah akuntansi (permanen &amp; anti-manipulasi). Nonaktifkan jika sedang melakukan input transaksi testing dan ingin bebas mengubah atau menghapus data jurnal.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="sw-journal-lock"
                    checked={company.journal_lock_enabled !== false}
                    onCheckedChange={async (checked) => {
                      try {
                        await setJournalLockStatus(checked);
                        setCompany((prev) =>
                          prev ? { ...prev, journal_lock_enabled: checked } : prev,
                        );
                        if (checked) {
                          toast.success("Kunci jurnal diaktifkan (Mode Produksi).");
                        } else {
                          toast.warning("Kunci jurnal dinonaktifkan (Mode Testing Aktif: Transaksi jurnal dapat diedit dan dihapus).");
                        }
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Gagal memperbarui pengaturan kunci jurnal.",
                        );
                      }
                    }}
                  />
                </Field>
              </FieldSet>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PENOMORAN DOKUMEN */}
        <TabsContent value="penomoran" className="flex flex-col gap-6">
          {/* Master Switch Kebijakan Periode Reset Penomoran (Konflik 2 & Standar 2027) */}
          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg font-bold">
                    Kebijakan Periode Reset Penomoran Dokumen
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
                        ? "Tahunan (Standar 2027)"
                        : currentGlobalResetPeriod === "monthly"
                          ? "Bulanan (Aktif 2026)"
                          : "Kustom / Campuran"
                    }
                  />
                </div>
                <CardDescription>
                  Atur siklus nomor urut seluruh dokumen resmi Altvira. Saat ini aktif <strong>Bulanan</strong> (periode 2026). Anda dapat beralih ke <strong>Tahunan</strong> untuk persiapan tahun 2027 tanpa perlu mengubah kode (hardcode).
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
                        Mode 2026: Reset Bulanan
                      </span>
                      {currentGlobalResetPeriod === "monthly" && (
                        <StatusBadge tone="success" label="Sedang Aktif" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pencacah mereset ke 001 tiap awal bulan (<code>YYYY-MM</code>). Format: <code>JENIS/ALT/YYYY/MM/URUT3</code>.
                    </p>
                    <div className="rounded-lg bg-background/80 border border-border/50 px-3 py-1.5 font-mono text-xs text-foreground font-medium">
                      Contoh: INV/ALT/2026/11/001
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
                    Terapkan Reset Bulanan (2026)
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
                        Mode 2027: Reset Tahunan (Standar Baru)
                      </span>
                      {currentGlobalResetPeriod === "yearly" && (
                        <StatusBadge tone="info" label="Sedang Aktif" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pencacah berlanjut 1 tahun penuh dan reset per 1 Januari. Format standar: <code>ALT/JENIS/YYYY/MM/URUT4</code> (4 digit).
                    </p>
                    <div className="rounded-lg bg-background/80 border border-border/50 px-3 py-1.5 font-mono text-xs text-foreground font-medium">
                      Contoh: ALT/INV/2027/01/0001
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
                    Beralih ke Standar Tahunan (2027)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle>Format Penomoran Dokumen Berurutan (Lampiran A.0)</CardTitle>
              <CardDescription>
                Gunakan variabel <code>{"{{tahun}}"}</code>,{" "}
                <code>{"{{bulan}}"}</code>, dan wajib{" "}
                <code>{"{{urut}}"}</code>. Nomor PO Klien dibuat terpisah dengan
                kode acak 6 karakter (<code>PO-YYYYMM-XXXXXX</code>).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Dokumen</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Pola Nomor</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Digit</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Reset</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Urutan Terakhir</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Aksi</TableHead>
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
                                <SelectItem value="monthly">Bulanan</SelectItem>
                                <SelectItem value="yearly">Tahunan</SelectItem>
                                <SelectItem value="never">Tanpa Reset</SelectItem>
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
                            "Belum dipakai"
                          )}
                        </TableCell>
                        <TableCell className="pl-2 pr-6 py-3 text-center whitespace-nowrap">
                          <div className="flex justify-center items-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Simpan Pola Penomoran"
                              onClick={() => void handleSaveSequence(seq)}
                              className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <SaveIcon className="size-4" />
                              <span className="sr-only">Simpan</span>
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

      <ConfirmActionDialog
        open={confirmMasterPolicy.open}
        onOpenChange={(open) =>
          setConfirmMasterPolicy((prev) => ({ ...prev, open }))
        }
        title={
          confirmMasterPolicy.period === "yearly"
            ? "Beralih ke Kebijakan Reset Tahunan (Standar 2027)"
            : "Terapkan Kebijakan Reset Bulanan (Mode 2026)"
        }
        description={
          confirmMasterPolicy.period === "yearly"
            ? "Seluruh jenis dokumen resmi akan dialihkan ke siklus reset nomor urut tahunan (1 tahun penuh tanpa reset bulanan) dengan format standar baru ALT/{JENIS}/{YYYY}/{MM}/{URUT4} (4 digit). Dokumen yang sudah diterbitkan sebelumnya tidak akan berubah."
            : "Seluruh jenis dokumen resmi akan menggunakan siklus reset nomor urut bulanan (reset ke 001 tiap awal bulan baru). Dokumen yang sudah diterbitkan sebelumnya tidak akan berubah."
        }
        confirmLabel={
          savingMasterPolicy
            ? "Menerapkan..."
            : confirmMasterPolicy.period === "yearly"
              ? "Beralih ke Standar 2027"
              : "Terapkan Mode 2026"
        }
        variant={confirmMasterPolicy.period === "yearly" ? "default" : "secondary"}
        onConfirm={handleApplyMasterPolicy}
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

