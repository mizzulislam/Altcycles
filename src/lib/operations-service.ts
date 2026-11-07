import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
  nextDemoDocNumber,
} from "@/lib/data-service";
import { inferRevenueMethodFromTerms, roundRupiah } from "@/lib/formatters";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  AttachmentRow,
  BudgetComparisonRow,
  BudgetLineRow,
  BudgetRow,
  BuyerPortalLookupDto,
  ClientPurchaseOrderRow,
  HandoverReportRow,
  InvoiceKind,
  JournalLineRow,
  JournalRow,
  JournalType,
  MilestoneRow,
  NotificationRow,
  PaymentRequestRow,
  PoItemRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProfitSharingSchemeRow,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectProgressRow,
  PurchaseOrderRow,
  QuotationItemRow,
  QuotationRow,
  ReceiptRow,
  SalesInvoiceRow,
  UatChecklistRow,
  UatConclusion,
  UatItemRow,
} from "@/types/database.types";

function pushDemoNotification(
  userId: string,
  title: string,
  message: string,
  linkPath: string,
) {
  demoStore.notifications.unshift({
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    message,
    link_path: linkPath,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

function findDemoPeriodByDate(dateIso: string) {
  const [yStr, mStr] = dateIso.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const period = demoStore.periods.find((p) => p.year === year && p.month === month);
  if (!period) {
    throw new Error(`Periode akuntansi untuk tanggal ${dateIso} belum dibuka.`);
  }
  if (period.status === "closed") {
    throw new Error(`Periode ${period.name} sudah ditutup dan menolak transaksi baru (BR-3).`);
  }
  return period;
}

function postDemoJournal(params: {
  journalDate: string;
  journalType: JournalType;
  description: string;
  projectId: string | null;
  referenceJournalId?: string | null;
  autoReverseNextPeriod?: boolean;
  lines: Array<{
    accountId: string;
    projectId?: string | null;
    description?: string | null;
    debit: number;
    credit: number;
  }>;
}): JournalRow {
  const actor = getDemoActor();
  const period = findDemoPeriodByDate(params.journalDate);
  if (params.lines.length < 2) {
    throw new Error("Jurnal minimal harus memiliki 2 baris ayat jurnal (BR-1).");
  }
  const sumDebit = params.lines.reduce((s, l) => s + roundRupiah(l.debit), 0);
  const sumCredit = params.lines.reduce((s, l) => s + roundRupiah(l.credit), 0);
  if (sumDebit <= 0 || sumDebit !== sumCredit) {
    throw new Error(
      `Jurnal tidak seimbang: total debit (${sumDebit}) tidak sama dengan total kredit (${sumCredit}) (BR-1).`,
    );
  }

  for (const line of params.lines) {
    const acc = demoStore.accounts.find((a) => a.id === line.accountId);
    if (!acc || !acc.is_active || !acc.is_postable) {
      throw new Error("Terdapat akun nonaktif atau akun induk pada baris jurnal.");
    }
  }

  if (params.autoReverseNextPeriod && params.projectId) {
    const prj = demoStore.projects.find((p) => p.id === params.projectId);
    if (
      prj &&
      (prj.revenue_method === "single_term_deferral" ||
        prj.revenue_method === "progress_billing")
    ) {
      throw new Error(
        "Jurnal pembalik tidak digunakan pada proyek 1 termin atau progress billing >= 3 termin (FR-AK12).",
      );
    }
  }

  const now = new Date().toISOString();
  const jrn: JournalRow = {
    id: crypto.randomUUID(),
    journal_number: nextDemoDocNumber("JRN", params.journalDate),
    journal_date: params.journalDate,
    period_id: period.id,
    journal_type: params.journalType,
    source_type: null,
    source_id: null,
    project_id: params.projectId,
    description: params.description.trim(),
    status: "posted",
    reference_journal_id: params.referenceJournalId ?? null,
    auto_reverse_next_period: Boolean(params.autoReverseNextPeriod),
    is_reversed: false,
    posted_at: now,
    posted_by: actor.id,
    created_by: actor.id,
    created_at: now,
    updated_at: now,
  };

  demoStore.journals.unshift(jrn);

  params.lines.forEach((l, idx) => {
    const acc = demoStore.accounts.find((a) => a.id === l.accountId);
    if (acc) acc.used_in_journal_count += 1;
    const effPrj = l.projectId ?? params.projectId;
    if (effPrj) {
      const prj = demoStore.projects.find((p) => p.id === effPrj);
      if (prj) prj.has_posted_journal = true;
    }
    demoStore.journalLines.push({
      id: crypto.randomUUID(),
      journal_id: jrn.id,
      line_no: idx + 1,
      account_id: l.accountId,
      project_id: effPrj ?? null,
      description: l.description ?? null,
      debit: roundRupiah(l.debit),
      credit: roundRupiah(l.credit),
    });
  });

  appendDemoAudit(actor, "INSERT", "journals", jrn.id, null, jrn);
  return jrn;
}

function tryEliminateDemoProject(projectId: string, eliminationDate: string) {
  const prj = demoStore.projects.find((p) => p.id === projectId);
  if (!prj || prj.revenue_method !== "progress_billing" || prj.is_eliminated) return;

  const maxPct = demoStore.projectProgress
    .filter((pp) => pp.project_id === projectId)
    .reduce((m, pp) => Math.max(m, pp.cumulative_percentage), 0);
  if (maxPct < 100) return;

  const wipAcc = demoStore.accounts.find((a) => a.system_tag === "work_in_progress");
  const billAcc = demoStore.accounts.find((a) => a.system_tag === "contract_billings");
  if (!wipAcc || !billAcc) return;

  const postedIds = new Set(
    demoStore.journals.filter((j) => j.status === "posted").map((j) => j.id),
  );
  let wipBal = 0;
  let billBal = 0;
  for (const jl of demoStore.journalLines) {
    if (!postedIds.has(jl.journal_id)) continue;
    const j = demoStore.journals.find((x) => x.id === jl.journal_id);
    const effPrj = jl.project_id ?? j?.project_id;
    if (effPrj !== projectId) continue;
    if (jl.account_id === wipAcc.id) wipBal += jl.debit - jl.credit;
    if (jl.account_id === billAcc.id) billBal += jl.credit - jl.debit;
  }

  if (wipBal === prj.contract_value && billBal === prj.contract_value && prj.contract_value > 0) {
    postDemoJournal({
      journalDate: eliminationDate,
      journalType: "elimination",
      description: `Eliminasi Penagihan atas Kontrak & Jasa dalam Proses saat proyek selesai 100% — ${prj.code}`,
      projectId,
      lines: [
        {
          accountId: billAcc.id,
          projectId,
          description: `Eliminasi Penagihan atas Kontrak ${prj.code}`,
          debit: prj.contract_value,
          credit: 0,
        },
        {
          accountId: wipAcc.id,
          projectId,
          description: `Eliminasi Jasa dalam Proses ${prj.code}`,
          debit: 0,
          credit: prj.contract_value,
        },
      ],
    });
    prj.is_eliminated = true;
    prj.status = "completed";
    prj.completed_date = eliminationDate;
  }
}

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
  format: "PDF" | "EXCEL",
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
      storage_path: `demo/${input.proofFile.name}`,
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
  const storagePath = `proofs/${created.id}/${Date.now()}_${safeFileName}`;

  if (input.proofFile.blob) {
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

// =============================================================================
// 5. Jurnal Akuntansi, Koreksi, Penutupan Buku, & Pembalik Opsional (UC-23, UC-26)
// =============================================================================
export async function listJournalsWithLines(): Promise<{
  journals: JournalRow[];
  lines: JournalLineRow[];
}> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat mengakses daftar jurnal akuntansi.");
    }
    return {
      journals: structuredClone(demoStore.journals).sort((a, b) =>
        b.journal_date.localeCompare(a.journal_date),
      ),
      lines: structuredClone(demoStore.journalLines),
    };
  }

  const [jRes, lRes] = await Promise.all([
    supabase
      .from("journals")
      .select("*")
      .order("journal_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("journal_lines").select("*").order("line_no", { ascending: true }),
  ]);
  if (jRes.error) throw new Error(jRes.error.message);
  if (lRes.error) throw new Error(lRes.error.message);
  return {
    journals: jRes.data ?? [],
    lines: lRes.data ?? [],
  };
}

export async function createManualOrAdjustmentJournal(input: {
  journalDate: string;
  journalType: "general" | "adjustment";
  description: string;
  projectId: string | null;
  autoReverseNextPeriod: boolean;
  lines: Array<{
    accountId: string;
    description?: string;
    debit: number;
    credit: number;
  }>;
}): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat memposting jurnal.");
    }
    postDemoJournal({
      journalDate: input.journalDate,
      journalType: input.journalType,
      description: input.description,
      projectId: input.projectId,
      autoReverseNextPeriod: input.autoReverseNextPeriod,
      lines: input.lines,
    });
    return;
  }

  const { error } = await supabase.rpc("create_and_post_journal", {
    p_journal_date: input.journalDate,
    p_journal_type: input.journalType,
    p_description: input.description.trim(),
    p_lines: input.lines.map((l) => ({
      account_id: l.accountId,
      project_id: input.projectId,
      description: l.description ?? input.description.trim(),
      debit: roundRupiah(l.debit),
      credit: roundRupiah(l.credit),
    })),
    p_project_id: input.projectId,
    p_auto_reverse_next_period: input.autoReverseNextPeriod,
  });
  if (error) throw new Error(error.message);
}

