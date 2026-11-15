import * as React from "react";
import {
  ArrowUpDownIcon,
  BanknoteIcon,
  ClockAlertIcon,
  ClockIcon,
  FileTextIcon,
  PlusIcon,
  ReceiptIcon,
  ReceiptTextIcon,
  WalletIcon,
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
import { Input } from "@/components/ui/input";
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
import { NumberInput } from "@/components/ui/number-input";
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
  buildInvoicePdfSpec,
  buildReceiptPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { DocumentIssueChecklistCard } from "@/components/shared/document-issue-checklist";
import { validateInvoiceChecklist } from "@/lib/document-checklist";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import type {
  AccountRow,
  CompanyProfileRow,
  CustomerRow,
  InvoiceKind,
  InvoicePaymentStatus,
  ProjectRow,
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";

const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  down_payment: "Uang Muka (DP)",
  milestone: "Termin Progres (Wajib BAKP)",
  final_settlement: "Pelunasan Akhir (Wajib BAST)",
};

export function InvoicingPage() {
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
  const [editRecord, setEditRecord] = React.useState<
    | { section: "invoices"; item: SalesInvoiceRow }
    | { section: "receipts"; item: ReceiptRow }
    | null
  >(null);
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

  function makeInvoiceSpec(inv: SalesInvoiceRow) {
    if (!company || !bundle) return null;
    const cust = customerMap.get(inv.customer_id);
    const prj = projectMap.get(inv.project_id);
    const cpo = bundle.clientPos.find((c) => c.id === inv.client_po_id);
    const ms = bundle.milestones.find((m) => m.id === inv.milestone_id);
    const bakp = bundle.bakpList.find((b) => b.id === inv.bakp_id);
    const bast = bundle.bastList.find((h) => h.id === inv.bast_id);
    const spk = bundle.documents.find(
      (d) => d.project_id === inv.project_id && d.doc_type === "SPK",
    );

    const projectMilestones = bundle.milestones.filter(
      (m) => m.project_id === inv.project_id,
    );
    const totalContractValue =
      projectMilestones.reduce((s, m) => s + m.amount, 0) ||
      prj?.contract_value ||
      cpo?.po_value ||
      inv.subtotal_amount;

    const projectInvoices = bundle.invoices.filter(
      (i) => i.project_id === inv.project_id,
    );
    const previousInvoices = projectInvoices.filter(
      (i) =>
        i.invoice_date < inv.invoice_date ||
        (i.invoice_date === inv.invoice_date &&
          i.invoice_number < inv.invoice_number),
    );
    const prevBilled = previousInvoices.reduce(
      (s, i) => s + i.subtotal_amount,
      0,
    );
    const remainingContract = Math.max(
      0,
      totalContractValue - (prevBilled + inv.subtotal_amount),
    );

    return buildInvoicePdfSpec({
      company,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      customerName: cust?.company_name ?? cust?.name ?? "Klien",
      customerPic: cust?.contact_person,
      customerTitle: cust?.contact_title,
      customerAddress: cust?.address ?? "-",
      customerLogoUrl: cust?.logo_storage_path ?? null,
      projectName: prj ? `${prj.code} - ${prj.name}` : "Proyek",
      clientPoNumber: cpo?.po_number ?? "-",
      spkNumber: spk?.doc_number ?? null,
      bakpNumber: bakp?.bakp_number ?? null,
      bastNumber: bast?.bast_number ?? null,
      servicePeriod: ms
        ? /^termin\b/i.test(ms.name.trim())
          ? ms.name.trim()
          : `Termin: ${ms.name.trim()}`
        : undefined,
      description: ms
        ? `${ms.name} — Proyek ${prj?.name ?? ""}`
        : `Penagihan Proyek ${prj?.name ?? ""}`,
      qty: 1,
      unit: "Paket",
      subtotal: inv.subtotal_amount,
      ppnAmount: inv.ppn_amount,
      totalAmount: inv.total_amount,
      contractValue: totalContractValue,
      previousBilledAmount: prevBilled,
      remainingContractAmount: remainingContract,
      includePph23Estimate: Boolean(company.pph_enabled),
      docStatus: inv.doc_status,
      paymentStatus: inv.payment_status,
      balanceDue: inv.total_amount - inv.paid_amount,
    });
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
    if (!company || !bundle) return null;
    const inv = bundle.invoices.find((i) => i.id === kw.invoice_id);
    const prj = inv ? projectMap.get(inv.project_id) : undefined;
    const cpo = inv
      ? bundle.clientPos.find((c) => c.id === inv.client_po_id)
      : undefined;
    const ms = inv
      ? bundle.milestones.find((m) => m.id === inv.milestone_id)
      : undefined;

    return buildReceiptPdfSpec({
      company,
      receiptNumber: kw.receipt_number,
      receiptDate: kw.receipt_date,
      receivedFrom: kw.received_from,
      invoiceNumber: inv?.invoice_number ?? "-",
      projectName: prj ? `${prj.code} - ${prj.name}` : "Proyek Klien",
      clientPoNumber: cpo?.po_number ?? null,
      servicePeriod: ms
        ? /^termin\b/i.test(ms.name.trim())
          ? ms.name.trim()
          : `Termin: ${ms.name.trim()}`
        : null,
      paymentMethod: "Transfer Bank Resmi Altvira",
      amount: kw.amount,
      hasMeterai: kw.amount > 5_000_000,
    });
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
        { header: "No. Invoice", widthRatio: 0.16 },
        { header: "Tanggal", widthRatio: 0.12 },
        { header: "Jatuh Tempo", widthRatio: 0.12 },
        { header: "Proyek / Klien", widthRatio: 0.24 },
        { header: "Total", widthRatio: 0.13, align: "right" },
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
            Invoice Penagihan, Umur Piutang, &amp; Kuitansi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Kelola invoice termin proyek, umur piutang, dan kuitansi resmi.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <ExportDownloadMenu
            label="Unduh / Ekspor"
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
            <span>Terbitkan Invoice</span>
          </Button>
        </div>
      </div>

      {/* Ringkasan KPI Penagihan & Piutang */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Total Nilai Invoice Diterbitkan
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalInvoiced)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {bundle?.invoices.length ?? 0} dokumen invoice terbit
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-cyan-400 border border-primary/20">
            <ReceiptTextIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Total Penerimaan Pembayaran
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalCollected)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {bundle?.receipts.length ?? 0} kuitansi pembayaran resmi
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Saldo Piutang Usaha Belum Tertagih
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(totalOutstanding)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {arAgingRows.length} tagihan menunggu pelunasan
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ClockAlertIcon className="size-5" />
          </div>
        </Card>
      </div>

      {/* Bar Navigasi Tab Penagihan & Piutang */}
      <div className="bg-card rounded-2xl p-2 flex items-center gap-1.5 shadow-2xs border border-border/80 w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {[
          {
            id: "invoices" as const,
            label: "Daftar Invoice",
            count: bundle?.invoices.length ?? 0,
            icon: FileTextIcon,
          },
          {
            id: "aging" as const,
            label: "Umur Piutang / Jatuh Tempo",
            count: arAgingRows.length,
            icon: ClockIcon,
          },
          {
            id: "receipts" as const,
            label: "Kuitansi Pembayaran",
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Terbitkan Invoice Penagihan Klien</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIssueInvoice} className="min-w-0">
            <FieldGroup className="gap-3.5">
              <Field>
                <FieldLabel required>Proyek Klien</FieldLabel>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih proyek klien" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projects.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Belum ada proyek klien aktif
                        </SelectItem>
                      ) : (
                        projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} — {p.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="inv-date" required>Tanggal Invoice</FieldLabel>
                  <DatePicker
                    id="inv-date"
                    required
                    value={invDate}
                    onChange={(v) => {
                      setInvDate(v);
                      try {
                        const d = new Date(v);
                        if (!isNaN(d.getTime())) {
                          d.setDate(d.getDate() + 14);
                          setDueDate(d.toISOString().split("T")[0]!);
                        }
                      } catch {}
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="inv-due" required>Tanggal Jatuh Tempo</FieldLabel>
                  <DatePicker
                    id="inv-due"
                    required
                    minDate={invDate}
                    value={dueDate}
                    onChange={setDueDate}
                  />
                </Field>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field>
                  <FieldLabel required>Jenis Tagihan</FieldLabel>
                  <Select
                    value={invoiceKind}
                    onValueChange={(v) => setInvoiceKind(v as InvoiceKind)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis tagihan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Object.entries(INVOICE_KIND_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Referensi PO Klien Terverifikasi</FieldLabel>
                  <Select value={clientPoId} onValueChange={setClientPoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih PO Klien" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projectVerifiedPos.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            Belum ada PO Klien terverifikasi untuk proyek ini
                          </SelectItem>
                        ) : (
                          projectVerifiedPos.map((cpo) => (
                            <SelectItem key={cpo.id} value={cpo.id}>
                              {cpo.po_number} ({formatRupiah(cpo.po_value)})
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {projectVerifiedPos.length === 0 ? (
                    <FieldDescription className="text-amber-600 dark:text-amber-400">
                      Verifikasi PO klien di menu Dokumen &amp; Termin Proyek terlebih dahulu.
                    </FieldDescription>
                  ) : null}
                </Field>
              </div>

              <div
                className={cn(
                  "grid gap-3.5",
                  invoiceKind === "milestone" || invoiceKind === "final_settlement"
                    ? "sm:grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                <Field>
                  <FieldLabel>Termin Proyek</FieldLabel>
                  <Select
                    value={milestoneId}
                    onValueChange={(id) => {
                      setMilestoneId(id);
                      const ms = projectMilestones.find((m) => m.id === id);
                      if (ms) setSubtotalAmount(ms.amount);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih termin proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Tanpa Termin Spesifik</SelectItem>
                        {projectMilestones.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}: {formatRupiah(m.amount)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                {invoiceKind === "milestone" ? (
                  <Field>
                    <FieldLabel>Dokumen BAKP Disetujui Klien</FieldLabel>
                    <Select value={bakpId} onValueChange={setBakpId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih BAKP" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">
                            {projectApprovedBakps.length === 0
                              ? "Belum ada BAKP disetujui klien"
                              : "Pilih Dokumen BAKP"}
                          </SelectItem>
                          {projectApprovedBakps.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.bakp_number} ({b.cumulative_percentage}%)
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}

                {invoiceKind === "final_settlement" ? (
                  <Field>
                    <FieldLabel>Dokumen BAST Ditandatangani</FieldLabel>
                    <Select value={bastId} onValueChange={setBastId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih BAST" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">
                            {projectSignedBasts.length === 0
                              ? "Belum ada BAST ditandatangani"
                              : "Pilih Dokumen BAST"}
                          </SelectItem>
                          {projectSignedBasts.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.bast_number} ({formatDateID(h.bast_date)})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="inv-amt" required>
                    Nominal Subtotal Tagihan (Rp Bulat)
                  </FieldLabel>
                  <NumberInput
                    id="inv-amt"
                    allowDecimal={false}
                    min={1}
                    required
                    value={subtotalAmount}
                    onValueChange={setSubtotalAmount}
                  />
                  {company?.pkp_enabled && subtotalAmount > 0 ? (
                    <FieldDescription>
                      PPN {company.ppn_rate}%:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatRupiah(
                          roundRupiah((roundRupiah(subtotalAmount) * company.ppn_rate) / 100),
                        )}
                      </span>{" "}
                      • Total:{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatRupiah(
                          roundRupiah(subtotalAmount) +
                            roundRupiah((roundRupiah(subtotalAmount) * company.ppn_rate) / 100),
                        )}
                      </span>
                    </FieldDescription>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel>Mode Pencatatan Saat Terbit</FieldLabel>
                  <Select
                    value={directCashAccountId}
                    onValueChange={setDirectCashAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          Catat ke Piutang Usaha terlebih dahulu
                        </SelectItem>
                        {cashAccounts.map((ca) => (
                          <SelectItem key={ca.id} value={ca.id}>
                            Dibayar Tunai/Transfer Langsung ke {ca.code} —{" "}
                            {ca.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Mendukung pencatatan lewat Piutang Usaha maupun kas langsung.
                  </FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="inv-notes">Catatan Invoice</FieldLabel>
                <Textarea
                  id="inv-notes"
                  rows={2}
                  className="min-h-[64px]"
                  placeholder="Opsional: keterangan penagihan, referensi kontrak, atau instruksi pembayaran..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>

              <DocumentIssueChecklistCard items={invoiceChecklist.items} />

              <DialogFooter className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={issuing || !invoiceChecklist.isValid}
                >
                  {issuing ? <Spinner data-icon="inline-start" /> : null}
                  Terbitkan Invoice &amp; Posting Jurnal
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Terima Pembayaran Invoice */}
      <Dialog
        open={Boolean(payTarget)}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Catat Penerimaan Pembayaran {payTarget?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {payTarget ? (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Total Tagihan
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatRupiah(payTarget.total_amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[11px]">
                    Sisa Belum Terbayar
                  </span>
                  <span className="font-bold text-primary dark:text-sky-400">
                    {formatRupiah(payTarget.total_amount - payTarget.paid_amount)}
                  </span>
                </div>
              </div>
            ) : null}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pay-date" required>Tanggal Dana Masuk</FieldLabel>
                <DatePicker
                  id="pay-date"
                  required
                  value={payDate}
                  onChange={setPayDate}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pay-amt" required>
                  Nominal Pembayaran Diterima (Rp)
                </FieldLabel>
                <NumberInput
                  id="pay-amt"
                  allowDecimal={false}
                  min={1}
                  max={
                    payTarget
                      ? payTarget.total_amount - payTarget.paid_amount
                      : undefined
                  }
                  required
                  value={payAmount}
                  onValueChange={setPayAmount}
                />
              </Field>
              <Field>
                <FieldLabel required>Rekening Tujuan Kas / Bank Perusahaan</FieldLabel>
                <Select
                  value={destCashAccountId}
                  onValueChange={setDestCashAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun kas/bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cashAccounts.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Belum ada akun kas/bank aktif
                        </SelectItem>
                      ) : (
                        cashAccounts.map((ca) => (
                          <SelectItem key={ca.id} value={ca.id}>
                            {ca.code} — {ca.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayTarget(null)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={paying}>
                  {paying ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Pembayaran &amp; Buat Kuitansi
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Lihat Rincian (Aksi Mode Edit) */}
      <Dialog
        open={Boolean(viewModal)}
        onOpenChange={(open) => {
          if (!open) setViewModal(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewModal?.title ?? "Rincian Data"}</DialogTitle>
          </DialogHeader>
          {viewModal ? (
            <div className="space-y-4">
              {viewModal.subtitle ? (
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {viewModal.subtitle}
                </p>
              ) : null}
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-muted/15">
                {viewModal.rows.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      {r.label}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground sm:text-right break-words">
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
              <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewModal(null)}
                  className="h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  Tutup
                </Button>
                {viewModal.onDownloadPdf && viewModal.onDownloadWord ? (
                  <DocumentDownloadMenu
                    variant="button"
                    label="Unduh / Ekspor"
                    title={`Unduh ${viewModal.title} (PDF / Word)`}
                    onDownloadPdf={viewModal.onDownloadPdf}
                    onDownloadWord={viewModal.onDownloadWord}
                  />
                ) : null}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Modal Edit Data Baris (Aksi Mode Edit) */}
      <Dialog
        open={Boolean(editRecord)}
        onOpenChange={(open) => {
          if (!open) setEditRecord(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editRecord?.section === "invoices"
                ? `Edit Invoice ${editRecord.item.invoice_number}`
                : editRecord?.section === "receipts"
                  ? `Edit Kuitansi ${editRecord.item.receipt_number}`
                  : "Edit Data"}
            </DialogTitle>
          </DialogHeader>
          {editRecord ? (
            <form onSubmit={handleSaveEditRecord}>
              <FieldGroup>
                {editRecord.section === "invoices" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Tanggal Invoice</FieldLabel>
                        <DatePicker
                          required
                          value={editRecord.item.invoice_date}
                          onChange={(v) =>
                            setEditRecord({
                              section: "invoices",
                              item: { ...editRecord.item, invoice_date: v },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Tanggal Jatuh Tempo</FieldLabel>
                        <DatePicker
                          required
                          minDate={editRecord.item.invoice_date}
                          value={editRecord.item.due_date}
                          onChange={(v) =>
                            setEditRecord({
                              section: "invoices",
                              item: { ...editRecord.item, due_date: v },
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Nominal Subtotal (Rp)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={1}
                          required
                          value={editRecord.item.subtotal_amount}
                          onValueChange={(subtotal_amount) =>
                            setEditRecord({
                              section: "invoices",
                              item: {
                                ...editRecord.item,
                                subtotal_amount,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Status Pembayaran</FieldLabel>
                        <Select
                          value={editRecord.item.payment_status}
                          onValueChange={(v) =>
                            setEditRecord({
                              section: "invoices",
                              item: {
                                ...editRecord.item,
                                payment_status: v as InvoicePaymentStatus,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                              <SelectItem value="partial">Dibayar Sebagian</SelectItem>
                              <SelectItem value="paid">Lunas</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Catatan Invoice</FieldLabel>
                      <Textarea
                        value={editRecord.item.notes ?? ""}
                        onChange={(e) =>
                          setEditRecord({
                            section: "invoices",
                            item: {
                              ...editRecord.item,
                              notes: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  </>
                )}

                {editRecord.section === "receipts" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Tanggal Terima</FieldLabel>
                        <DatePicker
                          required
                          value={editRecord.item.receipt_date}
                          onChange={(v) =>
                            setEditRecord({
                              section: "receipts",
                              item: { ...editRecord.item, receipt_date: v },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Jumlah Diterima (Rp)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={1}
                          required
                          value={editRecord.item.amount}
                          onValueChange={(amount) =>
                            setEditRecord({
                              section: "receipts",
                              item: {
                                ...editRecord.item,
                                amount,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel required>Diterima Dari</FieldLabel>
                      <Input
                        required
                        value={editRecord.item.received_from}
                        onChange={(e) =>
                          setEditRecord({
                            section: "receipts",
                            item: {
                              ...editRecord.item,
                              received_from: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  </>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditRecord(null)}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={savingEditRecord} className="cursor-pointer">
                    {savingEditRecord ? <Spinner data-icon="inline-start" /> : null}
                    Simpan Perubahan
                  </Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

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
