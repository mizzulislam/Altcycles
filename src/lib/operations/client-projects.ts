import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
  nextDemoDocNumber,
} from "@/lib/data-service";
import { inferRevenueMethodFromTerms, roundRupiah } from "@/lib/formatters";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  BakpStatus,
  BastStatus,
  ClientPoStatus,
  ClientPurchaseOrderRow,
  HandoverReportRow,
  InvoiceKind,
  MilestoneRow,
  MilestoneStatus,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectProgressRow,
  QuotationItemRow,
  QuotationRow,
  QuotationStatus,
  ReceiptRow,
  SalesInvoiceRow,
  UatChecklistRow,
  UatConclusion,
  UatItemRow,
} from "@/types/database.types";
import {
  findDemoPeriodByDate,
  postDemoJournal,
  tryEliminateDemoProject,
} from "@/lib/operations/shared";

// =============================================================================
// 6. Siklus Proyek Klien, Dokumen Lampiran A, & Progress Billing (UC-12..25)
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
}

export async function createQuotation(input: {
  quotationDate: string;
  validUntil: string;
  customerId: string;
  projectId: string | null;
  projectTitle: string;
  clientNeedSummary: string;
  estimatedWeeks: number;
  revisionLimit: number;
  items: Array<{ featureName: string; description: string; costAmount: number }>;
}): Promise<QuotationRow> {
  const totalAmount = input.items.reduce((s, i) => s + roundRupiah(i.costAmount), 0);
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const now = new Date().toISOString();
    const q: QuotationRow = {
      id: crypto.randomUUID(),
      quotation_number: nextDemoDocNumber("QT", input.quotationDate),
      quotation_date: input.quotationDate,
      valid_until: input.validUntil,
      customer_id: input.customerId,
      project_id: input.projectId,
      project_title: input.projectTitle.trim(),
      client_need_summary: input.clientNeedSummary.trim() || null,
      estimated_weeks: input.estimatedWeeks,
      revision_limit: input.revisionLimit,
      total_amount: totalAmount,
      status: "sent",
      terms_json: ["Harga tidak dikenakan PPN karena Altvira belum PKP."],
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.quotations.unshift(q);
    input.items.forEach((it, idx) => {
      demoStore.quotationItems.push({
        id: crypto.randomUUID(),
        quotation_id: q.id,
        line_no: idx + 1,
        feature_name: it.featureName.trim(),
        description: it.description.trim() || null,
        cost_amount: roundRupiah(it.costAmount),
      });
    });
    return structuredClone(q);
  }

  const { data: qtNo, error: seqErr } = await supabase.rpc("next_doc_number", {
    p_doc_type: "QT",
    p_doc_date: input.quotationDate,
  });
  if (seqErr) throw new Error(seqErr.message);

  const { data: q, error: qErr } = await supabase
    .from("quotations")
    .insert({
      quotation_number: qtNo,
      quotation_date: input.quotationDate,
      valid_until: input.validUntil,
      customer_id: input.customerId,
      project_id: input.projectId,
      project_title: input.projectTitle.trim(),
      client_need_summary: input.clientNeedSummary.trim() || null,
      estimated_weeks: input.estimatedWeeks,
      revision_limit: input.revisionLimit,
      total_amount: totalAmount,
      status: "sent",
    })
    .select("*")
    .single();
  if (qErr) throw new Error(qErr.message);

  const { error: iErr } = await supabase.from("quotation_items").insert(
    input.items.map((it, idx) => ({
      quotation_id: q.id,
      line_no: idx + 1,
      feature_name: it.featureName.trim(),
      description: it.description.trim() || null,
      cost_amount: roundRupiah(it.costAmount),
    })),
  );
  if (iErr) throw new Error(iErr.message);
  return q;
}