export async function createCorrectionJournalEntry(input: {
  originalJournalId: string;
  correctionDate: string;
  reason: string;
}): Promise<void> {
  if (input.reason.trim().length < 5) {
    throw new Error("Alasan koreksi wajib diisi minimal 5 karakter.");
  }
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat membuat jurnal koreksi.");
    }
    const orig = demoStore.journals.find((j) => j.id === input.originalJournalId);
    if (!orig || orig.status !== "posted") {
      throw new Error("Jurnal asal tidak ditemukan.");
    }
    const origLines = demoStore.journalLines
      .filter((l) => l.journal_id === orig.id)
      .sort((a, b) => a.line_no - b.line_no);
    postDemoJournal({
      journalDate: input.correctionDate,
      journalType: "correction",
      description: `Jurnal Koreksi atas ${orig.journal_number} — ${input.reason.trim()}`,
      projectId: orig.project_id,
      referenceJournalId: orig.id,
      lines: origLines.map((l) => ({
        accountId: l.account_id,
        projectId: l.project_id,
        description: `Koreksi atas ${orig.journal_number}`,
        debit: l.credit,
        credit: l.debit,
      })),
    });
    return;
  }

  const { error } = await supabase.rpc("create_correction_journal", {
    p_original_journal_id: input.originalJournalId,
    p_correction_date: input.correctionDate,
    p_reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function runPeriodClosingBook(periodId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menutup buku periode.");
    }
    const period = demoStore.periods.find((p) => p.id === periodId);
    if (!period) throw new Error("Periode tidak ditemukan.");
    if (period.status === "closed") {
      throw new Error(`Periode ${period.name} sudah tertutup.`);
    }

    const retainedAcc = demoStore.accounts.find(
      (a) => a.system_tag === "retained_earnings" && a.is_active,
    );
    if (!retainedAcc) throw new Error("Akun Laba Ditahan tidak ditemukan.");

    const periodJournalIds = new Set(
      demoStore.journals
        .filter(
          (j) =>
            j.period_id === periodId &&
            j.status === "posted" &&
            j.journal_type !== "closing",
        )
        .map((j) => j.id),
    );

    const netByNominalAcc = new Map<string, { d: number; c: number }>();
    for (const jl of demoStore.journalLines) {
      if (!periodJournalIds.has(jl.journal_id)) continue;
      const acc = demoStore.accounts.find((a) => a.id === jl.account_id);
      if (!acc || (acc.account_type !== "revenue" && acc.account_type !== "expense")) {
        continue;
      }
      const prev = netByNominalAcc.get(acc.id) ?? { d: 0, c: 0 };
      prev.d += jl.debit;
      prev.c += jl.credit;
      netByNominalAcc.set(acc.id, prev);
    }

    const closingLines: Array<{
      accountId: string;
      description: string;
      debit: number;
      credit: number;
    }> = [];
    let netProfit = 0;

    for (const [accId, t] of netByNominalAcc.entries()) {
      const acc = demoStore.accounts.find((a) => a.id === accId)!;
      if (acc.account_type === "revenue" && t.c > t.d) {
        const diff = t.c - t.d;
        closingLines.push({
          accountId: accId,
          description: `Penutupan akun pendapatan ${period.name}`,
          debit: diff,
          credit: 0,
        });
        netProfit += diff;
      } else if (acc.account_type === "expense" && t.d > t.c) {
        const diff = t.d - t.c;
        closingLines.push({
          accountId: accId,
          description: `Penutupan akun beban ${period.name}`,
          debit: 0,
          credit: diff,
        });
        netProfit -= diff;
      }
    }

    if (closingLines.length > 0) {
      if (netProfit > 0) {
        closingLines.push({
          accountId: retainedAcc.id,
          description: `Transfer laba bersih ke Laba Ditahan ${period.name}`,
          debit: 0,
          credit: netProfit,
        });
      } else if (netProfit < 0) {
        closingLines.push({
          accountId: retainedAcc.id,
          description: `Transfer rugi bersih ke Laba Ditahan ${period.name}`,
          debit: Math.abs(netProfit),
          credit: 0,
        });
      }
      postDemoJournal({
        journalDate: period.end_date,
        journalType: "closing",
        description: `Jurnal Penutup Periode ${period.name}`,
        projectId: null,
        lines: closingLines,
      });
    }

    const before = structuredClone(period);
    period.status = "closed";
    period.closed_at = new Date().toISOString();
    period.closed_by = actor.id;
    appendDemoAudit(actor, "CLOSE_PERIOD", "periods", period.id, before, period);
    return;
  }

  const { error } = await supabase.rpc("run_period_closing", {
    p_period_id: periodId,
  });
  if (error) throw new Error(error.message);
}

