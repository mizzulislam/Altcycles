import * as React from "react";
import {
  CalculatorIcon,
  CoinsIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { getCompanyProfile, listProfiles, listProjects } from "@/lib/data-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateTimeID, formatRupiah } from "@/lib/formatters";
import {
  getProfitSharingBundle,
  recordExportLog,
  runProjectProfitSharing,
  saveProfitSharingScheme,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type {
  ProfileRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProfitSharingSchemeRow,
  ProjectRow,
} from "@/types/database.types";

interface DraftRecipient {
  recipientName: string;
  recipientUserId: string;
  percentage: number;
}

export function ProfitSharingPage() {
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [schemes, setSchemes] = React.useState<ProfitSharingSchemeRow[]>([]);
  const [result, setResult] = React.useState<ProfitSharingResultRow | null>(
    null,
  );
  const [lines, setLines] = React.useState<ProfitSharingLineRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [postingDate, setPostingDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [useManualSharedCost, setUseManualSharedCost] = React.useState(false);
  const [manualSharedCost, setManualSharedCost] = React.useState(0);
  const [simulating, setSimulating] = React.useState(false);
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = React.useState(false);

  // Dialog Atur Skema Penerima 100% (BR-10)
  const [schemeOpen, setSchemeOpen] = React.useState(false);
  const [draftRecipients, setDraftRecipients] = React.useState<
    DraftRecipient[]
  >([]);
  const [savingScheme, setSavingScheme] = React.useState(false);

  React.useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [prjRes, profs] = await Promise.all([
          listProjects(),
          listProfiles(),
        ]);
        const clientPrjs = prjRes.projects.filter(
          (p) => p.project_category === "client",
        );
        setProjects(clientPrjs);
        setProfiles(profs.filter((u) => u.is_active));
        if (clientPrjs[0]) {
          setSelectedProjectId(clientPrjs[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const loadProjectSharing = React.useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const b = await getProfitSharingBundle(selectedProjectId);
      setSchemes(b.schemes);
      const res =
        b.results.find((r) => r.project_id === selectedProjectId) ?? null;
      setResult(res);
      setLines(
        res ? b.lines.filter((l) => l.result_id === res.id) : [],
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memuat data bagi hasil proyek.",
      );
    }
  }, [selectedProjectId]);

  React.useEffect(() => {
    void loadProjectSharing();
  }, [loadProjectSharing]);

  const isFinalized = result?.status === "finalized";
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  function openSchemeEditor() {
    if (schemes.length > 0) {
      setDraftRecipients(
        schemes.map((s) => ({
          recipientName: s.recipient_name,
          recipientUserId: s.recipient_user_id ?? "none",
          percentage: s.percentage,
        })),
      );
    } else {
      const firstTeamUser = profiles.find((u) => u.role === "user");
      setDraftRecipients([
        {
          recipientName: "Kas Ditahan Perusahaan Altvira",
          recipientUserId: "none",
          percentage: 60,
        },
        {
          recipientName: firstTeamUser?.full_name ?? "Tim Pengembang Proyek",
          recipientUserId: firstTeamUser?.id ?? "none",
          percentage: 40,
        },
      ]);
    }
    setSchemeOpen(true);
  }

  const sumPct = Number(
    draftRecipients.reduce((s, r) => s + r.percentage, 0).toFixed(2),
  );

  async function handleSaveScheme(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) return;
    setSavingScheme(true);
    try {
      await saveProfitSharingScheme(
        selectedProjectId,
        draftRecipients.map((r) => ({
          recipientName: r.recipientName,
          recipientUserId:
            r.recipientUserId === "none" ? null : r.recipientUserId,
          percentage: r.percentage,
        })),
      );
      toast.success("Skema bagi hasil 100% berhasil disimpan.");
      setSchemeOpen(false);
      await loadProjectSharing();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan skema bagi hasil.",
      );
    } finally {
      setSavingScheme(false);
    }
  }

  async function handleRunSimulation() {
    if (!selectedProjectId) return;
    setSimulating(true);
    try {
      await runProjectProfitSharing({
        projectId: selectedProjectId,
        finalize: false,
        postingDate,
        manualSharedCost: useManualSharedCost ? manualSharedCost : null,
      });
      toast.success(
        "Simulasi draf bagi hasil selesai dihitung (belum memposting jurnal).",
      );
      await loadProjectSharing();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menjalankan simulasi.",
      );
    } finally {
      setSimulating(false);
    }
  }

  async function handleExportExcel() {
    if (!result || !selectedProject) return;
    await downloadExcelSheet({
      fileName: `Bagi_Hasil_${selectedProject.code}.xlsx`,
      sheetName: "Bagi Hasil",
      columns: [
        { header: "Penerima Bagi Hasil", width: 32 },
        { header: "Persentase (%)", width: 16 },
        { header: "Nominal Hak Bagi Hasil (Rp)", width: 24 },
      ],
      rows: [
        ["Pendapatan Proyek Diakui", 0, result.recognized_revenue],
        ["Biaya Langsung Proyek", 0, -result.direct_cost],
        ["Alokasi Biaya Bersama", 0, -result.allocated_shared_cost],
        ["LABA KOTOR DASAR BAGI HASIL", 100, result.gross_profit],
        ...lines.map((l) => [l.recipient_name, l.percentage, l.share_amount]),
      ],
    });
    await recordExportLog("PROFIT_SHARING", "EXCEL");
    toast.success("Rincian bagi hasil berhasil diekspor ke Excel (.xlsx).");
  }

  async function handleExportPdf() {
    if (!result || !selectedProject) return;
    const comp = await getCompanyProfile();
    const tableRows: string[][] = [
      ["Pendapatan Proyek Diakui", "-", formatRupiah(result.recognized_revenue)],
      ["Biaya Langsung Proyek", "-", `(${formatRupiah(result.direct_cost)})`],
      ["Alokasi Biaya Bersama", "-", `(${formatRupiah(result.allocated_shared_cost)})`],
      ["Laba Kotor Dasar Bagi Hasil", "100%", formatRupiah(result.gross_profit)],
      ...lines.map((l) => [l.recipient_name, `${l.percentage}%`, formatRupiah(l.share_amount)]),
    ];
    const bytes = await generateDocumentPdf({
      docTitle: `PERHITUNGAN BAGI HASIL PROYEK ${selectedProject.code}`,
      docSubtitle: `${selectedProject.name} (${isFinalized ? "Difinalisasi" : "Simulasi Draf"})`,
      docNumber: `BH/${selectedProject.code}`,
      docDate: postingDate || new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: "Komponen / Penerima", widthRatio: 0.52 },
        { header: "Porsi (%)", widthRatio: 0.16, align: "right" },
        { header: "Nominal (Rp)", widthRatio: 0.32, align: "right" },
      ],
      tableRows,
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, `Bagi_Hasil_${selectedProject.code}.pdf`);
    await recordExportLog("PROFIT_SHARING", "PDF");
    toast.success("Rincian bagi hasil berhasil diekspor ke PDF (.pdf).");
  }

  async function handleExportCsv() {
    if (!result || !selectedProject) return;
    downloadCsvFile(
      `Bagi_Hasil_${selectedProject.code}.csv`,
      ["Penerima Bagi Hasil", "Persentase (%)", "Nominal Hak Bagi Hasil (Rp)"],
      [
        ["Pendapatan Proyek Diakui", 0, result.recognized_revenue],
        ["Biaya Langsung Proyek", 0, -result.direct_cost],
        ["Alokasi Biaya Bersama", 0, -result.allocated_shared_cost],
        ["Laba Kotor Dasar Bagi Hasil", 100, result.gross_profit],
        ...lines.map((l) => [l.recipient_name, l.percentage, l.share_amount]),
      ],
    );
    await recordExportLog("PROFIT_SHARING", "CSV");
    toast.success("Rincian bagi hasil berhasil diekspor ke CSV (.csv).");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Perhitungan &amp; Finalisasi Bagi Hasil Proyek
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Hitung pembagian laba bersih proyek bagi anggota tim dan finalisasi pencairan hak bagi hasil.
          </p>
        </div>
        {result ? (
          <div className="flex items-center gap-2.5 shrink-0">
            <ExportDownloadMenu
              label="Unduh / Ekspor"
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />
          </div>
        ) : null}
      </div>

      <Card className="@container rounded-2xl border-border/80 bg-card shadow-2xs overflow-visible">
        <CardHeader className="p-5 sm:p-6 pb-5 border-b border-border/70">
          <div className="flex flex-col gap-4 @[720px]:flex-row @[720px]:items-end @[720px]:justify-between">
            <div className="w-full @[720px]:flex-1 @[720px]:min-w-0">
              <Field className="min-w-0">
                <FieldLabel className="text-xs font-semibold text-foreground">
                  Pilih Proyek Klien
                </FieldLabel>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="w-full min-w-0 h-10 rounded-xl text-xs sm:text-sm gap-2">
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
              </Field>
            </div>
            <div className="flex flex-wrap @[720px]:flex-nowrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFinalized}
                onClick={openSchemeEditor}
                className="h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer gap-1.5"
              >
                <PlusIcon className="size-3.5 shrink-0" />
                <span>Atur Skema 100%</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isFinalized || schemes.length === 0 || simulating}
                onClick={() => void handleRunSimulation()}
                className="h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer gap-1.5"
              >
                {simulating ? (
                  <Spinner className="size-3.5 shrink-0" />
                ) : (
                  <CalculatorIcon className="size-3.5 shrink-0" />
                )}
                <span>Hitung Simulasi Draf</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isFinalized || schemes.length === 0}
                onClick={() => setFinalizeConfirmOpen(true)}
                className="h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer gap-1.5 shadow-2xs"
              >
                <LockIcon className="size-3.5 shrink-0" />
                <span>Finalisasi &amp; Kunci Bagi Hasil</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          <Field>
            <FieldLabel htmlFor="ps-date" className="text-xs font-semibold text-foreground">
              Tanggal Posting Jurnal Saat Finalisasi
            </FieldLabel>
            <DatePicker
              id="ps-date"
              disabled={isFinalized}
              value={postingDate}
              onChange={setPostingDate}
            />
            <FieldDescription className="text-[11px] leading-relaxed">
              Tanggal efektif pencatatan jurnal bagi hasil ke Buku Besar.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="ps-man" className="text-xs font-semibold text-foreground">
              Override Manual Biaya Bersama
            </FieldLabel>
            <div className="flex h-9 w-full items-center justify-between rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-foreground">
                {useManualSharedCost ? "Input Manual Aktif" : "Alokasi Otomatis"}
              </span>
              <Switch
                id="ps-man"
                disabled={isFinalized}
                checked={useManualSharedCost}
                onCheckedChange={setUseManualSharedCost}
              />
            </div>
            <FieldDescription className="text-[11px] leading-relaxed">
              Aktifkan untuk menentukan nominal biaya bersama secara manual.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="ps-man-val" className="text-xs font-semibold text-foreground">
              Nominal Biaya Bersama Manual (Rp)
            </FieldLabel>
            <NumberInput
              id="ps-man-val"
              allowDecimal={false}
              min={0}
              disabled={isFinalized || !useManualSharedCost}
              value={manualSharedCost}
              onValueChange={setManualSharedCost}
              className="h-9 rounded-xl"
            />
            <FieldDescription className="text-[11px] leading-relaxed">
              Jika nonaktif, dialokasikan secara proporsional otomatis berdasarkan pendapatan proyek.
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner />
          <span>Memuat data bagi hasil...</span>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 items-stretch">
          <Card className="overflow-hidden flex flex-col">
            <CardHeader className="px-6 py-4 border-b border-border/70">
              <CardTitle className="text-base sm:text-lg font-bold">
                Skema Porsi Penerima (Wajib 100%)
              </CardTitle>
              <CardDescription>
                Anggota tim pelaksana proyek dapat memantau porsi hak bagi hasil masing-masing secara transparan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold">Nama Penerima</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold w-32">Porsi (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemes.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={2} className="p-0">
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                            <UsersIcon className="size-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">
                            Skema Belum Ditetapkan
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                            Klik Atur Skema 100% untuk mendaftarkan penerima dan persentase bagi hasil.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    schemes.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="pl-6 pr-3 font-medium text-foreground">
                          {s.recipient_name}
                        </TableCell>
                        <TableCell className="pl-2 pr-6 text-center font-semibold text-foreground tabular-nums">
                          {s.percentage}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="overflow-hidden flex flex-col">
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold">
                  Hasil Perhitungan Laba Kotor &amp; Distribusi
                </CardTitle>
                <CardDescription>
                  {result?.finalized_at
                    ? `Difinalisasi pada ${formatDateTimeID(result.finalized_at)}`
                    : "Simulasi draf dapat diperbarui sebelum difinalisasi."}
                </CardDescription>
              </div>
              {result ? (
                <div className="shrink-0 self-start sm:self-center">
                  <StatusBadge
                    tone={isFinalized ? "success" : "warning"}
                    label={
                      isFinalized ? "Difinalisasi & Terkunci" : "Simulasi Draf"
                    }
                  />
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center bg-muted/10">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                    <CoinsIcon className="size-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Belum Ada Perhitungan
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Susun skema 100% lalu klik Hitung Simulasi Draf.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border/70">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="pl-6 pr-3 text-foreground">
                          Pendapatan Proyek Diakui (Jurnal Terposting)
                        </TableCell>
                        <TableCell className="pl-3 pr-6 w-48 whitespace-nowrap">
                          <MonetaryCell amount={result.recognized_revenue} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-6 pr-3 text-foreground">
                          Biaya Langsung Proyek
                        </TableCell>
                        <TableCell className="pl-3 pr-6 w-48 whitespace-nowrap">
                          <MonetaryCell amount={-result.direct_cost} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-6 pr-3 text-foreground">
                          Alokasi Biaya Bersama
                        </TableCell>
                        <TableCell className="pl-3 pr-6 w-48 whitespace-nowrap">
                          <MonetaryCell amount={-result.allocated_shared_cost} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/40 font-bold border-t border-border/80">
                        <TableCell className="pl-6 pr-3 font-bold text-foreground">
                          Laba Kotor Proyek
                        </TableCell>
                        <TableCell className="pl-3 pr-6 w-48 whitespace-nowrap">
                          <MonetaryCell
                            amount={result.gross_profit}
                            className="font-bold text-primary dark:text-sky-400"
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="pl-6 pr-3 text-center font-semibold">Penerima</TableHead>
                        <TableHead className="px-3 text-center font-semibold w-28">Persentase</TableHead>
                        <TableHead className="pl-3 pr-6 text-center font-semibold w-48">Hak Bagi Hasil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="pl-6 pr-3 font-medium text-foreground">
                            {l.recipient_name}
                          </TableCell>
                          <TableCell className="px-3 text-center tabular-nums text-foreground">
                            {l.percentage}%
                          </TableCell>
                          <TableCell className="pl-3 pr-6 whitespace-nowrap">
                            <MonetaryCell amount={l.share_amount} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Atur Skema 100% */}
      <Dialog open={schemeOpen} onOpenChange={setSchemeOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atur Skema Bagi Hasil Proyek (Wajib 100%)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveScheme} className="space-y-4">
            <FieldGroup>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Tautkan baris ke akun User jika penerima merupakan anggota tim internal.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraftRecipients((prev) => [
                      ...prev,
                      {
                        recipientName: "",
                        recipientUserId: "none",
                        percentage: 0,
                      },
                    ])
                  }
                  className="h-8 px-3 rounded-xl text-xs font-semibold shrink-0 self-start sm:self-center cursor-pointer gap-1.5"
                >
                  <PlusIcon className="size-3.5" />
                  <span>Tambah Penerima</span>
                </Button>
              </div>

              <div className="hidden sm:grid sm:grid-cols-12 gap-2.5 px-1 text-xs font-semibold text-muted-foreground">
                <div className="sm:col-span-5">Nama Penerima</div>
                <div className="sm:col-span-4">Akun Tim</div>
                <div className="sm:col-span-3">Porsi (%)</div>
              </div>

              <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                {draftRecipients.map((r, idx) => (
                  <div
                    key={idx}
                    className="grid items-center gap-2.5 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-5">
                      <Input
                        required
                        placeholder="Nama penerima / kas perusahaan"
                        value={r.recipientName}
                        onChange={(e) =>
                          setDraftRecipients((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, recipientName: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Select
                        value={r.recipientUserId}
                        onValueChange={(uid) => {
                          const found = profiles.find((p) => p.id === uid);
                          setDraftRecipients((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    recipientUserId: uid,
                                    recipientName:
                                      found && !x.recipientName
                                        ? found.full_name
                                        : x.recipientName,
                                  }
                                : x,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">
                              Porsi Perusahaan / Internal
                            </SelectItem>
                            {profiles
                              .filter((p) => p.role === "user")
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.full_name}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-3">
                      <NumberInput
                        allowDecimal
                        maxDecimals={2}
                        min={0.01}
                        max={100}
                        required
                        value={r.percentage}
                        onValueChange={(percentage) =>
                          setDraftRecipients((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, percentage } : x,
                            ),
                          )
                        }
                      />
                      {draftRecipients.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDraftRecipients((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="shrink-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          title="Hapus penerima"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs font-semibold">
                <span className="text-foreground">Total Porsi: {sumPct}%</span>
                <StatusBadge
                  tone={sumPct === 100 ? "success" : "destructive"}
                  label={sumPct === 100 ? "Tepat 100%" : "Wajib 100%"}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSchemeOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={savingScheme || sumPct !== 100}
                >
                  {savingScheme ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Skema
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Finalisasi & Kunci Permanen (BR-9) */}
      <ConfirmActionDialog
        open={finalizeConfirmOpen}
        onOpenChange={setFinalizeConfirmOpen}
        title="Finalisasi & Kunci Bagi Hasil Proyek Ini?"
        description="Setelah difinalisasi, skema dan nominal terkunci permanen serta sistem otomatis menerbitkan jurnal Beban Bagi Hasil pada Utang Bagi Hasil."
        destructive
        confirmLabel="Ya, Finalisasi & Posting Jurnal"
        onConfirm={async () => {
          await runProjectProfitSharing({
            projectId: selectedProjectId,
            finalize: true,
            postingDate,
            manualSharedCost: useManualSharedCost ? manualSharedCost : null,
          });
          toast.success(
            "Bagi hasil proyek telah difinalisasi, dikunci, dan diposting ke Buku Besar.",
          );
          await loadProjectSharing();
        }}
      />
    </div>
  );
}

