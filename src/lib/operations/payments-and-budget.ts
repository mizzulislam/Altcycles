import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
  nextDemoDocNumber,
} from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  AttachmentRow,
  BudgetComparisonRow,
  BudgetLineRow,
  BudgetRow,
  PaymentRequestRow,
} from "@/types/database.types";
import {
  postDemoJournal,
  pushDemoNotification,
} from "@/lib/operations/shared";

// =============================================================================
// 3. Payment Approval 1-Level & Pencairan Dana (UC-06, UC-07, UC-09, UC-10)
// =============================================================================
export async function listPaymentRequests(): Promise<{
  requests: PaymentRequestRow[];
  attachments: AttachmentRow[];
}> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const requests =
      actor.role === "admin"
        ? structuredClone(demoStore.paymentRequests)
        : structuredClone(
            demoStore.paymentRequests.filter((r) => r.requester_id === actor.id),
          );
    const ids = new Set(requests.map((r) => r.id));
    const attachments = structuredClone(
      demoStore.attachments.filter((a) => ids.has(a.entity_id)),
    );
    return { requests, attachments };
  }

  const [reqRes, attRes] = await Promise.all([
    supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("attachments")
      .select("*")
      .in("entity_type", ["payment_request_proof", "payment_transfer_proof"]),
  ]);
  if (reqRes.error) throw new Error(reqRes.error.message);
  if (attRes.error) throw new Error(attRes.error.message);
  return {
    requests: reqRes.data ?? [],
    attachments: attRes.data ?? [],
  };
}

