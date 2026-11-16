import { demoStore, getDemoActor, nextDemoDocNumber } from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  BakpStatus,
  BastStatus,
  HandoverReportRow,
  ProgressReportRow,
  ProjectDocumentRow,
  QuotationRow,
  QuotationStatus,
  UatChecklistRow,
  UatConclusion,
} from "@/types/database.types";

// =============================================================================
// QUOTATIONS
// =============================================================================

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
    qt.client_need_summary = input.clientNeedSummary.trim() || null,
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

// =============================================================================
// PROJECT DOCUMENTS (SOW / SPK)
// =============================================================================

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

// =============================================================================
// BAKP (BERITA ACARA KEMAJUAN PEKERJAAN)
// =============================================================================

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
    bakp.findings_notes = input.findingsNotes.trim() || null,
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

// =============================================================================
// UAT (USER ACCEPTANCE TESTING)
// =============================================================================

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
    uat.staging_url = input.stagingUrl.trim() || null,
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

// =============================================================================
// BAST (BERITA ACARA SERAH TERIMA)
// =============================================================================

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
