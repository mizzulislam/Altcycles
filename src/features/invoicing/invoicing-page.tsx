import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { getCompanyProfile } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import {
  exportInvoicesToCsv,
  exportInvoicesToExcel,
  exportInvoicesToPdf,
} from "./components/invoice-export-handlers";
import { InvoiceKpiSummary } from "./components/invoice-kpi-summary";
import type { InvoiceSpecBuilderContext } from "./components/invoice-spec-builder";
import { InvoiceTabNavigation } from "./components/invoice-tab-navigation";
import { InvoiceTabsContent } from "./components/invoice-tabs-content";
import { InvoiceActionDialogs } from "./components/invoice-action-dialogs";
import {
  handleDownloadInvoicePdf,
  handleDownloadInvoiceWord,
  handleDownloadReceiptPdf,
  handleDownloadReceiptWord,
} from "./components/invoice-document-handlers";
import { useInvoicingPageState } from "./components/use-invoicing-page-state";

export function InvoicingPage() {
  const { t, language } = useLanguage();
  const state = useInvoicingPageState();

  const specContext = React.useMemo<InvoiceSpecBuilderContext>(
    () => ({
      company: state.company,
      bundle: state.bundle,
      customerMap: state.customerMap,
      projectMap: state.projectMap,
    }),
    [state.company, state.bundle, state.customerMap, state.projectMap],
  );

  async function handleExportInvoicesExcel() {
    await exportInvoicesToExcel({
      bundle: state.bundle,
      company: state.company,
      projectMap: state.projectMap,
      customerMap: state.customerMap,
      totalInvoiced: state.totalInvoiced,
      totalOutstanding: state.totalOutstanding,
      language,
      t,
    });
  }

  async function handleExportInvoicesPdf() {
    const comp = state.company ?? (await getCompanyProfile());
    await exportInvoicesToPdf({
      bundle: state.bundle,
      company: comp,
      projectMap: state.projectMap,
      customerMap: state.customerMap,
      totalInvoiced: state.totalInvoiced,
      totalOutstanding: state.totalOutstanding,
      language,
      t,
    });
  }

  async function handleExportInvoicesCsv() {
    await exportInvoicesToCsv({
      bundle: state.bundle,
      company: state.company,
      projectMap: state.projectMap,
      customerMap: state.customerMap,
      totalInvoiced: state.totalInvoiced,
      totalOutstanding: state.totalOutstanding,
      language,
      t,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("invoicing.page_title", "Invoice Penagihan, Umur Piutang, & Kuitansi")}
        description={t(
          "invoicing.page_desc",
          "Kelola invoice termin proyek, umur piutang, dan kuitansi resmi.",
        )}
      />

      {/* Ringkasan KPI Penagihan & Piutang */}
      <InvoiceKpiSummary
        totalInvoiced={state.totalInvoiced}
        totalCollected={state.totalCollected}
        totalOutstanding={state.totalOutstanding}
        invoiceCount={state.bundle?.invoices.length ?? 0}
        receiptCount={state.bundle?.receipts.length ?? 0}
        arPendingCount={state.arAgingRows.length}
      />

      {/* Bar Navigasi Tab Penagihan & Piutang */}
      <InvoiceTabNavigation
        activeTab={state.activeTab}
        onTabChange={state.setActiveTab}
        invoiceCount={state.bundle?.invoices.length ?? 0}
        agingCount={state.arAgingRows.length}
        receiptCount={state.bundle?.receipts.length ?? 0}
        t={t}
      />

      {/* Konten Tab Aktif (Invoice, Umur Piutang, Kuitansi) */}
      <InvoiceTabsContent
        activeTab={state.activeTab}
        sortedInvoices={state.sortedInvoices}
        sortedReceipts={state.sortedReceipts}
        arAgingRows={state.arAgingRows}
        loading={state.loading}
        projectMap={state.projectMap}
        customerMap={state.customerMap}
        bundle={state.bundle}
        agingRefDate={state.agingRefDate}
        setAgingRefDate={state.setAgingRefDate}
        invoiceStatusFilter={state.invoiceStatusFilter}
        setInvoiceStatusFilter={state.setInvoiceStatusFilter}
        isEditingInvoices={state.isEditingInvoices}
        setIsEditingInvoices={state.setIsEditingInvoices}
        selectedInvoiceIds={state.selectedInvoiceIds}
        setSelectedInvoiceIds={state.setSelectedInvoiceIds}
        invoiceSortField={state.invoiceSortField}
        setInvoiceSortField={state.setInvoiceSortField}
        invoiceSortOrder={state.invoiceSortOrder}
        setInvoiceSortOrder={state.setInvoiceSortOrder}
        isEditingReceipts={state.isEditingReceipts}
        setIsEditingReceipts={state.setIsEditingReceipts}
        selectedReceiptIds={state.selectedReceiptIds}
        setSelectedReceiptIds={state.setSelectedReceiptIds}
        receiptSortOrder={state.receiptSortOrder}
        setReceiptSortOrder={state.setReceiptSortOrder}
        onRecordPayment={(inv) => {
          state.setPayDate(inv.invoice_date);
          state.setPayAmount(inv.total_amount - inv.paid_amount);
          state.setPayTarget(inv);
        }}
        onViewDetail={(item) => state.setViewModal(item)}
        onEditInvoice={(inv) =>
          state.setEditRecord({ section: "invoices", item: { ...inv } })
        }
        onDeleteInvoice={(inv) =>
          state.setDeleteConfirm({
            section: "invoices",
            ids: [inv.id],
            label: inv.invoice_number,
          })
        }
        onDeleteSelectedInvoices={() =>
          state.setDeleteConfirm({
            section: "invoices",
            ids: state.selectedInvoiceIds,
            label: t("invoicing:table.selected_invoices", "invoice terpilih"),
          })
        }
        onDownloadInvoicePdf={(inv) => void handleDownloadInvoicePdf(inv, specContext)}
        onDownloadInvoiceWord={(inv) => void handleDownloadInvoiceWord(inv, specContext)}
        onCreateInvoice={() => state.setCreateOpen(true)}
        onExportExcel={handleExportInvoicesExcel}
        onExportPdf={handleExportInvoicesPdf}
        onExportCsv={handleExportInvoicesCsv}
        onEditReceipt={(kw) =>
          state.setEditRecord({ section: "receipts", item: { ...kw } })
        }
        onDeleteReceipt={(kw) =>
          state.setDeleteConfirm({
            section: "receipts",
            ids: [kw.id],
            label: kw.receipt_number,
          })
        }
        onDeleteSelectedReceipts={() =>
          state.setDeleteConfirm({
            section: "receipts",
            ids: state.selectedReceiptIds,
            label: t("invoicing:receipts.selected_receipts", "kuitansi terpilih"),
          })
        }
        onDownloadReceiptPdf={(kw) => void handleDownloadReceiptPdf(kw, specContext)}
        onDownloadReceiptWord={(kw) => void handleDownloadReceiptWord(kw, specContext)}
      />

      {/* Seluruh Modal Dialog (Create, Payment, View, Edit, Confirm Delete) */}
      <InvoiceActionDialogs
        createOpen={state.createOpen}
        setCreateOpen={state.setCreateOpen}
        projects={state.projects}
        selectedProjectId={state.selectedProjectId}
        setSelectedProjectId={state.setSelectedProjectId}
        invDate={state.invDate}
        setInvDate={state.setInvDate}
        dueDate={state.dueDate}
        setDueDate={state.setDueDate}
        invoiceKind={state.invoiceKind}
        setInvoiceKind={state.setInvoiceKind}
        clientPoId={state.clientPoId}
        setClientPoId={state.setClientPoId}
        projectVerifiedPos={state.projectVerifiedPos}
        milestoneId={state.milestoneId}
        setMilestoneId={state.setMilestoneId}
        projectMilestones={state.projectMilestones}
        bakpId={state.bakpId}
        setBakpId={state.setBakpId}
        projectApprovedBakps={state.projectApprovedBakps}
        bastId={state.bastId}
        setBastId={state.setBastId}
        projectSignedBasts={state.projectSignedBasts}
        subtotalAmount={state.subtotalAmount}
        setSubtotalAmount={state.setSubtotalAmount}
        company={state.company}
        directCashAccountId={state.directCashAccountId}
        setDirectCashAccountId={state.setDirectCashAccountId}
        cashAccounts={state.cashAccounts}
        notes={state.notes}
        setNotes={state.setNotes}
        invoiceChecklist={state.invoiceChecklist}
        issuing={state.issuing}
        onIssueInvoice={state.handleIssueInvoice}
        payTarget={state.payTarget}
        setPayTarget={state.setPayTarget}
        payDate={state.payDate}
        setPayDate={state.setPayDate}
        payAmount={state.payAmount}
        setPayAmount={state.setPayAmount}
        destCashAccountId={state.destCashAccountId}
        setDestCashAccountId={state.setDestCashAccountId}
        paying={state.paying}
        onRecordPayment={state.handleRecordPayment}
        viewModal={state.viewModal}
        setViewModal={state.setViewModal}
        editRecord={state.editRecord}
        setEditRecord={state.setEditRecord}
        savingEditRecord={state.savingEditRecord}
        onSaveEditRecord={state.handleSaveEditRecord}
        deleteConfirm={state.deleteConfirm}
        setDeleteConfirm={state.setDeleteConfirm}
        bundle={state.bundle}
        onExecuteDelete={state.executeDeleteRecords}
      />
    </div>
  );
}
