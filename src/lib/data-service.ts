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
import { inferRevenueMethodFromTerms } from "@/lib/formatters";
import { isDemoMode, supabase } from "@/lib/supabase";
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
  UserRole,
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

// =============================================================================
// 1. Profil & Manajemen Pengguna (Super Admin)
// =============================================================================
export async function listProfiles(): Promise<ProfileRow[]> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role === "user") {
      return [actor];
    }
    return [...demoStore.profiles].sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    );
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createInternalUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Akses ditolak: hanya Super Admin yang dapat membuat pengguna.");
    }
    if (
      demoStore.profiles.some(
        (p) => p.email.toLowerCase() === input.email.trim().toLowerCase(),
      )
    ) {
      throw new Error("Email pengguna sudah terdaftar.");
    }
    const now = new Date().toISOString();
    const row: ProfileRow = {
      id: crypto.randomUUID(),
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      is_active: true,
      last_login_at: null,
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.profiles.push(row);
    appendDemoAudit(actor, "INSERT", "profiles", row.id, null, row);
    return;
  }

  const { data, error } = await supabase.functions.invoke("admin-manage-users", {
    body: {
      action: "create_user",
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role,
    },
  });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
}

export async function updateInternalUserRole(
  targetUserId: string,
  role: UserRole,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengubah peran.");
    }
    const target = demoStore.profiles.find((p) => p.id === targetUserId);
    if (!target) throw new Error("Pengguna tidak ditemukan.");
    const before = structuredClone(target);
    target.role = role;
    target.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "profiles", target.id, before, target);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", targetUserId);
  if (error) throw new Error(error.message);
}

export async function toggleInternalUserActive(
  targetUserId: string,
  isActive: boolean,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat menonaktifkan pengguna.");
    }
    if (actor.id === targetUserId && !isActive) {
      throw new Error("Super Admin tidak dapat menonaktifkan akunnya sendiri.");
    }
    const target = demoStore.profiles.find((p) => p.id === targetUserId);
    if (!target) throw new Error("Pengguna tidak ditemukan.");
    const before = structuredClone(target);
    target.is_active = isActive;
    target.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "profiles", target.id, before, target);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", targetUserId);
  if (error) throw new Error(error.message);
}

// =============================================================================
// 2. Konfigurasi Sistem, Pajak, Penomoran, & Template (Super Admin)
// =============================================================================
export async function getCompanyProfile(): Promise<CompanyProfileRow> {
  if (isDemoMode || !supabase) {
    return structuredClone(demoStore.company);
  }
  const { data, error } = await supabase
    .from("company_profile")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCompanyProfile(
  patch: Partial<CompanyProfileRow>,
): Promise<CompanyProfileRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengubah konfigurasi perusahaan.");
    }
    const before = structuredClone(demoStore.company);
    demoStore.company = {
      ...demoStore.company,
      ...patch,
      id: 1,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    };
    appendDemoAudit(actor, "UPDATE", "company_profile", "1", before, demoStore.company);
    return structuredClone(demoStore.company);
  }

  const { data, error } = await supabase
    .from("company_profile")
    .update(patch)
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listDocSequences(): Promise<{
  sequences: DocSequenceRow[];
  counters: DocSequenceCounterRow[];
}> {
  if (isDemoMode || !supabase) {
    getDemoActor();
    return {
      sequences: structuredClone(demoStore.sequences),
      counters: structuredClone(demoStore.counters),
    };
  }
  const [seqRes, cntRes] = await Promise.all([
    supabase.from("doc_sequences").select("*").order("doc_type"),
    supabase.from("doc_sequence_counters").select("*"),
  ]);
  if (seqRes.error) throw new Error(seqRes.error.message);
  if (cntRes.error) throw new Error(cntRes.error.message);
  return {
    sequences: seqRes.data ?? [],
    counters: cntRes.data ?? [],
  };
}

