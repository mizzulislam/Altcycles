import {
  appendDemoAudit,
  demoStore,
  getDemoActor,
  nextDemoDocNumber,
} from "@/lib/data-service";
import { roundRupiah } from "@/lib/formatters";

import type {
  JournalRow,
  JournalType,
} from "@/types/database.types";

export function pushDemoNotification(
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

export function findDemoPeriodByDate(dateIso: string) {
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

export function postDemoJournal(params: {
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

export function tryEliminateDemoProject(projectId: string, eliminationDate: string) {
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
