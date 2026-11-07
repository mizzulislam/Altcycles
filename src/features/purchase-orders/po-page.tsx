import * as React from "react";
import {
  BanIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
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
import {
  getCompanyProfile,
  listProjects,
  listVendors,
} from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateID, formatRupiah, roundRupiah } from "@/lib/formatters";
import {
  createPurchaseOrder,
  getProjectBudgetComparison,
  listPurchaseOrders,
  recordExportLog,
  updatePurchaseOrderStatus,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type {
  CompanyProfileRow,
  PoItemRow,
  PoStatus,
  ProjectRow,
  PurchaseOrderRow,
  VendorRow,
} from "@/types/database.types";

const PO_STATUS_META: Record<
  PoStatus,
  { label: string; tone: "secondary" | "info" | "success" | "destructive" }
> = {
  draft: { label: "Draf", tone: "secondary" },
  issued: { label: "Diterbitkan", tone: "info" },
  completed: { label: "Selesai", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "destructive" },
};

export function PurchaseOrdersPage({ mode }: { mode: "user" | "admin" }) {
  const [orders, setOrders] = React.useState<PurchaseOrderRow[]>([]);
  const [items, setItems] = React.useState<PoItemRow[]>([]);
  const [vendors, setVendors] = React.useState<VendorRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [poDate, setPoDate] = React.useState("2026-11-07");
  const [vendorId, setVendorId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [issueNow, setIssueNow] = React.useState(true);
  const [formItems, setFormItems] = React.useState<
    Array<{ description: string; quantity: number; unit: string; unitPrice: number }>
  >([{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }]);
  const [budgetRemaining, setBudgetRemaining] = React.useState<number | null>(null);
  const [ackBudgetWarning, setAckBudgetWarning] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [cancelTarget, setCancelTarget] = React.useState<PurchaseOrderRow | null>(
    null,
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, vnds, prjs, comp] = await Promise.all([
        listPurchaseOrders(),
        listVendors(),
        listProjects(),
        getCompanyProfile(),
      ]);
      setOrders(poRes.orders);
      setItems(poRes.items);
      setVendors(vnds.filter((v) => v.is_active));
      setProjects(prjs.projects);
      setCompany(comp);
      if (!vendorId && vnds[0]) setVendorId(vnds[0].id);
      if (!projectId && prjs.projects[0]) setProjectId(prjs.projects[0].id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data PO.");
    } finally {
      setLoading(false);
    }
  }, [vendorId, projectId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!projectId || !dialogOpen) {
      setBudgetRemaining(null);
      return;
    }
    void getProjectBudgetComparison(projectId)
      .then((rows) => {
        if (rows.length === 0) {
          setBudgetRemaining(null);
        } else {
          setBudgetRemaining(
            rows.reduce((s, r) => s + r.remaining_amount, 0),
          );
        }
      })
      .catch(() => setBudgetRemaining(null));
  }, [projectId, dialogOpen]);

  const draftTotal = formItems.reduce(
    (s, it) => s + roundRupiah(it.quantity * it.unitPrice),
    0,
  );
  const exceedsBudget =
    budgetRemaining !== null && draftTotal > budgetRemaining;

  async function handleCreatePo(e: React.FormEvent) {
    e.preventDefault();
    if (exceedsBudget && !ackBudgetWarning) {
      toast.error(
        "Nilai PO melampaui sisa anggaran proyek. Centang konfirmasi peringatan anggaran untuk melanjutkan (FR-PO6).",
      );
      return;
    }
    setSaving(true);
    try {
      const created = await createPurchaseOrder({
        poDate,
        vendorId,
        projectId,
        notes,
        issueImmediately: issueNow,
        budgetWarningAcknowledged: ackBudgetWarning,
        items: formItems,
      });
      toast.success(`PO ${created.po_number} berhasil disimpan.`);
      setDialogOpen(false);
      setFormItems([{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }]);
      setNotes("");
      setAckBudgetWarning(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat PO.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf(po: PurchaseOrderRow) {
    if (!company) return;
    const vendor = vendors.find((v) => v.id === po.vendor_id);
    const prj = projects.find((p) => p.id === po.project_id);
    const poLines = items.filter((i) => i.po_id === po.id);

    const bytes = await generateDocumentPdf({
      docTitle: "PURCHASE ORDER (PO PEMBELIAN VENDOR)",
      docSubtitle: `Status: ${PO_STATUS_META[po.status].label}`,
      docNumber: po.po_number,
      docDate: po.po_date,
      company,
      recipientTitle: "Kepada Vendor / Pemasok:",
      recipientLines: [
        vendor?.name ?? "Vendor",
        vendor?.address ?? "-",
        `Kontak: ${vendor?.contact_name ?? "-"} | Telp: ${vendor?.phone ?? "-"}`,
      ],
      metaRows: [
        { label: "Proyek Referensi", value: prj ? `${prj.code} - ${prj.name}` : "-" },
        { label: "Catatan", value: po.notes ?? "-" },
      ],
      tableColumns: [
        { header: "No", widthRatio: 0.08 },
        { header: "Deskripsi Barang / Jasa", widthRatio: 0.44 },
        { header: "Qty", widthRatio: 0.14 },
        { header: "Harga Satuan", widthRatio: 0.17, align: "right" },
        { header: "Subtotal", widthRatio: 0.17, align: "right" },
      ],
      tableRows: poLines.map((l) => [
        String(l.line_no),
        l.description,
        `${l.quantity} ${l.unit}`,
        formatRupiah(l.unit_price),
        formatRupiah(l.line_total),
      ]),
      summaryRows: [{ label: "TOTAL NILAI PO", value: formatRupiah(po.total_amount) }],
      terbilangAmount: po.total_amount,
      notes: [
        "Harap cantumkan Nomor PO ini pada setiap surat jalan dan tagihan/invoice vendor.",
        "Dokumen PO yang telah diterbitkan bersifat terkunci (BR-7).",
      ],
      rightSignatureLabel: `Pemesan, ${company.company_name}`,
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    });

    downloadPdfBytes(bytes, po.po_number.replace(/\//g, "-"));
    toast.success(`PDF ${po.po_number} berhasil diunduh.`);
  }

  async function handleExportExcel() {
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.code]));
    await downloadExcelSheet({
      fileName: "Daftar-PO-Pembelian-Internal.xlsx",
      sheetName: "PO Pembelian",
      columns: [
        { header: "Nomor PO", width: 22 },
        { header: "Tanggal", width: 14 },
        { header: "Vendor", width: 28 },
        { header: "Kode Proyek", width: 18 },
        { header: "Total (IDR)", width: 18 },
        { header: "Status", width: 16 },
      ],
      rows: filtered.map((o) => [
        o.po_number,
        formatDateID(o.po_date),
        vendorMap.get(o.vendor_id) ?? "-",
        projectMap.get(o.project_id) ?? "-",
        o.total_amount,
        PO_STATUS_META[o.status].label,
      ]),
    });
    await recordExportLog("PO_INTERNAL", "EXCEL");
    toast.success("Daftar PO berhasil diekspor ke Excel (.xlsx).");
  }

  const filtered = orders.filter(
    (o) => statusFilter === "ALL" || o.status === statusFilter,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "admin"
              ? "Seluruh Purchase Order Pembelian Vendor"
              : "Purchase Order Pembelian Saya"}
          </h1>
          <p className="text-sm text-muted-foreground">
            PO yang sudah diterbitkan terkunci dari pengubahan nilai (BR-7) dan
            siap diunduh dalam format PDF A4 (FR-PO3).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "admin" ? (
            <Button type="button" variant="outline" onClick={() => void handleExportExcel()}>
              <FileSpreadsheetIcon data-icon="inline-start" />
              Ekspor Excel
            </Button>
          ) : null}
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Buat PO Vendor
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daftar Dokumen PO</CardTitle>
            <CardDescription>
              Saring berdasarkan status penerbitan atau penyelesaian pengadaan.
            </CardDescription>
          </div>
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="draft">Draf</SelectItem>
                  <SelectItem value="issued">Diterbitkan</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat PO pembelian...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Belum ada dokumen PO"
              description="Klik Buat PO Vendor untuk membuat pesanan pembelian barang atau jasa proyek."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor PO</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Total Nilai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((po) => {
                  const vnd = vendors.find((v) => v.id === po.vendor_id);
                  const prj = projects.find((p) => p.id === po.project_id);
                  const meta = PO_STATUS_META[po.status];
                  return (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {po.po_number}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateID(po.po_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {vnd?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {prj ? `${prj.code} — ${prj.name}` : "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatRupiah(po.total_amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={meta.tone} label={meta.label} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDownloadPdf(po)}
                          >
                            <DownloadIcon data-icon="inline-start" />
                            PDF
                          </Button>
                          {po.status === "draft" ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                await updatePurchaseOrderStatus(po.id, "issued");
                                toast.success(`PO ${po.po_number} diterbitkan.`);
                                await reload();
                              }}
                            >
                              Terbitkan
                            </Button>
                          ) : null}
                          {mode === "admin" && po.status === "issued" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                await updatePurchaseOrderStatus(po.id, "completed");
                                toast.success(`PO ${po.po_number} ditandai selesai.`);
                                await reload();
                              }}
                            >
                              <CheckCircle2Icon data-icon="inline-start" />
                              Selesai
                            </Button>
                          ) : null}
                          {(po.status === "draft" || po.status === "issued") ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCancelTarget(po)}
                            >
                              <BanIcon data-icon="inline-start" />
                              Batalkan
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat Purchase Order Pembelian Vendor</DialogTitle>
            <DialogDescription>
              Nomor dokumen `POP/ALT/YYYY/MM/NNN` diterbitkan otomatis tanpa
              duplikasi (BR-6).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePo}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="po-date">Tanggal PO</FieldLabel>
                  <Input
                    id="po-date"
                    type="date"
                    required
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Vendor / Pemasok</FieldLabel>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.code} — {v.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Proyek Terkait</FieldLabel>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih proyek" />
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
                </Field>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Rincian Item PO</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormItems((prev) => [
                        ...prev,
                        { description: "", quantity: 1, unit: "Unit", unitPrice: 0 },
                      ])
                    }
                  >
                    <PlusIcon data-icon="inline-start" />
                    Tambah Baris
                  </Button>
                </div>
                {formItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 sm:grid-cols-12 sm:items-end"
                  >
                    <div className="sm:col-span-5">
                      <Input
                        placeholder="Deskripsi barang/jasa"
                        required
                        value={it.description}
                        onChange={(e) =>
                          setFormItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, description: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={1}
                        required
                        value={it.quantity}
                        onChange={(e) =>
                          setFormItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, quantity: Number(e.target.value) } : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Satuan"
                        value={it.unit}
                        onChange={(e) =>
                          setFormItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, unit: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        required
                        placeholder="Harga Rp"
                        value={it.unitPrice}
                        onChange={(e) =>
                          setFormItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, unitPrice: Number(e.target.value) } : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={formItems.length === 1}
                        onClick={() =>
                          setFormItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2 text-sm font-bold">
                  Total PO: {formatRupiah(draftTotal)}
                </div>
              </div>

              {exceedsBudget ? (
                <Alert variant="destructive">
                  <AlertTitle>Peringatan Melampaui Sisa Anggaran Proyek (FR-PO6)</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>
                      Total PO ({formatRupiah(draftTotal)}) melebihi sisa
                      anggaran proyek saat ini ({formatRupiah(budgetRemaining ?? 0)}).
                    </span>
                    <label className="flex items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={ackBudgetWarning}
                        onChange={(e) => setAckBudgetWarning(e.target.checked)}
                      />
                      Saya memahami peringatan anggaran ini dan tetap melanjutkan.
                    </label>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel htmlFor="po-notes">Catatan Tambahan</FieldLabel>
                <Textarea
                  id="po-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jadwal pengiriman atau spesifikasi teknis..."
                />
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="po-issue" className="font-normal">
                  Langsung terbitkan PO setelah disimpan (mengunci rincian nilai)
                </FieldLabel>
                <Switch
                  id="po-issue"
                  checked={issueNow}
                  onCheckedChange={setIssueNow}
                />
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving || !vendorId || !projectId}>
                  {saving ? <Spinner data-icon="inline-start" /> : null}
                  Simpan PO
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title={`Batalkan dokumen ${cancelTarget?.po_number ?? ""}?`}
        description="Pembatalan bersifat permanen dan tercatat di riwayat status dokumen (BR-7)."
        destructive
        requireReason
        reasonLabel="Alasan Pembatalan PO"
        confirmLabel="Ya, Batalkan PO"
        onConfirm={async (reason) => {
          if (!cancelTarget) return;
          await updatePurchaseOrderStatus(cancelTarget.id, "cancelled", reason);
          toast.success(`PO ${cancelTarget.po_number} dibatalkan.`);
          await reload();
        }}
      />
    </div>
  );
}
