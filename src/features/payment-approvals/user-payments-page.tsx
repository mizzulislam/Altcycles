import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import {
  listAccounts,
  listProjects,
} from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import {
  listPaymentRequests,
  listPurchaseOrders,
} from "@/lib/operations-service";
import type {
  AccountRow,
  AttachmentRow,
  PaymentRequestRow,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";
import {
  handleDownloadPaPdf,
  handleDownloadPaWord,
  handleExportCsv,
  handleExportExcel,
  handleExportPdf,
} from "./user-payments/user-payments-export-handlers";
import { UserPaymentsKpiGrid } from "./user-payments/user-payments-kpi-grid";
import { UserPaymentsTable } from "./user-payments/user-payments-table";
import { UserPaymentCreateDialog } from "./user-payments/user-payment-create-dialog";
import { UserPaymentReviseDialog } from "./user-payments/user-payment-revise-dialog";

export function UserPaymentsPage() {
  const { t, language } = useLanguage();
  const [requests, setRequests] = React.useState<PaymentRequestRow[]>([]);
  const [attachments, setAttachments] = React.useState<AttachmentRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [expenseAccounts, setExpenseAccounts] = React.useState<AccountRow[]>([]);
  const [myPos, setMyPos] = React.useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [reviseTarget, setReviseTarget] = React.useState<PaymentRequestRow | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [paRes, prjRes, accs, poRes] = await Promise.all([
        listPaymentRequests(),
        listProjects(),
        listAccounts(),
        listPurchaseOrders(),
      ]);
      setRequests(paRes.requests);
      setAttachments(paRes.attachments);
      setProjects(prjRes.projects);
      const allExpense = accs.filter(
        (a) => a.is_active && a.is_postable && a.account_type === "expense",
      );
      const claimableExpense = allExpense.filter(
        (a) => a.system_tag !== "profit_sharing_expense" && a.code !== "6-1401",
      );
      const expOnly = claimableExpense.length > 0 ? claimableExpense : allExpense;
      setExpenseAccounts(expOnly);
      setMyPos(poRes.orders.filter((o) => o.status === "issued"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("approvals:load_error", "Gagal memuat pengajuan pembayaran."),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, `${p.code} - ${p.name}`])),
    [projects],
  );
  const accountMap = React.useMemo(
    () => new Map(expenseAccounts.map((a) => [a.id, `${a.code} - ${a.name}`])),
    [expenseAccounts],
  );

  const exportContext = {
    requests,
    attachments,
    projectMap,
    accountMap,
    t,
    language: (language ?? "id") as "id" | "en",
  };

  const pendingCount = requests.filter((r) => r.status === "submitted").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const totalPaidAmount = requests
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("approvals:user.page_title")}
        description={t("approvals:user.page_desc")}
      />

      {/* Ringkasan KPI Pengajuan Pembayaran */}
      <UserPaymentsKpiGrid
        pendingCount={pendingCount}
        approvedCount={approvedCount}
        totalPaidAmount={totalPaidAmount}
        t={t}
      />

      {/* Tabel Pengajuan Pembayaran */}
      <UserPaymentsTable
        loading={loading}
        requests={requests}
        attachments={attachments}
        projects={projects}
        onOpenCreate={() => setCreateOpen(true)}
        onSelectRevise={(req) => setReviseTarget(req)}
        onDownloadPdf={(req) => void handleDownloadPaPdf(req, attachments, projectMap, accountMap, t)}
        onDownloadWord={(req) => void handleDownloadPaWord(req, attachments, projectMap, accountMap, t)}
        onExportExcel={() => void handleExportExcel(exportContext)}
        onExportPdf={() => void handleExportPdf(exportContext)}
        onExportCsv={() => void handleExportCsv(exportContext)}
        t={t}
        language={(language ?? "id") as "id" | "en"}
      />

      {/* Dialog Buat Pengajuan Pembayaran Baru */}
      <UserPaymentCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        expenseAccounts={expenseAccounts}
        myPos={myPos}
        onSuccess={reload}
        t={t}
      />

      {/* Dialog Ajukan Ulang Pengajuan Ditolak */}
      <UserPaymentReviseDialog
        target={reviseTarget}
        onClose={() => setReviseTarget(null)}
        onSuccess={reload}
        t={t}
      />
    </div>
  );
}
