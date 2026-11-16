import {
  DEMO_ACCOUNTS,
  DEMO_ATTACHMENTS,
  DEMO_AUDIT_LOGS,
  DEMO_BUDGETS,
  DEMO_BUDGET_LINES,
  DEMO_CLIENT_POS,
  DEMO_COMPANY,
  DEMO_COUNTERS,
  DEMO_CUSTOMERS,
  DEMO_HANDOVER_REPORTS,
  DEMO_JOURNALS,
  DEMO_JOURNAL_LINES,
  DEMO_MILESTONES,
  DEMO_NOTIFICATIONS,
  DEMO_PAYMENT_REQUESTS,
  DEMO_PERIODS,
  DEMO_PO_ITEMS,
  DEMO_PROFILES,
  DEMO_PROFIT_SHARING_LINES,
  DEMO_PROFIT_SHARING_RESULTS,
  DEMO_PROFIT_SHARING_SCHEMES,
  DEMO_PROGRESS_REPORTS,
  DEMO_PROJECTS,
  DEMO_PROJECT_DOCUMENTS,
  DEMO_PROJECT_MEMBERS,
  DEMO_PROJECT_PROGRESS,
  DEMO_PURCHASE_ORDERS,
  DEMO_QUOTATIONS,
  DEMO_QUOTATION_ITEMS,
  DEMO_RECEIPTS,
  DEMO_SALES_INVOICES,
  DEMO_SEQUENCES,
  DEMO_TEMPLATES,
  DEMO_UAT_CHECKLISTS,
  DEMO_UAT_ITEMS,
  DEMO_VENDORS,
} from "@/lib/demo-seed";
import type {
  AccountRow,
  AttachmentRow,
  AuditAction,
  AuditLogRow,
  BudgetLineRow,
  BudgetRow,
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  CustomerRow,
  DocSequenceCounterRow,
  DocSequenceRow,
  DocTemplateRow,
  DocTypeCode,
  HandoverReportRow,
  JournalLineRow,
  JournalRow,
  Json,
  MilestoneRow,
  NotificationRow,
  PaymentRequestRow,
  PeriodRow,
  PoItemRow,
  ProfileRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProfitSharingSchemeRow,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectMemberRow,
  ProjectProgressRow,
  ProjectRow,
  PurchaseOrderRow,
  QuotationItemRow,
  QuotationRow,
  ReceiptRow,
  SalesInvoiceRow,
  UatChecklistRow,
  UatItemRow,
  VendorRow,
} from "@/types/database.types";

export interface DemoStore {
  profiles: ProfileRow[];
  company: CompanyProfileRow;
  sequences: DocSequenceRow[];
  counters: DocSequenceCounterRow[];
  templates: DocTemplateRow[];
  accounts: AccountRow[];
  periods: PeriodRow[];
  vendors: VendorRow[];
  customers: CustomerRow[];
  projects: ProjectRow[];
  projectMembers: ProjectMemberRow[];
  purchaseOrders: PurchaseOrderRow[];
  poItems: PoItemRow[];
  paymentRequests: PaymentRequestRow[];
  attachments: AttachmentRow[];
  notifications: NotificationRow[];
  budgets: BudgetRow[];
  budgetLines: BudgetLineRow[];
  journals: JournalRow[];
  journalLines: JournalLineRow[];
  quotations: QuotationRow[];
  quotationItems: QuotationItemRow[];
  clientPos: ClientPurchaseOrderRow[];
  projectDocuments: ProjectDocumentRow[];
  milestones: MilestoneRow[];
  progressReports: ProgressReportRow[];
  uatChecklists: UatChecklistRow[];
  uatItems: UatItemRow[];
  handoverReports: HandoverReportRow[];
  projectProgress: ProjectProgressRow[];
  salesInvoices: SalesInvoiceRow[];
  receipts: ReceiptRow[];
  profitSharingSchemes: ProfitSharingSchemeRow[];
  profitSharingResults: ProfitSharingResultRow[];
  profitSharingLines: ProfitSharingLineRow[];
  auditLogs: AuditLogRow[];
  currentUserId: string | null;
}

