import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
  nextDemoDocNumber,
} from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";
import { cachedQuery, invalidateAndNotifyDataChange } from "@/lib/realtime-cache";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  NotificationRow,
  PoItemRow,
  PurchaseOrderRow,
} from "@/types/database.types";

// =============================================================================
// 1. Notifikasi dalam Aplikasi (UC-03) & Log Ekspor (UC-29, UC-39)
// =============================================================================
export async function listMyNotifications(): Promise<NotificationRow[]> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    return demoStore.notifications
      .filter((n) => n.user_id === actor.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markAllNotificationsRead(): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    for (const n of demoStore.notifications) {
      if (n.user_id === actor.id) n.is_read = true;
    }
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
}

export async function recordExportLog(
  reportType: string,
  format: "PDF" | "EXCEL" | "CSV",
  periodFilter?: string,
): Promise<void> {
  if (isDemoMode || !supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("export_logs").insert({
    user_id: user.id,
    report_type: reportType,
    format,
    period_filter: periodFilter ?? null,
  });
}

// =============================================================================
// 2. PO Pembelian Internal ke Vendor (UC-04, UC-05, FR-PO1..6, BR-7)
// =============================================================================
export async function listPurchaseOrders(): Promise<{
  orders: PurchaseOrderRow[];
  items: PoItemRow[];
}> {
  return cachedQuery("purchase_orders:list", async () => {
    if (isDemoMode || !supabase) {
      const actor = getDemoActor();
      const orders =
        actor.role === "admin"
          ? structuredClone(demoStore.purchaseOrders)
          : structuredClone(
              demoStore.purchaseOrders.filter((po) => po.created_by === actor.id),
            );
      const ids = new Set(orders.map((o) => o.id));
      return {
        orders,
        items: structuredClone(demoStore.poItems.filter((i) => ids.has(i.po_id))),
      };
    }
    const [poRes, itemRes] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("po_items").select("*").order("line_no", { ascending: true }),
    ]);
    if (poRes.error) throw new Error(poRes.error.message);
    if (itemRes.error) throw new Error(itemRes.error.message);
    return {
      orders: poRes.data ?? [],
      items: itemRes.data ?? [],
    };
  });
}

