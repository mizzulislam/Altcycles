import * as React from "react";
import {
  CalculatorIcon,
  FileSpreadsheetIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
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
import { listProfiles, listProjects } from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateTimeID, formatRupiah } from "@/lib/formatters";
import {
  getProfitSharingBundle,
  recordExportLog,
  runProjectProfitSharing,
  saveProfitSharingScheme,
} from "@/lib/operations-service";
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

  const [postingDate, setPostingDate] = React.useState("2027-01-31");
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
    toast.success("Rincian bagi hasil berhasil diekspor ke Excel.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Perhitungan &amp; Finalisasi Bagi Hasil Proyek
          </h1>
          <p className="text-sm text-muted-foreground">
            Menghitung Laba Kotor Proyek (Pendapatan Diakui dikurangi Biaya Langsung dan Alokasi Proporsional Biaya Bersama), dengan total porsi tepat 100% serta penguncian permanen saat difinalisasi.
          </p>
        </div>
        {result ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportExcel()}
          >
            <FileSpreadsheetIcon data-icon="inline-start" />
            Ekspor Excel
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-80">
            <Field>
              <FieldLabel>Pilih Proyek Klien</FieldLabel>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger>
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isFinalized}
              onClick={openSchemeEditor}
            >
              <PlusIcon data-icon="inline-start" />
              Atur Skema 100%
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isFinalized || schemes.length === 0 || simulating}
              onClick={() => void handleRunSimulation()}
            >
              {simulating ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CalculatorIcon data-icon="inline-start" />
              )}
              Hitung Simulasi Draf
            </Button>
            <Button
              type="button"
              disabled={isFinalized || schemes.length === 0}
              onClick={() => setFinalizeConfirmOpen(true)}
            >
              <LockIcon data-icon="inline-start" />
              Finalisasi &amp; Kunci Bagi Hasil
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 border-t pt-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="ps-date">
              Tanggal Posting Jurnal Saat Finalisasi
            </FieldLabel>
            <Input
              id="ps-date"
              type="date"
              disabled={isFinalized}
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
            />
          </Field>
          <Field orientation="horizontal" className="items-end pb-2">
            <FieldLabel htmlFor="ps-man">
              Override Manual Biaya Bersama
            </FieldLabel>
            <Switch
              id="ps-man"
              disabled={isFinalized}
              checked={useManualSharedCost}
              onCheckedChange={setUseManualSharedCost}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ps-man-val">
              Nominal Biaya Bersama Manual (Rp)
            </FieldLabel>
            <Input
              id="ps-man-val"
              type="number"
              min={0}
              disabled={isFinalized || !useManualSharedCost}
              value={manualSharedCost}
              onChange={(e) => setManualSharedCost(Number(e.target.value))}
            />
            <FieldDescription>
              Jika nonaktif, dialokasikan secara proporsional otomatis berdasarkan
              pendapatan proyek.
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
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Skema Porsi Penerima (Wajib 100%)</CardTitle>
              <CardDescription>
                Anggota tim pelaksana proyek dapat memantau porsi hak bagi hasil masing-masing secara transparan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schemes.length === 0 ? (
                <EmptyState
                  title="Skema belum ditetapkan"
                  description="Klik Atur Skema 100% untuk mendaftarkan penerima dan persentase bagi hasil."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Penerima</TableHead>
                      <TableHead className="text-right">Porsi (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.recipient_name}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {s.percentage}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Hasil Perhitungan Laba Kotor &amp; Distribusi</CardTitle>
                <CardDescription>
                  {result?.finalized_at
                    ? `Difinalisasi pada ${formatDateTimeID(result.finalized_at)}`
                    : "Simulasi draf dapat diperbarui sebelum difinalisasi."}
                </CardDescription>
              </div>
              {result ? (
                <StatusBadge
                  tone={isFinalized ? "success" : "warning"}
                  label={
                    isFinalized ? "Difinalisasi & Terkunci" : "Simulasi Draf"
                  }
                />
              ) : null}
            </CardHeader>
            <CardContent>
              {!result ? (
                <EmptyState
                  title="Belum ada perhitungan"
                  description="Susun skema 100% lalu klik Hitung Simulasi Draf."
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs">
                          Pendapatan Proyek Diakui (Jurnal Terposting)
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {formatRupiah(result.recognized_revenue)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs">
                          Biaya Langsung Proyek
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          ({formatRupiah(result.direct_cost)})
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs">
                          Alokasi Biaya Bersama
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          ({formatRupiah(result.allocated_shared_cost)})
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-muted font-bold">
                        <TableCell>LABA KOTOR PROYEK</TableCell>
                        <TableCell className="text-right">
                          {formatRupiah(result.gross_profit)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Penerima</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead className="text-right">
                          Hak Bagi Hasil
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs font-medium">
                            {l.recipient_name}
                          </TableCell>
                          <TableCell className="text-xs">
                            {l.percentage}%
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {formatRupiah(l.share_amount)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atur Skema Bagi Hasil Proyek (Wajib 100%)</DialogTitle>
            <DialogDescription>
              Tautkan baris ke akun User apabila penerima merupakan anggota tim
              internal agar tampil di dashboard pribadinya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveScheme}>
            <FieldGroup>
              <div className="flex justify-end">
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
                >
                  <PlusIcon data-icon="inline-start" />
                  Tambah Penerima
                </Button>
              </div>
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                {draftRecipients.map((r, idx) => (
                  <div
                    key={idx}
                    className="grid items-center gap-2 sm:grid-cols-12"
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
                    <div className="flex items-center gap-1 sm:col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        min={0.01}
                        max={100}
                        required
                        value={r.percentage}
                        onChange={(e) =>
                          setDraftRecipients((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, percentage: Number(e.target.value) }
                                : x,
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
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Total Porsi: {sumPct}%</span>
                <StatusBadge
                  tone={sumPct === 100 ? "success" : "destructive"}
                  label={sumPct === 100 ? "Tepat 100%" : "Wajib 100%"}
                />
              </div>
              <DialogFooter>
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