export async function runOptionalReversingEntries(
  sourcePeriodId: string,
  reversingDate: string,
): Promise<number> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menjalankan jurnal pembalik.");
    }
    const candidates = demoStore.journals.filter(
      (j) =>
        j.period_id === sourcePeriodId &&
        j.status === "posted" &&
        j.auto_reverse_next_period &&
        !j.is_reversed,
    );
    for (const jrn of candidates) {
      const origLines = demoStore.journalLines
        .filter((l) => l.journal_id === jrn.id)
        .sort((a, b) => a.line_no - b.line_no);
      postDemoJournal({
        journalDate: reversingDate,
        journalType: "reversing",
        description: `Jurnal Pembalik Awal Periode atas ${jrn.journal_number}`,
        projectId: jrn.project_id,
        referenceJournalId: jrn.id,
        lines: origLines.map((l) => ({
          accountId: l.account_id,
          projectId: l.project_id,
          description: `Jurnal Pembalik atas ${jrn.journal_number}`,
          debit: l.credit,
          credit: l.debit,
        })),
      });
      jrn.is_reversed = true;
    }
    return candidates.length;
  }

  const { data, error } = await supabase.rpc("generate_optional_reversing_entries", {
    p_source_period_id: sourcePeriodId,
    p_reversing_date: reversingDate,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

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
}): Promise<ProjectDocumentRow> {
  const todayIso = new Date().toISOString().slice(0, 10);
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
      content_json: { summary: input.summary.trim() },
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
      content_json: { summary: input.summary.trim() },
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
    if (prj.has_posted_journal) {
      throw new Error(
        "Jadwal termin tidak dapat disusun ulang setelah proyek memiliki jurnal terposting.",
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

    const invNumber = nextDemoDocNumber("INV", input.invoiceDate);
    const jrn = postDemoJournal({
      journalDate: input.invoiceDate,
      journalType: "auto_invoice",
      description: `Penagihan Invoice ${invNumber} — ${prj.name}`,
      projectId: prj.id,
      lines: [
        { accountId: debitAccId, projectId: prj.id, debit: totalAmount, credit: 0 },
        { accountId: creditAcc.id, projectId: prj.id, debit: 0, credit: totalAmount },
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
// 8. Bagi Hasil Proyek & Alokasi Proporsional Biaya Bersama (UC-28)
// =============================================================================
export async function getProfitSharingBundle(projectId?: string): Promise<{
  schemes: ProfitSharingSchemeRow[];
  results: ProfitSharingResultRow[];
  lines: ProfitSharingLineRow[];
}> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role === "user") {
      const myLines = demoStore.profitSharingLines.filter(
        (l) => l.recipient_user_id === actor.id,
      );
      const resIds = new Set(myLines.map((l) => l.result_id));
      return {
        schemes: [],
        results: structuredClone(
          demoStore.profitSharingResults.filter((r) => resIds.has(r.id)),
        ),
        lines: structuredClone(myLines),
      };
    }
    return {
      schemes: structuredClone(
        projectId
          ? demoStore.profitSharingSchemes.filter((s) => s.project_id === projectId)
          : demoStore.profitSharingSchemes,
      ),
      results: structuredClone(
        projectId
          ? demoStore.profitSharingResults.filter((r) => r.project_id === projectId)
          : demoStore.profitSharingResults,
      ),
      lines: structuredClone(demoStore.profitSharingLines),
    };
  }

  const [sRes, rRes, lRes] = await Promise.all([
    projectId
      ? supabase.from("profit_sharing_schemes").select("*").eq("project_id", projectId)
      : supabase.from("profit_sharing_schemes").select("*"),
    projectId
      ? supabase.from("profit_sharing_results").select("*").eq("project_id", projectId)
      : supabase.from("profit_sharing_results").select("*"),
    supabase.from("profit_sharing_lines").select("*"),
  ]);
  return {
    schemes: sRes.data ?? [],
    results: rRes.data ?? [],
    lines: lRes.data ?? [],
  };
}

export async function saveProfitSharingScheme(
  projectId: string,
  schemes: Array<{
    recipientName: string;
    recipientUserId: string | null;
    percentage: number;
  }>,
): Promise<void> {
  const sum = Number(schemes.reduce((s, x) => s + x.percentage, 0).toFixed(2));
  if (sum !== 100) {
    throw new Error(
      `Total persentase bagi hasil per proyek harus tepat 100% (saat ini: ${sum}%) (BR-10).`,
    );
  }

  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") throw new Error("Hanya Admin yang berwenang.");
    const existing = demoStore.profitSharingResults.find(
      (r) => r.project_id === projectId,
    );
    if (existing?.status === "finalized") {
      throw new Error("Bagi hasil proyek ini sudah difinalisasi dan terkunci (BR-9).");
    }
    demoStore.profitSharingSchemes = demoStore.profitSharingSchemes.filter(
      (s) => s.project_id !== projectId,
    );
    for (const s of schemes) {
      demoStore.profitSharingSchemes.push({
        id: crypto.randomUUID(),
        project_id: projectId,
        recipient_name: s.recipientName.trim(),
        recipient_user_id: s.recipientUserId,
        percentage: s.percentage,
        created_at: new Date().toISOString(),
      });
    }
    return;
  }

  const { error } = await supabase.rpc("save_profit_sharing_scheme", {
    p_project_id: projectId,
    p_schemes: schemes.map((s) => ({
      recipient_name: s.recipientName.trim(),
      recipient_user_id: s.recipientUserId ?? "",
      percentage: s.percentage,
    })),
  });
  if (error) throw new Error(error.message);
}

export async function runProjectProfitSharing(params: {
  projectId: string;
  finalize: boolean;
  postingDate: string;
  manualSharedCost?: number | null;
}): Promise<ProfitSharingResultRow> {
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") throw new Error("Hanya Admin yang berwenang.");
    const existing = demoStore.profitSharingResults.find(
      (r) => r.project_id === params.projectId,
    );
    if (existing?.status === "finalized") {
      throw new Error("Bagi hasil proyek ini sudah difinalisasi dan terkunci (BR-9).");
    }
    const schemes = demoStore.profitSharingSchemes.filter(
      (s) => s.project_id === params.projectId,
    );
    const sumPct = Number(schemes.reduce((s, x) => s + x.percentage, 0).toFixed(2));
    if (sumPct !== 100 || schemes.length === 0) {
      throw new Error("Skema bagi hasil belum lengkap 100% (BR-10).");
    }

    const postedNonClosing = new Set(
      demoStore.journals
        .filter((j) => j.status === "posted" && j.journal_type !== "closing")
        .map((j) => j.id),
    );
    let projRev = 0;
    let allRev = 0;
    let directCost = 0;
    let sharedPool = 0;

    for (const jl of demoStore.journalLines) {
      if (!postedNonClosing.has(jl.journal_id)) continue;
      const acc = demoStore.accounts.find((a) => a.id === jl.account_id);
      const j = demoStore.journals.find((x) => x.id === jl.journal_id);
      if (!acc || !j) continue;
      const effPrj = jl.project_id ?? j.project_id;

      if (acc.account_type === "revenue") {
        if (effPrj) allRev += jl.credit - jl.debit;
        if (effPrj === params.projectId) projRev += jl.credit - jl.debit;
      } else if (acc.account_type === "expense") {
        if (acc.system_tag === "shared_expense") {
          sharedPool += jl.debit - jl.credit;
        } else if (
          acc.system_tag !== "profit_sharing_expense" &&
          effPrj === params.projectId
        ) {
          directCost += jl.debit - jl.credit;
        }
      }
    }

    const allocShared =
      params.manualSharedCost != null
        ? roundRupiah(params.manualSharedCost)
        : allRev > 0 && sharedPool > 0
          ? roundRupiah((sharedPool * projRev) / allRev)
          : 0;

    const grossProfit = projRev - directCost - allocShared;
    let jrnId: string | null = null;

    if (params.finalize && grossProfit > 0) {
      const expAcc = demoStore.accounts.find(
        (a) => a.system_tag === "profit_sharing_expense",
      );
      const payAcc = demoStore.accounts.find(
        (a) => a.system_tag === "profit_sharing_payable",
      );
      if (!expAcc || !payAcc) {
        throw new Error("Akun Beban/Utang Bagi Hasil tidak ditemukan di COA.");
      }
      const j = postDemoJournal({
        journalDate: params.postingDate,
        journalType: "profit_sharing",
        description: "Finalisasi bagi hasil laba kotor proyek",
        projectId: params.projectId,
        lines: [
          {
            accountId: expAcc.id,
            projectId: params.projectId,
            debit: grossProfit,
            credit: 0,
          },
          {
            accountId: payAcc.id,
            projectId: params.projectId,
            debit: 0,
            credit: grossProfit,
          },
        ],
      });
      jrnId = j.id;
    }

    const now = new Date().toISOString();
    const resId = existing?.id ?? crypto.randomUUID();
    const resultRow: ProfitSharingResultRow = {
      id: resId,
      project_id: params.projectId,
      recognized_revenue: projRev,
      direct_cost: directCost,
      allocated_shared_cost: allocShared,
      gross_profit: grossProfit,
      status: params.finalize ? "finalized" : "draft_simulation",
      journal_id: jrnId,
      finalized_at: params.finalize ? now : null,
      finalized_by: params.finalize ? actor.id : null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    demoStore.profitSharingResults = demoStore.profitSharingResults.filter(
      (r) => r.project_id !== params.projectId,
    );
    demoStore.profitSharingResults.push(resultRow);

    demoStore.profitSharingLines = demoStore.profitSharingLines.filter(
      (l) => l.result_id !== resId,
    );

    let runningSum = 0;
    schemes.forEach((sc, idx) => {
      const share =
        grossProfit <= 0
          ? 0
          : idx === schemes.length - 1
            ? grossProfit - runningSum
            : roundRupiah((grossProfit * sc.percentage) / 100);
      runningSum += share;
      demoStore.profitSharingLines.push({
        id: crypto.randomUUID(),
        result_id: resId,
        recipient_name: sc.recipient_name,
        recipient_user_id: sc.recipient_user_id,
        percentage: sc.percentage,
        share_amount: share,
      });
    });

    if (params.finalize) {
      appendDemoAudit(
        actor,
        "FINALIZE_SHARING",
        "profit_sharing_results",
        resId,
        null,
        resultRow,
      );
    }

    return structuredClone(resultRow);
  }

  const { data, error } = await supabase.rpc("calculate_project_profit_sharing", {
    p_project_id: params.projectId,
    p_finalize: params.finalize,
    p_posting_date: params.postingDate,
    p_manual_shared_cost: params.manualSharedCost ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

// =============================================================================
// 9. Portal Pembeli Tanpa Login (UC-34..36, FR-PB1..9)
// =============================================================================
function generateRandomBuyerPoCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PO-${ym}-${suffix}`;
}

export async function publicBuyerSubmitPo(input: {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  quotationReference: string;
  items: Array<{ item: string; qty: number; price: number }>;
  turnstileToken?: string;
}): Promise<{ po_number: string; po_value: number; status: string }> {
  const poValue = input.items.reduce(
    (s, it) => s + roundRupiah(it.qty * it.price),
    0,
  );
  if (poValue <= 0) {
    throw new Error("Total nilai item PO klien harus lebih besar dari Rp0.");
  }

  if (isDemoMode || !supabase) {
    const poNumber = generateRandomBuyerPoCode();
    const now = new Date().toISOString();
    const created: ClientPurchaseOrderRow = {
      id: crypto.randomUUID(),
      po_number: poNumber,
      project_id: null,
      quotation_reference: input.quotationReference.trim() || null,
      client_name: input.clientName.trim(),
      client_company: input.clientCompany.trim() || null,
      client_email: input.clientEmail.trim(),
      client_phone: input.clientPhone.trim() || null,
      items_json: input.items.map((i) => ({
        item: i.item.trim(),
        qty: i.qty,
        price: roundRupiah(i.price),
      })),
      po_value: poValue,
      status: "pending_verification",
      verified_by: null,
      verified_at: null,
      rejection_note: null,
      attachment_path: null,
      submitted_ip_hash: "demo",
      created_at: now,
      updated_at: now,
    };
    demoStore.clientPos.unshift(created);
    for (const adm of demoStore.profiles.filter(
      (p) => p.role === "admin" && p.is_active,
    )) {
      pushDemoNotification(
        adm.id,
        `PO Klien Baru: ${poNumber}`,
        `${created.client_name} mengajukan PO senilai Rp${poValue.toLocaleString("id-ID")} (Menunggu Verifikasi).`,
        "/admin/proyek",
      );
    }
    return {
      po_number: poNumber,
      po_value: poValue,
      status: created.status,
    };
  }

  const { data, error } = await supabase.functions.invoke("buyer-submit-po", {
    body: {
      clientName: input.clientName.trim(),
      clientCompany: input.clientCompany.trim(),
      clientEmail: input.clientEmail.trim(),
      clientPhone: input.clientPhone.trim(),
      quotationReference: input.quotationReference.trim(),
      poValue,
      items: input.items,
      turnstileToken: input.turnstileToken,
    },
  });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as { po_number: string; po_value: number; status: string };
}

export async function publicBuyerLookupPo(
  rawPoNumber: string,
): Promise<BuyerPortalLookupDto> {
  const norm = rawPoNumber.trim().toUpperCase();
  if (!norm) {
    throw new Error("Masukkan Nomor PO terlebih dahulu.");
  }

  if (isDemoMode || !supabase) {
    const cpo = demoStore.clientPos.find((c) => c.po_number === norm);
    if (!cpo) {
      throw new Error(
        "Nomor PO tidak ditemukan. Pastikan format kode PO sesuai (contoh pada Mode Lokal: PO-202611-SN8K4P).",
      );
    }

    const prj = cpo.project_id
      ? demoStore.projects.find((p) => p.id === cpo.project_id)
      : null;

    const maxPct = cpo.project_id
      ? demoStore.projectProgress
          .filter((pp) => pp.project_id === cpo.project_id)
          .reduce((m, pp) => Math.max(m, pp.cumulative_percentage), 0)
      : 0;

    const milestones = cpo.project_id
      ? demoStore.milestones
          .filter((m) => m.project_id === cpo.project_id)
          .sort((a, b) => a.sequence_no - b.sequence_no)
          .map((m) => ({
            sequence_no: m.sequence_no,
            name: m.name,
            percentage: m.percentage,
            amount: m.amount,
            status: m.status,
            achievement_criteria: m.achievement_criteria,
          }))
      : [];

    const documents: BuyerPortalLookupDto["documents"] = [];
    if (cpo.project_id) {
      for (const q of demoStore.quotations.filter(
        (x) => x.project_id === cpo.project_id,
      )) {
        documents.push({
          category: "Quotation",
          doc_number: q.quotation_number,
          doc_date: q.quotation_date,
          status: q.status,
        });
      }
      for (const pd of demoStore.projectDocuments.filter(
        (x) => x.project_id === cpo.project_id && x.visible_to_buyer,
      )) {
        documents.push({
          category: pd.doc_type,
          doc_number: pd.doc_number,
          doc_date: pd.created_at.slice(0, 10),
          status: pd.is_signed ? "Bertanda Tangan" : "Draf",
        });
      }
      for (const b of demoStore.progressReports.filter(
        (x) => x.project_id === cpo.project_id,
      )) {
        documents.push({
          category: "BAKP",
          doc_number: b.bakp_number,
          doc_date: b.bakp_date,
          status: b.status,
        });
      }
      for (const u of demoStore.uatChecklists.filter(
        (x) => x.project_id === cpo.project_id,
      )) {
        documents.push({
          category: "UAT",
          doc_number: u.uat_number,
          doc_date: u.test_date,
          status: u.conclusion,
        });
      }
      for (const h of demoStore.handoverReports.filter(
        (x) => x.project_id === cpo.project_id,
      )) {
        documents.push({
          category: "BAST",
          doc_number: h.bast_number,
          doc_date: h.bast_date,
          status: h.status,
        });
      }
      for (const i of demoStore.salesInvoices.filter(
        (x) =>
          x.project_id === cpo.project_id &&
          x.client_po_id === cpo.id &&
          x.doc_status === "issued",
      )) {
        documents.push({
          category: "Invoice",
          doc_number: i.invoice_number,
          doc_date: i.invoice_date,
          status: i.payment_status,
        });
      }
      for (const r of demoStore.receipts.filter((x) =>
        demoStore.salesInvoices.some(
          (i) => i.id === x.invoice_id && i.client_po_id === cpo.id,
        ),
      )) {
        documents.push({
          category: "Kuitansi",
          doc_number: r.receipt_number,
          doc_date: r.receipt_date,
          status: "Sah",
        });
      }
    }

    return {
      po_number: cpo.po_number,
      client_name: cpo.client_name,
      client_company: cpo.client_company,
      po_value: cpo.po_value,
      verification_status: cpo.status,
      submitted_at: cpo.created_at,
      project: prj
        ? {
            code: prj.code,
            name: prj.name,
            status: prj.status,
            start_date: prj.start_date,
            target_end_date: prj.target_end_date,
            cumulative_progress_pct: maxPct,
          }
        : null,
      milestones,
      documents,
    };
  }

  const { data, error } = await supabase.functions.invoke("buyer-portal-lookup", {
    body: { poNumber: norm },
  });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as BuyerPortalLookupDto;
}
