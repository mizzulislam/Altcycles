import * as React from "react";
import { toast } from "sonner";
import {
  getCompanyProfile,
  listAccounts,
  listCustomers,
  listProjects,
} from "@/lib/data-service";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { roundRupiah } from "@/lib/formatters";
import { buildArAging } from "@/lib/accounting-engine";
import { validateInvoiceChecklist } from "@/lib/document-checklist";
import {
  createAndIssueSalesInvoice,
  deleteReceipts,
  deleteSalesInvoices,
  getProjectWorkspace,
  type ProjectWorkspaceBundle,
  recordClientInvoicePayment,
  updateReceipt,
  updateSalesInvoice,
} from "@/lib/operations-service";
import type { ViewDetailState } from "@/features/client-projects/components/project-detail-shared";
import type {
  AccountRow,
  CompanyProfileRow,
  CustomerRow,
  InvoiceKind,
  ProjectRow,
  SalesInvoiceRow,
} from "@/types/database.types";
import type { EditableInvoiceRecord } from "./invoice-edit-dialog";

export function useInvoicingPageState() {
  const [bundle, setBundle] = React.useState<ProjectWorkspaceBundle | null>(null);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [cashAccounts, setCashAccounts] = React.useState<AccountRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [agingRefDate, setAgingRefDate] = React.useState("2026-12-31");
  const [activeTab, setActiveTab] = React.useState<"invoices" | "aging" | "receipts">("invoices");

  // Sort & Edit Mode
  const [invoiceSortField, setInvoiceSortField] = React.useState<"date" | "due_date" | "number" | "amount">("date");
  const [invoiceSortOrder, setInvoiceSortOrder] = React.useState<"asc" | "desc">("asc");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = React.useState<string>("all");
  const [receiptSortOrder, setReceiptSortOrder] = React.useState<"asc" | "desc">("asc");
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
  const [invoiceKind, setInvoiceKind] = React.useState<InvoiceKind>("down_payment");
  const [clientPoId, setClientPoId] = React.useState("");
  const [milestoneId, setMilestoneId] = React.useState("none");
  const [bakpId, setBakpId] = React.useState("none");
  const [bastId, setBastId] = React.useState("none");
  const [subtotalAmount, setSubtotalAmount] = React.useState(0);
  const [directCashAccountId, setDirectCashAccountId] = React.useState("none");
  const [notes, setNotes] = React.useState("");
  const [issuing, setIssuing] = React.useState(false);

  // Dialog Catat Pembayaran Invoice
  const [payTarget, setPayTarget] = React.useState<SalesInvoiceRow | null>(null);
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

  const filteredInvoices = React.useMemo(() => {
    const list = bundle?.invoices ?? [];
    if (invoiceStatusFilter === "all") return list;
    if (invoiceStatusFilter === "overdue") {
      const today = new Date().toISOString().slice(0, 10);
      return list.filter(
        (i) => i.payment_status !== "paid" && i.due_date < today,
      );
    }
    return list.filter((i) => i.payment_status === invoiceStatusFilter);
  }, [bundle?.invoices, invoiceStatusFilter]);

  const sortedInvoices = React.useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let cmp = 0;
      if (invoiceSortField === "due_date") {
        cmp = a.due_date.localeCompare(b.due_date);
      } else if (invoiceSortField === "number") {
        cmp = a.invoice_number.localeCompare(b.invoice_number);
      } else if (invoiceSortField === "amount") {
        cmp = a.total_amount - b.total_amount;
      } else {
        cmp = a.invoice_date.localeCompare(b.invoice_date) || a.invoice_number.localeCompare(b.invoice_number);
      }
      return invoiceSortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredInvoices, invoiceSortField, invoiceSortOrder]);

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

  const totalInvoiced = (bundle?.invoices ?? []).reduce(
    (s, i) => s + i.total_amount,
    0,
  );
  const totalCollected = (bundle?.invoices ?? []).reduce(
    (s, i) => s + i.paid_amount,
    0,
  );
  const totalOutstanding = totalInvoiced - totalCollected;

  return {
    bundle,
    projects,
    customers,
    cashAccounts,
    company,
    loading,
    agingRefDate,
    setAgingRefDate,
    activeTab,
    setActiveTab,
    invoiceSortField,
    setInvoiceSortField,
    invoiceSortOrder,
    setInvoiceSortOrder,
    invoiceStatusFilter,
    setInvoiceStatusFilter,
    receiptSortOrder,
    setReceiptSortOrder,
    isEditingInvoices,
    setIsEditingInvoices,
    selectedInvoiceIds,
    setSelectedInvoiceIds,
    isEditingReceipts,
    setIsEditingReceipts,
    selectedReceiptIds,
    setSelectedReceiptIds,
    viewModal,
    setViewModal,
    editRecord,
    setEditRecord,
    savingEditRecord,
    deleteConfirm,
    setDeleteConfirm,
    createOpen,
    setCreateOpen,
    invDate,
    setInvDate,
    dueDate,
    setDueDate,
    selectedProjectId,
    setSelectedProjectId,
    invoiceKind,
    setInvoiceKind,
    clientPoId,
    setClientPoId,
    milestoneId,
    setMilestoneId,
    bakpId,
    setBakpId,
    bastId,
    setBastId,
    subtotalAmount,
    setSubtotalAmount,
    directCashAccountId,
    setDirectCashAccountId,
    notes,
    setNotes,
    issuing,
    payTarget,
    setPayTarget,
    payDate,
    setPayDate,
    payAmount,
    setPayAmount,
    destCashAccountId,
    setDestCashAccountId,
    paying,
    reload,
    customerMap,
    projectMap,
    projectVerifiedPos,
    projectMilestones,
    projectApprovedBakps,
    projectSignedBasts,
    arAgingRows,
    invoiceChecklist,
    sortedInvoices,
    sortedReceipts,
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    handleIssueInvoice,
    handleRecordPayment,
    handleSaveEditRecord,
    executeDeleteRecords,
  };
}
