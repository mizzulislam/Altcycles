import * as React from "react";
import {
  ArrowUpDownIcon,
  BanIcon,
  CheckCircle2Icon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { PoCreateDialog } from "./dialogs/po-create-dialog";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionEditControls } from "@/features/client-projects/components/project-detail-shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { validatePurchaseOrderChecklist } from "@/lib/document-checklist";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
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
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import {
  getCompanyProfile,
  listProjects,
  listVendors,
} from "@/lib/data-service";
import { resolveDocumentSigner } from "@/lib/pdf/document-signer-config";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import {
  formatDateID,
  formatDateI18n,
  formatDocDateLong,
  formatDocRupiah,
  formatRupiah,
  roundRupiah,
} from "@/lib/formatters";
import { getActiveLanguage, useLanguage } from "@/lib/i18n";
import {
  createPurchaseOrder,
  deletePurchaseOrders,
  getProjectBudgetComparison,
  listPurchaseOrders,
  recordExportLog,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
} from "@/lib/operations-service";
import {
  downloadPdfBytes,
  generateDocumentPdf,
  type DocStatusVariant,
  type PdfDocumentSpec,
} from "@/lib/pdf-generator";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import type {
  CompanyProfileRow,
  PoItemRow,
  PoStatus,
  ProjectRow,
  PurchaseOrderRow,
  VendorRow,
} from "@/types/database.types";
import { TruncatedTooltipText } from "@/components/shared/page-header";

const PO_STATUS_META: Record<
  PoStatus,
  { label: string; tone: "secondary" | "info" | "success" | "destructive" }
> = {
  draft: { label: "Draf", tone: "secondary" },
  issued: { label: "Diterbitkan", tone: "info" },
  completed: { label: "Selesai", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "destructive" },
};

function getPoStatusMeta(status: PoStatus, t: (k: string, fb?: string) => string): { label: string; tone: "secondary" | "info" | "success" | "destructive" } {
  switch (status) {
    case "draft":
      return { label: t("po:status_draft", "Draf"), tone: "secondary" };
    case "issued":
      return { label: t("po:status_issued", "Diterbitkan"), tone: "info" };
    case "completed":
      return { label: t("po:status_completed", "Selesai"), tone: "success" };
    case "cancelled":
      return { label: t("po:status_cancelled", "Dibatalkan"), tone: "destructive" };
  }
}