export async function updateDocSequence(
  docType: DocTypeCode,
  patch: Pick<DocSequenceRow, "prefix_pattern" | "padding_digits" | "reset_period">,
): Promise<void> {
  if (!patch.prefix_pattern.includes("{{urut}}")) {
    throw new Error("Pola penomoran wajib memuat placeholder {{urut}}.");
  }
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengatur penomoran.");
    }
    const target = demoStore.sequences.find((s) => s.doc_type === docType);
    if (!target) throw new Error("Jenis dokumen tidak ditemukan.");
    const before = structuredClone(target);
    Object.assign(target, patch, {
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    });
    appendDemoAudit(actor, "UPDATE", "doc_sequences", docType, before, target);
    return;
  }

  const { error } = await supabase
    .from("doc_sequences")
    .update(patch)
    .eq("doc_type", docType);
  if (error) throw new Error(error.message);
}

export async function listDocTemplates(): Promise<DocTemplateRow[]> {
  if (isDemoMode || !supabase) {
    getDemoActor();
    return structuredClone(demoStore.templates);
  }
  const { data, error } = await supabase
    .from("doc_templates")
    .select("*")
    .order("doc_type");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateDocTemplate(
  docType: DocTypeCode,
  patch: Pick<DocTemplateRow, "default_placeholders" | "footer_notes">,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengubah template dokumen.");
    }
    const target = demoStore.templates.find((t) => t.doc_type === docType);
    if (!target) throw new Error("Template tidak ditemukan.");
    const before = structuredClone(target);
    target.default_placeholders = patch.default_placeholders;
    target.footer_notes = patch.footer_notes;
    target.version += 1;
    target.updated_by = actor.id;
    target.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "doc_templates", docType, before, target);
    return;
  }

  const { error } = await supabase
    .from("doc_templates")
    .update(patch)
    .eq("doc_type", docType);
  if (error) throw new Error(error.message);
}

// =============================================================================
// 3. Audit Trail (Super Admin Read-Only)
// =============================================================================
export async function listAuditLogs(): Promise<AuditLogRow[]> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat membaca Audit Trail.");
    }
    return structuredClone(demoStore.auditLogs);
  }
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// =============================================================================
// 4. Bagan Akun / COA SAK (Admin Kelola, Super Admin Baca)
// =============================================================================
export async function listAccounts(): Promise<AccountRow[]> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role === "user") {
      return demoStore.accounts.filter(
        (a) => a.is_active && a.account_type === "expense",
      );
    }
    return [...demoStore.accounts].sort((a, b) => a.code.localeCompare(b.code));
  }
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("code", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveAccount(
  input: Omit<
    AccountRow,
    "id" | "created_at" | "updated_at" | "used_in_journal_count" | "created_by"
  > & { id?: string },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat mengelola Bagan Akun.");
    }
    const now = new Date().toISOString();
    if (input.id) {
      const target = demoStore.accounts.find((a) => a.id === input.id);
      if (!target) throw new Error("Akun tidak ditemukan.");
      const before = structuredClone(target);
      Object.assign(target, input, { updated_at: now });
      appendDemoAudit(actor, "UPDATE", "accounts", target.id, before, target);
    } else {
      if (demoStore.accounts.some((a) => a.code === input.code.trim())) {
        throw new Error(`Kode akun ${input.code} sudah digunakan.`);
      }
      const created: AccountRow = {
        ...input,
        id: crypto.randomUUID(),
        code: input.code.trim(),
        name: input.name.trim(),
        used_in_journal_count: 0,
        created_by: actor.id,
        created_at: now,
        updated_at: now,
      };
      demoStore.accounts.push(created);
      appendDemoAudit(actor, "INSERT", "accounts", created.id, null, created);
    }
    return;
  }

  if (input.id) {
    const { id, ...patch } = input;
    const { error } = await supabase.from("accounts").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("accounts").insert({
      ...input,
      created_by: null,
    });
    if (error) throw new Error(error.message);
  }
}