export async function createPurchaseOrder(input: {
  poDate: string;
  vendorId: string;
  projectId: string;
  notes?: string;
  issueImmediately: boolean;
  budgetWarningAcknowledged?: boolean;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
}): Promise<PurchaseOrderRow> {
  if (input.items.length === 0) {
    throw new Error("Minimal harus ada 1 baris item barang/jasa pada PO.");
  }
  const computedItems = input.items.map((item, idx) => ({
    line_no: idx + 1,
    description: item.description.trim(),
    quantity: item.quantity,
    unit: item.unit.trim() || "Unit",
    unit_price: roundRupiah(item.unitPrice),
    line_total: roundRupiah(item.quantity * item.unitPrice),
  }));
  const subtotal = computedItems.reduce((s, i) => s + i.line_total, 0);

  if (input.issueImmediately && subtotal <= 0) {
    throw new Error(
      "Purchase Order yang langsung diterbitkan wajib memiliki total nilai lebih dari Rp 0.",
    );
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const now = new Date().toISOString();
    const po: PurchaseOrderRow = {
      id: crypto.randomUUID(),
      po_number: nextDemoDocNumber("POP", input.poDate),
      po_date: input.poDate,
      vendor_id: input.vendorId,
      project_id: input.projectId,
      subtotal,
      tax_amount: 0,
      total_amount: subtotal,
      status: input.issueImmediately ? "issued" : "draft",
      notes: input.notes?.trim() || null,
      budget_warning_acknowledged: Boolean(input.budgetWarningAcknowledged),
      issued_at: input.issueImmediately ? now : null,
      cancelled_at: null,
      cancel_reason: null,
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.purchaseOrders.unshift(po);
    for (const ci of computedItems) {
      demoStore.poItems.push({
        id: crypto.randomUUID(),
        po_id: po.id,
        ...ci,
      });
    }
    appendDemoAudit(actor, "INSERT", "purchase_orders", po.id, null, po);
    invalidateAndNotifyDataChange("purchase_orders");
    return structuredClone(po);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi pengguna tidak ditemukan.");

  const { data: poNumber, error: seqErr } = await supabase.rpc("next_doc_number", {
    p_doc_type: "POP",
    p_doc_date: input.poDate,
  });
  if (seqErr) throw new Error(seqErr.message);

  const { data: draftPo, error: insErr } = await supabase
    .from("purchase_orders")
    .insert({
      po_number: poNumber,
      po_date: input.poDate,
      vendor_id: input.vendorId,
      project_id: input.projectId,
      subtotal,
      tax_amount: 0,
      total_amount: subtotal,
      status: "draft",
      notes: input.notes?.trim() || null,
      budget_warning_acknowledged: Boolean(input.budgetWarningAcknowledged),
      created_by: user.id,
    })
    .select("*")
    .single();
  if (insErr) throw new Error(insErr.message);

  const { error: itemsErr } = await supabase.from("po_items").insert(
    computedItems.map((ci) => ({
      po_id: draftPo.id,
      ...ci,
    })),
  );
  if (itemsErr) throw new Error(itemsErr.message);

  if (input.issueImmediately) {
    const { data: issued, error: issErr } = await supabase
      .from("purchase_orders")
      .update({ status: "issued" })
      .eq("id", draftPo.id)
      .select("*")
      .single();
    if (issErr) throw new Error(issErr.message);
    invalidateAndNotifyDataChange("purchase_orders");
    return issued;
  }

  invalidateAndNotifyDataChange("purchase_orders");
  return draftPo;
}

export async function updatePurchaseOrder(
  poId: string,
  input: {
    poDate: string;
    vendorId: string;
    projectId: string;
    notes?: string;
    issueImmediately?: boolean;
    budgetWarningAcknowledged?: boolean;
    items: Array<{
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>;
  },
): Promise<PurchaseOrderRow> {
  if (input.items.length === 0) {
    throw new Error("Minimal harus ada 1 baris item barang/jasa pada PO.");
  }
  const computedItems = input.items.map((item, idx) => ({
    line_no: idx + 1,
    description: item.description.trim(),
    quantity: item.quantity,
    unit: item.unit.trim() || "Unit",
    unit_price: roundRupiah(item.unitPrice),
    line_total: roundRupiah(item.quantity * item.unitPrice),
  }));
  const subtotal = computedItems.reduce((s, i) => s + i.line_total, 0);

  if (input.issueImmediately && subtotal <= 0) {
    throw new Error(
      "Purchase Order yang langsung diterbitkan wajib memiliki total nilai lebih dari Rp 0.",
    );
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const po = demoStore.purchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error("PO tidak ditemukan.");
    if (po.status !== "draft") {
      throw new Error("Hanya PO berstatus Draf yang dapat diubah rinciannya (BR-7).");
    }
    const before = structuredClone(po);
    const now = new Date().toISOString();
    po.po_date = input.poDate;
    po.vendor_id = input.vendorId;
    po.project_id = input.projectId;
    po.notes = input.notes?.trim() || null;
    po.subtotal = subtotal;
    po.total_amount = subtotal;
    po.updated_at = now;
    if (input.issueImmediately) {
      po.status = "issued";
      po.issued_at = now;
    }

    demoStore.poItems = demoStore.poItems.filter((i) => i.po_id !== poId);
    for (const ci of computedItems) {
      demoStore.poItems.push({
        id: crypto.randomUUID(),
        po_id: poId,
        ...ci,
      });
    }
    appendDemoAudit(actor, "UPDATE", "purchase_orders", po.id, before, po);
    invalidateAndNotifyDataChange("purchase_orders");
    return structuredClone(po);
  }

  const { data: currentPo, error: getErr } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", poId)
    .single();
  if (getErr) throw new Error(getErr.message);
  if (currentPo.status !== "draft") {
    throw new Error("Hanya PO berstatus Draf yang dapat diubah rinciannya (BR-7).");
  }

  const { error: delItemsErr } = await supabase
    .from("po_items")
    .delete()
    .eq("po_id", poId);
  if (delItemsErr) throw new Error(delItemsErr.message);

  const { error: insItemsErr } = await supabase.from("po_items").insert(
    computedItems.map((ci) => ({
      po_id: poId,
      ...ci,
    })),
  );
  if (insItemsErr) throw new Error(insItemsErr.message);

  const { data: updated, error: updErr } = await supabase
    .from("purchase_orders")
    .update({
      po_date: input.poDate,
      vendor_id: input.vendorId,
      project_id: input.projectId,
      notes: input.notes?.trim() || null,
      subtotal,
      total_amount: subtotal,
      status: input.issueImmediately ? "issued" : "draft",
      issued_at: input.issueImmediately ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", poId)
    .select("*")
    .single();
  if (updErr) throw new Error(updErr.message);

  invalidateAndNotifyDataChange("purchase_orders");
  return updated;
}

export async function deletePurchaseOrders(poIds: string[]): Promise<void> {
  if (poIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const idSet = new Set(poIds);
    const nonDraft = demoStore.purchaseOrders.filter(
      (p) => idSet.has(p.id) && p.status !== "draft",
    );
    if (nonDraft.length > 0) {
      throw new Error(
        "Hanya PO berstatus Draf yang dapat dihapus. PO yang sudah diterbitkan atau selesai terkunci oleh sistem (BR-7).",
      );
    }
    demoStore.poItems = demoStore.poItems.filter((i) => !idSet.has(i.po_id));
    demoStore.purchaseOrders = demoStore.purchaseOrders.filter((p) => !idSet.has(p.id));
    for (const id of poIds) {
      appendDemoAudit(actor, "DELETE", "purchase_orders", id, null, null);
    }
    invalidateAndNotifyDataChange("purchase_orders");
    return;
  }

  // Hapus item-item PO terlebih dahulu agar trigger draft-only pada po_items tidak gagal saat parent terhapus
  const { error: itemsErr } = await supabase
    .from("po_items")
    .delete()
    .in("po_id", poIds);
  if (itemsErr) throw new Error(itemsErr.message);

  const { error } = await supabase
    .from("purchase_orders")
    .delete()
    .in("id", poIds)
    .eq("status", "draft");
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("purchase_orders");
}

export async function updatePurchaseOrderStatus(
  poId: string,
  nextStatus: "issued" | "completed" | "cancelled",
  cancelReason?: string,
): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const po = demoStore.purchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error("PO tidak ditemukan.");
    if (po.status === "completed" || po.status === "cancelled") {
      throw new Error("PO sudah terkunci dan tidak dapat diubah lagi (BR-7).");
    }
    const before = structuredClone(po);
    po.status = nextStatus;
    if (nextStatus === "issued") po.issued_at = new Date().toISOString();
    if (nextStatus === "cancelled") {
      po.cancelled_at = new Date().toISOString();
      po.cancel_reason = cancelReason?.trim() || "Dibatalkan pengguna";
    }
    po.updated_at = new Date().toISOString();
    appendDemoAudit(actor, "UPDATE", "purchase_orders", po.id, before, po);
    invalidateAndNotifyDataChange("purchase_orders");
    return;
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: nextStatus,
      cancel_reason: nextStatus === "cancelled" ? (cancelReason?.trim() ?? null) : null,
    })
    .eq("id", poId);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("purchase_orders");
}
