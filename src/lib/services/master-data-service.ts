import { inferRevenueMethodFromTerms } from "@/lib/formatters";
import { cachedQuery, invalidateAndNotifyDataChange } from "@/lib/realtime-cache";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  CustomerRow,
  ProjectMemberRow,
  ProjectRow,
  VendorRow,
} from "@/types/database.types";
import { appendDemoAudit, demoStore, getDemoActor } from "./demo-store";
import {
  CUSTOMER_EXT_STORAGE_KEY,
  readLocalJson,
  writeLocalJson,
} from "./storage-helpers";

// =============================================================================
// 6. Master Vendor, Pelanggan, & Proyek
// =============================================================================
export async function listVendors(): Promise<VendorRow[]> {
  return cachedQuery("vendors:list", async () => {
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
  });
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
    invalidateAndNotifyDataChange("vendors");
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
  invalidateAndNotifyDataChange("vendors");
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
    invalidateAndNotifyDataChange("vendors");
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
  invalidateAndNotifyDataChange("vendors");
}

export async function listCustomers(): Promise<CustomerRow[]> {
  return cachedQuery("customers:list", async () => {
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
  });
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
    invalidateAndNotifyDataChange("customers");
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
      invalidateAndNotifyDataChange("customers");
      return;
    }
    if (error) throw new Error(error.message);
    invalidateAndNotifyDataChange("customers");
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
      invalidateAndNotifyDataChange("customers");
      return;
    }
    if (error) throw new Error(error.message);
    if (data?.id) saveCustomerExt(String(data.id));
    invalidateAndNotifyDataChange("customers");
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
    invalidateAndNotifyDataChange("customers");
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
  invalidateAndNotifyDataChange("customers");
}

export async function listProjects(): Promise<{
  projects: ProjectRow[];
  members: ProjectMemberRow[];
}> {
  return cachedQuery("projects:list", async () => {
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
  });
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
    invalidateAndNotifyDataChange("projects");
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
  invalidateAndNotifyDataChange("projects");
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
    invalidateAndNotifyDataChange("projects");
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
  invalidateAndNotifyDataChange("projects");
}