export async function deleteAccount(accountId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menghapus akun.");
    }
    const idx = demoStore.accounts.findIndex((a) => a.id === accountId);
    const target = demoStore.accounts[idx];
    if (!target) throw new Error("Akun tidak ditemukan.");
    if (target.used_in_journal_count > 0) {
      throw new Error(
        `Akun ${target.code} (${target.name}) sudah digunakan dalam jurnal dan tidak boleh dihapus; silakan nonaktifkan akun tersebut (BR-19).`,
      );
    }
    demoStore.accounts.splice(idx, 1);
    appendDemoAudit(actor, "DELETE", "accounts", target.id, target, null);
    return;
  }

  const { error } = await supabase.from("accounts").delete().eq("id", accountId);
  if (error) throw new Error(error.message);
}

// =============================================================================
// 5. Periode Akuntansi (Admin)
// =============================================================================
const NAMA_BULAN = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export async function listPeriods(): Promise<PeriodRow[]> {
  if (isDemoMode || !supabase) {
    getDemoActor();
    return [...demoStore.periods].sort(
      (a, b) => b.year - a.year || b.month - a.month,
    );
  }
  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPeriod(year: number, month: number): Promise<void> {
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const name = `${NAMA_BULAN[month] ?? mm} ${year}`;

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat membuat periode akuntansi.");
    }
    if (demoStore.periods.some((p) => p.year === year && p.month === month)) {
      throw new Error(`Periode ${name} sudah ada.`);
    }
    const now = new Date().toISOString();
    const created: PeriodRow = {
      id: crypto.randomUUID(),
      year,
      month,
      name,
      start_date: startDate,
      end_date: endDate,
      status: "open",
      closed_at: null,
      closed_by: null,
      reopened_at: null,
      reopened_by: null,
      reopen_reason: null,
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.periods.push(created);
    appendDemoAudit(actor, "INSERT", "periods", created.id, null, created);
    return;
  }

  const { error } = await supabase.from("periods").insert({
    year,
    month,
    name,
    start_date: startDate,
    end_date: endDate,
  });
  if (error) throw new Error(error.message);
}

export async function closePeriod(periodId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menutup periode akuntansi.");
    }
    const target = demoStore.periods.find((p) => p.id === periodId);
    if (!target) throw new Error("Periode tidak ditemukan.");
    const before = structuredClone(target);
    target.status = "closed";
    target.closed_at = new Date().toISOString();
    target.closed_by = actor.id;
    appendDemoAudit(actor, "CLOSE_PERIOD", "periods", target.id, before, target);
    return;
  }

  const { error } = await supabase.rpc("close_accounting_period", {
    p_period_id: periodId,
  });
  if (error) throw new Error(error.message);
}

export async function reopenPeriod(
  periodId: string,
  reason: string,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat membuka kembali periode tertutup.");
    }
    if (reason.trim().length < 5) {
      throw new Error("Alasan pembukaan kembali wajib diisi minimal 5 karakter.");
    }
    const target = demoStore.periods.find((p) => p.id === periodId);
    if (!target) throw new Error("Periode tidak ditemukan.");
    const before = structuredClone(target);
    target.status = "open";
    target.reopened_at = new Date().toISOString();
    target.reopened_by = actor.id;
    target.reopen_reason = reason.trim();
    appendDemoAudit(actor, "REOPEN_PERIOD", "periods", target.id, before, target);
    return;
  }

  const { error } = await supabase.rpc("reopen_accounting_period", {
    p_period_id: periodId,
    p_reason: reason.trim(),
  });
  if (error) throw new Error(error.message);
}

