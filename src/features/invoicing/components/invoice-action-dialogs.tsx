import * as React from "react";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import type { ViewDetailState } from "@/features/client-projects/components/project-detail-shared";
import type {
  AccountRow,
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  HandoverReportRow,
  MilestoneRow,
  ProgressReportRow,
  ProjectRow,
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations-service";
import { InvoiceCreateDialog } from "./invoice-create-dialog";
import { InvoicePaymentDialog } from "./invoice-payment-dialog";
import { InvoiceViewDetailDialog } from "./invoice-view-detail-dialog";
import {
  InvoiceEditDialog,
  type EditableInvoiceRecord,
} from "./invoice-edit-dialog";
import type { validateInvoiceChecklist } from "@/lib/document-checklist";

export interface InvoiceActionDialogsProps {
  // Create Dialog props
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  projects: ProjectRow[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  invDate: string;
  setInvDate: (date: string) => void;
  dueDate: string;
  setDueDate: (date: string) => void;
  invoiceKind: any;
  setInvoiceKind: (kind: any) => void;
  clientPoId: string;
  setClientPoId: (id: string) => void;
  projectVerifiedPos: ClientPurchaseOrderRow[];
  milestoneId: string;
  setMilestoneId: (id: string) => void;
  projectMilestones: MilestoneRow[];
  bakpId: string;
  setBakpId: (id: string) => void;
  projectApprovedBakps: ProgressReportRow[];
  bastId: string;
  setBastId: (id: string) => void;
  projectSignedBasts: HandoverReportRow[];
  subtotalAmount: number;
  setSubtotalAmount: (amount: number) => void;
  company: CompanyProfileRow | null;
  directCashAccountId: string;
  setDirectCashAccountId: (id: string) => void;
  cashAccounts: AccountRow[];
  notes: string;
  setNotes: (notes: string) => void;
  invoiceChecklist: ReturnType<typeof validateInvoiceChecklist>;
  issuing: boolean;
  onIssueInvoice: (e: React.FormEvent) => Promise<void>;

  // Payment Dialog props
  payTarget: SalesInvoiceRow | null;
  setPayTarget: (target: SalesInvoiceRow | null) => void;
  payDate: string;
  setPayDate: (date: string) => void;
  payAmount: number;
  setPayAmount: (amount: number) => void;
  destCashAccountId: string;
  setDestCashAccountId: (id: string) => void;
  paying: boolean;
  onRecordPayment: (e: React.FormEvent) => Promise<void>;

  // View Detail Dialog props
  viewModal: ViewDetailState | null;
  setViewModal: (modal: ViewDetailState | null) => void;

  // Edit Dialog props
  editRecord: EditableInvoiceRecord | null;
  setEditRecord: React.Dispatch<React.SetStateAction<EditableInvoiceRecord | null>>;
  savingEditRecord: boolean;
  onSaveEditRecord: (e: React.FormEvent) => Promise<void>;

  // Delete Confirm Dialog props
  deleteConfirm: {
    section: "invoices" | "receipts";
    ids: string[];
    label: string;
  } | null;
  setDeleteConfirm: (confirm: { section: "invoices" | "receipts"; ids: string[]; label: string } | null) => void;
  bundle: ProjectWorkspaceBundle | null;
  onExecuteDelete: () => Promise<void>;
}

export function InvoiceActionDialogs({
  createOpen,
  setCreateOpen,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  invDate,
  setInvDate,
  dueDate,
  setDueDate,
  invoiceKind,
  setInvoiceKind,
  clientPoId,
  setClientPoId,
  projectVerifiedPos,
  milestoneId,
  setMilestoneId,
  projectMilestones,
  bakpId,
  setBakpId,
  projectApprovedBakps,
  bastId,
  setBastId,
  projectSignedBasts,
  subtotalAmount,
  setSubtotalAmount,
  company,
  directCashAccountId,
  setDirectCashAccountId,
  cashAccounts,
  notes,
  setNotes,
  invoiceChecklist,
  issuing,
  onIssueInvoice,
  payTarget,
  setPayTarget,
  payDate,
  setPayDate,
  payAmount,
  setPayAmount,
  destCashAccountId,
  setDestCashAccountId,
  paying,
  onRecordPayment,
  viewModal,
  setViewModal,
  editRecord,
  setEditRecord,
  savingEditRecord,
  onSaveEditRecord,
  deleteConfirm,
  setDeleteConfirm,
  bundle,
  onExecuteDelete,
}: InvoiceActionDialogsProps) {
  return (
    <>
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
        onSubmit={onIssueInvoice}
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
        onSubmit={onRecordPayment}
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
        onSubmit={onSaveEditRecord}
      />

      {/* Konfirmasi Hapus Data / Hapus Pilihan */}
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
          (bundle?.receipts ?? []).some((r: ReceiptRow) => deleteConfirm.ids.includes(r.invoice_id))
            ? "Data yang dihapus tidak dapat dikembalikan. Dokumen Kuitansi yang terhubung dengan invoice terpilih juga akan ikut dihapus."
            : "Data yang dihapus tidak dapat dikembalikan."
        }
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={onExecuteDelete}
      />
    </>
  );
}
