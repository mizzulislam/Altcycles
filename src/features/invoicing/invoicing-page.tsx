import * as React from "react";
import {
  ClockIcon,
  FileTextIcon,
  PlusIcon,
  ReceiptIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { Button } from "@/components/ui/button";
import type { ViewDetailState } from "@/features/client-projects/components/project-detail-shared";
import { buildArAging } from "@/lib/accounting-engine";
import {
  getCompanyProfile,
  listAccounts,
  listCustomers,
  listProjects,
} from "@/lib/data-service";
import { useRealtimeSync } from "@/lib/realtime-cache";
import { roundRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
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
import {
  exportInvoicesToCsv,
  exportInvoicesToExcel,
  exportInvoicesToPdf,
} from "./components/invoice-export-handlers";
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
import { InvoiceCreateDialog } from "./components/invoice-create-dialog";
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
import { TruncatedTooltipText } from "@/components/shared/page-header";
import { InvoicingTable } from "./components/invoicing-table";
import { InvoiceAgingTable } from "./components/invoice-aging-table";
import { InvoiceReceiptsTable } from "./components/invoice-receipts-table";

export function InvoicingPage() {
  const { t, language } = useLanguage();
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
    await exportInvoicesToExcel({
      bundle,
      company,
      projectMap,
      customerMap,
      totalInvoiced,
      totalOutstanding,
      language,
      t,
    });
  }

  async function handleExportInvoicesPdf() {
    const comp = company ?? (await getCompanyProfile());
    await exportInvoicesToPdf({
      bundle,
      company: comp,
      projectMap,
      customerMap,
      totalInvoiced,
      totalOutstanding,
      language,
      t,
    });
  }

  async function handleExportInvoicesCsv() {
    await exportInvoicesToCsv({
      bundle,
      company,
      projectMap,
      customerMap,
      totalInvoiced,
      totalOutstanding,
      language,
      t,
    });
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
        <div className="min-w-0 flex-1">
          <TruncatedTooltipText as="h1" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("invoicing.page_title", "Invoice Penagihan, Umur Piutang, & Kuitansi")}
          </TruncatedTooltipText>
          <TruncatedTooltipText as="p" className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {t("invoicing.page_desc", "Kelola invoice termin proyek, umur piutang, dan kuitansi resmi.")}
          </TruncatedTooltipText>
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
        <InvoicingTable
          sortedInvoices={sortedInvoices}
          loading={loading}
          projectMap={projectMap}
          customerMap={customerMap}
          isEditingInvoices={isEditingInvoices}
          setIsEditingInvoices={setIsEditingInvoices}
          selectedInvoiceIds={selectedInvoiceIds}
          setSelectedInvoiceIds={setSelectedInvoiceIds}
          invoiceSortOrder={invoiceSortOrder}
          setInvoiceSortOrder={setInvoiceSortOrder}
          onRecordPayment={(inv) => {
            setPayDate(inv.invoice_date);
            setPayAmount(inv.total_amount - inv.paid_amount);
            setPayTarget(inv);
          }}
          onViewDetail={(state) => setViewModal(state)}
          onEdit={(inv) =>
            setEditRecord({ section: "invoices", item: { ...inv } })
          }
          onDelete={(inv) =>
            setDeleteConfirm({
              section: "invoices",
              ids: [inv.id],
              label: inv.invoice_number,
            })
          }
          onDeleteSelected={() =>
            setDeleteConfirm({
              section: "invoices",
              ids: selectedInvoiceIds,
              label: t("invoicing:table.selected_invoices", "invoice terpilih"),
            })
          }
          onDownloadPdf={handleDownloadInvoicePdf}
          onDownloadWord={handleDownloadInvoiceWord}
        />
      )}

      {activeTab === "aging" && (
        <InvoiceAgingTable
          arAgingRows={arAgingRows}
          loading={loading}
          agingRefDate={agingRefDate}
          setAgingRefDate={setAgingRefDate}
        />
      )}

      {activeTab === "receipts" && (
        <InvoiceReceiptsTable
          sortedReceipts={sortedReceipts}
          loading={loading}
          bundle={bundle}
          isEditingReceipts={isEditingReceipts}
          setIsEditingReceipts={setIsEditingReceipts}
          selectedReceiptIds={selectedReceiptIds}
          setSelectedReceiptIds={setSelectedReceiptIds}
          receiptSortOrder={receiptSortOrder}
          setReceiptSortOrder={setReceiptSortOrder}
          onViewDetail={(state) => setViewModal(state)}
          onEdit={(kw) =>
            setEditRecord({ section: "receipts", item: { ...kw } })
          }
          onDelete={(kw) =>
            setDeleteConfirm({
              section: "receipts",
              ids: [kw.id],
              label: kw.receipt_number,
            })
          }
          onDeleteSelected={() =>
            setDeleteConfirm({
              section: "receipts",
              ids: selectedReceiptIds,
              label: t("invoicing:receipts.selected_receipts", "kuitansi terpilih"),
            })
          }
          onDownloadPdf={handleDownloadReceiptPdf}
          onDownloadWord={handleDownloadReceiptWord}
        />
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
