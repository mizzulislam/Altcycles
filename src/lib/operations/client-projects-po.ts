import { appendDemoAudit, demoStore, getDemoActor } from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";
import { isDemoMode, supabase } from "@/lib/supabase";
import type { ClientPoStatus } from "@/types/database.types";

export async function verifyClientPurchaseOrder(params: {
  clientPoId: string;
  projectId: string;
  approve: boolean;
  rejectionNote?: string;
}): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat memverifikasi PO klien.");
    }
    const cpo = demoStore.clientPos.find((c) => c.id === params.clientPoId);
    if (!cpo) throw new Error("PO klien tidak ditemukan.");
    if (params.approve) {
      cpo.status = "verified";
      cpo.project_id = params.projectId;
      cpo.verified_by = actor.id;
      cpo.verified_at = new Date().toISOString();
      cpo.rejection_note = null;
      appendDemoAudit(actor, "VERIFY_PO", "client_purchase_orders", cpo.id, null, cpo);
    } else {
      cpo.status = "rejected";
      cpo.verified_by = actor.id;
      cpo.verified_at = new Date().toISOString();
      cpo.rejection_note = params.rejectionNote?.trim() || "Ditolak";
    }
    return;
  }

  const { error } = await supabase.rpc("verify_client_po", {
    p_client_po_id: params.clientPoId,
    p_project_id: params.projectId,
    p_approve: params.approve,
    p_rejection_note: params.rejectionNote ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function updateClientPurchaseOrder(
  cpoId: string,
  input: {
    clientName: string;
    clientCompany: string;
    clientEmail: string;
    poValue: number;
    status: ClientPoStatus;
  },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const cpo = demoStore.clientPos.find((c) => c.id === cpoId);
    if (!cpo) throw new Error("PO Klien tidak ditemukan.");
    cpo.client_name = input.clientName.trim();
    cpo.client_company = input.clientCompany.trim() || null;
    cpo.client_email = input.clientEmail.trim();
    cpo.po_value = roundRupiah(input.poValue);
    cpo.status = input.status;
    return;
  }
  const { error } = await supabase
    .from("client_purchase_orders")
    .update({
      client_name: input.clientName.trim(),
      client_company: input.clientCompany.trim() || null,
      client_email: input.clientEmail.trim(),
      po_value: roundRupiah(input.poValue),
      status: input.status,
    })
    .eq("id", cpoId);
  if (error) throw new Error(error.message);
}

export async function deleteClientPurchaseOrders(cpoIds: string[]): Promise<void> {
  if (cpoIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(cpoIds);
    demoStore.clientPos = demoStore.clientPos.filter((c) => !idSet.has(c.id));
    return;
  }
  const { error } = await supabase
    .from("client_purchase_orders")
    .delete()
    .in("id", cpoIds);
  if (error) throw new Error(error.message);
}
