import { demoStore, getDemoActor, nextDemoDocNumber } from "@/lib/data-service";
import { inferRevenueMethodFromTerms, roundRupiah } from "@/lib/formatters";
import {
  findDemoPeriodByDate,
  postDemoJournal,
  tryEliminateDemoProject,
} from "@/lib/operations/shared";
import { invalidateAndNotifyDataChange } from "@/lib/realtime-cache";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  InvoiceKind,
  InvoicePaymentStatus,
  MilestoneStatus,
  ProjectProgressRow,
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";

// =============================================================================
// MILESTONES / TERMIN PROYEK
// =============================================================================

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
    ms.achievement_criteria = input.achievementCriteria.trim() || null,
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

// =============================================================================
// PROJECT PROGRESS & PERIOD COMPLETION
// =============================================================================

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

// =============================================================================
// SALES INVOICES (PENAGIHAN)
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
  if (input.dueDate < input.invoiceDate) {
    throw new Error(
      "Tanggal jatuh tempo tidak boleh lebih awal dari tanggal invoice (Checklist Standar).",
    );
  }
  if (subtotal <= 0) {
    throw new Error("Nominal subtotal tagihan harus lebih besar dari Rp 0.");
  }

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

export async function updateSalesInvoice(
  invoiceId: string,
  input: {
    invoiceDate: string;
    dueDate: string;
    subtotalAmount: number;
    paymentStatus: InvoicePaymentStatus;
    notes: string;
  },
): Promise<void> {
  const subtotal = roundRupiah(input.subtotalAmount);
  if (input.dueDate < input.invoiceDate) {
    throw new Error(
      "Tanggal jatuh tempo tidak boleh lebih awal dari tanggal invoice.",
    );
  }
  if (subtotal <= 0) {
    throw new Error("Nominal subtotal tagihan harus lebih besar dari Rp 0.");
  }

  if (isDemoMode || !supabase) {
    const inv = demoStore.salesInvoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error("Invoice tidak ditemukan.");
    const ppnAmount = demoStore.company.pkp_enabled
      ? roundRupiah((subtotal * demoStore.company.ppn_rate) / 100)
      : 0;
    const totalAmount = subtotal + ppnAmount;
    inv.invoice_date = input.invoiceDate;
    inv.due_date = input.dueDate;
    inv.subtotal_amount = subtotal;
    inv.ppn_amount = ppnAmount;
    inv.total_amount = totalAmount;
    inv.payment_status = input.paymentStatus;
    if (input.paymentStatus === "paid") {
      inv.paid_amount = totalAmount;
    } else if (input.paymentStatus === "unpaid") {
      inv.paid_amount = 0;
    } else {
      inv.paid_amount = Math.min(Math.max(1, inv.paid_amount), totalAmount - 1);
    }
    inv.notes = input.notes.trim() || null,
    inv.updated_at = new Date().toISOString();
    invalidateAndNotifyDataChange("sales_invoices");
    return;
  }

  const [companyRes, existingRes] = await Promise.all([
    supabase
      .from("company_profile")
      .select("pkp_enabled, ppn_rate")
      .eq("id", 1)
      .single(),
    supabase
      .from("sales_invoices")
      .select("doc_status, subtotal_amount, paid_amount")
      .eq("id", invoiceId)
      .single(),
  ]);
  if (existingRes.error) throw new Error(existingRes.error.message);
  const pkpEnabled = companyRes.data?.pkp_enabled ?? false;
  const ppnRate = companyRes.data?.ppn_rate ?? 11;
  const ppnAmount = pkpEnabled ? roundRupiah((subtotal * ppnRate) / 100) : 0;
  const totalAmount = subtotal + ppnAmount;
  const prevPaid = Number(existingRes.data?.paid_amount ?? 0);
  const nextPaidAmount =
    input.paymentStatus === "paid"
      ? totalAmount
      : input.paymentStatus === "unpaid"
        ? 0
        : Math.min(Math.max(1, prevPaid), Math.max(1, totalAmount - 1));

  if (existingRes.data?.doc_status === "issued" && subtotal !== existingRes.data.subtotal_amount) {
    const { error: draftErr } = await supabase
      .from("sales_invoices")
      .update({ doc_status: "draft" })
      .eq("id", invoiceId);
    if (draftErr) throw new Error(draftErr.message);
  }

  const { error } = await supabase
    .from("sales_invoices")
    .update({
      invoice_date: input.invoiceDate,
      due_date: input.dueDate,
      subtotal_amount: subtotal,
      ppn_amount: ppnAmount,
      total_amount: totalAmount,
      paid_amount: nextPaidAmount,
      payment_status: input.paymentStatus,
      notes: input.notes.trim() || null,
      doc_status: existingRes.data?.doc_status ?? "issued",
    })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("sales_invoices");
}

export async function deleteSalesInvoices(invoiceIds: string[]): Promise<void> {
  if (invoiceIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(invoiceIds);
    demoStore.receipts = demoStore.receipts.filter((r) => !idSet.has(r.invoice_id));
    demoStore.salesInvoices = demoStore.salesInvoices.filter((i) => !idSet.has(i.id));
    invalidateAndNotifyDataChange("sales_invoices");
    return;
  }

  const { error: recErr } = await supabase
    .from("receipts")
    .delete()
    .in("invoice_id", invoiceIds);
  if (recErr) throw new Error(recErr.message);

  const { error: payErr } = await supabase
    .from("invoice_payments")
    .delete()
    .in("invoice_id", invoiceIds);
  if (payErr) throw new Error(payErr.message);

  const { error: draftErr } = await supabase
    .from("sales_invoices")
    .update({ doc_status: "draft" })
    .in("id", invoiceIds);
  if (draftErr) throw new Error(draftErr.message);

  const { error } = await supabase
    .from("sales_invoices")
    .delete()
    .in("id", invoiceIds);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("sales_invoices");
}

// =============================================================================
// RECEIPTS (KUITANSI PELUNASAN)
// =============================================================================

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

export async function updateReceipt(
  receiptId: string,
  input: {
    receiptDate: string;
    receivedFrom: string;
    amount: number;
  },
): Promise<void> {
  const amt = roundRupiah(input.amount);
  if (amt <= 0) {
    throw new Error("Jumlah pembayaran kuitansi harus lebih besar dari Rp 0.");
  }
  if (!input.receivedFrom.trim()) {
    throw new Error("Nama pembayar (Diterima Dari) wajib diisi.");
  }

  if (isDemoMode || !supabase) {
    const kw = demoStore.receipts.find((r) => r.id === receiptId);
    if (!kw) throw new Error("Kuitansi tidak ditemukan.");
    kw.receipt_date = input.receiptDate;
    kw.received_from = input.receivedFrom.trim();
    kw.amount = amt;
    invalidateAndNotifyDataChange("receipts");
    return;
  }

  const { error } = await supabase
    .from("receipts")
    .update({
      receipt_date: input.receiptDate,
      received_from: input.receivedFrom.trim(),
      amount: amt,
    })
    .eq("id", receiptId);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("receipts");
}

export async function deleteReceipts(receiptIds: string[]): Promise<void> {
  if (receiptIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const idSet = new Set(receiptIds);
    demoStore.receipts = demoStore.receipts.filter((r) => !idSet.has(r.id));
    invalidateAndNotifyDataChange("receipts");
    return;
  }

  const { error } = await supabase
    .from("receipts")
    .delete()
    .in("id", receiptIds);
  if (error) throw new Error(error.message);
  invalidateAndNotifyDataChange("receipts");
}