export async function createProjectDocument(input: {
  projectId: string;
  docType: "SOW" | "SPK";
  title: string;
  summary: string;
  isSigned: boolean;
  signedFileName?: string;
  contentJson?: Record<string, unknown>;
}): Promise<ProjectDocumentRow> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const payloadContent = {
    ...(input.contentJson ?? {}),
    summary: input.summary.trim(),
  };
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const now = new Date().toISOString();
    const docNumber = nextDemoDocNumber(input.docType, todayIso);
    const doc: ProjectDocumentRow = {
      id: crypto.randomUUID(),
      project_id: input.projectId,
      doc_type: input.docType,
      doc_number: docNumber,
      title: input.title.trim(),
      version: 1,
      content_json: payloadContent as ProjectDocumentRow["content_json"],
      is_signed: input.isSigned,
      signed_storage_path: input.signedFileName ? `demo/${input.signedFileName}` : null,
      visible_to_buyer: true,
      uploaded_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.projectDocuments.unshift(doc);
    if (input.docType === "SPK") {
      const prj = demoStore.projects.find((p) => p.id === input.projectId);
      if (prj) prj.spk_number = docNumber;
    }
    return structuredClone(doc);
  }

  const { data: docNo, error: seqErr } = await supabase.rpc("next_doc_number", {
    p_doc_type: input.docType,
    p_doc_date: todayIso,
  });
  if (seqErr) throw new Error(seqErr.message);

  const { data: created, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: input.projectId,
      doc_type: input.docType,
      doc_number: docNo,
      title: input.title.trim(),
      content_json: payloadContent as ProjectDocumentRow["content_json"],
      is_signed: input.isSigned,
      signed_storage_path: input.signedFileName ? `docs/${input.signedFileName}` : null,
      visible_to_buyer: true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

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

export async function saveProjectMilestonesSchedule(
  projectId: string,
  items: Array<{
    name: string;
    isDownPayment: boolean;
    isFinalSettlement: boolean;
    percentage: number;
    amount: number;
    achievementCriteria: string;
  }>,
): Promise<void> {
  const sumPct = Number(items.reduce((s, i) => s + i.percentage, 0).toFixed(2));
  if (sumPct !== 100) {
    throw new Error(
      `Total persentase termin per proyek harus tepat 100% (saat ini: ${sumPct}%) (BR-17).`,
    );
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") throw new Error("Hanya Admin yang berwenang.");
    const prj = demoStore.projects.find((p) => p.id === projectId);
    if (!prj) throw new Error("Proyek tidak ditemukan.");
    const existingIds = new Set(
      demoStore.milestones
        .filter((m) => m.project_id === projectId)
        .map((m) => m.id),
    );
    const hasLockedMilestone =
      demoStore.progressReports.some((pr) => existingIds.has(pr.milestone_id)) ||
      demoStore.salesInvoices.some(
        (si) => si.milestone_id !== null && existingIds.has(si.milestone_id),
      );
    if (hasLockedMilestone) {
      throw new Error(
        "Jadwal termin tidak dapat disusun ulang karena sebagian termin sudah memiliki BAKP atau Invoice terkait.",
      );
    }
    const sumAmt = items.reduce((s, i) => s + roundRupiah(i.amount), 0);
    if (prj.contract_value > 0 && sumAmt !== prj.contract_value) {
      throw new Error(
        `Total nilai termin (${sumAmt}) harus sama dengan nilai kontrak proyek (${prj.contract_value}).`,
      );
    }
    demoStore.milestones = demoStore.milestones.filter((m) => m.project_id !== projectId);
    items.forEach((it, idx) => {
      demoStore.milestones.push({
        id: crypto.randomUUID(),
        project_id: projectId,
        sequence_no: idx + 1,
        name: it.name.trim(),
        is_down_payment: it.isDownPayment,
        is_final_settlement: it.isFinalSettlement,
        percentage: it.percentage,
        amount: roundRupiah(it.amount),
        achievement_criteria: it.achievementCriteria.trim() || null,
        status: "planned",
        created_at: new Date().toISOString(),
      });
    });
    prj.term_count = items.length;
    prj.revenue_method = inferRevenueMethodFromTerms(items.length);
    return;
  }

  const { error } = await supabase.rpc("save_project_milestones", {
    p_project_id: projectId,
    p_milestones: items.map((it) => ({
      name: it.name.trim(),
      is_down_payment: it.isDownPayment,
      is_final_settlement: it.isFinalSettlement,
      percentage: it.percentage,
      amount: roundRupiah(it.amount),
      achievement_criteria: it.achievementCriteria.trim(),
    })),
  });
  if (error) throw new Error(error.message);
}

export async function createBakpReport(input: {
  bakpDate: string;
  projectId: string;
  milestoneId: string;
  cumulativePercentage: number;
  billableAmount: number;
  findingsNotes: string;
  approveImmediately: boolean;
}): Promise<ProgressReportRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const now = new Date().toISOString();
    const bakp: ProgressReportRow = {
      id: crypto.randomUUID(),
      bakp_number: nextDemoDocNumber("BAKP", input.bakpDate),
      bakp_date: input.bakpDate,
      project_id: input.projectId,
      milestone_id: input.milestoneId,
      cumulative_percentage: input.cumulativePercentage,
      billable_amount: roundRupiah(input.billableAmount),
      deliverables_json: [{ name: "Deliverable Termin sesuai SoW", status: "Selesai" }],
      findings_notes: input.findingsNotes.trim() || null,
      status: input.approveImmediately ? "approved_by_client" : "draft",
      signed_storage_path: input.approveImmediately ? "demo/bakp-signed.pdf" : null,
      approved_at: input.approveImmediately ? now : null,
      created_by: actor.id,
      created_at: now,
    };
    demoStore.progressReports.unshift(bakp);
    if (input.approveImmediately) {
      const ms = demoStore.milestones.find((m) => m.id === input.milestoneId);
      if (ms && ms.status === "planned") ms.status = "bakp_approved";
    }
    return structuredClone(bakp);
  }

  const { data: bakpNo, error: seqErr } = await supabase.rpc("next_doc_number", {
    p_doc_type: "BAKP",
    p_doc_date: input.bakpDate,
  });
  if (seqErr) throw new Error(seqErr.message);

  const { data: created, error } = await supabase
    .from("progress_reports")
    .insert({
      bakp_number: bakpNo,
      bakp_date: input.bakpDate,
      project_id: input.projectId,
      milestone_id: input.milestoneId,
      cumulative_percentage: input.cumulativePercentage,
      billable_amount: roundRupiah(input.billableAmount),
      deliverables_json: [{ name: "Deliverable Termin sesuai SoW", status: "Selesai" }],
      findings_notes: input.findingsNotes.trim() || null,
      status: input.approveImmediately ? "approved_by_client" : "draft",
      approved_at: input.approveImmediately ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function approveBakpByClient(bakpId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const bakp = demoStore.progressReports.find((b) => b.id === bakpId);
    if (!bakp) throw new Error("BAKP tidak ditemukan.");
    bakp.status = "approved_by_client";
    bakp.approved_at = new Date().toISOString();
    return;
  }
  const { error } = await supabase
    .from("progress_reports")
    .update({ status: "approved_by_client", approved_at: new Date().toISOString() })
    .eq("id", bakpId);
  if (error) throw new Error(error.message);
}

export async function createUatChecklist(input: {
  testDate: string;
  projectId: string;
  stagingUrl: string;
  clientTesterName: string;
  altviraCompanionName: string;
  conclusion: UatConclusion;
  scenarios: Array<{ featureName: string; testScenario: string; result: "pass" | "fail" }>;
}): Promise<UatChecklistRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const uat: UatChecklistRow = {
      id: crypto.randomUUID(),
      uat_number: nextDemoDocNumber("UAT", input.testDate),
      test_date: input.testDate,
      project_id: input.projectId,
      staging_url: input.stagingUrl.trim() || null,
      client_tester_name: input.clientTesterName.trim(),
      altvira_companion_name: input.altviraCompanionName.trim(),
      conclusion: input.conclusion,
      signed_storage_path: null,
      created_by: actor.id,
      created_at: new Date().toISOString(),
    };
    demoStore.uatChecklists.unshift(uat);
    input.scenarios.forEach((sc, idx) => {
      demoStore.uatItems.push({
        id: crypto.randomUUID(),
        uat_id: uat.id,
        line_no: idx + 1,
        feature_name: sc.featureName.trim(),
        test_scenario: sc.testScenario.trim(),
        result: sc.result,
        notes: null,
      });
    });
    return structuredClone(uat);
  }

  const { data: uatNo, error: seqErr } = await supabase.rpc("next_doc_number", {
    p_doc_type: "UAT",
    p_doc_date: input.testDate,
  });
  if (seqErr) throw new Error(seqErr.message);

  const { data: created, error } = await supabase
    .from("uat_checklists")
    .insert({
      uat_number: uatNo,
      test_date: input.testDate,
      project_id: input.projectId,
      staging_url: input.stagingUrl.trim() || null,
      client_tester_name: input.clientTesterName.trim(),
      altvira_companion_name: input.altviraCompanionName.trim(),
      conclusion: input.conclusion,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  if (input.scenarios.length > 0) {
    const { error: scErr } = await supabase.from("uat_items").insert(
      input.scenarios.map((sc, idx) => ({
        uat_id: created.id,
        line_no: idx + 1,
        feature_name: sc.featureName.trim(),
        test_scenario: sc.testScenario.trim(),
        result: sc.result,
        notes: null,
      })),
    );
    if (scErr) throw new Error(scErr.message);
  }
  return created;
}

export async function createBastHandover(input: {
  bastDate: string;
  projectId: string;
  uatId: string;
  warrantyDays: number;
  isSigned: boolean;
}): Promise<HandoverReportRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const uat = demoStore.uatChecklists.find((u) => u.id === input.uatId);
    if (!uat || (uat.conclusion !== "accepted" && uat.conclusion !== "accepted_with_notes")) {
      throw new Error(
        "BAST tidak dapat diterbitkan sebelum UAT dinyatakan Diterima (FR-PK8).",
      );
    }
    const bast: HandoverReportRow = {
      id: crypto.randomUUID(),
      bast_number: nextDemoDocNumber("BAST", input.bastDate),
      bast_date: input.bastDate,
      project_id: input.projectId,
      uat_id: input.uatId,
      handover_items_json: [
        { item: "Source Code & Dokumentasi Teknis", format: "Git Repository + PDF", note: "Lengkap" },
      ],
      warranty_days: input.warrantyDays,
      status: input.isSigned ? "signed" : "draft",
      signed_storage_path: input.isSigned ? "demo/bast-signed.pdf" : null,
      signed_at: input.isSigned ? new Date().toISOString() : null,
      created_by: actor.id,
      created_at: new Date().toISOString(),
    };
    demoStore.handoverReports.unshift(bast);
    return structuredClone(bast);
  }

  const { data: bastNo, error: seqErr } = await supabase.rpc("next_doc_number", {
    p_doc_type: "BAST",
    p_doc_date: input.bastDate,
  });
  if (seqErr) throw new Error(seqErr.message);

  const { data: created, error } = await supabase
    .from("handover_reports")
    .insert({
      bast_number: bastNo,
      bast_date: input.bastDate,
      project_id: input.projectId,
      uat_id: input.uatId,
      handover_items_json: [
        { item: "Source Code & Dokumentasi Teknis", format: "Git Repository + PDF", note: "Lengkap" },
      ],
      warranty_days: input.warrantyDays,
      status: input.isSigned ? "signed" : "draft",
      signed_at: input.isSigned ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function recordPeriodProjectCompletion(input: {
  projectId: string;
  progressDate: string;
  cumulativePct: number;
  cumulativeRevenueOverride?: number | null;
  enableAutoReverse?: boolean;
}): Promise<ProjectProgressRow> {
  if (input.cumulativePct < 0 || input.cumulativePct > 100) {
    throw new Error("Persentase penyelesaian wajib di antara 0% dan 100% (BR-21).");
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") throw new Error("Hanya Admin yang berwenang.");
    const prj = demoStore.projects.find((p) => p.id === input.projectId);
    if (!prj) throw new Error("Proyek tidak ditemukan.");
    const period = findDemoPeriodByDate(input.progressDate);

    const priorEntries = demoStore.projectProgress.filter(
      (pp) => pp.project_id === input.projectId,
    );
    const priorMaxPct = priorEntries.reduce(
      (m, pp) => Math.max(m, pp.cumulative_percentage),
      0,
    );
    const priorCumRev = priorEntries.reduce(
      (m, pp) => Math.max(m, pp.cumulative_recognized_revenue),
      0,
    );

    if (input.cumulativePct < priorMaxPct) {
      throw new Error(
        `Persentase penyelesaian (${input.cumulativePct}%) tidak boleh turun di bawah progres sebelumnya (${priorMaxPct}%) (BR-21).`,
      );
    }

    const targetCumRev =
      input.cumulativePct === 100
        ? prj.contract_value
        : input.cumulativeRevenueOverride != null
          ? roundRupiah(input.cumulativeRevenueOverride)
          : roundRupiah((prj.contract_value * input.cumulativePct) / 100);

    const deltaRev = targetCumRev - priorCumRev;
    if (deltaRev < 0) {
      throw new Error("Nilai pendapatan kumulatif tidak valid terhadap periode sebelumnya.");
    }

    let jrnId: string | null = null;
    if (deltaRev > 0) {
      const revAcc = demoStore.accounts.find((a) => a.system_tag === "service_revenue");
      const wipAcc = demoStore.accounts.find((a) => a.system_tag === "work_in_progress");
      const unearnedAcc = demoStore.accounts.find((a) => a.system_tag === "unearned_revenue");
      const unbilledAcc = demoStore.accounts.find((a) => a.system_tag === "unbilled_receivable");
      if (!revAcc || !wipAcc || !unearnedAcc || !unbilledAcc) {
        throw new Error("Akun sistem pengakuan pendapatan belum lengkap.");
      }

      if (prj.revenue_method === "progress_billing") {
        const j = postDemoJournal({
          journalDate: input.progressDate,
          journalType: "progress_billing",
          description: `Pengakuan pendapatan progres ${input.cumulativePct}% — ${prj.name}`,
          projectId: prj.id,
          lines: [
            { accountId: wipAcc.id, projectId: prj.id, debit: deltaRev, credit: 0 },
            { accountId: revAcc.id, projectId: prj.id, debit: 0, credit: deltaRev },
          ],
        });
        jrnId = j.id;
      } else if (prj.revenue_method === "single_term_deferral") {
        const j = postDemoJournal({
          journalDate: input.progressDate,
          journalType: "adjustment",
          description: `Penyesuaian deferral proyek ${prj.name}`,
          projectId: prj.id,
          lines: [
            { accountId: unearnedAcc.id, projectId: prj.id, debit: deltaRev, credit: 0 },
            { accountId: revAcc.id, projectId: prj.id, debit: 0, credit: deltaRev },
          ],
        });
        jrnId = j.id;
      } else {
        const j = postDemoJournal({
          journalDate: input.progressDate,
          journalType: "adjustment",
          description: `Pengakuan pendapatan akrual proyek 2 termin — ${prj.name}`,
          projectId: prj.id,
          autoReverseNextPeriod: Boolean(input.enableAutoReverse),
          lines: [
            { accountId: unbilledAcc.id, projectId: prj.id, debit: deltaRev, credit: 0 },
            { accountId: revAcc.id, projectId: prj.id, debit: 0, credit: deltaRev },
          ],
        });
        jrnId = j.id;
      }
    }

    const prog: ProjectProgressRow = {
      id: crypto.randomUUID(),
      project_id: prj.id,
      period_id: period.id,
      progress_date: input.progressDate,
      bakp_id: null,
      cumulative_percentage: input.cumulativePct,
      cumulative_recognized_revenue: targetCumRev,
      period_recognized_revenue: deltaRev,
      adjustment_journal_id: jrnId,
      recorded_by: actor.id,
      created_at: new Date().toISOString(),
    };
    demoStore.projectProgress.push(prog);

    tryEliminateDemoProject(prj.id, input.progressDate);
    return structuredClone(prog);
  }

  const { data, error } = await supabase.rpc("record_period_project_progress", {
    p_project_id: input.projectId,
    p_progress_date: input.progressDate,
    p_cumulative_pct: input.cumulativePct,
    p_cumulative_revenue_override: input.cumulativeRevenueOverride ?? null,
    p_enable_auto_reverse: input.enableAutoReverse ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

// =============================================================================
// 7. Penagihan Invoice Klien, Pembayaran, & Kuitansi Otomatis (UC-19..21)
// =============================================================================
export async function createAndIssueSalesInvoice(input: {
  invoiceDate: string;
  dueDate: string;
  projectId: string;
  customerId: string;
  milestoneId: string | null;
  clientPoId: string;
  bakpId: string | null;
  bastId: string | null;
  invoiceKind: InvoiceKind;
  subtotalAmount: number;
  notes?: string;
  directCashAccountId?: string | null;
}): Promise<SalesInvoiceRow> {
  const subtotal = roundRupiah(input.subtotalAmount);

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") throw new Error("Hanya Admin yang berwenang menerbitkan invoice.");
    const cpo = demoStore.clientPos.find((c) => c.id === input.clientPoId);
    if (!cpo || cpo.status !== "verified") {
      throw new Error(
        "PO Klien belum diverifikasi Admin dan belum aktif sebagai referensi penagihan (BR-23).",
      );
    }
    if (input.invoiceKind === "milestone") {
      const bakp = demoStore.progressReports.find((b) => b.id === input.bakpId);
      if (!bakp || bakp.status !== "approved_by_client") {
        throw new Error(
          "Invoice termin hanya dapat diterbitkan setelah BAKP disetujui klien (BR-14).",
        );
      }
    }
    if (input.invoiceKind === "final_settlement") {
      const bast = demoStore.handoverReports.find((b) => b.id === input.bastId);
      if (!bast || bast.status !== "signed") {
        throw new Error(
          "Invoice pelunasan hanya dapat diterbitkan setelah BAST ditandatangani (BR-15).",
        );
      }
    }

    const prj = demoStore.projects.find((p) => p.id === input.projectId);
    if (!prj) throw new Error("Proyek tidak ditemukan.");
    const cust = demoStore.customers.find((c) => c.id === input.customerId);

    const ppnAmount = demoStore.company.pkp_enabled
      ? roundRupiah((subtotal * demoStore.company.ppn_rate) / 100)
      : 0;
    const totalAmount = subtotal + ppnAmount;

    const arAcc = demoStore.accounts.find((a) => a.system_tag === "accounts_receivable");
    const debitAccId = input.directCashAccountId || arAcc?.id;
    const creditAcc = demoStore.accounts.find((a) =>
      prj.revenue_method === "progress_billing"
        ? a.system_tag === "contract_billings"
        : prj.revenue_method === "two_term_accrual" && input.invoiceKind === "final_settlement"
          ? a.system_tag === "service_revenue"
          : a.system_tag === "unearned_revenue",
    );
    if (!debitAccId || !creditAcc) {
      throw new Error("Akun piutang/penagihan belum lengkap di COA.");
    }

    const ppnAcc =
      ppnAmount > 0
        ? demoStore.accounts.find(
            (a) =>
              a.is_active &&
              a.is_postable &&
              (a.code === "2-1501" ||
                a.name.toLowerCase().includes("ppn keluaran")),
          )
        : undefined;
    if (ppnAmount > 0 && !ppnAcc) {
      throw new Error(
        "Akun Utang PPN Keluaran (2-1501) belum aktif di Bagan Akun. Aktifkan akun tersebut sebelum menerbitkan faktur PKP.",
      );
    }

    const invNumber = nextDemoDocNumber("INV", input.invoiceDate);
    const jrn = postDemoJournal({
      journalDate: input.invoiceDate,
      journalType: "auto_invoice",
      description: `Penagihan Invoice ${invNumber} — ${prj.name}`,
      projectId: prj.id,
      lines: [
        { accountId: debitAccId, projectId: prj.id, debit: totalAmount, credit: 0 },
        { accountId: creditAcc.id, projectId: prj.id, debit: 0, credit: subtotal },
        ...(ppnAmount > 0 && ppnAcc
          ? [{ accountId: ppnAcc.id, projectId: prj.id, debit: 0, credit: ppnAmount }]
          : []),
      ],
    });

    const now = new Date().toISOString();
    const isDirectPaid = Boolean(input.directCashAccountId);
    const inv: SalesInvoiceRow = {
      id: crypto.randomUUID(),
      invoice_number: invNumber,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate,
      project_id: prj.id,
      customer_id: input.customerId,
      milestone_id: input.milestoneId,
      client_po_id: input.clientPoId,
      bakp_id: input.bakpId,
      bast_id: input.bastId,
      invoice_kind: input.invoiceKind,
      subtotal_amount: subtotal,
      ppn_amount: ppnAmount,
      total_amount: totalAmount,
      paid_amount: isDirectPaid ? totalAmount : 0,
      doc_status: "issued",
      payment_status: isDirectPaid ? "paid" : "unpaid",
      journal_id: jrn.id,
      notes: input.notes?.trim() || null,
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.salesInvoices.unshift(inv);

    if (isDirectPaid) {
      demoStore.receipts.unshift({
        id: crypto.randomUUID(),
        receipt_number: nextDemoDocNumber("KW", input.invoiceDate),
        receipt_date: input.invoiceDate,
        invoice_id: inv.id,
        invoice_payment_id: crypto.randomUUID(),
        amount: totalAmount,
        received_from: cust?.name ?? "Klien",
        created_at: now,
      });
      if (input.milestoneId) {
        const ms = demoStore.milestones.find((m) => m.id === input.milestoneId);
        if (ms) ms.status = "paid";
      }
    } else if (input.milestoneId) {
      const ms = demoStore.milestones.find((m) => m.id === input.milestoneId);
      if (ms) ms.status = "invoiced";
    }

    tryEliminateDemoProject(prj.id, input.invoiceDate);
    return structuredClone(inv);
  }

  const companyRes = await supabase
    .from("company_profile")
    .select("pkp_enabled, ppn_rate")
    .eq("id", 1)
    .single();
  const pkpEnabled = companyRes.data?.pkp_enabled ?? false;
  const ppnRate = companyRes.data?.ppn_rate ?? 11;
  const ppnAmount = pkpEnabled ? roundRupiah((subtotal * ppnRate) / 100) : 0;
  const totalAmount = subtotal + ppnAmount;

  const { data: invNo, error: seqErr } = await supabase.rpc("next_doc_number", {
    p_doc_type: "INV",
    p_doc_date: input.invoiceDate,
  });
  if (seqErr) throw new Error(seqErr.message);

  const { data: draft, error: insErr } = await supabase
    .from("sales_invoices")
    .insert({
      invoice_number: invNo,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate,
      project_id: input.projectId,
      customer_id: input.customerId,
      milestone_id: input.milestoneId,
      client_po_id: input.clientPoId,
      bakp_id: input.bakpId,
      bast_id: input.bastId,
      invoice_kind: input.invoiceKind,
      subtotal_amount: subtotal,
      ppn_amount: ppnAmount,
      total_amount: totalAmount,
      doc_status: "draft",
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (insErr) throw new Error(insErr.message);

  const { data: issued, error: issErr } = await supabase.rpc("issue_sales_invoice", {
    p_invoice_id: draft.id,
    p_direct_cash_account_id: input.directCashAccountId ?? null,
  });
  if (issErr) throw new Error(issErr.message);
  return issued;
}

export async function recordClientInvoicePayment(input: {
  invoiceId: string;
  paymentDate: string;
  amount: number;
  destinationAccountId: string;
}): Promise<ReceiptRow> {
  const amt = roundRupiah(input.amount);
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") throw new Error("Hanya Admin yang berwenang.");
    const inv = demoStore.salesInvoices.find((i) => i.id === input.invoiceId);
    if (!inv || inv.doc_status !== "issued") {
      throw new Error("Invoice tidak valid.");
    }
    if (amt <= 0 || inv.paid_amount + amt > inv.total_amount) {
      throw new Error("Nominal pembayaran melebihi sisa tagihan invoice.");
    }
    const arAcc = demoStore.accounts.find((a) => a.system_tag === "accounts_receivable");
    if (!arAcc) throw new Error("Akun Piutang Usaha tidak ditemukan.");

    postDemoJournal({
      journalDate: input.paymentDate,
      journalType: "auto_receipt",
      description: `Penerimaan pembayaran Invoice ${inv.invoice_number}`,
      projectId: inv.project_id,
      lines: [
        {
          accountId: input.destinationAccountId,
          projectId: inv.project_id,
          debit: amt,
          credit: 0,
        },
        {
          accountId: arAcc.id,
          projectId: inv.project_id,
          debit: 0,
          credit: amt,
        },
      ],
    });

    inv.paid_amount += amt;
    inv.payment_status = inv.paid_amount >= inv.total_amount ? "paid" : "partial";
    if (inv.payment_status === "paid" && inv.milestone_id) {
      const ms = demoStore.milestones.find((m) => m.id === inv.milestone_id);
      if (ms) ms.status = "paid";
    }

    const cust = demoStore.customers.find((c) => c.id === inv.customer_id);
    const kw: ReceiptRow = {
      id: crypto.randomUUID(),
      receipt_number: nextDemoDocNumber("KW", input.paymentDate),
      receipt_date: input.paymentDate,
      invoice_id: inv.id,
      invoice_payment_id: crypto.randomUUID(),
      amount: amt,
      received_from: cust?.name ?? "Klien",
      created_at: new Date().toISOString(),
    };
    demoStore.receipts.unshift(kw);
    return structuredClone(kw);
  }

  const { data, error } = await supabase.rpc("record_invoice_payment", {
    p_invoice_id: input.invoiceId,
    p_payment_date: input.paymentDate,
    p_amount: amt,
    p_destination_account_id: input.destinationAccountId,
  });
  if (error) throw new Error(error.message);
  return data;
}

// =============================================================================
// CRUD PENDUKUNG TABEL WORKSPACE PROYEK (Lihat / Edit / Hapus / Hapus Pilihan)
// =============================================================================

export async function updateProjectMilestone(
  milestoneId: string,
  input: {
    name: string;
    percentage: number;
    amount: number;
    achievementCriteria: string;
    status: MilestoneStatus;
  },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const ms = demoStore.milestones.find((m) => m.id === milestoneId);
    if (!ms) throw new Error("Termin tidak ditemukan.");
    ms.name = input.name.trim();
    ms.percentage = input.percentage;
    ms.amount = roundRupiah(input.amount);
    ms.achievement_criteria = input.achievementCriteria.trim() || null;
    ms.status = input.status;
    return;
  }
  const { error } = await supabase
    .from("milestones")
    .update({
      name: input.name.trim(),
      percentage: input.percentage,
      amount: roundRupiah(input.amount),
      achievement_criteria: input.achievementCriteria.trim() || null,
      status: input.status,
    })
    .eq("id", milestoneId);
  if (error) throw new Error(error.message);
}

export async function deleteProjectMilestones(
  projectId: string,
  milestoneIds: string[],
): Promise<void> {
  if (milestoneIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(milestoneIds);
    const affectedBakpIds = new Set(
      demoStore.progressReports
        .filter((b) => idSet.has(b.milestone_id))
        .map((b) => b.id),
    );
    demoStore.salesInvoices.forEach((inv) => {
      if (inv.milestone_id && idSet.has(inv.milestone_id)) inv.milestone_id = null;
      if (inv.bakp_id && affectedBakpIds.has(inv.bakp_id)) inv.bakp_id = null;
    });
    demoStore.progressReports = demoStore.progressReports.filter(
      (b) => !idSet.has(b.milestone_id),
    );
    demoStore.milestones = demoStore.milestones.filter((m) => !idSet.has(m.id));
    const remaining = demoStore.milestones
      .filter((m) => m.project_id === projectId)
      .sort((a, b) => a.sequence_no - b.sequence_no);
    remaining.forEach((m, idx) => {
      m.sequence_no = idx + 1;
    });
    const prj = demoStore.projects.find((p) => p.id === projectId);
    if (prj) {
      prj.term_count = remaining.length;
      if (remaining.length > 0) {
        prj.revenue_method = inferRevenueMethodFromTerms(remaining.length);
      }
    }
    return;
  }

  const { data: linkedBakps, error: bakpLookupErr } = await supabase
    .from("progress_reports")
    .select("id")
    .in("milestone_id", milestoneIds);
  if (bakpLookupErr) throw new Error(bakpLookupErr.message);

  const affectedBakpIds = (linkedBakps ?? []).map((b) => String(b.id));
  if (affectedBakpIds.length > 0) {
    const { error: invBakpErr } = await supabase
      .from("sales_invoices")
      .update({ bakp_id: null })
      .in("bakp_id", affectedBakpIds);
    if (invBakpErr) throw new Error(invBakpErr.message);

    const { error: delBakpErr } = await supabase
      .from("progress_reports")
      .delete()
      .in("id", affectedBakpIds);
    if (delBakpErr) throw new Error(delBakpErr.message);
  }

  const { error: invMsErr } = await supabase
    .from("sales_invoices")
    .update({ milestone_id: null })
    .in("milestone_id", milestoneIds);
  if (invMsErr) throw new Error(invMsErr.message);

  const { error } = await supabase.from("milestones").delete().in("id", milestoneIds);
  if (error) throw new Error(error.message);
}

export async function updateProjectProgressEntry(
  entryId: string,
  input: {
    progressDate: string;
    cumulativePercentage: number;
    cumulativeRecognizedRevenue: number;
    periodRecognizedRevenue: number;
  },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const entry = demoStore.projectProgress.find((p) => p.id === entryId);
    if (!entry) throw new Error("Catatan progres tidak ditemukan.");
    entry.progress_date = input.progressDate;
    entry.cumulative_percentage = input.cumulativePercentage;
    entry.cumulative_recognized_revenue = roundRupiah(input.cumulativeRecognizedRevenue);
    entry.period_recognized_revenue = roundRupiah(input.periodRecognizedRevenue);
    return;
  }
  const { error } = await supabase
    .from("project_progress")
    .update({
      progress_date: input.progressDate,
      cumulative_percentage: input.cumulativePercentage,
      cumulative_recognized_revenue: roundRupiah(input.cumulativeRecognizedRevenue),
      period_recognized_revenue: roundRupiah(input.periodRecognizedRevenue),
    })
    .eq("id", entryId);
  if (error) throw new Error(error.message);
}

export async function deleteProjectProgressEntries(entryIds: string[]): Promise<void> {
  if (entryIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(entryIds);
    demoStore.projectProgress = demoStore.projectProgress.filter((p) => !idSet.has(p.id));
    return;
  }
  const { error } = await supabase.from("project_progress").delete().in("id", entryIds);
  if (error) throw new Error(error.message);
}

export async function updateQuotation(
  quotationId: string,
  input: {
    quotationDate: string;
    validUntil: string;
    projectTitle: string;
    clientNeedSummary: string;
    estimatedWeeks: number;
    revisionLimit: number;
    totalAmount: number;
    status: QuotationStatus;
  },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const qt = demoStore.quotations.find((q) => q.id === quotationId);
    if (!qt) throw new Error("Quotation tidak ditemukan.");
    qt.quotation_date = input.quotationDate;
    qt.valid_until = input.validUntil;
    qt.project_title = input.projectTitle.trim();
    qt.client_need_summary = input.clientNeedSummary.trim() || null;
    qt.estimated_weeks = input.estimatedWeeks;
    qt.revision_limit = input.revisionLimit;
    qt.total_amount = roundRupiah(input.totalAmount);
    qt.status = input.status;
    qt.updated_at = new Date().toISOString();
    return;
  }
  const { error } = await supabase
    .from("quotations")
    .update({
      quotation_date: input.quotationDate,
      valid_until: input.validUntil,
      project_title: input.projectTitle.trim(),
      client_need_summary: input.clientNeedSummary.trim() || null,
      estimated_weeks: input.estimatedWeeks,
      revision_limit: input.revisionLimit,
      total_amount: roundRupiah(input.totalAmount),
      status: input.status,
    })
    .eq("id", quotationId);
  if (error) throw new Error(error.message);
}

export async function deleteQuotations(quotationIds: string[]): Promise<void> {
  if (quotationIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(quotationIds);
    demoStore.quotations = demoStore.quotations.filter((q) => !idSet.has(q.id));
    demoStore.quotationItems = demoStore.quotationItems.filter(
      (qi) => !idSet.has(qi.quotation_id),
    );
    return;
  }
  const { error } = await supabase.from("quotations").delete().in("id", quotationIds);
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

export async function updateProjectDocument(
  docId: string,
  input: {
    docType: "SOW" | "SPK";
    title: string;
    summary: string;
    isSigned: boolean;
    contentJson?: Record<string, unknown>;
  },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const doc = demoStore.projectDocuments.find((d) => d.id === docId);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    doc.doc_type = input.docType;
    doc.title = input.title.trim();
    doc.content_json = {
      ...(doc.content_json as Record<string, unknown> | null),
      ...(input.contentJson ?? {}),
      summary: input.summary.trim(),
    } as ProjectDocumentRow["content_json"];
    doc.is_signed = input.isSigned;
    doc.updated_at = new Date().toISOString();
    return;
  }
  const { data: existingDoc } = await supabase
    .from("project_documents")
    .select("content_json")
    .eq("id", docId)
    .maybeSingle();
  const mergedContent = {
    ...((existingDoc?.content_json as Record<string, unknown> | null) ?? {}),
    ...(input.contentJson ?? {}),
    summary: input.summary.trim(),
  };
  const { error } = await supabase
    .from("project_documents")
    .update({
      doc_type: input.docType,
      title: input.title.trim(),
      content_json: mergedContent as ProjectDocumentRow["content_json"],
      is_signed: input.isSigned,
    })
    .eq("id", docId);
  if (error) throw new Error(error.message);
}

export async function deleteProjectDocuments(docIds: string[]): Promise<void> {
  if (docIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(docIds);
    demoStore.projectDocuments = demoStore.projectDocuments.filter((d) => !idSet.has(d.id));
    return;
  }
  const { error } = await supabase.from("project_documents").delete().in("id", docIds);
  if (error) throw new Error(error.message);
}

export async function updateBakpReport(
  bakpId: string,
  input: {
    bakpDate: string;
    cumulativePercentage: number;
    billableAmount: number;
    findingsNotes: string;
    status: BakpStatus;
  },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const bakp = demoStore.progressReports.find((b) => b.id === bakpId);
    if (!bakp) throw new Error("BAKP tidak ditemukan.");
    bakp.bakp_date = input.bakpDate;
    bakp.cumulative_percentage = input.cumulativePercentage;
    bakp.billable_amount = roundRupiah(input.billableAmount);
    bakp.findings_notes = input.findingsNotes.trim() || null;
    bakp.status = input.status;
    bakp.approved_at = input.status === "approved_by_client" ? (bakp.approved_at ?? new Date().toISOString()) : null;
    return;
  }
  const { error } = await supabase
    .from("progress_reports")
    .update({
      bakp_date: input.bakpDate,
      cumulative_percentage: input.cumulativePercentage,
      billable_amount: roundRupiah(input.billableAmount),
      findings_notes: input.findingsNotes.trim() || null,
      status: input.status,
      approved_at: input.status === "approved_by_client" ? new Date().toISOString() : null,
    })
    .eq("id", bakpId);
  if (error) throw new Error(error.message);
}

export async function deleteBakpReports(bakpIds: string[]): Promise<void> {
  if (bakpIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(bakpIds);
    demoStore.salesInvoices.forEach((inv) => {
      if (inv.bakp_id && idSet.has(inv.bakp_id)) inv.bakp_id = null;
    });
    demoStore.progressReports = demoStore.progressReports.filter((b) => !idSet.has(b.id));
    return;
  }
  const { error: invErr } = await supabase
    .from("sales_invoices")
    .update({ bakp_id: null })
    .in("bakp_id", bakpIds);
  if (invErr) throw new Error(invErr.message);

  const { error } = await supabase.from("progress_reports").delete().in("id", bakpIds);
  if (error) throw new Error(error.message);
}

export async function updateUatChecklist(
  uatId: string,
  input: {
    testDate: string;
    stagingUrl: string;
    clientTesterName: string;
    altviraCompanionName: string;
    conclusion: UatConclusion;
  },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const uat = demoStore.uatChecklists.find((u) => u.id === uatId);
    if (!uat) throw new Error("Dokumen UAT tidak ditemukan.");
    uat.test_date = input.testDate;
    uat.staging_url = input.stagingUrl.trim() || null;
    uat.client_tester_name = input.clientTesterName.trim();
    uat.altvira_companion_name = input.altviraCompanionName.trim();
    uat.conclusion = input.conclusion;
    return;
  }
  const { error } = await supabase
    .from("uat_checklists")
    .update({
      test_date: input.testDate,
      staging_url: input.stagingUrl.trim() || null,
      client_tester_name: input.clientTesterName.trim(),
      altvira_companion_name: input.altviraCompanionName.trim(),
      conclusion: input.conclusion,
    })
    .eq("id", uatId);
  if (error) throw new Error(error.message);
}

export async function deleteUatChecklists(uatIds: string[]): Promise<void> {
  if (uatIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(uatIds);
    const affectedBastIds = new Set(
      demoStore.handoverReports
        .filter((h) => idSet.has(h.uat_id))
        .map((h) => h.id),
    );
    demoStore.salesInvoices.forEach((inv) => {
      if (inv.bast_id && affectedBastIds.has(inv.bast_id)) inv.bast_id = null;
    });
    demoStore.handoverReports = demoStore.handoverReports.filter((h) => !idSet.has(h.uat_id));
    demoStore.uatChecklists = demoStore.uatChecklists.filter((u) => !idSet.has(u.id));
    demoStore.uatItems = demoStore.uatItems.filter((ui) => !idSet.has(ui.uat_id));
    return;
  }

  const { data: linkedBasts, error: bastLookupErr } = await supabase
    .from("handover_reports")
    .select("id")
    .in("uat_id", uatIds);
  if (bastLookupErr) throw new Error(bastLookupErr.message);

  const affectedBastIds = (linkedBasts ?? []).map((h) => String(h.id));
  if (affectedBastIds.length > 0) {
    const { error: invErr } = await supabase
      .from("sales_invoices")
      .update({ bast_id: null })
      .in("bast_id", affectedBastIds);
    if (invErr) throw new Error(invErr.message);

    const { error: delBastErr } = await supabase
      .from("handover_reports")
      .delete()
      .in("id", affectedBastIds);
    if (delBastErr) throw new Error(delBastErr.message);
  }

  const { error } = await supabase.from("uat_checklists").delete().in("id", uatIds);
  if (error) throw new Error(error.message);
}

export async function updateBastHandover(
  bastId: string,
  input: {
    bastDate: string;
    warrantyDays: number;
    status: BastStatus;
  },
): Promise<void> {
  if (isDemoMode || !supabase) {
    const bast = demoStore.handoverReports.find((h) => h.id === bastId);
    if (!bast) throw new Error("BAST tidak ditemukan.");
    bast.bast_date = input.bastDate;
    bast.warranty_days = input.warrantyDays;
    bast.status = input.status;
    bast.signed_at = input.status === "signed" ? (bast.signed_at ?? new Date().toISOString()) : null;
    return;
  }
  const { error } = await supabase
    .from("handover_reports")
    .update({
      bast_date: input.bastDate,
      warranty_days: input.warrantyDays,
      status: input.status,
      signed_at: input.status === "signed" ? new Date().toISOString() : null,
    })
    .eq("id", bastId);
  if (error) throw new Error(error.message);
}

export async function deleteBastHandovers(bastIds: string[]): Promise<void> {
  if (bastIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(bastIds);
    demoStore.salesInvoices.forEach((inv) => {
      if (inv.bast_id && idSet.has(inv.bast_id)) inv.bast_id = null;
    });
    demoStore.handoverReports = demoStore.handoverReports.filter((h) => !idSet.has(h.id));
    return;
  }
  const { error: invErr } = await supabase
    .from("sales_invoices")
    .update({ bast_id: null })
    .in("bast_id", bastIds);
  if (invErr) throw new Error(invErr.message);

  const { error } = await supabase.from("handover_reports").delete().in("id", bastIds);
  if (error) throw new Error(error.message);
}

