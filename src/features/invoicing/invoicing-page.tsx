import * as React from "react";
import {
  ArrowUpDownIcon,
  BanknoteIcon,
  ClockIcon,
  FileTextIcon,
  PlusIcon,
  ReceiptIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Spinner } from "@/components/ui/empty";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RowEditActionButtons,
  SectionEditControls,
  type ViewDetailState,
} from "@/features/client-projects/components/project-detail-shared";
import { buildArAging } from "@/lib/accounting-engine";
import {
  getCompanyProfile,
  listAccounts,
  listCustomers,
  listProjects,
} from "@/lib/data-service";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { useLanguage } from "@/lib/i18n";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateID, formatRupiah, roundRupiah } from "@/lib/formatters";
import {
  createAndIssueSalesInvoice,
  deleteReceipts,
  deleteSalesInvoices,
  getProjectWorkspace,
  type ProjectWorkspaceBundle,
  recordClientInvoicePayment,
  recordExportLog,
  updateReceipt,
  updateSalesInvoice,
} from "@/lib/operations-service";
import {
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { validateInvoiceChecklist } from "@/lib/document-checklist";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import type {
  AccountRow,
  CompanyProfileRow,
  CustomerRow,
  InvoiceKind,
  ProjectRow,
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";
import { InvoiceKpiSummary } from "./components/invoice-kpi-summary";
import {
  InvoiceCreateDialog,
  INVOICE_KIND_LABELS,
} from "./components/invoice-create-dialog";
import { InvoicePaymentDialog } from "./components/invoice-payment-dialog";
import { InvoiceViewDetailDialog } from "./components/invoice-view-detail-dialog";
import {
  InvoiceEditDialog,
  type EditableInvoiceRecord,
} from "./components/invoice-edit-dialog";
import {
  makeInvoiceSpec as buildInvoiceSpecHelper,
  makeReceiptSpec as buildReceiptSpecHelper,
  type InvoiceSpecBuilderContext,
} from "./components/invoice-spec-builder";

export function InvoicingPage() {
  const { t } = useLanguage();
  const [bundle, setBundle] = React.useState<ProjectWorkspaceBundle | null>(
    null,
  );
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [cashAccounts, setCashAccounts] = React.useState<AccountRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [agingRefDate, setAgingRefDate] = React.useState("2026-12-31");
  const [activeTab, setActiveTab] = React.useState<"invoices" | "aging" | "receipts">("invoices");

  // Sort & Edit Mode untuk Daftar Invoice Klien dan Kuitansi Bukti Pembayaran
  const [invoiceSortOrder, setInvoiceSortOrder] = React.useState<"asc" | "desc">("desc");
  const [receiptSortOrder, setReceiptSortOrder] = React.useState<"asc" | "desc">("desc");
  const [isEditingInvoices, setIsEditingInvoices] = React.useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = React.useState<string[]>([]);
  const [isEditingReceipts, setIsEditingReceipts] = React.useState(false);
  const [selectedReceiptIds, setSelectedReceiptIds] = React.useState<string[]>([]);
  const [viewModal, setViewModal] = React.useState<ViewDetailState | null>(null);
  const [editRecord, setEditRecord] = React.useState<EditableInvoiceRecord | null>(null);
  const [savingEditRecord, setSavingEditRecord] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    section: "invoices" | "receipts";
    ids: string[];
    label: string;
  } | null>(null);

  // Dialog Terbitkan Invoice Baru
  const [createOpen, setCreateOpen] = React.useState(false);
  const [invDate, setInvDate] = React.useState("2026-11-01");
  const [dueDate, setDueDate] = React.useState("2026-11-15");
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [invoiceKind, setInvoiceKind] =
    React.useState<InvoiceKind>("down_payment");
  const [clientPoId, setClientPoId] = React.useState("");
  const [milestoneId, setMilestoneId] = React.useState("none");
  const [bakpId, setBakpId] = React.useState("none");
  const [bastId, setBastId] = React.useState("none");
  const [subtotalAmount, setSubtotalAmount] = React.useState(0);
  const [directCashAccountId, setDirectCashAccountId] = React.useState("none");
  const [notes, setNotes] = React.useState("");
  const [issuing, setIssuing] = React.useState(false);

  // Dialog Catat Pembayaran Invoice Klien (menerbitkan Kuitansi otomatis)
  const [payTarget, setPayTarget] = React.useState<SalesInvoiceRow | null>(
    null,
  );
  const [payDate, setPayDate] = React.useState("2026-11-07");
  const [payAmount, setPayAmount] = React.useState(0);
  const [destCashAccountId, setDestCashAccountId] = React.useState("");
  const [paying, setPaying] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ws, prjRes, csts, accs, comp] = await Promise.all([
        getProjectWorkspace(),
        listProjects(),
        listCustomers(),
        listAccounts(),
        getCompanyProfile(),
      ]);
      setBundle(ws);
      const clientProjects = prjRes.projects.filter(
        (p) => p.project_category === "client",
      );
      setProjects(clientProjects);
      setCustomers(csts);
      const cash = accs.filter(
        (a) => a.is_active && a.is_postable && a.system_tag === "cash_bank",
      );
      setCashAccounts(cash);
      setCompany(comp);

      if (clientProjects[0]) {
        setSelectedProjectId((prev) => prev || clientProjects[0]!.id);
      }
      if (cash[0]) {
        setDestCashAccountId((prev) => prev || cash[0]!.id);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memuat data penagihan dan piutang.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeSync(reload);

  const customerMap = React.useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );
  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const projectVerifiedPos = React.useMemo(
    () =>
      (bundle?.clientPos ?? []).filter(
        (c) => c.project_id === selectedProjectId && c.status === "verified",
      ),
    [bundle, selectedProjectId],
  );
  const projectMilestones = React.useMemo(
    () =>
      (bundle?.milestones ?? []).filter(
        (m) => m.project_id === selectedProjectId,
      ),
    [bundle, selectedProjectId],
  );
  const projectApprovedBakps = React.useMemo(
    () =>
      (bundle?.bakpList ?? []).filter(
        (b) =>
          b.project_id === selectedProjectId &&
          b.status === "approved_by_client",
      ),
    [bundle, selectedProjectId],
  );
  const projectSignedBasts = React.useMemo(
    () =>
      (bundle?.bastList ?? []).filter(
        (h) => h.project_id === selectedProjectId && h.status === "signed",
      ),
    [bundle, selectedProjectId],
  );

  React.useEffect(() => {
    setClientPoId(projectVerifiedPos[0]?.id ?? "");
    setMilestoneId(projectMilestones[0]?.id ?? "none");
    setBakpId(projectApprovedBakps[0]?.id ?? "none");
    setBastId(projectSignedBasts[0]?.id ?? "none");
    if (projectMilestones[0]) {
      setSubtotalAmount(projectMilestones[0].amount);
    } else {
      setSubtotalAmount(0);
    }
  }, [
    selectedProjectId,
    projectVerifiedPos,
    projectMilestones,
    projectApprovedBakps,
    projectSignedBasts,
  ]);

  const arAgingRows = React.useMemo(() => {
    if (!bundle) return [];
    const cNameMap = new Map(customers.map((c) => [c.id, c.name]));
    const pCodeMap = new Map(projects.map((p) => [p.id, p.code]));
    return buildArAging(bundle.invoices, cNameMap, pCodeMap, agingRefDate);
  }, [bundle, customers, projects, agingRefDate]);

  const selectedProject = projectMap.get(selectedProjectId) ?? null;
  const selectedCustomer = selectedProject?.customer_id
    ? customers.find((c) => c.id === selectedProject.customer_id) ?? null
    : null;
  const selectedClientPo =
    bundle?.clientPos.find((po) => po.id === clientPoId) ?? null;
  const selectedBakp =
    bundle?.bakpList.find((b) => b.id === bakpId) ?? null;
  const selectedBast =
    bundle?.bastList.find((b) => b.id === bastId) ?? null;

  const invoiceChecklist = React.useMemo(() => {
    return validateInvoiceChecklist({
      company,
      customer: selectedCustomer,
      clientPo: selectedClientPo,
      invoiceDate: invDate,
      dueDate,
      invoiceKind,
      bakp: selectedBakp,
      bast: selectedBast,
      subtotalAmount,
    });
  }, [
    company,
    selectedCustomer,
    selectedClientPo,
    invDate,
    dueDate,
    invoiceKind,
    selectedBakp,
    selectedBast,
    subtotalAmount,
  ]);

  async function handleIssueInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceChecklist.isValid) {
      const firstInvalid = invoiceChecklist.items.find((i) => !i.passed);
      toast.error(
        firstInvalid?.message || "Checklist sebelum terbit belum terpenuhi.",
      );
      return;
    }
    const prj = projectMap.get(selectedProjectId);
    if (!prj || !prj.customer_id) {
      toast.error("Proyek belum memiliki pelanggan terkait.");
      return;
    }
    if (!invDate || !dueDate) {
      toast.error("Tanggal invoice dan tanggal jatuh tempo wajib diisi.");
      return;
    }
    if (dueDate < invDate) {
      toast.error("Tanggal jatuh tempo tidak boleh lebih awal dari tanggal invoice.");
      return;
    }
    if (!clientPoId || clientPoId === "__empty") {
      toast.error(
        "Pilih PO Klien yang telah diverifikasi Admin terlebih dahulu.",
      );
      return;
    }
    if (invoiceKind === "milestone" && (!bakpId || bakpId === "none")) {
      toast.error(
        "Pilih dokumen BAKP yang telah disetujui klien untuk tagihan termin/progres.",
      );
      return;
    }
    if (invoiceKind === "final_settlement" && (!bastId || bastId === "none")) {
      toast.error(
        "Pilih dokumen BAST yang telah ditandatangani untuk tagihan pelunasan akhir.",
      );
      return;
    }
    if (roundRupiah(subtotalAmount) <= 0) {
      toast.error("Nominal subtotal tagihan harus lebih besar dari Rp 0.");
      return;
    }
    setIssuing(true);
    try {
      await createAndIssueSalesInvoice({
        invoiceDate: invDate,
        dueDate,
        projectId: prj.id,
        customerId: prj.customer_id,
        milestoneId: milestoneId === "none" ? null : milestoneId,
        clientPoId,
        bakpId:
          invoiceKind === "milestone" && bakpId !== "none" ? bakpId : null,
        bastId:
          invoiceKind === "final_settlement" && bastId !== "none"
            ? bastId
            : null,
        invoiceKind,
        subtotalAmount: roundRupiah(subtotalAmount),
        notes,
        directCashAccountId:
          directCashAccountId === "none" ? null : directCashAccountId,
      });
      toast.success(
        "Invoice penagihan berhasil diterbitkan dan jurnal otomatis telah diposting.",
      );
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menerbitkan invoice.",
      );
    } finally {
      setIssuing(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget || !destCashAccountId) return;
    setPaying(true);
    try {
      const kw = await recordClientInvoicePayment({
        invoiceId: payTarget.id,
        paymentDate: payDate,
        amount: roundRupiah(payAmount),
        destinationAccountId: destCashAccountId,
      });
      toast.success(
        `Pembayaran diterima & Kuitansi ${kw.receipt_number} otomatis diterbitkan.`,
      );
      setPayTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal mencatat penerimaan pembayaran.",
      );
    } finally {
      setPaying(false);
    }
  }

  const specContext = React.useMemo<InvoiceSpecBuilderContext>(
    () => ({ company, bundle, customerMap, projectMap }),
    [company, bundle, customerMap, projectMap],
  );

  function makeInvoiceSpec(inv: SalesInvoiceRow) {
    return buildInvoiceSpecHelper(inv, specContext);
  }

  const sortedInvoices = React.useMemo(() => {
    const list = bundle?.invoices ?? [];
    return [...list].sort((a, b) => {
      if (invoiceSortOrder === "asc") {
        return (
          a.invoice_date.localeCompare(b.invoice_date) ||
          a.invoice_number.localeCompare(b.invoice_number)
        );
      }
      return (
        b.invoice_date.localeCompare(a.invoice_date) ||
        b.invoice_number.localeCompare(a.invoice_number)
      );
    });
  }, [bundle?.invoices, invoiceSortOrder]);

  const sortedReceipts = React.useMemo(() => {
    const list = bundle?.receipts ?? [];
    return [...list].sort((a, b) => {
      if (receiptSortOrder === "asc") {
        return (
          a.receipt_date.localeCompare(b.receipt_date) ||
          a.receipt_number.localeCompare(b.receipt_number)
        );
      }
      return (
        b.receipt_date.localeCompare(a.receipt_date) ||
        b.receipt_number.localeCompare(a.receipt_number)
      );
    });
  }, [bundle?.receipts, receiptSortOrder]);

  async function handleSaveEditRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!editRecord) return;
    setSavingEditRecord(true);
    try {
      if (editRecord.section === "invoices") {
        await updateSalesInvoice(editRecord.item.id, {
          invoiceDate: editRecord.item.invoice_date,
          dueDate: editRecord.item.due_date,
          subtotalAmount: editRecord.item.subtotal_amount,
          paymentStatus: editRecord.item.payment_status,
          notes: editRecord.item.notes ?? "",
        });
        toast.success(
          `Invoice ${editRecord.item.invoice_number} berhasil diperbarui.`,
        );
      } else {
        await updateReceipt(editRecord.item.id, {
          receiptDate: editRecord.item.receipt_date,
          receivedFrom: editRecord.item.received_from,
          amount: editRecord.item.amount,
        });
        toast.success(
          `Kuitansi ${editRecord.item.receipt_number} berhasil diperbarui.`,
        );
      }
      setEditRecord(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan perubahan data.",
      );
    } finally {
      setSavingEditRecord(false);
    }
  }

  async function executeDeleteRecords() {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.section === "invoices") {
        await deleteSalesInvoices(deleteConfirm.ids);
        setSelectedInvoiceIds((prev) =>
          prev.filter((id) => !deleteConfirm.ids.includes(id)),
        );
        setIsEditingInvoices(false);
      } else {
        await deleteReceipts(deleteConfirm.ids);
        setSelectedReceiptIds((prev) =>
          prev.filter((id) => !deleteConfirm.ids.includes(id)),
        );
        setIsEditingReceipts(false);
      }
      toast.success("Data berhasil dihapus.");
      setDeleteConfirm(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus data.",
      );
    }
  }

  async function handleDownloadInvoicePdf(inv: SalesInvoiceRow) {
    const spec = makeInvoiceSpec(inv);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${inv.invoice_number.replace(/\//g, "_")}.pdf`);
    await recordExportLog("SALES_INVOICE", "PDF");
  }

  async function handleDownloadInvoiceWord(inv: SalesInvoiceRow) {
    const spec = makeInvoiceSpec(inv);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(blob, `${inv.invoice_number.replace(/\//g, "_")}.docx`);
    await recordExportLog("SALES_INVOICE", "PDF");
  }

  function makeReceiptSpec(kw: ReceiptRow) {
    return buildReceiptSpecHelper(kw, specContext);
  }

  async function handleDownloadReceiptPdf(kw: ReceiptRow) {
    const spec = makeReceiptSpec(kw);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${kw.receipt_number.replace(/\//g, "_")}.pdf`);
    await recordExportLog("RECEIPT_KUITANSI", "PDF");
  }

  async function handleDownloadReceiptWord(kw: ReceiptRow) {
    const spec = makeReceiptSpec(kw);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(blob, `${kw.receipt_number.replace(/\//g, "_")}.docx`);
    await recordExportLog("RECEIPT_KUITANSI", "PDF");
  }

  async function handleExportInvoicesExcel() {
    if (!bundle) return;
    await downloadExcelSheet({
      fileName: "Daftar_Invoice_dan_Piutang_Altcycles.xlsx",
      sheetName: "Invoice Penjualan",
      columns: [
        { header: "No. Invoice", width: 22 },
        { header: "Tanggal", width: 14 },
        { header: "Jatuh Tempo", width: 14 },
        { header: "Proyek", width: 22 },
        { header: "Pelanggan", width: 26 },
        { header: "Total Tagihan", width: 18 },
        { header: "Terbayar", width: 18 },
        { header: "Sisa Piutang", width: 18 },
        { header: "Status Bayar", width: 16 },
      ],
      rows: bundle.invoices.map((inv) => [
        inv.invoice_number,
        formatDateID(inv.invoice_date),
        formatDateID(inv.due_date),
        projectMap.get(inv.project_id)?.code ?? "-",
        customerMap.get(inv.customer_id)?.name ?? "Klien",
        inv.total_amount,
        inv.paid_amount,
        inv.total_amount - inv.paid_amount,
        inv.payment_status,
      ]),
    });
    await recordExportLog("SALES_INVOICES", "EXCEL");
    toast.success("Daftar invoice & piutang berhasil diekspor ke Excel (.xlsx).");
  }

  async function handleExportInvoicesPdf() {
    if (!bundle) return;
    const comp = company ?? (await getCompanyProfile());
    const bytes = await generateDocumentPdf({
      docTitle: "DAFTAR INVOICE PENAGIHAN & PIUTANG",
      docSubtitle: `Total Nilai Invoice: ${formatRupiah(totalInvoiced)} | Sisa Piutang: ${formatRupiah(totalOutstanding)}`,
      docNumber: `INV-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: "No. Invoice", widthRatio: 0.15 },
        { header: "Tanggal", widthRatio: 0.11 },
        { header: "Jatuh Tempo", widthRatio: 0.14 },
        { header: "Proyek / Klien", widthRatio: 0.23 },
        { header: "Total", widthRatio: 0.14, align: "right" },
        { header: "Sisa", widthRatio: 0.13, align: "right" },
        { header: "Status", widthRatio: 0.10 },
      ],
      tableRows: bundle.invoices.map((inv) => [
        inv.invoice_number,
        formatDateID(inv.invoice_date),
        formatDateID(inv.due_date),
        `${projectMap.get(inv.project_id)?.code ?? "-"} - ${customerMap.get(inv.customer_id)?.name ?? "Klien"}`,
        formatRupiah(inv.total_amount),
        formatRupiah(inv.total_amount - inv.paid_amount),
        inv.payment_status === "paid"
          ? "Lunas"
          : inv.payment_status === "partial"
            ? "Sebagian"
            : "Belum Lunas",
      ]),
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(bytes, "Daftar_Invoice_dan_Piutang_Altcycles.pdf");
    await recordExportLog("SALES_INVOICES", "PDF");
  }

  async function handleExportInvoicesCsv() {
    if (!bundle) return;
    downloadCsvFile(
      "Daftar_Invoice_dan_Piutang_Altcycles.csv",
      [
        "No. Invoice",
        "Tanggal",
        "Jatuh Tempo",
        "Proyek",
        "Pelanggan",
        "Total Tagihan",
        "Terbayar",
        "Sisa Piutang",
        "Status Bayar",
      ],
      bundle.invoices.map((inv) => [
        inv.invoice_number,
        inv.invoice_date,
        inv.due_date,
        projectMap.get(inv.project_id)?.code ?? "-",
        customerMap.get(inv.customer_id)?.name ?? "Klien",
        inv.total_amount,
        inv.paid_amount,
        inv.total_amount - inv.paid_amount,
        inv.payment_status,
      ]),
    );
    await recordExportLog("SALES_INVOICES", "CSV");
    toast.success("Daftar invoice & piutang berhasil diekspor ke CSV (.csv).");
  }

  const totalInvoiced = (bundle?.invoices ?? []).reduce(
    (s, i) => s + i.total_amount,
    0,
  );
  const totalCollected = (bundle?.invoices ?? []).reduce(
    (s, i) => s + i.paid_amount,
    0,
  );
  const totalOutstanding = totalInvoiced - totalCollected;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("invoicing.page_title", "Invoice Penagihan, Umur Piutang, & Kuitansi")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {t("invoicing.page_desc", "Kelola invoice termin proyek, umur piutang, dan kuitansi resmi.")}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <ExportDownloadMenu
            label={t("action.export_download", "Unduh / Ekspor")}
            onExportExcel={handleExportInvoicesExcel}
            onExportPdf={handleExportInvoicesPdf}
            onExportCsv={handleExportInvoicesCsv}
          />
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="shrink-0"
          >
            <PlusIcon className="size-4" />
            <span>{t("invoicing.issue_invoice", "Terbitkan Invoice")}</span>
          </Button>
        </div>
      </div>

      {/* Ringkasan KPI Penagihan & Piutang */}
      <InvoiceKpiSummary
        totalInvoiced={totalInvoiced}
        totalCollected={totalCollected}
        totalOutstanding={totalOutstanding}
        invoiceCount={bundle?.invoices.length ?? 0}
        receiptCount={bundle?.receipts.length ?? 0}
        arPendingCount={arAgingRows.length}
      />

      {/* Bar Navigasi Tab Penagihan & Piutang */}
      <div className="bg-card rounded-2xl p-2 flex items-center gap-1.5 shadow-2xs border border-border/80 w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {[
          {
            id: "invoices" as const,
            label: t("invoicing.tab_invoices", "Daftar Invoice"),
            count: bundle?.invoices.length ?? 0,
            icon: FileTextIcon,
          },
          {
            id: "aging" as const,
            label: t("invoicing.tab_aging", "Umur Piutang / Jatuh Tempo"),
            count: arAgingRows.length,
            icon: ClockIcon,
          },
          {
            id: "receipts" as const,
            label: t("invoicing.tab_receipts", "Kuitansi Pembayaran"),
            count: bundle?.receipts.length ?? 0,
            icon: ReceiptIcon,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground",
                )}
              />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-none",
                  isActive
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "invoices" && (
        <Card className="overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold">
                Daftar Invoice Klien
              </CardTitle>
              <CardDescription>
                Klik ikon catat pembayaran saat dana masuk ke rekening perusahaan untuk menerbitkan Kuitansi otomatis.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setInvoiceSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                className="h-9 gap-1.5 rounded-xl text-xs font-medium cursor-pointer shrink-0"
              >
                <ArrowUpDownIcon className="size-3.5" />
                <span>Urutan: {invoiceSortOrder === "asc" ? "Terlama" : "Terbaru"}</span>
              </Button>
              <SectionEditControls
                hasItems={sortedInvoices.length > 0}
                isEditing={isEditingInvoices}
                selectedCount={selectedInvoiceIds.length}
                onStartEdit={() => setIsEditingInvoices(true)}
                onCancelEdit={() => {
                  setIsEditingInvoices(false);
                  setSelectedInvoiceIds([]);
                }}
                onDeleteSelected={() =>
                  setDeleteConfirm({
                    section: "invoices",
                    ids: selectedInvoiceIds,
                    label: "invoice terpilih",
                  })
                }
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Spinner />
                <span>Memuat daftar invoice...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    {isEditingInvoices && (
                      <TableHead className="w-12 text-center align-middle px-3">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={
                              sortedInvoices.length > 0 &&
                              selectedInvoiceIds.length === sortedInvoices.length
                            }
                            indeterminate={
                              selectedInvoiceIds.length > 0 &&
                              selectedInvoiceIds.length < sortedInvoices.length
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedInvoiceIds(sortedInvoices.map((i) => i.id));
                              } else {
                                setSelectedInvoiceIds([]);
                              }
                            }}
                            aria-label="Pilih semua invoice"
                          />
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">No. Invoice</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Tanggal &amp; Jatuh Tempo</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Proyek &amp; Klien</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Total Tagihan</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Terbayar</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7 + (isEditingInvoices ? 1 : 0)} className="p-0">
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                            <FileTextIcon className="size-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">
                            Belum Ada Invoice Diterbitkan
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                            Pastikan PO Klien telah diverifikasi sebelum menerbitkan invoice.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedInvoices.map((inv) => {
                      const prj = projectMap.get(inv.project_id);
                      const cust = customerMap.get(inv.customer_id);
                      const remaining = inv.total_amount - inv.paid_amount;
                      const isChecked = selectedInvoiceIds.includes(inv.id);
                      const statusLabel =
                        inv.payment_status === "paid"
                          ? "Lunas"
                          : inv.payment_status === "partial"
                            ? "Dibayar Sebagian"
                            : "Belum Dibayar";

                      return (
                        <TableRow key={inv.id}>
                          {isEditingInvoices && (
                            <TableCell className="align-top text-center px-3 py-3.5">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  setSelectedInvoiceIds((prev) =>
                                    checked
                                      ? [...prev, inv.id]
                                      : prev.filter((id) => id !== inv.id),
                                  );
                                }}
                                className="mt-0.5"
                                aria-label={`Pilih ${inv.invoice_number}`}
                              />
                            </TableCell>
                          )}
                          <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                            {inv.invoice_number}
                          </TableCell>
                          <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
                            <div className="text-foreground">Terbit: {formatDateID(inv.invoice_date)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Tempo: {formatDateID(inv.due_date)}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5">
                            <div className="font-medium text-foreground">
                              {prj ? `${prj.code} — ${prj.name}` : "-"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {cust?.name ?? "Klien"}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-3.5 whitespace-nowrap">
                            <MonetaryCell amount={inv.total_amount} />
                          </TableCell>
                          <TableCell className="px-3 py-3.5 whitespace-nowrap">
                            <MonetaryCell amount={inv.paid_amount} className="font-normal" />
                          </TableCell>
                          <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center min-h-5 -my-px">
                              <StatusBadge
                                tone={
                                  inv.payment_status === "paid"
                                    ? "success"
                                    : inv.payment_status === "partial"
                                      ? "warning"
                                      : "info"
                                }
                                label={statusLabel}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                            {isEditingInvoices ? (
                              <RowEditActionButtons
                                onView={() =>
                                  setViewModal({
                                    title: `Rincian ${inv.invoice_number}`,
                                    subtitle: prj ? `${prj.code} — ${prj.name}` : cust?.name ?? "Klien",
                                    rows: [
                                      { label: "Nomor Invoice", value: inv.invoice_number },
                                      { label: "Tanggal Terbit", value: formatDateID(inv.invoice_date) },
                                      { label: "Tanggal Jatuh Tempo", value: formatDateID(inv.due_date) },
                                      { label: "Klien", value: cust?.company_name ?? cust?.name ?? "-" },
                                      { label: "Jenis Tagihan", value: INVOICE_KIND_LABELS[inv.invoice_kind] ?? inv.invoice_kind },
                                      { label: "Subtotal", value: formatRupiah(inv.subtotal_amount) },
                                      { label: "PPN", value: formatRupiah(inv.ppn_amount) },
                                      { label: "Total Tagihan", value: formatRupiah(inv.total_amount) },
                                      { label: "Telah Dibayar", value: formatRupiah(inv.paid_amount) },
                                      { label: "Status Pembayaran", value: statusLabel },
                                      { label: "Catatan", value: inv.notes ?? "-" },
                                    ],
                                    onDownloadPdf: () => void handleDownloadInvoicePdf(inv),
                                    onDownloadWord: () => void handleDownloadInvoiceWord(inv),
                                  })
                                }
                                onEdit={() =>
                                  setEditRecord({ section: "invoices", item: { ...inv } })
                                }
                                onDelete={() =>
                                  setDeleteConfirm({
                                    section: "invoices",
                                    ids: [inv.id],
                                    label: inv.invoice_number,
                                  })
                                }
                              />
                            ) : (
                              <div className="flex justify-center items-center gap-1 -my-1.5">
                                {remaining > 0 ? (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    title="Terima Pembayaran Invoice"
                                    onClick={() => {
                                      setPayDate(inv.invoice_date);
                                      setPayAmount(remaining);
                                      setPayTarget(inv);
                                    }}
                                    className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                  >
                                    <BanknoteIcon className="size-4" />
                                    <span className="sr-only">Terima Pembayaran Invoice</span>
                                  </Button>
                                ) : null}
                                <DocumentDownloadMenu
                                  title="Unduh Invoice (PDF / Word)"
                                  onDownloadPdf={() => handleDownloadInvoicePdf(inv)}
                                  onDownloadWord={() => handleDownloadInvoiceWord(inv)}
                                />
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "aging" && (
        <Card className="overflow-visible">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold">
                Pemantauan Umur Piutang &amp; Tagihan Jatuh Tempo
              </CardTitle>
              <CardDescription>
                Mengelompokkan sisa piutang berdasarkan keterlambatan hari terhadap tanggal acuan.
              </CardDescription>
            </div>
            <div className="w-full sm:w-60 shrink-0 space-y-1">
              <div className="h-6 flex items-center">
                <span className="text-xs font-semibold text-foreground">
                  Tanggal Acuan Perhitungan
                </span>
              </div>
              <DatePicker
                value={agingRefDate}
                onChange={setAgingRefDate}
                className="w-full [&_[data-slot=input]]:h-8 [&_[data-inner-input=true]]:text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">No. Invoice</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Pelanggan &amp; Proyek</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Jatuh Tempo</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Sisa Tagihan</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Keterlambatan</TableHead>
                  <TableHead className="pl-3 pr-6 text-center font-semibold whitespace-nowrap">Kelompok Umur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arAgingRows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <ClockIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Tidak Ada Piutang Tertunggak
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          Seluruh invoice yang telah diterbitkan sudah lunas.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  arAgingRows.map((row) => (
                    <TableRow key={row.invoiceId}>
                      <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                        {row.invoiceNumber}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5">
                        <div className="font-medium text-foreground">{row.customerName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {row.projectCode}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
                        {formatDateID(row.dueDate)}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={row.outstandingAmount} />
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
                        {row.daysOverdue} Hari
                      </TableCell>
                      <TableCell className="pl-3 pr-6 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={
                              row.daysOverdue > 30
                                ? "destructive"
                                : row.daysOverdue >= 1
                                  ? "warning"
                                  : "success"
                            }
                            label={row.agingBucket}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "receipts" && (
        <Card className="overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold">
                Kuitansi Bukti Pembayaran (Lampiran A.6)
              </CardTitle>
              <CardDescription>
                Diterbitkan otomatis setiap kali pembayaran invoice klien dicatat.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setReceiptSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                className="h-9 gap-1.5 rounded-xl text-xs font-medium cursor-pointer shrink-0"
              >
                <ArrowUpDownIcon className="size-3.5" />
                <span>Urutan: {receiptSortOrder === "asc" ? "Terlama" : "Terbaru"}</span>
              </Button>
              <SectionEditControls
                hasItems={sortedReceipts.length > 0}
                isEditing={isEditingReceipts}
                selectedCount={selectedReceiptIds.length}
                onStartEdit={() => setIsEditingReceipts(true)}
                onCancelEdit={() => {
                  setIsEditingReceipts(false);
                  setSelectedReceiptIds([]);
                }}
                onDeleteSelected={() =>
                  setDeleteConfirm({
                    section: "receipts",
                    ids: selectedReceiptIds,
                    label: "kuitansi terpilih",
                  })
                }
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  {isEditingReceipts && (
                    <TableHead className="w-12 text-center align-middle px-3">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={
                            sortedReceipts.length > 0 &&
                            selectedReceiptIds.length === sortedReceipts.length
                          }
                          indeterminate={
                            selectedReceiptIds.length > 0 &&
                            selectedReceiptIds.length < sortedReceipts.length
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedReceiptIds(sortedReceipts.map((r) => r.id));
                            } else {
                              setSelectedReceiptIds([]);
                            }
                          }}
                          aria-label="Pilih semua kuitansi"
                        />
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Nomor Kuitansi</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Tanggal Terima</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Diterima Dari</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Jumlah</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedReceipts.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5 + (isEditingReceipts ? 1 : 0)} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <ReceiptIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Belum Ada Kuitansi
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          Kuitansi diterbitkan otomatis saat pembayaran invoice dicatat.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedReceipts.map((kw) => {
                    const isChecked = selectedReceiptIds.includes(kw.id);
                    const linkedInv = bundle?.invoices.find((i) => i.id === kw.invoice_id);
                    return (
                      <TableRow key={kw.id}>
                        {isEditingReceipts && (
                          <TableCell className="align-top text-center px-3 py-3.5">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setSelectedReceiptIds((prev) =>
                                  checked
                                    ? [...prev, kw.id]
                                    : prev.filter((id) => id !== kw.id),
                                );
                              }}
                              className="mt-0.5"
                              aria-label={`Pilih ${kw.receipt_number}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold text-foreground whitespace-nowrap">
                          {kw.receipt_number}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-center whitespace-nowrap">
                          {formatDateID(kw.receipt_date)}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 font-medium text-xs sm:text-sm leading-5 text-foreground">
                          {kw.received_from}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 whitespace-nowrap">
                          <MonetaryCell amount={kw.amount} />
                        </TableCell>
                        <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                          {isEditingReceipts ? (
                            <RowEditActionButtons
                              onView={() =>
                                setViewModal({
                                  title: `Rincian ${kw.receipt_number}`,
                                  subtitle: kw.received_from,
                                  rows: [
                                    { label: "Nomor Kuitansi", value: kw.receipt_number },
                                    { label: "Tanggal Terima", value: formatDateID(kw.receipt_date) },
                                    { label: "Diterima Dari", value: kw.received_from },
                                    { label: "Referensi Invoice", value: linkedInv?.invoice_number ?? "-" },
                                    { label: "Jumlah Diterima", value: formatRupiah(kw.amount) },
                                  ],
                                  onDownloadPdf: () => void handleDownloadReceiptPdf(kw),
                                  onDownloadWord: () => void handleDownloadReceiptWord(kw),
                                })
                              }
                              onEdit={() =>
                                setEditRecord({ section: "receipts", item: { ...kw } })
                              }
                              onDelete={() =>
                                setDeleteConfirm({
                                  section: "receipts",
                                  ids: [kw.id],
                                  label: kw.receipt_number,
                                })
                              }
                            />
                          ) : (
                            <div className="flex justify-center items-center -my-1.5">
                              <DocumentDownloadMenu
                                title="Unduh Kuitansi (PDF / Word)"
                                onDownloadPdf={() => handleDownloadReceiptPdf(kw)}
                                onDownloadWord={() => handleDownloadReceiptWord(kw)}
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  }))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Terbitkan Invoice */}
      <InvoiceCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        invDate={invDate}
        setInvDate={setInvDate}
        dueDate={dueDate}
        setDueDate={setDueDate}
        invoiceKind={invoiceKind}
        setInvoiceKind={setInvoiceKind}
        clientPoId={clientPoId}
        setClientPoId={setClientPoId}
        projectVerifiedPos={projectVerifiedPos}
        milestoneId={milestoneId}
        setMilestoneId={setMilestoneId}
        projectMilestones={projectMilestones}
        bakpId={bakpId}
        setBakpId={setBakpId}
        projectApprovedBakps={projectApprovedBakps}
        bastId={bastId}
        setBastId={setBastId}
        projectSignedBasts={projectSignedBasts}
        subtotalAmount={subtotalAmount}
        setSubtotalAmount={setSubtotalAmount}
        company={company}
        directCashAccountId={directCashAccountId}
        setDirectCashAccountId={setDirectCashAccountId}
        cashAccounts={cashAccounts}
        notes={notes}
        setNotes={setNotes}
        invoiceChecklist={invoiceChecklist}
        issuing={issuing}
        onSubmit={handleIssueInvoice}
      />

      {/* Dialog Terima Pembayaran Invoice */}
      <InvoicePaymentDialog
        payTarget={payTarget}
        onClose={() => setPayTarget(null)}
        payDate={payDate}
        setPayDate={setPayDate}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        destCashAccountId={destCashAccountId}
        setDestCashAccountId={setDestCashAccountId}
        cashAccounts={cashAccounts}
        paying={paying}
        onSubmit={handleRecordPayment}
      />

      {/* Modal Lihat Rincian Data */}
      <InvoiceViewDetailDialog
        viewModal={viewModal}
        onClose={() => setViewModal(null)}
      />

      {/* Modal Edit Data Baris */}
      <InvoiceEditDialog
        editRecord={editRecord}
        setEditRecord={setEditRecord}
        savingEditRecord={savingEditRecord}
        onSubmit={handleSaveEditRecord}
      />

      {/* Konfirmasi Hapus Data / Hapus Pilihan (Aksi Mode Edit) */}
      <ConfirmActionDialog
        open={Boolean(deleteConfirm)}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title={
          deleteConfirm && deleteConfirm.ids.length > 1
            ? `Hapus ${deleteConfirm.ids.length} ${deleteConfirm.label}?`
            : `Hapus ${deleteConfirm?.label ?? "data ini"}?`
        }
        description={
          deleteConfirm?.section === "invoices" &&
          bundle?.receipts.some((r) => deleteConfirm.ids.includes(r.invoice_id))
            ? "Data yang dihapus tidak dapat dikembalikan. Dokumen Kuitansi yang terhubung dengan invoice terpilih juga akan ikut dihapus."
            : "Data yang dihapus tidak dapat dikembalikan."
        }
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={executeDeleteRecords}
      />
    </div>
  );
}
