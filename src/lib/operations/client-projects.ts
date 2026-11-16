import { demoStore, getDemoActor } from "@/lib/data-service";
import { cachedQuery } from "@/lib/realtime-cache";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  ClientPurchaseOrderRow,
  HandoverReportRow,
  MilestoneRow,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectProgressRow,
  QuotationItemRow,
  QuotationRow,
  ReceiptRow,
  SalesInvoiceRow,
  UatChecklistRow,
  UatItemRow,
} from "@/types/database.types";

// =============================================================================
// DOMAIN SUB-MODULE RE-EXPORTS (100% Backward Compatible Facade)
// =============================================================================

export * from "@/lib/operations/client-projects-po";
export * from "@/lib/operations/client-projects-docs";
export * from "@/lib/operations/client-projects-termin";

// =============================================================================
// WORKSPACE BUNDLE AGGREGATOR
// =============================================================================

export interface ProjectWorkspaceBundle {
  quotations: QuotationRow[];
  quotationItems: QuotationItemRow[];
  clientPos: ClientPurchaseOrderRow[];
  documents: ProjectDocumentRow[];
  milestones: MilestoneRow[];
  bakpList: ProgressReportRow[];
  uatList: UatChecklistRow[];
  uatItems: UatItemRow[];
  bastList: HandoverReportRow[];
  progressEntries: ProjectProgressRow[];
  invoices: SalesInvoiceRow[];
  receipts: ReceiptRow[];
}

export async function getProjectWorkspace(
  projectId?: string,
): Promise<ProjectWorkspaceBundle> {
  return cachedQuery(`workspace:${projectId ?? "all"}`, async () => {
    if (isDemoMode || !supabase) {
      getDemoActor();
      const filterPrj = <T extends { project_id: string | null }>(arr: T[]) =>
        projectId ? arr.filter((x) => x.project_id === projectId) : arr;

      const quotations = structuredClone(filterPrj(demoStore.quotations));
      const qIds = new Set(quotations.map((q) => q.id));
      const uatList = structuredClone(filterPrj(demoStore.uatChecklists));
      const uIds = new Set(uatList.map((u) => u.id));
      const invoices = structuredClone(filterPrj(demoStore.salesInvoices));
      const iIds = new Set(invoices.map((i) => i.id));

      return {
        quotations,
        quotationItems: structuredClone(
          demoStore.quotationItems.filter((qi) => qIds.has(qi.quotation_id)),
        ),
        clientPos: structuredClone(
          projectId
            ? demoStore.clientPos.filter(
                (c) => c.project_id === projectId || c.project_id === null,
              )
            : demoStore.clientPos,
        ),
        documents: structuredClone(filterPrj(demoStore.projectDocuments)),
        milestones: structuredClone(filterPrj(demoStore.milestones)).sort(
          (a, b) => a.sequence_no - b.sequence_no,
        ),
        bakpList: structuredClone(filterPrj(demoStore.progressReports)),
        uatList,
        uatItems: structuredClone(
          demoStore.uatItems.filter((ui) => uIds.has(ui.uat_id)),
        ),
        bastList: structuredClone(filterPrj(demoStore.handoverReports)),
        progressEntries: structuredClone(filterPrj(demoStore.projectProgress)),
        invoices,
        receipts: structuredClone(
          demoStore.receipts.filter((r) => iIds.has(r.invoice_id)),
        ),
      };
    }

    const [
      qRes,
      qiRes,
      cpoRes,
      docRes,
      msRes,
      bakpRes,
      uatRes,
      uiRes,
      bastRes,
      progRes,
      invRes,
      kwRes,
    ] = await Promise.all([
      projectId
        ? supabase.from("quotations").select("*").eq("project_id", projectId)
        : supabase.from("quotations").select("*"),
      supabase.from("quotation_items").select("*").order("line_no"),
      supabase.from("client_purchase_orders").select("*").order("created_at", { ascending: false }),
      projectId
        ? supabase.from("project_documents").select("*").eq("project_id", projectId)
        : supabase.from("project_documents").select("*"),
      projectId
        ? supabase.from("milestones").select("*").eq("project_id", projectId).order("sequence_no")
        : supabase.from("milestones").select("*").order("sequence_no"),
      projectId
        ? supabase.from("progress_reports").select("*").eq("project_id", projectId)
        : supabase.from("progress_reports").select("*"),
      projectId
        ? supabase.from("uat_checklists").select("*").eq("project_id", projectId)
        : supabase.from("uat_checklists").select("*"),
      supabase.from("uat_items").select("*").order("line_no"),
      projectId
        ? supabase.from("handover_reports").select("*").eq("project_id", projectId)
        : supabase.from("handover_reports").select("*"),
      projectId
        ? supabase.from("project_progress").select("*").eq("project_id", projectId).order("progress_date")
        : supabase.from("project_progress").select("*").order("progress_date"),
      projectId
        ? supabase.from("sales_invoices").select("*").eq("project_id", projectId).order("invoice_date", { ascending: false })
        : supabase.from("sales_invoices").select("*").order("invoice_date", { ascending: false }),
      supabase.from("receipts").select("*").order("receipt_date", { ascending: false }),
    ]);

    return {
      quotations: qRes.data ?? [],
      quotationItems: qiRes.data ?? [],
      clientPos: cpoRes.data ?? [],
      documents: docRes.data ?? [],
      milestones: msRes.data ?? [],
      bakpList: bakpRes.data ?? [],
      uatList: uatRes.data ?? [],
      uatItems: uiRes.data ?? [],
      bastList: bastRes.data ?? [],
      progressEntries: progRes.data ?? [],
      invoices: invRes.data ?? [],
      receipts: kwRes.data ?? [],
    };
  });
}
