import * as React from "react";
import type { ViewDetailState } from "@/features/client-projects/components/project-detail-shared";
import type {
  CustomerRow,
  ProjectRow,
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations-service";
import { InvoicingTable } from "./invoicing-table";
import { InvoiceAgingTable } from "./invoice-aging-table";
import { InvoiceReceiptsTable } from "./invoice-receipts-table";

export interface InvoiceTabsContentProps {
  activeTab: "invoices" | "aging" | "receipts";
  sortedInvoices: SalesInvoiceRow[];
  sortedReceipts: ReceiptRow[];
  arAgingRows: any[];
  loading: boolean;
  projectMap: Map<string, ProjectRow>;
  customerMap: Map<string, CustomerRow>;
  bundle: ProjectWorkspaceBundle | null;
  agingRefDate: string;
  setAgingRefDate: (date: string) => void;
  invoiceStatusFilter: string;
  setInvoiceStatusFilter: (status: string) => void;
  isEditingInvoices: boolean;
  setIsEditingInvoices: (editing: boolean) => void;
  selectedInvoiceIds: string[];
  setSelectedInvoiceIds: React.Dispatch<React.SetStateAction<string[]>>;
  invoiceSortField: "date" | "due_date" | "number" | "amount";
  setInvoiceSortField: React.Dispatch<React.SetStateAction<"date" | "due_date" | "number" | "amount">>;
  invoiceSortOrder: "asc" | "desc";
  setInvoiceSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  isEditingReceipts: boolean;
  setIsEditingReceipts: (editing: boolean) => void;
  selectedReceiptIds: string[];
  setSelectedReceiptIds: React.Dispatch<React.SetStateAction<string[]>>;
  receiptSortOrder: "asc" | "desc";
  setReceiptSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  onRecordPayment: (inv: SalesInvoiceRow) => void;
  onViewDetail: (state: ViewDetailState) => void;
  onEditInvoice: (inv: SalesInvoiceRow) => void;
  onDeleteInvoice: (inv: SalesInvoiceRow) => void;
  onDeleteSelectedInvoices: () => void;
  onDownloadInvoicePdf: (inv: SalesInvoiceRow) => void;
  onDownloadInvoiceWord: (inv: SalesInvoiceRow) => void;
  onCreateInvoice: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onEditReceipt: (kw: ReceiptRow) => void;
  onDeleteReceipt: (kw: ReceiptRow) => void;
  onDeleteSelectedReceipts: () => void;
  onDownloadReceiptPdf: (kw: ReceiptRow) => void;
  onDownloadReceiptWord: (kw: ReceiptRow) => void;
}

export function InvoiceTabsContent({
  activeTab,
  sortedInvoices,
  sortedReceipts,
  arAgingRows,
  loading,
  projectMap,
  customerMap,
  bundle,
  agingRefDate,
  setAgingRefDate,
  invoiceStatusFilter,
  setInvoiceStatusFilter,
  isEditingInvoices,
  setIsEditingInvoices,
  selectedInvoiceIds,
  setSelectedInvoiceIds,
  invoiceSortField,
  setInvoiceSortField,
  invoiceSortOrder,
  setInvoiceSortOrder,
  isEditingReceipts,
  setIsEditingReceipts,
  selectedReceiptIds,
  setSelectedReceiptIds,
  receiptSortOrder,
  setReceiptSortOrder,
  onRecordPayment,
  onViewDetail,
  onEditInvoice,
  onDeleteInvoice,
  onDeleteSelectedInvoices,
  onDownloadInvoicePdf,
  onDownloadInvoiceWord,
  onCreateInvoice,
  onExportExcel,
  onExportPdf,
  onExportCsv,
  onEditReceipt,
  onDeleteReceipt,
  onDeleteSelectedReceipts,
  onDownloadReceiptPdf,
  onDownloadReceiptWord,
}: InvoiceTabsContentProps) {
  if (activeTab === "invoices") {
    return (
      <InvoicingTable
        sortedInvoices={sortedInvoices}
        loading={loading}
        projectMap={projectMap}
        customerMap={customerMap}
        invoiceStatusFilter={invoiceStatusFilter}
        setInvoiceStatusFilter={setInvoiceStatusFilter}
        isEditingInvoices={isEditingInvoices}
        setIsEditingInvoices={setIsEditingInvoices}
        selectedInvoiceIds={selectedInvoiceIds}
        setSelectedInvoiceIds={setSelectedInvoiceIds}
        invoiceSortField={invoiceSortField}
        setInvoiceSortField={setInvoiceSortField}
        invoiceSortOrder={invoiceSortOrder}
        setInvoiceSortOrder={setInvoiceSortOrder}
        onRecordPayment={onRecordPayment}
        onViewDetail={onViewDetail}
        onEdit={onEditInvoice}
        onDelete={onDeleteInvoice}
        onDeleteSelected={onDeleteSelectedInvoices}
        onDownloadPdf={onDownloadInvoicePdf}
        onDownloadWord={onDownloadInvoiceWord}
        onCreateInvoice={onCreateInvoice}
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
        onExportCsv={onExportCsv}
      />
    );
  }

  if (activeTab === "aging") {
    return (
      <InvoiceAgingTable
        arAgingRows={arAgingRows}
        loading={loading}
        agingRefDate={agingRefDate}
        setAgingRefDate={setAgingRefDate}
      />
    );
  }

  return (
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
      onViewDetail={onViewDetail}
      onEdit={onEditReceipt}
      onDelete={onDeleteReceipt}
      onDeleteSelected={onDeleteSelectedReceipts}
      onDownloadPdf={onDownloadReceiptPdf}
      onDownloadWord={onDownloadReceiptWord}
    />
  );
}