export async function createAndSubmitPaymentRequest(input: {
  purpose: string;
  recipientName: string;
  recipientBankInfo: string;
  amount: number;
  projectId: string;
  expenseAccountId: string;
  poId?: string | null;
  proofFile: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    blob?: Blob;
    storagePathOverride?: string;
  };
  budgetWarningAcknowledged?: boolean;
}): Promise<PaymentRequestRow> {
  if (input.proofFile.sizeBytes <= 0 || input.proofFile.sizeBytes > 5_242_880) {
    throw new Error("Ukuran berkas bukti wajib di atas 0 dan maksimal 5 MB (FR-LA4).");
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const now = new Date().toISOString();
    const req: PaymentRequestRow = {
      id: crypto.randomUUID(),
      request_number: nextDemoDocNumber("PA", todayIso),
      revision_no: 0,
      requester_id: actor.id,
      purpose: input.purpose.trim(),
      recipient_name: input.recipientName.trim(),
      recipient_bank_info: input.recipientBankInfo.trim() || null,
      amount: roundRupiah(input.amount),
      project_id: input.projectId,
      expense_account_id: input.expenseAccountId,
      po_id: input.poId || null,
      status: "submitted",
      budget_warning_acknowledged: Boolean(input.budgetWarningAcknowledged),
      submitted_at: now,
      approver_id: null,
      decided_at: null,
      rejection_reason: null,
      paid_date: null,
      source_cash_account_id: null,
      accrual_journal_id: null,
      payment_journal_id: null,
      created_at: now,
      updated_at: now,
    };
    demoStore.paymentRequests.unshift(req);
    demoStore.attachments.push({
      id: crypto.randomUUID(),
      entity_type: "payment_request_proof",
      entity_id: req.id,
      file_name: input.proofFile.name,
      mime_type: input.proofFile.mimeType,
      file_size_bytes: input.proofFile.sizeBytes,
      storage_path: input.proofFile.storagePathOverride || `demo/${input.proofFile.name}`,
      uploaded_by: actor.id,
      created_at: now,
    });
    for (const adm of demoStore.profiles.filter(
      (p) => p.role === "admin" && p.is_active && p.id !== actor.id,
    )) {
      pushDemoNotification(
        adm.id,
        `Pengajuan Pembayaran Baru: ${req.request_number}`,
        `Pengajuan sebesar Rp${req.amount.toLocaleString("id-ID")} untuk ${req.purpose} menunggu persetujuan.`,
        "/admin/persetujuan",
      );
    }
    appendDemoAudit(actor, "INSERT", "payment_requests", req.id, null, req);
    return structuredClone(req);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi tidak ditemukan.");

  const { data: paNo, error: seqErr } = await supabase.rpc("next_doc_number", {
    p_doc_type: "PA",
    p_doc_date: todayIso,
  });
  if (seqErr) throw new Error(seqErr.message);

  const { data: created, error: insErr } = await supabase
    .from("payment_requests")
    .insert({
      request_number: paNo,
      requester_id: user.id,
      purpose: input.purpose.trim(),
      recipient_name: input.recipientName.trim(),
      recipient_bank_info: input.recipientBankInfo.trim() || null,
      amount: roundRupiah(input.amount),
      project_id: input.projectId,
      expense_account_id: input.expenseAccountId,
      po_id: input.poId || null,
      status: "draft",
      budget_warning_acknowledged: Boolean(input.budgetWarningAcknowledged),
    })
    .select("*")
    .single();
  if (insErr) throw new Error(insErr.message);

  const safeFileName = input.proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath =
    input.proofFile.storagePathOverride ||
    `proofs/${created.id}/${Date.now()}_${safeFileName}`;

  if (input.proofFile.blob && !input.proofFile.storagePathOverride) {
    const { error: upErr } = await supabase.storage
      .from("altcycles-files")
      .upload(storagePath, input.proofFile.blob, {
        contentType: input.proofFile.mimeType || "application/octet-stream",
        upsert: false,
      });
    if (upErr) throw new Error(`Gagal mengunggah lampiran bukti: ${upErr.message}`);
  }

  const { error: attErr } = await supabase.from("attachments").insert({
    entity_type: "payment_request_proof",
    entity_id: created.id,
    file_name: input.proofFile.name,
    mime_type: input.proofFile.mimeType,
    file_size_bytes: input.proofFile.sizeBytes,
    storage_path: storagePath,
    uploaded_by: user.id,
  });
  if (attErr) throw new Error(attErr.message);

  const { data: submitted, error: subErr } = await supabase.rpc(
    "submit_payment_request",
    { p_request_id: created.id },
  );
  if (subErr) throw new Error(subErr.message);
  return submitted;
}

export async function getAttachmentSignedUrl(
  storagePath: string,
): Promise<string | null> {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  if (isDemoMode || !supabase || storagePath.startsWith("demo/")) {
    return null;
  }
  const { data, error } = await supabase.storage
    .from("altcycles-files")
    .createSignedUrl(storagePath, 300);
  if (error) throw new Error(`Gagal membuka tautan berkas: ${error.message}`);
  return data.signedUrl;
}

export async function resubmitRejectedPaymentRequest(input: {
  requestId: string;
  purpose: string;
  recipientBankInfo: string;
  amount: number;
}): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    const req = demoStore.paymentRequests.find((r) => r.id === input.requestId);
    if (!req || req.requester_id !== actor.id || req.status !== "rejected") {
      throw new Error("Hanya pengajuan ditolak milik sendiri yang dapat diajukan ulang.");
    }
    req.purpose = input.purpose.trim();
    req.recipient_bank_info = input.recipientBankInfo.trim() || null;
    req.amount = roundRupiah(input.amount);
    req.revision_no += 1;
    req.status = "submitted";
    req.submitted_at = new Date().toISOString();
    req.rejection_reason = null;
    req.approver_id = null;
    req.decided_at = null;
    return;
  }

  const { error: updErr } = await supabase
    .from("payment_requests")
    .update({
      purpose: input.purpose.trim(),
      recipient_bank_info: input.recipientBankInfo.trim() || null,
      amount: roundRupiah(input.amount),
    })
    .eq("id", input.requestId);
  if (updErr) throw new Error(updErr.message);

  const { error: subErr } = await supabase.rpc("submit_payment_request", {
    p_request_id: input.requestId,
  });
  if (subErr) throw new Error(subErr.message);
}