export const demoStore: DemoStore = {
  profiles: structuredClone(DEMO_PROFILES),
  company: structuredClone(DEMO_COMPANY),
  sequences: structuredClone(DEMO_SEQUENCES),
  counters: structuredClone(DEMO_COUNTERS),
  templates: structuredClone(DEMO_TEMPLATES),
  accounts: structuredClone(DEMO_ACCOUNTS),
  periods: structuredClone(DEMO_PERIODS),
  vendors: structuredClone(DEMO_VENDORS),
  customers: structuredClone(DEMO_CUSTOMERS),
  projects: structuredClone(DEMO_PROJECTS),
  projectMembers: structuredClone(DEMO_PROJECT_MEMBERS),
  purchaseOrders: structuredClone(DEMO_PURCHASE_ORDERS),
  poItems: structuredClone(DEMO_PO_ITEMS),
  paymentRequests: structuredClone(DEMO_PAYMENT_REQUESTS),
  attachments: structuredClone(DEMO_ATTACHMENTS),
  notifications: structuredClone(DEMO_NOTIFICATIONS),
  budgets: structuredClone(DEMO_BUDGETS),
  budgetLines: structuredClone(DEMO_BUDGET_LINES),
  journals: structuredClone(DEMO_JOURNALS),
  journalLines: structuredClone(DEMO_JOURNAL_LINES),
  quotations: structuredClone(DEMO_QUOTATIONS),
  quotationItems: structuredClone(DEMO_QUOTATION_ITEMS),
  clientPos: structuredClone(DEMO_CLIENT_POS),
  projectDocuments: structuredClone(DEMO_PROJECT_DOCUMENTS),
  milestones: structuredClone(DEMO_MILESTONES),
  progressReports: structuredClone(DEMO_PROGRESS_REPORTS),
  uatChecklists: structuredClone(DEMO_UAT_CHECKLISTS),
  uatItems: structuredClone(DEMO_UAT_ITEMS),
  handoverReports: structuredClone(DEMO_HANDOVER_REPORTS),
  projectProgress: structuredClone(DEMO_PROJECT_PROGRESS),
  salesInvoices: structuredClone(DEMO_SALES_INVOICES),
  receipts: structuredClone(DEMO_RECEIPTS),
  profitSharingSchemes: structuredClone(DEMO_PROFIT_SHARING_SCHEMES),
  profitSharingResults: structuredClone(DEMO_PROFIT_SHARING_RESULTS),
  profitSharingLines: structuredClone(DEMO_PROFIT_SHARING_LINES),
  auditLogs: structuredClone(DEMO_AUDIT_LOGS),
  currentUserId: null,
};

export function getDemoActor(): ProfileRow {
  const actor = demoStore.profiles.find(
    (p) => p.id === demoStore.currentUserId && p.is_active,
  );
  if (!actor) {
    throw new Error("Sesi tidak aktif atau pengguna telah dinonaktifkan.");
  }
  return actor;
}

export function appendDemoAudit(
  actor: ProfileRow,
  action: AuditAction,
  entityName: string,
  entityId: string,
  oldData: unknown,
  newData: unknown,
) {
  const nextId =
    demoStore.auditLogs.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  demoStore.auditLogs.unshift({
    id: nextId,
    actor_id: actor.id,
    actor_role: actor.role,
    action,
    entity_name: entityName,
    entity_id: entityId,
    old_data: oldData
      ? (JSON.parse(JSON.stringify(oldData)) as Record<string, Json | undefined>)
      : null,
    new_data: newData
      ? (JSON.parse(JSON.stringify(newData)) as Record<string, Json | undefined>)
      : null,
    created_at: new Date().toISOString(),
  });
}

export function nextDemoDocNumber(docType: DocTypeCode, dateIso: string): string {
  const seq = demoStore.sequences.find((s) => s.doc_type === docType);
  const [yyyy = "2026", mm = "11"] = dateIso.split("-");
  const periodKey =
    seq?.reset_period === "yearly"
      ? yyyy
      : seq?.reset_period === "never"
        ? "GLOBAL"
        : `${yyyy}-${mm}`;
  let cnt = demoStore.counters.find(
    (c) => c.doc_type === docType && c.period_key === periodKey,
  );
  if (!cnt) {
    cnt = {
      doc_type: docType,
      period_key: periodKey,
      last_number: 1,
      updated_at: new Date().toISOString(),
    };
    demoStore.counters.push(cnt);
  } else {
    cnt.last_number += 1;
    cnt.updated_at = new Date().toISOString();
  }
  const pad = seq?.padding_digits ?? 3;
  const pattern = seq?.prefix_pattern ?? `${docType}/ALT/{{tahun}}/{{bulan}}/{{urut}}`;
  return pattern
    .replace("{{tahun}}", yyyy)
    .replace("{{bulan}}", mm)
    .replace("{{urut}}", String(cnt.last_number).padStart(pad, "0"));
}

export function setDemoCurrentUser(userId: string | null) {
  demoStore.currentUserId = userId;
}

export function findDemoProfileByEmail(email: string): ProfileRow | null {
  const normalized = email.trim().toLowerCase();
  return (
    demoStore.profiles.find(
      (p) => p.email.toLowerCase() === normalized && p.is_active,
    ) ?? null
  );
}