// =============================================================================
// 6. Master Vendor, Pelanggan, & Proyek
// =============================================================================
export async function listVendors(): Promise<VendorRow[]> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role === "user") {
      return demoStore.vendors.filter((v) => v.is_active);
    }
    return [...demoStore.vendors].sort((a, b) => a.code.localeCompare(b.code));
  }
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("code", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveVendor(
  input: Pick<VendorRow, "code" | "name"> &
    Partial<VendorRow> & { id?: string },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat mengelola Vendor.");
    }
    const now = new Date().toISOString();
    if (input.id) {
      const target = demoStore.vendors.find((v) => v.id === input.id);
      if (!target) throw new Error("Vendor tidak ditemukan.");
      const before = structuredClone(target);
      Object.assign(target, input, { updated_at: now });
      appendDemoAudit(actor, "UPDATE", "vendors", target.id, before, target);
    } else {
      const created: VendorRow = {
        id: crypto.randomUUID(),
        code: input.code.trim(),
        name: input.name.trim(),
        contact_name: input.contact_name ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        npwp: input.npwp ?? null,
        address: input.address ?? null,
        bank_name: input.bank_name ?? null,
        bank_account_number: input.bank_account_number ?? null,
        bank_account_holder: input.bank_account_holder ?? null,
        is_active: input.is_active ?? true,
        created_by: actor.id,
        created_at: now,
        updated_at: now,
      };
      demoStore.vendors.push(created);
      appendDemoAudit(actor, "INSERT", "vendors", created.id, null, created);
    }
    return;
  }

  if (input.id) {
    const { id, ...patch } = input;
    const { error } = await supabase.from("vendors").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("vendors").insert(input);
    if (error) throw new Error(error.message);
  }
}

export async function listCustomers(): Promise<CustomerRow[]> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role === "user") {
      throw new Error("Akses ditolak: User tidak memiliki akses daftar pelanggan.");
    }
    return [...demoStore.customers].sort((a, b) => a.code.localeCompare(b.code));
  }
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("code", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveCustomer(
  input: Pick<CustomerRow, "code" | "name"> &
    Partial<CustomerRow> & { id?: string },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat mengelola Pelanggan.");
    }
    const now = new Date().toISOString();
    if (input.id) {
      const target = demoStore.customers.find((c) => c.id === input.id);
      if (!target) throw new Error("Pelanggan tidak ditemukan.");
      const before = structuredClone(target);
      Object.assign(target, input, { updated_at: now });
      appendDemoAudit(actor, "UPDATE", "customers", target.id, before, target);
    } else {
      const created: CustomerRow = {
        id: crypto.randomUUID(),
        code: input.code.trim(),
        name: input.name.trim(),
        company_name: input.company_name ?? null,
        contact_person: input.contact_person ?? null,
        contact_title: input.contact_title ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        npwp: input.npwp ?? null,
        address: input.address ?? null,
        is_active: input.is_active ?? true,
        created_by: actor.id,
        created_at: now,
        updated_at: now,
      };
      demoStore.customers.push(created);
      appendDemoAudit(actor, "INSERT", "customers", created.id, null, created);
    }
    return;
  }

  if (input.id) {
    const { id, ...patch } = input;
    const { error } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("customers").insert(input);
    if (error) throw new Error(error.message);
  }
}

export async function listProjects(): Promise<{
  projects: ProjectRow[];
  members: ProjectMemberRow[];
}> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role === "user") {
      const assignedIds = new Set(
        demoStore.projectMembers
          .filter((m) => m.user_id === actor.id)
          .map((m) => m.project_id),
      );
      return {
        projects: demoStore.projects.filter((p) => assignedIds.has(p.id)),
        members: demoStore.projectMembers.filter((m) => m.user_id === actor.id),
      };
    }
    return {
      projects: structuredClone(demoStore.projects),
      members: structuredClone(demoStore.projectMembers),
    };
  }

  const [prjRes, memRes] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("project_members").select("*"),
  ]);
  if (prjRes.error) throw new Error(prjRes.error.message);
  if (memRes.error) throw new Error(memRes.error.message);
  return {
    projects: prjRes.data ?? [],
    members: memRes.data ?? [],
  };
}