export async function decidePaymentRequest(params: {
  requestId: string;
  decision: "approve" | "reject";
  rejectionReason?: string;
  accountingDate: string;
}): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat memproses Payment Approval (FR-PA3).");
    }
    const req = demoStore.paymentRequests.find((r) => r.id === params.requestId);
    if (!req || req.status !== "submitted") {
      throw new Error("Pengajuan pembayaran tidak dalam status Diajukan.");
    }
    if (req.requester_id === actor.id) {
      throw new Error(
        "Pelanggaran pemisahan tugas: pengaju tidak boleh menyetujui pengajuannya sendiri (BR-4).",
      );
    }
    if (params.decision === "reject") {
      if (!params.rejectionReason || params.rejectionReason.trim().length < 3) {
        throw new Error("Alasan penolakan wajib diisi (BR-5).");
      }
      req.status = "rejected";
      req.approver_id = actor.id;
      req.decided_at = new Date().toISOString();
      req.rejection_reason = params.rejectionReason.trim();
      pushDemoNotification(
        req.requester_id,
        `Pengajuan Ditolak: ${req.request_number}`,
        `Alasan penolakan: ${req.rejection_reason}`,
        "/user/pembayaran",
      );
      return;
    }

    const payableAcc = demoStore.accounts.find(
      (a) => a.system_tag === "accounts_payable" && a.is_active,
    );
    if (!payableAcc) throw new Error("Akun Utang Usaha tidak ditemukan.");

    const jrn = postDemoJournal({
      journalDate: params.accountingDate,
      journalType: "auto_expense",
      description: `Pengakuan beban atas persetujuan ${req.request_number} — ${req.purpose}`,
      projectId: req.project_id,
      lines: [
        {
          accountId: req.expense_account_id,
          projectId: req.project_id,
          description: req.purpose,
          debit: req.amount,
          credit: 0,
        },
        {
          accountId: payableAcc.id,
          projectId: req.project_id,
          description: `Utang kepada ${req.recipient_name}`,
          debit: 0,
          credit: req.amount,
        },
      ],
    });

    req.status = "approved";
    req.approver_id = actor.id;
    req.decided_at = new Date().toISOString();
    req.accrual_journal_id = jrn.id;
    pushDemoNotification(
      req.requester_id,
      `Pengajuan Disetujui: ${req.request_number}`,
      "Pengajuan Anda telah disetujui Admin dan menunggu pencairan dana.",
      "/user/pembayaran",
    );
    return;
  }

  const { error } = await supabase.rpc("decide_payment_request", {
    p_request_id: params.requestId,
    p_decision: params.decision,
    p_rejection_reason: params.rejectionReason ?? null,
    p_accounting_date: params.accountingDate,
  });
  if (error) throw new Error(error.message);
}

export async function recordPaymentDisbursement(params: {
  requestId: string;
  paidDate: string;
  sourceCashAccountId: string;
}): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang berwenang mencatat realisasi pembayaran.");
    }
    const req = demoStore.paymentRequests.find((r) => r.id === params.requestId);
    if (!req || req.status !== "approved") {
      throw new Error("Hanya pengajuan berstatus Disetujui yang dapat dicatat dibayar.");
    }
    const payableAcc = demoStore.accounts.find(
      (a) => a.system_tag === "accounts_payable" && a.is_active,
    );
    if (!payableAcc) throw new Error("Akun Utang Usaha tidak ditemukan.");

    const jrn = postDemoJournal({
      journalDate: params.paidDate,
      journalType: "auto_payment",
      description: `Pembayaran atas ${req.request_number} kepada ${req.recipient_name}`,
      projectId: req.project_id,
      lines: [
        {
          accountId: payableAcc.id,
          projectId: req.project_id,
          description: `Pelunasan utang ${req.request_number}`,
          debit: req.amount,
          credit: 0,
        },
        {
          accountId: params.sourceCashAccountId,
          projectId: req.project_id,
          description: `Transfer ke ${req.recipient_name}`,
          debit: 0,
          credit: req.amount,
        },
      ],
    });

    req.status = "paid";
    req.paid_date = params.paidDate;
    req.source_cash_account_id = params.sourceCashAccountId;
    req.payment_journal_id = jrn.id;

    if (req.po_id) {
      const po = demoStore.purchaseOrders.find((p) => p.id === req.po_id);
      if (po && po.status === "issued") po.status = "completed";
    }

    pushDemoNotification(
      req.requester_id,
      `Pembayaran Selesai: ${req.request_number}`,
      `Dana untuk ${req.purpose} telah dicatat dibayar pada ${params.paidDate}.`,
      "/user/pembayaran",
    );
    return;
  }

  const { error } = await supabase.rpc("record_payment_disbursement", {
    p_request_id: params.requestId,
    p_paid_date: params.paidDate,
    p_source_cash_account_id: params.sourceCashAccountId,
  });
  if (error) throw new Error(error.message);
}

