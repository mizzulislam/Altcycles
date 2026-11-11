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
  LoginMediaCategory,
  LoginMediaItemRow,
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
// 1. Profil & Manajemen Pengguna (Super Admin & Multi-Role)
// =============================================================================
export async function switchActiveRole(targetRole: UserRole): Promise<ProfileRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const allowed = actor.roles && actor.roles.length > 0 ? actor.roles : [actor.role];
    if (!allowed.includes(targetRole)) {
      throw new Error(`Akses ditolak: Anda tidak memiliki wewenang untuk peran ${targetRole}.`);
    }
    const before = structuredClone(actor);
    actor.role = targetRole;
    actor.updated_at = new Date().toISOString();
    appendDemoAudit(
      actor,
      "UPDATE",
      "profiles",
      actor.id,
      { event: "ROLE_SWITCH", old_role: before.role },
      { event: "ROLE_SWITCH", active_role: targetRole },
    );
    return structuredClone(actor);
  }

  const { data, error } = await supabase.rpc("switch_active_role", {
    p_target_role: targetRole,
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ProfileRow;
}

export async function updateMyProfile(payload: {
  fullName: string;
  username?: string | null;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}): Promise<ProfileRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (!payload.fullName.trim()) {
      throw new Error("Nama lengkap wajib diisi.");
    }
    if (payload.username?.trim()) {
      const uname = payload.username.trim().toLowerCase();
      const conflict = demoStore.profiles.some(
        (p) => p.id !== actor.id && p.username?.toLowerCase() === uname,
      );
      if (conflict) {
        throw new Error(`Username "${payload.username.trim()}" sudah digunakan oleh akun lain.`);
      }
    }
    const before = structuredClone(actor);
    actor.full_name = payload.fullName.trim();
    actor.username = payload.username?.trim() || null;
    actor.phone_number = payload.phoneNumber?.trim() || null;
    actor.job_title = payload.jobTitle?.trim() || null;
    actor.bio = payload.bio?.trim() || null;
    if (payload.avatarUrl !== undefined) {
      actor.avatar_url = payload.avatarUrl ? payload.avatarUrl.trim() : null;
    }
    actor.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "profiles", actor.id, before, actor);
    return structuredClone(actor);
  }

  const { data, error } = await supabase.rpc("update_my_profile", {
    p_full_name: payload.fullName.trim(),
    p_username: payload.username?.trim() || null,
    p_phone_number: payload.phoneNumber?.trim() || null,
    p_job_title: payload.jobTitle?.trim() || null,
    p_bio: payload.bio?.trim() || null,
    p_avatar_url: payload.avatarUrl ? payload.avatarUrl.trim() : null,
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ProfileRow;
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran berkas melebihi batas maksimal 2MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Berkas harus berupa gambar (JPG, PNG, atau WebP).");
  }

  if (isDemoMode || !supabase) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Gagal membaca berkas gambar."));
        }
      };
      reader.onerror = () => reject(new Error("Gagal memproses berkas avatar."));
      reader.readAsDataURL(file);
    });
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || "user";
  const ext = file.name.split(".").pop() || "png";
  const filePath = `avatars/${userId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("altcycles-files")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    // Fallback: Jika bucket belum disiapkan, ubah jadi base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(uploadError.message));
      reader.readAsDataURL(file);
    });
  }

  const { data: publicUrlData } = supabase.storage
    .from("altcycles-files")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

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

export async function updateInternalUserRoles(
  targetUserId: string,
  roles: UserRole[],
  primaryRole?: UserRole,
): Promise<ProfileRow> {
  if (roles.length === 0) {
    throw new Error("Pengguna harus memiliki minimal satu peran aktif.");
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengubah peran pengguna.");
    }
    if (actor.id === targetUserId) {
      throw new Error("Anda tidak dapat mengubah peran akun Anda sendiri.");
    }
    const target = demoStore.profiles.find((p) => p.id === targetUserId);
    if (!target) throw new Error("Pengguna tidak ditemukan.");

    const hadSuperAdmin =
      target.role === "super_admin" || target.roles?.includes("super_admin");
    if (hadSuperAdmin && !roles.includes("super_admin")) {
      const otherSa = demoStore.profiles.filter(
        (p) =>
          p.id !== targetUserId &&
          p.is_active &&
          (p.role === "super_admin" || p.roles?.includes("super_admin")),
      );
      if (otherSa.length === 0) {
        throw new Error("Tidak dapat mencabut hak Super Admin terakhir pada sistem.");
      }
    }

    const before = structuredClone(target);
    const newActiveRole: UserRole =
      primaryRole && roles.includes(primaryRole)
        ? primaryRole
        : roles.includes(target.role)
        ? target.role
        : roles[0]!;

    target.roles = roles;
    target.role = newActiveRole;
    target.updated_at = new Date().toISOString();

    appendDemoAudit(
      actor,
      "UPDATE",
      "profiles",
      target.id,
      { event: "USER_ROLES_UPDATED", previous_roles: before.roles || [before.role] },
      { event: "USER_ROLES_UPDATED", new_roles: roles, new_active_role: newActiveRole },
    );

    return structuredClone(target);
  }

  const { data, error } = await supabase.rpc("update_user_roles", {
    p_target_user_id: targetUserId,
    p_roles: roles,
    p_primary_role: primaryRole ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ProfileRow;
}

export async function deleteInternalUser(targetUserId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang berhak menghapus akun pengguna.");
    }
    if (actor.id === targetUserId) {
      throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
    }

    const targetIdx = demoStore.profiles.findIndex((p) => p.id === targetUserId);
    if (targetIdx === -1) throw new Error("Pengguna tidak ditemukan.");
    const target = demoStore.profiles[targetIdx]!;

    const isSa =
      target.role === "super_admin" || target.roles?.includes("super_admin");
    if (isSa) {
      const otherSa = demoStore.profiles.filter(
        (p) =>
          p.id !== targetUserId &&
          p.is_active &&
          (p.role === "super_admin" || p.roles?.includes("super_admin")),
      );
      if (otherSa.length === 0) {
        throw new Error("Tidak dapat menghapus Super Admin terakhir pada sistem.");
      }
    }

    // Periksa keterkaitan data transaksi keuangan
    const hasPo = demoStore.purchaseOrders.some(
      (po: PurchaseOrderRow) => po.created_by === targetUserId || (po as any).verified_by === targetUserId,
    );
    if (hasPo) {
      throw new Error(
        "Pengguna tidak dapat dihapus permanen karena tercatat dalam dokumen PO Pembelian. Silakan gunakan opsi 'Nonaktifkan' untuk mencabut akses login.",
      );
    }

    const hasPayment = demoStore.paymentRequests.some(
      (pr) => pr.requester_id === targetUserId || (pr as any).reviewed_by === targetUserId,
    );
    if (hasPayment) {
      throw new Error(
        "Pengguna tidak dapat dihapus permanen karena tercatat dalam pengajuan pembayaran. Silakan gunakan opsi 'Nonaktifkan' untuk mencabut akses login.",
      );
    }

    const hasJournal = demoStore.journals.some(
      (j) => j.created_by === targetUserId,
    );
    if (hasJournal) {
      throw new Error(
        "Pengguna tidak dapat dihapus permanen karena telah menerbitkan ayat jurnal akuntansi. Silakan gunakan opsi 'Nonaktifkan' untuk mencabut akses login.",
      );
    }

    const hasInvoice = demoStore.salesInvoices.some(
      (inv) => inv.created_by === targetUserId,
    );
    if (hasInvoice) {
      throw new Error(
        "Pengguna tidak dapat dihapus permanen karena tercatat dalam penerbitan invoice penagihan. Silakan gunakan opsi 'Nonaktifkan' untuk mencabut akses login.",
      );
    }

    const hasProjectMember = demoStore.projectMembers.some(
      (pm) => pm.user_id === targetUserId,
    );
    if (hasProjectMember) {
      throw new Error(
        "Pengguna masih terdaftar sebagai anggota proyek aktif. Silakan cabut penugasan proyek terlebih dahulu atau pilih opsi 'Nonaktifkan'.",
      );
    }

    demoStore.profiles.splice(targetIdx, 1);
    appendDemoAudit(
      actor,
      "DELETE",
      "profiles",
      target.id,
      target,
      { event: "USER_DELETED", deleted_user_email: target.email },
    );
    return;
  }

  const { error } = await supabase.rpc("delete_internal_user", {
    p_target_user_id: targetUserId,
  });
  if (error) throw new Error(error.message);
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
const COMPANY_EXT_STORAGE_KEY = "altcycles_company_ext_v1";
const CUSTOMER_EXT_STORAGE_KEY = "altcycles_customers_ext_v1";
const LOGIN_MEDIA_STORAGE_KEY = "altcycles_login_media_v1";

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Abaikan kuota storage
  }
}

export async function getCompanyProfile(): Promise<CompanyProfileRow> {
  const localExt = readLocalJson<Partial<CompanyProfileRow>>(COMPANY_EXT_STORAGE_KEY, {});
  if (isDemoMode || !supabase) {
    const base = structuredClone(demoStore.company);
    return {
      ...base,
      ...localExt,
      bank_accounts_json: base.bank_accounts_json ?? localExt.bank_accounts_json ?? [
        {
          bank_name: base.bank_name,
          account_number: base.bank_account_number,
          account_holder: base.bank_account_holder,
        },
      ],
    };
  }
  const { data, error } = await supabase
    .from("company_profile")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  return {
    ...localExt,
    ...data,
    signer_name: data.signer_name,
    signer_title: data.signer_title,
    tax_id_number: data.tax_id_number ?? localExt.tax_id_number ?? null,
    logo_storage_path: data.logo_storage_path ?? localExt.logo_storage_path ?? null,
    tagline: data.tagline ?? localExt.tagline ?? "ADAPT TODAY, INNOVATE TOMORROW",
    signing_city: data.signing_city ?? localExt.signing_city ?? "Bogor",
    signer_signature_path: data.signer_signature_path ?? localExt.signer_signature_path ?? null,
    signer_paraf_path: data.signer_paraf_path ?? localExt.signer_paraf_path ?? null,
    bank_accounts_json: localExt.bank_accounts_json ?? [
      {
        bank_name: data.bank_name,
        account_number: data.bank_account_number,
        account_holder: data.bank_account_holder,
      },
    ],
    social_links_json: data.social_links_json ?? localExt.social_links_json ?? [
      { platform: "Instagram", username: "@altvira.tech" },
      { platform: "LinkedIn", username: "altvira-technology" },
      { platform: "TikTok", username: "@altvira.tech" },
    ],
  };
}

export async function updateCompanyProfile(
  patch: Partial<CompanyProfileRow>,
): Promise<CompanyProfileRow> {
  const extKeys: Array<keyof CompanyProfileRow> = [
    "tagline",
    "signing_city",
    "tax_id_number",
    "signer_signature_path",
    "signer_paraf_path",
    "social_links_json",
    "bank_accounts_json",
    "logo_storage_path",
  ];
  const prevExt = readLocalJson<Partial<CompanyProfileRow>>(COMPANY_EXT_STORAGE_KEY, {});
  const nextExt: Partial<CompanyProfileRow> = { ...prevExt };
  for (const k of extKeys) {
    if (k in patch) {
      (nextExt as Record<string, unknown>)[k] = patch[k];
    }
  }
  writeLocalJson(COMPANY_EXT_STORAGE_KEY, nextExt);

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
    return { ...structuredClone(demoStore.company), ...nextExt };
  }

  const { data, error } = await supabase
    .from("company_profile")
    .update(patch)
    .eq("id", 1)
    .select("*")
    .single();
  if (!error) {
    return { ...nextExt, ...data };
  }

  // Fallback jika kolom baru (migrasi 0014/0015) belum diterapkan di database cloud
  if (error.message.includes("column") || error.message.includes("schema cache")) {
    const corePatch: Record<string, unknown> = { ...patch };
    delete corePatch.tagline;
    delete corePatch.signing_city;
    delete corePatch.tax_id_number;
    delete corePatch.signer_signature_path;
    delete corePatch.signer_paraf_path;
    delete corePatch.social_links_json;
    delete corePatch.bank_accounts_json;
    if (Object.keys(corePatch).length > 0) {
      const { data: coreData, error: coreErr } = await supabase
        .from("company_profile")
        .update(corePatch as Partial<CompanyProfileRow>)
        .eq("id", 1)
        .select("*")
        .single();
      if (coreErr) throw new Error(coreErr.message);
      return { ...coreData, ...nextExt };
    }
    return getCompanyProfile();
  }

  throw new Error(error.message);
}

export async function setJournalLockStatus(enabled: boolean): Promise<boolean> {
  demoStore.company.journal_lock_enabled = enabled;
  if (isDemoMode || !supabase) {
    return enabled;
  }

  // Coba update via RPC jika ada, atau fallback langsung ke update company_profile
  try {
    const { data, error } = await (supabase as any).rpc("set_journal_lock_status", {
      p_enabled: enabled,
    });
    if (!error) {
      return Boolean(data ?? enabled);
    }
  } catch {
    // Abaikan dan gunakan update langsung ke company_profile
  }

  const { error: updErr } = await (supabase as any)
    .from("company_profile")
    .update({ journal_lock_enabled: enabled })
    .eq("id", 1);
  if (updErr) throw new Error(updErr.message);
  return enabled;
}

export async function setAutoClosingStatus(enabled: boolean): Promise<boolean> {
  demoStore.company.auto_closing_enabled = enabled;
  if (isDemoMode || !supabase) {
    return enabled;
  }

  try {
    const { error: updErr } = await (supabase as any)
      .from("company_profile")
      .update({ auto_closing_enabled: enabled })
      .eq("id", 1);
    if (!updErr) return enabled;
  } catch {
    // Abaikan jika kolom di Supabase belum dimigrasi
  }
  return enabled;
}

function isLoginMediaMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("login_media_items") &&
    (m.includes("does not exist") ||
      m.includes("schema cache") ||
      m.includes("could not find the table"))
  );
}

function sortLoginMedia(rows: LoginMediaItemRow[]): LoginMediaItemRow[] {
  return [...rows].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export async function listActiveLoginMedia(): Promise<LoginMediaItemRow[]> {
  const localItems = sortLoginMedia(
    readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []),
  ).filter((item) => item.is_active);

  if (isDemoMode || !supabase) {
    return localItems;
  }

  try {
    const { data, error } = await supabase
      .from("login_media_items")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      if (isLoginMediaMissingTableError(error.message)) {
        return localItems;
      }
      throw new Error(error.message);
    }
    const items = (data ?? []) as LoginMediaItemRow[];
    return sortLoginMedia(items);
  } catch {
    return localItems;
  }
}

export async function listAllLoginMedia(): Promise<{
  items: LoginMediaItemRow[];
  usingLocalFallback: boolean;
}> {
  const localItems = sortLoginMedia(
    readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []),
  );

  if (isDemoMode || !supabase) {
    return { items: localItems, usingLocalFallback: false };
  }

  const { data, error } = await supabase
    .from("login_media_items")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isLoginMediaMissingTableError(error.message)) {
      return { items: localItems, usingLocalFallback: true };
    }
    throw new Error(error.message);
  }

  const items = sortLoginMedia((data ?? []) as LoginMediaItemRow[]);
  writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, items);
  return { items, usingLocalFallback: false };
}

export async function createLoginMediaItem(input: {
  title: string;
  subtitle?: string | null;
  category: LoginMediaCategory;
  image_url: string;
  link_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}): Promise<{ item: LoginMediaItemRow; savedToCloud: boolean }> {
  const now = new Date().toISOString();
  const payload = {
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    category: input.category,
    image_url: input.image_url.trim(),
    link_url: input.link_url?.trim() || null,
    display_order: Math.max(1, Math.round(input.display_order ?? 1)),
    is_active: input.is_active ?? true,
  };

  const makeLocal = (): LoginMediaItemRow => ({
    id: crypto.randomUUID(),
    ...payload,
    created_by: isDemoMode ? getDemoActor().id : null,
    created_at: now,
    updated_at: now,
  });

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengelola media login.");
    }
    const created = makeLocal();
    const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);
    writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, sortLoginMedia([...prev, created]));
    appendDemoAudit(actor, "INSERT", "login_media_items", created.id, null, created);
    return { item: created, savedToCloud: false };
  }

  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("login_media_items")
    .insert({
      ...payload,
      created_by: userRes.user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (isLoginMediaMissingTableError(error.message)) {
      const created = makeLocal();
      const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);
      writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, sortLoginMedia([...prev, created]));
      return { item: created, savedToCloud: false };
    }
    throw new Error(error.message);
  }

  const created = data as LoginMediaItemRow;
  const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);
  writeLocalJson(
    LOGIN_MEDIA_STORAGE_KEY,
    sortLoginMedia([...prev.filter((x) => x.id !== created.id), created]),
  );
  return { item: created, savedToCloud: true };
}

export async function updateLoginMediaItem(
  id: string,
  patch: Partial<{
    title: string;
    subtitle: string | null;
    category: LoginMediaCategory;
    image_url: string;
    link_url: string | null;
    display_order: number;
    is_active: boolean;
  }>,
): Promise<{ item: LoginMediaItemRow; savedToCloud: boolean }> {
  const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);
  const now = new Date().toISOString();

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat mengelola media login.");
    }
    const idx = prev.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error("Media tidak ditemukan.");
    const before = structuredClone(prev[idx]!);
    const updated: LoginMediaItemRow = {
      ...before,
      ...patch,
      updated_at: now,
    };
    const next = [...prev];
    next[idx] = updated;
    writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, sortLoginMedia(next));
    appendDemoAudit(actor, "UPDATE", "login_media_items", id, before, updated);
    return { item: updated, savedToCloud: false };
  }

  const { data, error } = await supabase
    .from("login_media_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isLoginMediaMissingTableError(error.message)) {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx < 0) throw new Error("Media tidak ditemukan.");
      const updated: LoginMediaItemRow = {
        ...prev[idx]!,
        ...patch,
        updated_at: now,
      };
      const next = [...prev];
      next[idx] = updated;
      writeLocalJson(LOGIN_MEDIA_STORAGE_KEY, sortLoginMedia(next));
      return { item: updated, savedToCloud: false };
    }
    throw new Error(error.message);
  }

  const updated = data as LoginMediaItemRow;
  writeLocalJson(
    LOGIN_MEDIA_STORAGE_KEY,
    sortLoginMedia([...prev.filter((x) => x.id !== id), updated]),
  );
  return { item: updated, savedToCloud: true };
}

export async function deleteLoginMediaItem(id: string): Promise<void> {
  const prev = readLocalJson<LoginMediaItemRow[]>(LOGIN_MEDIA_STORAGE_KEY, []);

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "super_admin") {
      throw new Error("Hanya Super Admin yang dapat menghapus media login.");
    }
    const target = prev.find((x) => x.id === id);
    writeLocalJson(
      LOGIN_MEDIA_STORAGE_KEY,
      prev.filter((x) => x.id !== id),
    );
    if (target) {
      appendDemoAudit(actor, "DELETE", "login_media_items", id, target, null);
    }
    return;
  }

  const { error } = await supabase.from("login_media_items").delete().eq("id", id);
  if (error) {
    if (isLoginMediaMissingTableError(error.message)) {
      writeLocalJson(
        LOGIN_MEDIA_STORAGE_KEY,
        prev.filter((x) => x.id !== id),
      );
      return;
    }
    throw new Error(error.message);
  }

  writeLocalJson(
    LOGIN_MEDIA_STORAGE_KEY,
    prev.filter((x) => x.id !== id),
  );
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
    .order("id", { ascending: false })
    .limit(1000);
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

export async function deleteVendor(id: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menghapus Vendor.");
    }
    const idx = demoStore.vendors.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error("Vendor tidak ditemukan.");
    const before = structuredClone(demoStore.vendors[idx]);
    demoStore.vendors.splice(idx, 1);
    appendDemoAudit(actor, "DELETE", "vendors", id, before, null);
    return;
  }
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Vendor tidak dapat dihapus karena sudah memiliki riwayat transaksi atau PO terkait. Anda dapat mengubah statusnya menjadi Nonaktif.",
      );
    }
    throw new Error(error.message);
  }
}

export async function listCustomers(): Promise<CustomerRow[]> {
  const extMap = readLocalJson<Record<string, Partial<CustomerRow>>>(CUSTOMER_EXT_STORAGE_KEY, {});
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role === "user") {
      throw new Error("Akses ditolak: User tidak memiliki akses daftar pelanggan.");
    }
    return [...demoStore.customers]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((c) => ({ ...c, ...(extMap[c.id] ?? {}) }));
  }
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("code", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    ...(extMap[c.id] ?? {}),
    ...c,
    logo_storage_path: c.logo_storage_path ?? extMap[c.id]?.logo_storage_path ?? null,
    signature_storage_path: c.signature_storage_path ?? extMap[c.id]?.signature_storage_path ?? null,
    paraf_storage_path: c.paraf_storage_path ?? extMap[c.id]?.paraf_storage_path ?? null,
  }));
}

export async function saveCustomer(
  input: Pick<CustomerRow, "code" | "name"> &
    Partial<CustomerRow> & { id?: string },
): Promise<void> {
  const extPatch: Partial<CustomerRow> = {};
  if ("logo_storage_path" in input) extPatch.logo_storage_path = input.logo_storage_path ?? null;
  if ("signature_storage_path" in input) extPatch.signature_storage_path = input.signature_storage_path ?? null;
  if ("paraf_storage_path" in input) extPatch.paraf_storage_path = input.paraf_storage_path ?? null;

  const saveCustomerExt = (custId: string) => {
    if (Object.keys(extPatch).length === 0) return;
    const extMap = readLocalJson<Record<string, Partial<CustomerRow>>>(CUSTOMER_EXT_STORAGE_KEY, {});
    extMap[custId] = { ...(extMap[custId] ?? {}), ...extPatch };
    writeLocalJson(CUSTOMER_EXT_STORAGE_KEY, extMap);
  };

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
      saveCustomerExt(target.id);
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
        logo_storage_path: input.logo_storage_path ?? null,
        signature_storage_path: input.signature_storage_path ?? null,
        paraf_storage_path: input.paraf_storage_path ?? null,
        is_active: input.is_active ?? true,
        created_by: actor.id,
        created_at: now,
        updated_at: now,
      };
      demoStore.customers.push(created);
      saveCustomerExt(created.id);
      appendDemoAudit(actor, "INSERT", "customers", created.id, null, created);
    }
    return;
  }

  if (input.id) {
    const { id, ...patch } = input;
    saveCustomerExt(id);
    const { error } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", id);
    if (error && (error.message.includes("column") || error.message.includes("schema cache"))) {
      const corePatch: Record<string, unknown> = { ...patch };
      delete corePatch.logo_storage_path;
      delete corePatch.signature_storage_path;
      delete corePatch.paraf_storage_path;
      const { error: coreErr } = await supabase
        .from("customers")
        .update(corePatch as Partial<CustomerRow>)
        .eq("id", id);
      if (coreErr) throw new Error(coreErr.message);
      return;
    }
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("customers").insert(input).select("id").single();
    if (error && (error.message.includes("column") || error.message.includes("schema cache"))) {
      const coreInput: Record<string, unknown> = { ...input };
      delete coreInput.logo_storage_path;
      delete coreInput.signature_storage_path;
      delete coreInput.paraf_storage_path;
      const { data: coreCreated, error: coreErr } = await supabase
        .from("customers")
        .insert(coreInput as unknown as typeof input)
        .select("id")
        .single();
      if (coreErr) throw new Error(coreErr.message);
      if (coreCreated?.id) saveCustomerExt(String(coreCreated.id));
      return;
    }
    if (error) throw new Error(error.message);
    if (data?.id) saveCustomerExt(String(data.id));
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menghapus Pelanggan.");
    }
    const idx = demoStore.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Pelanggan tidak ditemukan.");
    const before = structuredClone(demoStore.customers[idx]);
    demoStore.customers.splice(idx, 1);
    appendDemoAudit(actor, "DELETE", "customers", id, before, null);
    return;
  }
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Pelanggan tidak dapat dihapus karena sudah memiliki riwayat proyek atau dokumen penagihan terkait. Anda dapat mengubah statusnya menjadi Nonaktif.",
      );
    }
    throw new Error(error.message);
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

export async function deleteProjects(projectIds: string[]): Promise<void> {
  if (projectIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menghapus proyek.");
    }
    const idSet = new Set(projectIds);
    const hasLinkedFinancial =
      demoStore.journals.some((j) => j.project_id && idSet.has(j.project_id)) ||
      demoStore.salesInvoices.some((inv) => idSet.has(inv.project_id)) ||
      demoStore.purchaseOrders.some((po) => idSet.has(po.project_id)) ||
      demoStore.paymentRequests.some((pa) => idSet.has(pa.project_id));
    if (hasLinkedFinancial) {
      throw new Error(
        "Proyek yang sudah memiliki jurnal, PO, pengajuan pembayaran, atau invoice tidak dapat dihapus.",
      );
    }
    demoStore.projectMembers = demoStore.projectMembers.filter(
      (m) => !idSet.has(m.project_id),
    );
    demoStore.milestones = demoStore.milestones.filter((m) => !idSet.has(m.project_id));
    demoStore.projectDocuments = demoStore.projectDocuments.filter(
      (d) => !idSet.has(d.project_id),
    );
    demoStore.progressReports = demoStore.progressReports.filter(
      (b) => !idSet.has(b.project_id),
    );
    demoStore.uatChecklists = demoStore.uatChecklists.filter(
      (u) => !idSet.has(u.project_id),
    );
    demoStore.handoverReports = demoStore.handoverReports.filter(
      (h) => !idSet.has(h.project_id),
    );
    demoStore.projectProgress = demoStore.projectProgress.filter(
      (pp) => !idSet.has(pp.project_id),
    );
    demoStore.projects = demoStore.projects.filter((p) => !idSet.has(p.id));
    return;
  }

  const { error } = await supabase.from("projects").delete().in("id", projectIds);
  if (error) {
    if (error.message.toLowerCase().includes("foreign key constraint")) {
      throw new Error(
        "Proyek yang sudah terhubung dengan jurnal, PO, pembayaran, atau invoice tidak dapat dihapus.",
      );
    }
    throw new Error(error.message);
  }
}

