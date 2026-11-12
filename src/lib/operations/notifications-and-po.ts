import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
  nextDemoDocNumber,
} from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";
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
    return issued;
  }

  return draftPo;
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
}
