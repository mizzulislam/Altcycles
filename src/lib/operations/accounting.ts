import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
} from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";
import { isDemoMode, supabase } from "@/lib/supabase";
import type {
  JournalLineRow,
  JournalRow,
} from "@/types/database.types";
import {
  postDemoJournal,
} from "@/lib/operations/shared";

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
  journalType: "general" | "adjustment" | "closing";
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

export async function updateJournal(input: {
  journalId: string;
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
      throw new Error("Hanya Admin yang dapat mengubah jurnal akuntansi.");
    }
    const jrn = demoStore.journals.find((j) => j.id === input.journalId);
    if (!jrn) throw new Error("Jurnal tidak ditemukan.");
    jrn.journal_date = input.journalDate;
    jrn.journal_type = input.journalType;
    jrn.description = input.description.trim();
    jrn.project_id = input.projectId;
    jrn.auto_reverse_next_period = input.autoReverseNextPeriod;
    jrn.updated_at = new Date().toISOString();

    // Replace lines
    demoStore.journalLines = demoStore.journalLines.filter(
      (l) => l.journal_id !== input.journalId,
    );
    input.lines.forEach((l, idx) => {
      demoStore.journalLines.push({
        id: crypto.randomUUID(),
        journal_id: input.journalId,
        line_no: idx + 1,
        account_id: l.accountId,
        project_id: input.projectId,
        description: l.description ?? input.description.trim(),
        debit: roundRupiah(l.debit),
        credit: roundRupiah(l.credit),
      });
    });
    return;
  }

  const { error: updErr } = await supabase
    .from("journals")
    .update({
      journal_date: input.journalDate,
      journal_type: input.journalType,
      description: input.description.trim(),
      project_id: input.projectId,
      auto_reverse_next_period: input.autoReverseNextPeriod,
    })
    .eq("id", input.journalId);
  if (updErr) throw new Error(updErr.message);

  const { error: delErr } = await supabase
    .from("journal_lines")
    .delete()
    .eq("journal_id", input.journalId);
  if (delErr) throw new Error(delErr.message);

  const { error: insErr } = await supabase.from("journal_lines").insert(
    input.lines.map((l, idx) => ({
      journal_id: input.journalId,
      line_no: idx + 1,
      account_id: l.accountId,
      project_id: input.projectId,
      description: l.description ?? input.description.trim(),
      debit: roundRupiah(l.debit),
      credit: roundRupiah(l.credit),
    })),
  );
  if (insErr) throw new Error(insErr.message);
}

export async function deleteJournals(journalIds: string[]): Promise<void> {
  if (journalIds.length === 0) return;
  if (isDemoMode || !supabase) {
    const actor = getDemoActor();
    if (actor.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menghapus jurnal akuntansi.");
    }
    const idSet = new Set(journalIds);
    demoStore.projectProgress.forEach((pp) => {
      if (pp.adjustment_journal_id && idSet.has(pp.adjustment_journal_id)) {
        pp.adjustment_journal_id = null;
      }
    });
    demoStore.salesInvoices.forEach((inv) => {
      if (inv.journal_id && idSet.has(inv.journal_id)) {
        inv.journal_id = null;
      }
    });
    demoStore.profitSharingResults.forEach((ps) => {
      if (ps.journal_id && idSet.has(ps.journal_id)) {
        ps.journal_id = null;
      }
    });
    demoStore.journals.forEach((j) => {
      if (j.reference_journal_id && idSet.has(j.reference_journal_id)) {
        j.reference_journal_id = null;
      }
    });
    demoStore.journalLines = demoStore.journalLines.filter(
      (l) => !idSet.has(l.journal_id),
    );
    const affectedProjectIds = new Set(
      demoStore.journals
        .filter((j) => idSet.has(j.id) && j.project_id)
        .map((j) => j.project_id!),
    );
    demoStore.journals = demoStore.journals.filter((j) => !idSet.has(j.id));
    affectedProjectIds.forEach((pid) => {
      const prj = demoStore.projects.find((p) => p.id === pid);
      if (prj) {
        prj.has_posted_journal = demoStore.journals.some(
          (j) => j.project_id === pid && j.status === "posted",
        );
      }
    });
    return;
  }

  // Putuskan referensi FK opsional terlebih dahulu sebagai jaring pengaman, lalu hapus header
  // jurnal secara atomik (journal_lines ikut terhapus oleh ON DELETE CASCADE).
  await Promise.all([
    supabase
      .from("project_progress")
      .update({ adjustment_journal_id: null })
      .in("adjustment_journal_id", journalIds),
    supabase
      .from("sales_invoices")
      .update({ journal_id: null })
      .in("journal_id", journalIds),
    supabase
      .from("invoice_payments")
      .update({ journal_id: null })
      .in("journal_id", journalIds),
    supabase
      .from("profit_sharing_results")
      .update({ journal_id: null })
      .in("journal_id", journalIds),
    supabase
      .from("journals")
      .update({ reference_journal_id: null })
      .in("reference_journal_id", journalIds),
  ]);

  const { error: journalsError } = await supabase
    .from("journals")
    .delete()
    .in("id", journalIds);
  if (journalsError) throw new Error(journalsError.message);
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
