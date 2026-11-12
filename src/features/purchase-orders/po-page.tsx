import * as React from "react";
import {
  BanIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileTextIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { Textarea } from "@/components/ui/textarea";
import {
  getCompanyProfile,
  listProjects,
  listVendors,
} from "@/lib/data-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
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
  const [poDate, setPoDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
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
      const activeVendors = vnds.filter((v) => v.is_active);
      setOrders(poRes.orders);
      setItems(poRes.items);
      setVendors(activeVendors);
      setProjects(prjs.projects);
      setCompany(comp);
      setVendorId((prev) => prev || activeVendors[0]?.id || "");
      setProjectId((prev) => prev || prjs.projects[0]?.id || "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data PO.");
    } finally {
      setLoading(false);
    }
  }, []);

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
        "Nilai PO melampaui sisa anggaran proyek. Centang konfirmasi peringatan anggaran untuk melanjutkan.",
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
        "Dokumen PO yang telah diterbitkan bersifat terkunci secara permanen.",
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

  async function handleExportPdf() {
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.code]));
    const comp = company ?? (await getCompanyProfile());
    const bytes = await generateDocumentPdf({
      docTitle: "DAFTAR PURCHASE ORDER PEMBELIAN VENDOR",
      docSubtitle: `Total PO Ditampilkan: ${filtered.length} dokumen`,
      docNumber: `PO-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: "Nomor PO", widthRatio: 0.20 },
        { header: "Tanggal", widthRatio: 0.14 },
        { header: "Vendor", widthRatio: 0.24 },
        { header: "Proyek", widthRatio: 0.14 },
        { header: "Total (Rp)", widthRatio: 0.16, align: "right" },
        { header: "Status", widthRatio: 0.12 },
      ],
      tableRows: filtered.map((o) => [
        o.po_number,
        formatDateID(o.po_date),
        vendorMap.get(o.vendor_id) ?? "-",
        projectMap.get(o.project_id) ?? "-",
        formatRupiah(o.total_amount),
        PO_STATUS_META[o.status].label,
      ]),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, "Daftar_Purchase_Order_Altcycles.pdf");
    await recordExportLog("PO_INTERNAL", "PDF");
    toast.success("Daftar PO berhasil diekspor ke PDF (.pdf).");
  }

  async function handleExportCsv() {
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.code]));
    downloadCsvFile(
      "Daftar_Purchase_Order_Altcycles.csv",
      ["Nomor PO", "Tanggal", "Vendor", "Kode Proyek", "Total (IDR)", "Status"],
      filtered.map((o) => [
        o.po_number,
        o.po_date,
        vendorMap.get(o.vendor_id) ?? "-",
        projectMap.get(o.project_id) ?? "-",
        o.total_amount,
        PO_STATUS_META[o.status].label,
      ]),
    );
    await recordExportLog("PO_INTERNAL", "CSV");
    toast.success("Daftar PO berhasil diekspor ke CSV (.csv).");
  }

  const filtered = orders.filter(
    (o) => statusFilter === "ALL" || o.status === statusFilter,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mode === "admin"
              ? "Seluruh Purchase Order Pembelian Vendor"
              : "Purchase Order Pembelian Saya"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {mode === "admin"
              ? "Kelola penerbitan, persetujuan status, dan dokumen purchase order vendor."
              : "Buat dan pantau pesanan pembelian pengadaan barang atau jasa proyek."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {mode === "admin" ? (
            <ExportDownloadMenu
              label="Unduh / Ekspor"
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer gap-1.5 shadow-2xs"
          >
            <PlusIcon className="size-4" />
            <span>Buat PO Vendor</span>
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>Daftar Dokumen PO</CardTitle>
            <CardDescription>
              Saring berdasarkan status penerbitan atau penyelesaian pengadaan.
            </CardDescription>
          </div>
          <div className="w-full sm:w-52 shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 rounded-xl text-xs sm:text-sm">
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
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat PO pembelian...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Nomor PO</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Tanggal</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Vendor</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Proyek</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">Total Nilai</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <FileTextIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Belum Ada Dokumen PO
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                          Klik tombol Buat PO Vendor di kanan atas untuk membuat pesanan pembelian barang atau jasa proyek.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((po) => {
                  const vnd = vendors.find((v) => v.id === po.vendor_id);
                  const prj = projects.find((p) => p.id === po.project_id);
                  const meta = PO_STATUS_META[po.status];
                  return (
                    <TableRow key={po.id}>
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-center font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {po.po_number}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {formatDateID(po.po_date)}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 font-medium text-xs sm:text-sm leading-5">
                        {vnd?.name ?? "-"}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5">
                        {prj ? `${prj.code}: ${prj.name}` : "-"}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={po.total_amount} />
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge tone={meta.tone} label={meta.label} />
                        </div>
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="flex justify-center items-center gap-1 -my-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Unduh PDF PO"
                            onClick={() => void handleDownloadPdf(po)}
                            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          >
                            <DownloadIcon className="size-4" />
                            <span className="sr-only">Unduh PDF PO</span>
                          </Button>
                          {po.status === "draft" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Terbitkan PO"
                              onClick={async () => {
                                await updatePurchaseOrderStatus(po.id, "issued");
                                toast.success(`PO ${po.po_number} diterbitkan.`);
                                await reload();
                              }}
                              className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <SendIcon className="size-4" />
                              <span className="sr-only">Terbitkan PO</span>
                            </Button>
                          ) : null}
                          {mode === "admin" && po.status === "issued" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Tandai PO Selesai"
                              onClick={async () => {
                                await updatePurchaseOrderStatus(po.id, "completed");
                                toast.success(`PO ${po.po_number} ditandai selesai.`);
                                await reload();
                              }}
                              className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              <CheckCircle2Icon className="size-4" />
                              <span className="sr-only">Tandai Selesai</span>
                            </Button>
                          ) : null}
                          {(po.status === "draft" || po.status === "issued") ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Batalkan PO"
                              onClick={() => setCancelTarget(po)}
                              className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <BanIcon className="size-4" />
                              <span className="sr-only">Batalkan PO</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Buat Purchase Order Pembelian Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePo} className="min-w-0">
            <FieldGroup className="gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="po-date" required>Tanggal PO</FieldLabel>
                  <DatePicker
                    id="po-date"
                    required
                    value={poDate}
                    onChange={setPoDate}
                  />
                </Field>
                <Field>
                  <FieldLabel required>Vendor / Pemasok</FieldLabel>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {vendors.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            Belum ada vendor aktif
                          </SelectItem>
                        ) : (
                          vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.code}: {v.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel required>Proyek Terkait</FieldLabel>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projects.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Belum ada proyek tersedia
                        </SelectItem>
                      ) : (
                        projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code}: {p.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-muted/15 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Rincian Item PO
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs cursor-pointer"
                    onClick={() =>
                      setFormItems((prev) => [
                        ...prev,
                        { description: "", quantity: 1, unit: "Unit", unitPrice: 0 },
                      ])
                    }
                  >
                    <PlusIcon className="size-3.5 mr-1" />
                    Tambah Baris
                  </Button>
                </div>
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-0.5 text-[11px] font-medium text-muted-foreground">
                  <div className="sm:col-span-5">Deskripsi Barang / Jasa</div>
                  <div className="sm:col-span-2">Qty</div>
                  <div className="sm:col-span-2">Satuan</div>
                  <div className="sm:col-span-2">Harga Satuan (Rp)</div>
                  <div className="sm:col-span-1 text-center">Hapus</div>
                </div>
                {formItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 sm:grid-cols-12 sm:items-center"
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
                      <NumberInput
                        allowDecimal={false}
                        min={1}
                        required
                        value={it.quantity}
                        onValueChange={(quantity) =>
                          setFormItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, quantity } : row,
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
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        required
                        placeholder="Harga Rp"
                        value={it.unitPrice}
                        onValueChange={(unitPrice) =>
                          setFormItems((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, unitPrice } : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Hapus baris item"
                        disabled={formItems.length === 1}
                        onClick={() =>
                          setFormItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2Icon className="size-4" />
                        <span className="sr-only">Hapus baris</span>
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-1.5 border-t border-border/60 text-sm font-bold tabular-nums">
                  Total PO: {formatRupiah(draftTotal)}
                </div>
              </div>

              {exceedsBudget ? (
                <Alert variant="destructive">
                  <AlertTitle>Peringatan Melampaui Sisa Anggaran Proyek</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>
                      Total PO ({formatRupiah(draftTotal)}) melebihi sisa
                      anggaran proyek saat ini ({formatRupiah(budgetRemaining ?? 0)}).
                    </span>
                    <div className="flex items-center gap-2.5 text-xs font-medium">
                      <Checkbox
                        id="ack-po-budget-warning"
                        checked={ackBudgetWarning}
                        onCheckedChange={setAckBudgetWarning}
                      />
                      <label
                        htmlFor="ack-po-budget-warning"
                        className="cursor-pointer select-none leading-relaxed"
                      >
                        Saya memahami peringatan anggaran ini dan tetap melanjutkan.
                      </label>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel htmlFor="po-notes">Catatan Tambahan</FieldLabel>
                <Textarea
                  id="po-notes"
                  rows={2}
                  className="min-h-[64px]"
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
        description="Pembatalan bersifat permanen dan tercatat di riwayat status dokumen."
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