export async function saveProject(
  input: Pick<ProjectRow, "name" | "project_category" | "status" | "contract_value" | "term_count"> &
    Partial<ProjectRow> & { id?: string; memberUserIds?: string[] },
): Promise<void> {
  const { memberUserIds, ...projectFields } = input;
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat mengelola Proyek.");
    }
    const now = new Date().toISOString();
    let projectId = projectFields.id;
    if (projectId) {
      const target = demoStore.projects.find((p) => p.id === projectId);
      if (!target) throw new Error("Proyek tidak ditemukan.");
      if (
        target.has_posted_journal &&
        projectFields.revenue_method &&
        projectFields.revenue_method !== target.revenue_method
      ) {
        throw new Error(
          "Metode pengakuan pendapatan tidak dapat diubah setelah proyek memiliki jurnal terposting (BR-13).",
        );
      }
      const before = structuredClone(target);
      const nextMethod =
        projectFields.revenue_method ??
        inferRevenueMethodFromTerms(projectFields.term_count);
      Object.assign(target, projectFields, {
        revenue_method: nextMethod,
        updated_at: now,
      });
      appendDemoAudit(actor, "UPDATE", "projects", target.id, before, target);
    } else {
      const nextSeq = demoStore.projects.length + 1;
      const code =
        projectFields.code?.trim() ||
        `PRJ/ALT/${new Date().getFullYear()}/${String(nextSeq).padStart(3, "0")}`;
      const created: ProjectRow = {
        id: crypto.randomUUID(),
        code,
        name: projectFields.name.trim(),
        project_category: projectFields.project_category,
        customer_id: projectFields.customer_id ?? null,
        status: projectFields.status,
        start_date: projectFields.start_date ?? null,
        target_end_date: projectFields.target_end_date ?? null,
        completed_date: null,
        contract_value: Math.round(projectFields.contract_value),
        term_count: projectFields.term_count,
        revenue_method: inferRevenueMethodFromTerms(projectFields.term_count),
        spk_number: projectFields.spk_number ?? null,
        has_posted_journal: false,
        is_eliminated: false,
        description: projectFields.description ?? null,
        created_by: actor.id,
        created_at: now,
        updated_at: now,
      };
      demoStore.projects.unshift(created);
      projectId = created.id;
      appendDemoAudit(actor, "INSERT", "projects", created.id, null, created);
    }

    if (memberUserIds && projectId) {
      demoStore.projectMembers = demoStore.projectMembers.filter(
        (m) => m.project_id !== projectId,
      );
      for (const uid of memberUserIds) {
        demoStore.projectMembers.push({
          project_id: projectId,
          user_id: uid,
          member_role: "Anggota Tim",
          assigned_by: actor.id,
          assigned_at: now,
        });
      }
    }
    return;
  }

  let savedId = projectFields.id;
  if (savedId) {
    const { id, ...patch } = projectFields;
    const { error } = await supabase.from("projects").update(patch).eq("id", id!);
    if (error) throw new Error(error.message);
  } else {
    let code = projectFields.code?.trim();
    if (!code) {
      const { data: genCode, error: seqErr } = await supabase.rpc(
        "next_doc_number",
        { p_doc_type: "PRJ" },
      );
      if (seqErr) throw new Error(seqErr.message);
      code = genCode;
    }
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...projectFields, code })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    savedId = data.id;
  }

  if (memberUserIds && savedId) {
    await supabase.from("project_members").delete().eq("project_id", savedId);
    if (memberUserIds.length > 0) {
      const { error: memErr } = await supabase.from("project_members").insert(
        memberUserIds.map((uid) => ({
          project_id: savedId!,
          user_id: uid,
          member_role: "Anggota Tim",
        })),
      );
      if (memErr) throw new Error(memErr.message);
    }
  }
}