// =============================================================================
// 4. Budgeting & Anggaran vs Realisasi Terposting (UC-08, UC-22, BR-8)
// =============================================================================
export async function getProjectBudgetComparison(
  projectId: string,
): Promise<BudgetComparisonRow[]> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (
      actor.role !== "admin" &&
      !demoStore.projectMembers.some(
        (m) => m.project_id === projectId && m.user_id === actor.id,
      )
    ) {
      throw new Error("Akses ditolak: Anda bukan anggota proyek ini.");
    }

    const activeBudget = demoStore.budgets
      .filter((b) => b.project_id === projectId && b.status === "active")
      .sort((a, b) => b.version - a.version)[0];
    if (!activeBudget) return [];

    const committedPo = demoStore.purchaseOrders
      .filter((po) => po.project_id === projectId && po.status === "issued")
      .reduce((s, po) => s + po.total_amount, 0);

    const postedNonClosingIds = new Set(
      demoStore.journals
        .filter((j) => j.status === "posted" && j.journal_type !== "closing")
        .map((j) => j.id),
    );

    const bLines = demoStore.budgetLines.filter(
      (bl) => bl.budget_id === activeBudget.id,
    );

    return bLines.map((bl) => {
      const acc = demoStore.accounts.find((a) => a.id === bl.account_id);
      let realized = 0;
      for (const jl of demoStore.journalLines) {
        if (!postedNonClosingIds.has(jl.journal_id)) continue;
        if (jl.account_id !== bl.account_id) continue;
        const jrn = demoStore.journals.find((j) => j.id === jl.journal_id);
        const effPrj = jl.project_id ?? jrn?.project_id;
        if (effPrj === projectId) {
          realized += jl.debit - jl.credit;
        }
      }
      const absorption =
        bl.allocated_amount > 0
          ? Number(((realized / bl.allocated_amount) * 100).toFixed(2))
          : 0;
      return {
        account_id: bl.account_id,
        account_code: acc?.code ?? "-",
        account_name: acc?.name ?? "Akun",
        allocated_amount: bl.allocated_amount,
        realized_amount: realized,
        committed_po_amount: committedPo,
        remaining_amount: bl.allocated_amount - realized,
        absorption_pct: absorption,
        alert_threshold_pct: activeBudget.alert_threshold_pct,
        is_over_threshold: absorption >= activeBudget.alert_threshold_pct,
      };
    });
  }

  const { data, error } = await supabase.rpc("get_project_budget_vs_actual", {
    p_project_id: projectId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveProjectBudget(input: {
  projectId: string;
  alertThresholdPct: number;
  notes?: string;
  lines: Array<{ accountId: string; allocatedAmount: number }>;
}): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat mengelola anggaran proyek.");
    }
    const prevMaxVer = demoStore.budgets
      .filter((b) => b.project_id === input.projectId)
      .reduce((m, b) => Math.max(m, b.version), 0);
    for (const old of demoStore.budgets) {
      if (old.project_id === input.projectId && old.status === "active") {
        old.status = "superseded";
      }
    }
    const now = new Date().toISOString();
    const budget: BudgetRow = {
      id: crypto.randomUUID(),
      project_id: input.projectId,
      period_id: null,
      version: prevMaxVer + 1,
      alert_threshold_pct: input.alertThresholdPct,
      status: "active",
      notes: input.notes?.trim() || null,
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    demoStore.budgets.unshift(budget);
    for (const l of input.lines) {
      if (l.allocatedAmount > 0) {
        demoStore.budgetLines.push({
          id: crypto.randomUUID(),
          budget_id: budget.id,
          account_id: l.accountId,
          allocated_amount: roundRupiah(l.allocatedAmount),
        });
      }
    }
    appendDemoAudit(actor, "INSERT", "budgets", budget.id, null, budget);
    return;
  }

  await supabase
    .from("budgets")
    .update({ status: "superseded" })
    .eq("project_id", input.projectId)
    .eq("status", "active");

  const { data: created, error: bErr } = await supabase
    .from("budgets")
    .insert({
      project_id: input.projectId,
      alert_threshold_pct: input.alertThresholdPct,
      status: "active",
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (bErr) throw new Error(bErr.message);

  const validLines: Array<Omit<BudgetLineRow, "id">> = input.lines
    .filter((l) => l.allocatedAmount > 0)
    .map((l) => ({
      budget_id: created.id,
      account_id: l.accountId,
      allocated_amount: roundRupiah(l.allocatedAmount),
    }));

  if (validLines.length > 0) {
    const { error: lErr } = await supabase.from("budget_lines").insert(validLines);
    if (lErr) throw new Error(lErr.message);
  }
}