export function PurchaseOrdersPage({ mode }: { mode: "user" | "admin" }) {
  const { t, language } = useLanguage();
  const [orders, setOrders] = React.useState<PurchaseOrderRow[]>([]);
  const [items, setItems] = React.useState<PoItemRow[]>([]);
  const [vendors, setVendors] = React.useState<VendorRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPo, setEditingPo] = React.useState<PurchaseOrderRow | null>(null);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedPoIds, setSelectedPoIds] = React.useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = React.useState<PurchaseOrderRow | null>(null);

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

  const selectedVendor = vendors.find((v) => v.id === vendorId) ?? null;
  const poChecklist = React.useMemo(() => {
    return validatePurchaseOrderChecklist({
      vendor: selectedVendor,
      poDate,
      items: formItems,
      exceedsBudget,
      ackBudgetWarning,
      issueImmediately: issueNow,
    });
  }, [selectedVendor, poDate, formItems, exceedsBudget, ackBudgetWarning, issueNow]);

  function handleOpenCreate() {
    setEditingPo(null);
    setPoDate(new Date().toLocaleDateString("en-CA"));
    setVendorId(vendors[0]?.id || "");
    setProjectId(projects[0]?.id || "");
    setNotes("");
    setIssueNow(true);
    setFormItems([{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }]);
    setAckBudgetWarning(false);
    setDialogOpen(true);
  }

  function handleOpenEditPo(po: PurchaseOrderRow) {
    const poLines = items.filter((i) => i.po_id === po.id);
    setEditingPo(po);
    setPoDate(po.po_date);
    setVendorId(po.vendor_id);
    setProjectId(po.project_id);
    setNotes(po.notes || "");
    setIssueNow(false);
    setFormItems(
      poLines.length > 0
        ? poLines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unit_price,
          }))
        : [{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }],
    );
    setAckBudgetWarning(Boolean(po.budget_warning_acknowledged));
    setDialogOpen(true);
  }

  async function handleSavePo(e: React.FormEvent) {
    e.preventDefault();
    if (issueNow && draftTotal <= 0) {
      toast.error(
        "Purchase Order yang langsung diterbitkan wajib memiliki total nilai lebih dari Rp 0 (harga satuan > 0).",
      );
      return;
    }
    if (!poChecklist.isValid) {
      const firstInvalid = poChecklist.items.find((i) => !i.passed);
      toast.error(
        firstInvalid?.message || "Checklist PO sebelum terbit belum terpenuhi.",
      );
      return;
    }
    if (exceedsBudget && !ackBudgetWarning) {
      toast.error(
        "Nilai PO melampaui sisa anggaran proyek. Centang konfirmasi peringatan anggaran untuk melanjutkan.",
      );
      return;
    }
    setSaving(true);
    try {
      if (editingPo) {
        const updated = await updatePurchaseOrder(editingPo.id, {
          poDate,
          vendorId,
          projectId,
          notes,
          issueImmediately: issueNow,
          budgetWarningAcknowledged: ackBudgetWarning,
          items: formItems,
        });
        toast.success(
          t("po:toast_updated", {
            number: updated.po_number,
            defaultValue: `PO ${updated.po_number} berhasil diperbarui.`,
          }),
        );
      } else {
        const created = await createPurchaseOrder({
          poDate,
          vendorId,
          projectId,
          notes,
          issueImmediately: issueNow,
          budgetWarningAcknowledged: ackBudgetWarning,
          items: formItems,
        });
        toast.success(
          t("po:toast_created", {
            number: created.po_number,
            defaultValue: `PO ${created.po_number} berhasil disimpan.`,
          }),
        );
      }
      setDialogOpen(false);
      setEditingPo(null);
      setFormItems([{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }]);
      setNotes("");
      setAckBudgetWarning(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : editingPo
            ? "Gagal memperbarui PO."
            : "Gagal membuat PO.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSelectedPos() {
    try {
      await deletePurchaseOrders(selectedPoIds);
      toast.success(
        t("po:toast_deleted", {
          count: selectedPoIds.length,
          defaultValue: `${selectedPoIds.length} PO draf berhasil dihapus.`,
        }),
      );
      setSelectedPoIds([]);
      setDeleteConfirmOpen(false);
      setIsEditing(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus PO.");
    }
  }

  function makePoDocSpec(po: PurchaseOrderRow): PdfDocumentSpec | null {
    if (!company) return null;
    const lang = getActiveLanguage();

    const vendor = vendors.find((v) => v.id === po.vendor_id);
    const prj = projects.find((p) => p.id === po.project_id);
    const poLines = items.filter((i) => i.po_id === po.id);

    const statusTone: DocStatusVariant =
      po.status === "completed"
        ? "success"
        : po.status === "issued"
          ? "info"
          : po.status === "cancelled"
            ? "danger"
            : "neutral";

    const statusText = t(`po:status_${po.status}`).toUpperCase();

    return {
      docTitle: t("po:doc_spec.title", "PURCHASE ORDER (PO PEMBELIAN VENDOR)"),
      docSubtitle: t("po:doc_spec.subtitle", "PESANAN PENGADAAN BARANG / JASA INTERNAL"),
      docNumber: po.po_number,
      docDate: po.po_date,
      statusBadge: {
        text: statusText,
        variant: statusTone,
      },
      balanceDueBox: {
        label: t("po:doc_spec.total_order_value", "TOTAL NILAI PESANAN (PO)"),
        amountText: formatDocRupiah(po.total_amount),
        dueDateText: t("po:doc_spec.payment_terms_standard", "Syarat Pembayaran: Transfer Bank Resmi"),
      },
      company,
      recipientTitle: t("po:doc_spec.recipient_title", "Kepada Vendor / Pemasok"),
      recipientLines: [
        vendor?.name ?? t("po:doc_spec.default_vendor_name", "Vendor Mitra"),
        vendor?.address ?? "-",
        `${t("parties:vendors.col_pic", "Kontak")}: ${vendor?.contact_name ?? "-"} · Telp: ${vendor?.phone ?? "-"}`,
      ],
      metaRows: [
        {
          label: t("po:doc_spec.issue_date", "Tanggal Terbit"),
          value: formatDocDateLong(po.po_date, lang),
        },
        { label: t("po:doc_spec.po_number", "Nomor PO"), value: po.po_number },
        {
          label: t("po:doc_spec.related_project", "Proyek Terkait"),
          value: prj ? `${prj.code} - ${prj.name}` : "-",
        },
        {
          label: t("po:doc_spec.delivery_address", "Alamat Pengiriman"),
          value: company.address,
        },
        {
          label: t("po:doc_spec.receiving_contact", "Kontak Penerima"),
          value: `${company.signer_name} (${company.phone})`,
        },
        {
          label: t("po:doc_spec.additional_notes", "Catatan Tambahan"),
          value: po.notes ?? "-",
        },
      ],
      tableColumns: [
        { header: "No", widthRatio: 0.07, align: "center" },
        {
          header: t("po:doc_spec.item_desc", "Deskripsi Barang"),
          widthRatio: 0.43,
        },
        { header: "Qty", widthRatio: 0.12, align: "center" },
        {
          header: t("po:doc_spec.unit_price", "Harga Satuan"),
          widthRatio: 0.19,
          align: "right",
        },
        { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
      ],
      tableRows: poLines.map((l) => [
        String(l.line_no),
        l.description,
        `${l.quantity} ${l.unit}`,
        formatDocRupiah(l.unit_price),
        formatDocRupiah(l.line_total),
      ]),
      summaryRows: [
        {
          label: t("po:doc_spec.total_po_value", "Total Nilai PO"),
          value: formatDocRupiah(po.total_amount),
        },
      ],
      terbilangAmount: po.total_amount,
      notes: [
        t("po:doc_spec.notes_standard", "Harap cantumkan Nomor PO ini pada setiap surat jalan, tanda terima, dan tagihan/invoice vendor."),
      ],
      leftSignatureLabel: t("po:doc_spec.sig_prepared_by", "Dibuat Oleh,"),
      leftSignatureName: company.signer_name,
      leftSignatureImageUrl: resolveDocumentSigner({
        docType: "POP",
        slot: "left",
        company,
        signerUserId: po.created_by,
        signerName: company.signer_name,
        signerJobTitle: company.signer_title,
      }).signatureImageUrl,
      thirdSignatureLabel: t("po:doc_spec.sig_reviewed_by", "Diverifikasi & Disetujui,"),
      thirdSignatureName: t("po:doc_spec.sig_finance_director", "Direktur Keuangan"),
      thirdSignatureImageUrl: resolveDocumentSigner({
        docType: "POP",
        slot: "third",
        company,
        signerJobTitle: "Direktur Keuangan",
      }).signatureImageUrl,
      rightSignatureLabel: `${t("po:doc_spec.sig_vendor_accepted", "Disetujui Rekanan,")} ${vendor?.name ?? ""}`,
      rightSignatureName: vendor?.contact_name ?? t("po:doc_spec.sig_vendor_rep", "Perwakilan Vendor"),
      footerDocNumber: po.po_number,
    };
  }

  async function handleDownloadPdf(po: PurchaseOrderRow) {
    const spec = makePoDocSpec(po);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, po.po_number.replace(/\//g, "-"));
    await recordExportLog("PO_INTERNAL", "PDF");
  }

  async function handleDownloadWord(po: PurchaseOrderRow) {
    const spec = makePoDocSpec(po);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(blob, `${po.po_number.replace(/\//g, "-")}.docx`);
    await recordExportLog("PO_INTERNAL", "PDF");
    toast.success(
      t("po:doc_spec.toast_word_success", {
        number: po.po_number,
        defaultValue: `Dokumen PO ${po.po_number} (Word) berhasil diunduh.`,
      }),
    );
  }

  async function handleExportExcel() {
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.code]));
    await downloadExcelSheet({
      fileName: t("po:export.excel_filename", "Daftar-PO-Pembelian-Internal.xlsx"),
      sheetName: t("po:export.excel_sheet", "PO Pembelian"),
      columns: [
        { header: t("po:col_po_number", "Nomor PO"), width: 22 },
        { header: t("po:col_date", "Tanggal"), width: 14 },
        { header: t("po:col_vendor", "Vendor"), width: 28 },
        { header: t("po:col_project", "Kode Proyek"), width: 18 },
        { header: t("po:col_total", "Total (IDR)"), width: 18 },
        { header: t("po:col_status", "Status"), width: 16 },
      ],
      rows: filtered.map((o) => [
        o.po_number,
        formatDateID(o.po_date),
        vendorMap.get(o.vendor_id) ?? "-",
        projectMap.get(o.project_id) ?? "-",
        o.total_amount,
        t(`po:status_${o.status}`, PO_STATUS_META[o.status].label),
      ]),
    });
    await recordExportLog("PO_INTERNAL", "EXCEL");
    toast.success(
      t("po:export.toast_excel_success", "Daftar PO berhasil diekspor ke Excel (.xlsx)."),
    );
  }

  async function handleExportPdf() {
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.code]));
    const comp = company ?? (await getCompanyProfile());
    const bytes = await generateDocumentPdf({
      docTitle: t("po:export.pdf_title", "DAFTAR PURCHASE ORDER PEMBELIAN VENDOR"),
      docSubtitle: t("po:export.pdf_subtitle", "Daftar riwayat penerbitan PO pengadaan barang dan jasa vendor Altvira."),
      docNumber: `PO-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: t("po:col_po_number", "Nomor PO"), widthRatio: 0.20 },
        { header: t("po:col_date", "Tanggal"), widthRatio: 0.14 },
        { header: t("po:col_vendor", "Vendor"), widthRatio: 0.24 },
        { header: t("po:col_project", "Proyek"), widthRatio: 0.14 },
        { header: t("po:col_total", "Total (IDR)"), widthRatio: 0.16, align: "right" },
        { header: t("po:col_status", "Status"), widthRatio: 0.12 },
      ],
      tableRows: filtered.map((o) => [
        o.po_number,
        formatDateID(o.po_date),
        vendorMap.get(o.vendor_id) ?? "-",
        projectMap.get(o.project_id) ?? "-",
        formatRupiah(o.total_amount),
        t(`po:status_${o.status}`, PO_STATUS_META[o.status].label),
      ]),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(
      bytes,
      t("po:export.pdf_filename", "Daftar_Purchase_Order_Altcycles.pdf"),
    );
    await recordExportLog("PO_INTERNAL", "PDF");
  }

  async function handleExportCsv() {
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.code]));
    downloadCsvFile(
      t("po:export.csv_filename", "Daftar_Purchase_Order_Altcycles.csv"),
      [
        t("po:col_po_number", "Nomor PO"),
        t("po:col_date", "Tanggal"),
        t("po:col_vendor", "Vendor"),
        t("po:col_project", "Kode Proyek"),
        t("po:col_total", "Total (IDR)"),
        t("po:col_status", "Status"),
      ],
      filtered.map((o) => [
        o.po_number,
        o.po_date,
        vendorMap.get(o.vendor_id) ?? "-",
        projectMap.get(o.project_id) ?? "-",
        o.total_amount,
        t(`po:status_${o.status}`, PO_STATUS_META[o.status].label),
      ]),
    );
    await recordExportLog("PO_INTERNAL", "CSV");
    toast.success(
      t("po:export.toast_csv_success", "Daftar PO berhasil diekspor ke CSV (.csv)."),
    );
  }

  const filtered = orders.filter(
    (o) => statusFilter === "ALL" || o.status === statusFilter,
  );

  const sortedOrders = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOrder === "asc") {
        return (
          a.po_date.localeCompare(b.po_date) ||
          a.po_number.localeCompare(b.po_number)
        );
      }
      return (
        b.po_date.localeCompare(a.po_date) ||
        b.po_number.localeCompare(a.po_number)
      );
    });
  }, [filtered, sortOrder]);

  const draftOrders = React.useMemo(
    () => sortedOrders.filter((p) => p.status === "draft"),
    [sortedOrders],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <TruncatedTooltipText as="h1" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mode === "admin"
              ? t("po:title", "Seluruh Purchase Order Pembelian Vendor")
              : t("po:my_title", "Purchase Order Pembelian Saya")}
          </TruncatedTooltipText>
          <TruncatedTooltipText as="p" className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {mode === "admin"
              ? t("po:subtitle", "Kelola penerbitan, persetujuan status, dan dokumen purchase order vendor.")
              : t("po:my_subtitle", "Buat dan pantau pesanan pembelian pengadaan barang atau jasa proyek.")}
          </TruncatedTooltipText>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
          {mode === "admin" ? (
            <ExportDownloadMenu
              label={t("common:action.export_download", "Unduh / Ekspor")}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer gap-1.5 shadow-2xs w-full sm:w-auto"
          >
            <PlusIcon className="size-4" />
            <span>{t("po:btn_create", "Buat PO Vendor")}</span>
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t("po:card_title", "Daftar Purchase Order Vendor")}
          description={t("po:card_desc", "Pantau riwayat penerbitan PO internal dan status konfirmasi rekanan.")}
          controls={
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="w-full sm:w-44 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 rounded-xl text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ALL">{t("po:status_all", "Semua Status")}</SelectItem>
                      <SelectItem value="draft">{t("po:status_draft", "Draf")}</SelectItem>
                      <SelectItem value="issued">{t("po:status_issued", "Diterbitkan")}</SelectItem>
                      <SelectItem value="completed">{t("po:status_completed", "Selesai")}</SelectItem>
                      <SelectItem value="cancelled">{t("po:status_cancelled", "Dibatalkan")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold cursor-pointer shrink-0"
              >
                <ArrowUpDownIcon className="size-3.5" />
                <span>
                  {t("common:action.order", "Urutan")}:{" "}
                  {sortOrder === "asc"
                    ? t("common:action.oldest", "Terlama")
                    : t("common:action.newest", "Terbaru")}
                </span>
              </Button>
              <SectionEditControls
                hasItems={sortedOrders.length > 0}
                isEditing={isEditing}
                selectedCount={selectedPoIds.length}
                onStartEdit={() => setIsEditing(true)}
                onCancelEdit={() => {
                  setIsEditing(false);
                  setSelectedPoIds([]);
                }}
                onDeleteSelected={() => setDeleteConfirmOpen(true)}
              />
            </div>
          }
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {isEditing && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          draftOrders.length > 0 &&
                          selectedPoIds.length === draftOrders.length
                        }
                        indeterminate={
                          selectedPoIds.length > 0 &&
                          selectedPoIds.length < draftOrders.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPoIds(draftOrders.map((p) => p.id));
                          } else {
                            setSelectedPoIds([]);
                          }
                        }}
                        aria-label="Pilih semua PO Draf"
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                  {t("po:col_po_number", "Nomor PO")}
                </TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                  {t("po:col_date", "Tanggal PO")}
                </TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                  {t("po:col_vendor", "Vendor / Rekanan")}
                </TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                  {t("po:col_project", "Proyek")}
                </TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">
                  {t("po:col_total", "Total Nilai (IDR)")}
                </TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                  {t("po:col_status", "Status")}
                </TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">
                  {t("po:col_actions", "Aksi")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRow
                  colSpan={isEditing ? 8 : 7}
                  message={t("common:action.loading", "Memuat data...")}
                />
              ) : sortedOrders.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={isEditing ? 8 : 7} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <FileTextIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("po:empty_title", "Belum ada dokumen Purchase Order yang dibuat.")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                          {t("po:empty_desc", "Klik tombol Buat PO Vendor di kanan atas untuk membuat purchase order baru.")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((po) => {
                  const vnd = vendors.find((v) => v.id === po.vendor_id);
                  const prj = projects.find((p) => p.id === po.project_id);
                  const meta = getPoStatusMeta(po.status, t);
                  return (
                    <TableRow key={po.id}>
                      {isEditing && (
                        <TableCell className="align-top text-center px-3 py-3.5">
                          <Checkbox
                            checked={selectedPoIds.includes(po.id)}
                            disabled={po.status !== "draft"}
                            onCheckedChange={(checked) => {
                              if (checked === true) {
                                setSelectedPoIds((prev) => [...prev, po.id]);
                              } else {
                                setSelectedPoIds((prev) => prev.filter((id) => id !== po.id));
                              }
                            }}
                            aria-label={`Pilih PO ${po.po_number}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-center font-mono text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {po.po_number}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {formatDateI18n(po.po_date, language)}
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
                          {isEditing && po.status === "draft" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={t("po:action_edit_po", "Edit PO")}
                              onClick={() => handleOpenEditPo(po)}
                              className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <PencilIcon className="size-4" />
                              <span className="sr-only">{t("po:action_edit_po", "Edit PO")}</span>
                            </Button>
                          ) : null}
                          {isEditing && po.status === "draft" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={t("po:action_delete_po", "Hapus PO")}
                              onClick={() => setSingleDeleteTarget(po)}
                              className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2Icon className="size-4" />
                              <span className="sr-only">{t("po:action_delete_po", "Hapus PO")}</span>
                            </Button>
                          ) : null}
                          <DocumentDownloadMenu
                            title={t("po:action_view_pdf", "Lihat / Unduh Dokumen PO")}
                            onDownloadPdf={() => void handleDownloadPdf(po)}
                            onDownloadWord={() => void handleDownloadWord(po)}
                          />
                          {po.status === "draft" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={t("po:status_issued", "Terbitkan PO")}
                              onClick={async () => {
                                await updatePurchaseOrderStatus(po.id, "issued");
                                toast.success(t("po:toast_issued", { number: po.po_number, defaultValue: `PO ${po.po_number} diterbitkan.` }));
                                await reload();
                              }}
                              className="size-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <SendIcon className="size-4" />
                              <span className="sr-only">{t("po:status_issued", "Terbitkan PO")}</span>
                            </Button>
                          ) : null}
                          {mode === "admin" && po.status === "issued" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={t("po:action_mark_completed", "Tandai Selesai")}
                              onClick={async () => {
                                await updatePurchaseOrderStatus(po.id, "completed");
                                toast.success(t("po:toast_completed", { number: po.po_number, defaultValue: `PO ${po.po_number} ditandai selesai.` }));
                                await reload();
                              }}
                              className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              <CheckCircle2Icon className="size-4" />
                              <span className="sr-only">{t("po:action_mark_completed", "Tandai Selesai")}</span>
                            </Button>
                          ) : null}
                          {po.status === "issued" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={t("po:action_cancel_po", "Batalkan PO")}
                              onClick={() => setCancelTarget(po)}
                              className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <BanIcon className="size-4" />
                              <span className="sr-only">{t("po:action_cancel_po", "Batalkan PO")}</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PoCreateDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingPo(null);
          }
        }}
        editingPo={editingPo}
        poDate={poDate}
        setPoDate={setPoDate}
        vendorId={vendorId}
        setVendorId={setVendorId}
        projectId={projectId}
        setProjectId={setProjectId}
        vendors={vendors}
        projects={projects}
        formItems={formItems}
        setFormItems={setFormItems}
        draftTotal={draftTotal}
        exceedsBudget={exceedsBudget}
        budgetRemaining={budgetRemaining}
        ackBudgetWarning={ackBudgetWarning}
        setAckBudgetWarning={setAckBudgetWarning}
        notes={notes}
        setNotes={setNotes}
        issueNow={issueNow}
        setIssueNow={setIssueNow}
        poChecklist={poChecklist}
        saving={saving}
        onSubmit={handleSavePo}
        onCancel={() => {
          setDialogOpen(false);
          setEditingPo(null);
        }}
      />

      <ConfirmActionDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("po:modal_delete.title", "Hapus Purchase Order Draf?")}
        description={t(
          "po:modal_delete.desc",
          `Apakah Anda yakin ingin menghapus ${selectedPoIds.length} dokumen Purchase Order draf terpilih? Tindakan ini tidak dapat dibatalkan.`,
        )}
        destructive
        confirmLabel={t("common:action.delete", "Hapus")}
        onConfirm={handleDeleteSelectedPos}
      />

      <ConfirmActionDialog
        open={Boolean(singleDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setSingleDeleteTarget(null);
        }}
        title={t("po:modal_delete_single.title", {
          number: singleDeleteTarget?.po_number ?? "",
          defaultValue: `Hapus Purchase Order ${singleDeleteTarget?.po_number ?? ""}?`,
        })}
        description={t(
          "po:modal_delete_single.desc",
          "Apakah Anda yakin ingin menghapus dokumen Purchase Order draf ini? Tindakan ini tidak dapat dibatalkan.",
        )}
        destructive
        confirmLabel={t("common:action.delete", "Hapus")}
        onConfirm={async () => {
          if (!singleDeleteTarget) return;
          try {
            await deletePurchaseOrders([singleDeleteTarget.id]);
            toast.success(
              t("po:toast_deleted_single", {
                number: singleDeleteTarget.po_number,
                defaultValue: `PO draf ${singleDeleteTarget.po_number} berhasil dihapus.`,
              }),
            );
            setSingleDeleteTarget(null);
            await reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Gagal menghapus PO.");
          }
        }}
      />

      <ConfirmActionDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title={t("po:modal_cancel.title", {
          number: cancelTarget?.po_number ?? "",
          defaultValue: `Batalkan dokumen ${cancelTarget?.po_number ?? ""}?`,
        })}
        description={t(
          "po:modal_cancel.desc",
          "Pembatalan PO ini akan dicatat dalam riwayat audit trail sistem. Masukkan alasan pembatalan dokumen resmi ini.",
        )}
        destructive
        requireReason
        reasonLabel={t("po:modal_cancel.reason_label", "Alasan Pembatalan PO")}
        confirmLabel={t("po:modal_cancel.btn_confirm", "Ya, Batalkan PO")}
        onConfirm={async (reason) => {
          if (!cancelTarget) return;
          await updatePurchaseOrderStatus(cancelTarget.id, "cancelled", reason);
          toast.success(
            t("po:toast_cancelled", {
              number: cancelTarget.po_number,
              defaultValue: `PO ${cancelTarget.po_number} dibatalkan.`,
            }),
          );
          await reload();
        }}
      />
    </div>
  );
}
