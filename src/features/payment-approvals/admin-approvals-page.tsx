import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";
import { listAccounts, listProfiles, listProjects } from "@/lib/data-service";
import { listPaymentRequests } from "@/lib/operations-service";
import type {
  AccountRow,
  AttachmentRow,
  PaymentRequestRow,
  ProfileRow,
  ProjectRow,
} from "@/types/database.types";
import {
  handleDownloadPaPdf,
  handleDownloadPaWord,
  handleExportCsv,
  handleExportExcel,
  handleExportPdf,
} from "./admin-approvals/admin-approvals-export-handlers";
import { AdminApprovalsKpiGrid } from "./admin-approvals/admin-approvals-kpi-grid";
import { AdminApprovalsTable } from "./admin-approvals/admin-approvals-table";
import { AdminApprovalDialogs } from "./admin-approvals/admin-approval-dialogs";

export function AdminApprovalsPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [requests, setRequests] = React.useState<PaymentRequestRow[]>([]);
  const [attachments, setAttachments] = React.useState<AttachmentRow[]>([]);
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [sortKey, setSortKey] = React.useState<"date" | "number" | "amount" | "requester">("date");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [loading, setLoading] = React.useState(true);

  // Dialog targets
  const [approveTarget, setApproveTarget] = React.useState<PaymentRequestRow | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<PaymentRequestRow | null>(null);
  const [disburseTarget, setDisburseTarget] = React.useState<PaymentRequestRow | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [paRes, profs, prjRes, accs] = await Promise.all([
        listPaymentRequests(),
        listProfiles(),
        listProjects(),
        listAccounts(),
      ]);
      setRequests(paRes.requests);
      setAttachments(paRes.attachments);
      setProfiles(profs);
      setProjects(prjRes.projects);
      setAccounts(accs);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memuat daftar persetujuan pembayaran.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const cashAccounts = React.useMemo(
    () =>
      accounts.filter(
        (a) => a.is_active && a.is_postable && a.system_tag === "cash_bank",
      ),
    [accounts],
  );

  const profileMap = React.useMemo(
    () => new Map(profiles.map((p) => [p.id, p.full_name])),
    [profiles],
  );
  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, `${p.code}: ${p.name}`])),
    [projects],
  );
  const accountMap = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, `${a.code}: ${a.name}`])),
    [accounts],
  );

  const filteredRequests = React.useMemo(() => {
    const list =
      statusFilter === "ALL"
        ? [...requests]
        : requests.filter((r) => r.status === statusFilter);

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === "number") {
        cmp = a.request_number.localeCompare(b.request_number);
      } else if (sortKey === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortKey === "requester") {
        const nameA = profileMap.get(a.requester_id) ?? "";
        const nameB = profileMap.get(b.requester_id) ?? "";
        cmp = nameA.localeCompare(nameB);
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [requests, statusFilter, sortKey, sortDirection, profileMap]);

  const exportContext = {
    filteredRequests,
    attachments,
    profileMap,
    projectMap,
    accountMap,
    t,
    language: (language ?? "id") as "id" | "en",
  };

  const pendingCount = requests.filter((r) => r.status === "submitted").length;
  const approvedUnpaidCount = requests.filter(
    (r) => r.status === "approved",
  ).length;
  const totalPaidAmount = requests
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-3.5 sm:gap-6 max-sm:flex-1 max-sm:min-h-[calc(100dvh-5.5rem)]">
      <PageHeader
        title={t("approvals:admin.page_title", "Persetujuan Pembayaran 1-Level & Pencairan Dana")}
        description={t("approvals:admin.page_desc", "Verifikasi permohonan dana, persetujuan pengajuan, dan pencairan kas tim.")}
      />

      {/* Ringkasan KPI Persetujuan & Pencairan */}
      <AdminApprovalsKpiGrid
        pendingCount={pendingCount}
        approvedUnpaidCount={approvedUnpaidCount}
        totalPaidAmount={totalPaidAmount}
        t={t}
      />

      {/* Tabel Pengajuan Pembayaran Tim */}
      <AdminApprovalsTable
        loading={loading}
        filteredRequests={filteredRequests}
        attachments={attachments}
        profile={profile}
        profileMap={profileMap}
        projectMap={projectMap}
        accountMap={accountMap}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={(key, dir) => {
          setSortKey(key as any);
          setSortDirection(dir);
        }}
        onExportExcel={() => void handleExportExcel(exportContext)}
        onExportPdf={() => void handleExportPdf(exportContext)}
        onExportCsv={() => void handleExportCsv(exportContext)}
        onDownloadPdf={(req) => void handleDownloadPaPdf(req, attachments, profileMap, projectMap, accountMap, t)}
        onDownloadWord={(req) => void handleDownloadPaWord(req, attachments, profileMap, projectMap, accountMap, t)}
        onOpenApprove={(req) => setApproveTarget(req)}
        onOpenReject={(req) => setRejectTarget(req)}
        onOpenDisburse={(req) => setDisburseTarget(req)}
        t={t}
        language={(language ?? "id") as "id" | "en"}
      />

      {/* Dialog Aksi Persetujuan, Penolakan, dan Pencairan */}
      <AdminApprovalDialogs
        approveTarget={approveTarget}
        rejectTarget={rejectTarget}
        disburseTarget={disburseTarget}
        cashAccounts={cashAccounts}
        onCloseApprove={() => setApproveTarget(null)}
        onCloseReject={() => setRejectTarget(null)}
        onCloseDisburse={() => setDisburseTarget(null)}
        onSuccess={reload}
        t={t}
      />
    </div>
  );
}
