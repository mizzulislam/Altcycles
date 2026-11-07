import type {
  AccountRow,
  JournalLineRow,
  JournalRow,
  ProjectRow,
  SalesInvoiceRow,
} from "@/types/database.types";

export interface LedgerEntryView {
  journalId: string;
  journalNumber: string;
  journalDate: string;
  journalType: string;
  projectCode: string | null;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface TrialBalanceLine {
  accountId: string;
  code: string;
  name: string;
  accountType: AccountRow["account_type"];
  totalDebit: number;
  totalCredit: number;
  endingDebit: number;
  endingCredit: number;
}

export interface IncomeStatementReport {
  revenues: Array<{ code: string; name: string; amount: number }>;
  directExpenses: Array<{ code: string; name: string; amount: number }>;
  sharedExpenses: Array<{ code: string; name: string; amount: number }>;
  totalRevenue: number;
  totalDirectExpense: number;
  grossProfit: number;
  totalSharedExpense: number;
  netProfit: number;
}

export interface ContractPositionPerProject {
  projectId: string;
  projectCode: string;
  projectName: string;
  wipBalance: number;
  billingsBalance: number;
  netContractPosition: number; // > 0 => Aset Kontrak, < 0 => Liabilitas Kontrak
}

export interface BalanceSheetReport {
  assets: Array<{ code: string; name: string; amount: number }>;
  contractAssets: ContractPositionPerProject[];
  liabilities: Array<{ code: string; name: string; amount: number }>;
  contractLiabilities: ContractPositionPerProject[];
  equities: Array<{ code: string; name: string; amount: number }>;
  currentUnclosedEarnings: number;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface CashFlowReport {
  beginningCash: number;
  operatingInflow: number;
  operatingOutflow: number;
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netChangeInCash: number;
  endingCash: number;
}

export interface ArAgingItem {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  projectCode: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  agingBucket: "Belum Jatuh Tempo" | "1–30 Hari" | "31–60 Hari" | "> 60 Hari";
}

/**
 * Menyaring jurnal terposting sesuai rentang tanggal dan opsional proyek.
 */
function filterPostedLines(
  journals: JournalRow[],
  lines: JournalLineRow[],
  options: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
    excludeClosing?: boolean;
  },
): Array<{ journal: JournalRow; line: JournalLineRow }> {
  const journalMap = new Map<string, JournalRow>();
  for (const j of journals) {
    if (j.status !== "posted") continue;
    if (options.excludeClosing && j.journal_type === "closing") continue;
    if (options.startDate && j.journal_date < options.startDate) continue;
    if (options.endDate && j.journal_date > options.endDate) continue;
    journalMap.set(j.id, j);
  }

  const out: Array<{ journal: JournalRow; line: JournalLineRow }> = [];
  for (const line of lines) {
    const j = journalMap.get(line.journal_id);
    if (!j) continue;
    const effectiveProject = line.project_id ?? j.project_id;
    if (options.projectId && effectiveProject !== options.projectId) continue;
    out.push({ journal: j, line });
  }

  out.sort((a, b) =>
    a.journal.journal_date.localeCompare(b.journal.journal_date) ||
    a.journal.journal_number.localeCompare(b.journal.journal_number) ||
    a.line.line_no - b.line.line_no,
  );
  return out;
}

/**
 * 1. Buku Besar (General Ledger) per Akun (FR-AK3)
 */
export function buildGeneralLedger(
  account: AccountRow,
  journals: JournalRow[],
  lines: JournalLineRow[],
  projects: ProjectRow[],
  options: { startDate?: string; endDate?: string; projectId?: string } = {},
): LedgerEntryView[] {
  const projectMap = new Map(projects.map((p) => [p.id, p.code]));
  const matched = filterPostedLines(journals, lines, options).filter(
    ({ line }) => line.account_id === account.id,
  );

  let running = 0;
  return matched.map(({ journal, line }) => {
    const delta =
      account.normal_balance === "debit"
        ? line.debit - line.credit
        : line.credit - line.debit;
    running += delta;
    const effPrj = line.project_id ?? journal.project_id;
    return {
      journalId: journal.id,
      journalNumber: journal.journal_number,
      journalDate: journal.journal_date,
      journalType: journal.journal_type,
      projectCode: effPrj ? (projectMap.get(effPrj) ?? null) : null,
      description: line.description || journal.description,
      debit: line.debit,
      credit: line.credit,
      runningBalance: running,
    };
  });
}

/**
 * 2. Neraca Saldo (Trial Balance) (FR-AK4)
 */
export function buildTrialBalance(
  accounts: AccountRow[],
  journals: JournalRow[],
  lines: JournalLineRow[],
  options: { endDate?: string; projectId?: string; excludeClosing?: boolean } = {},
): {
  rows: TrialBalanceLine[];
  sumDebit: number;
  sumCredit: number;
  sumEndingDebit: number;
  sumEndingCredit: number;
} {
  const matched = filterPostedLines(journals, lines, options);
  const totals = new Map<string, { d: number; c: number }>();

  for (const { line } of matched) {
    const prev = totals.get(line.account_id) ?? { d: 0, c: 0 };
    prev.d += line.debit;
    prev.c += line.credit;
    totals.set(line.account_id, prev);
  }

  const rows: TrialBalanceLine[] = [];
  let sumDebit = 0;
  let sumCredit = 0;
  let sumEndingDebit = 0;
  let sumEndingCredit = 0;

  for (const acc of [...accounts].sort((a, b) => a.code.localeCompare(b.code))) {
    if (!acc.is_postable) continue;
    const t = totals.get(acc.id);
    if (!t || (t.d === 0 && t.c === 0)) continue;

    const net = t.d - t.c;
    const endingDebit = net > 0 ? net : 0;
    const endingCredit = net < 0 ? Math.abs(net) : 0;

    sumDebit += t.d;
    sumCredit += t.c;
    sumEndingDebit += endingDebit;
    sumEndingCredit += endingCredit;

    rows.push({
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      accountType: acc.account_type,
      totalDebit: t.d,
      totalCredit: t.c,
      endingDebit,
      endingCredit,
    });
  }

  return { rows, sumDebit, sumCredit, sumEndingDebit, sumEndingCredit };
}

/**
 * 3. Laporan Laba Rugi (Income Statement) Basis Akrual (FR-AK6)
 */
export function buildIncomeStatement(
  accounts: AccountRow[],
  journals: JournalRow[],
  lines: JournalLineRow[],
  options: { startDate?: string; endDate?: string; projectId?: string } = {},
): IncomeStatementReport {
  const matched = filterPostedLines(journals, lines, {
    ...options,
    excludeClosing: true,
  });
  const accTotals = new Map<string, number>();

  for (const { line } of matched) {
    accTotals.set(
      line.account_id,
      (accTotals.get(line.account_id) ?? 0) + (line.debit - line.credit),
    );
  }

  const revenues: Array<{ code: string; name: string; amount: number }> = [];
  const directExpenses: Array<{ code: string; name: string; amount: number }> = [];
  const sharedExpenses: Array<{ code: string; name: string; amount: number }> = [];

  for (const acc of [...accounts].sort((a, b) => a.code.localeCompare(b.code))) {
    if (!acc.is_postable) continue;
    const netDebit = accTotals.get(acc.id) ?? 0;
    if (acc.account_type === "revenue") {
      const revAmount = -netDebit;
      if (revAmount !== 0) {
        revenues.push({ code: acc.code, name: acc.name, amount: revAmount });
      }
    } else if (acc.account_type === "expense") {
      if (netDebit !== 0) {
        if (acc.system_tag === "shared_expense") {
          sharedExpenses.push({ code: acc.code, name: acc.name, amount: netDebit });
        } else {
          directExpenses.push({ code: acc.code, name: acc.name, amount: netDebit });
        }
      }
    }
  }

  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalDirectExpense = directExpenses.reduce((s, r) => s + r.amount, 0);
  const grossProfit = totalRevenue - totalDirectExpense;
  const totalSharedExpense = sharedExpenses.reduce((s, r) => s + r.amount, 0);
  const netProfit = grossProfit - totalSharedExpense;

  return {
    revenues,
    directExpenses,
    sharedExpenses,
    totalRevenue,
    totalDirectExpense,
    grossProfit,
    totalSharedExpense,
    netProfit,
  };
}

/**
 * 4. Neraca (Balance Sheet) dengan Perhitungan Aset Kontrak & Liabilitas Kontrak per Proyek (PRD Bagian 7.1 & FR-AK7)
 *    - Jasa dalam Proses > Penagihan atas Kontrak => Aset Kontrak
 *    - Penagihan atas Kontrak > Jasa dalam Proses => Liabilitas Kontrak
 */
export function buildBalanceSheet(
  accounts: AccountRow[],
  journals: JournalRow[],
  lines: JournalLineRow[],
  projects: ProjectRow[],
  asOfDate?: string,
): BalanceSheetReport {
  const matched = filterPostedLines(journals, lines, { endDate: asOfDate });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const netDebitByAccount = new Map<string, number>();
  const wipByProject = new Map<string, number>();
  const billingsByProject = new Map<string, number>();

  let currentUnclosedEarnings = 0;

  for (const { journal, line } of matched) {
    const acc = accountMap.get(line.account_id);
    if (!acc) continue;

    const effPrj = line.project_id ?? journal.project_id ?? "__UNASSIGNED__";

    if (acc.system_tag === "work_in_progress") {
      wipByProject.set(
        effPrj,
        (wipByProject.get(effPrj) ?? 0) + (line.debit - line.credit),
      );
      continue;
    }

    if (acc.system_tag === "contract_billings") {
      billingsByProject.set(
        effPrj,
        (billingsByProject.get(effPrj) ?? 0) + (line.credit - line.debit),
      );
      continue;
    }

    if (acc.account_type === "revenue" || acc.account_type === "expense") {
      // Saldo akun nominal yang belum ditutup oleh jurnal penutup masuk sebagai laba tahun/periode berjalan
      currentUnclosedEarnings += line.credit - line.debit;
      continue;
    }

    netDebitByAccount.set(
      acc.id,
      (netDebitByAccount.get(acc.id) ?? 0) + (line.debit - line.credit),
    );
  }

  const allContractProjectKeys = new Set<string>([
    ...wipByProject.keys(),
    ...billingsByProject.keys(),
  ]);

  const contractAssets: ContractPositionPerProject[] = [];
  const contractLiabilities: ContractPositionPerProject[] = [];

  for (const key of allContractProjectKeys) {
    const wip = wipByProject.get(key) ?? 0;
    const billings = billingsByProject.get(key) ?? 0;
    const net = wip - billings;
    if (net === 0) continue;

    const prj = projectMap.get(key);
    const entry: ContractPositionPerProject = {
      projectId: key,
      projectCode: prj?.code ?? "PRJ",
      projectName: prj?.name ?? "Proyek Kontrak",
      wipBalance: wip,
      billingsBalance: billings,
      netContractPosition: net,
    };

    if (net > 0) {
      contractAssets.push(entry);
    } else {
      contractLiabilities.push(entry);
    }
  }

  const assets: Array<{ code: string; name: string; amount: number }> = [];
  const liabilities: Array<{ code: string; name: string; amount: number }> = [];
  const equities: Array<{ code: string; name: string; amount: number }> = [];

  for (const acc of [...accounts].sort((a, b) => a.code.localeCompare(b.code))) {
    if (!acc.is_postable) continue;
    if (
      acc.system_tag === "work_in_progress" ||
      acc.system_tag === "contract_billings"
    ) {
      continue;
    }
    const netDebit = netDebitByAccount.get(acc.id) ?? 0;
    if (netDebit === 0) continue;

    if (acc.account_type === "asset" || acc.account_type === "contra_asset") {
      assets.push({ code: acc.code, name: acc.name, amount: netDebit });
    } else if (acc.account_type === "liability") {
      liabilities.push({ code: acc.code, name: acc.name, amount: -netDebit });
    } else if (acc.account_type === "equity") {
      equities.push({ code: acc.code, name: acc.name, amount: -netDebit });
    }
  }

  const sumRegularAssets = assets.reduce((s, r) => s + r.amount, 0);
  const sumContractAssets = contractAssets.reduce(
    (s, r) => s + r.netContractPosition,
    0,
  );
  const totalAssets = sumRegularAssets + sumContractAssets;

  const sumRegularLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const sumContractLiabilities = contractLiabilities.reduce(
    (s, r) => s + Math.abs(r.netContractPosition),
    0,
  );
  const sumEquities = equities.reduce((s, r) => s + r.amount, 0);
  const totalLiabilitiesAndEquity =
    sumRegularLiabilities +
    sumContractLiabilities +
    sumEquities +
    currentUnclosedEarnings;

  return {
    assets,
    contractAssets,
    liabilities,
    contractLiabilities,
    equities,
    currentUnclosedEarnings,
    totalAssets,
    totalLiabilitiesAndEquity,
    isBalanced: totalAssets === totalLiabilitiesAndEquity,
  };
}

/**
 * 5. Laporan Arus Kas (Cash Flow Statement) Metode Langsung Terklasifikasi (FR-AK8)
 */
export function buildCashFlowStatement(
  accounts: AccountRow[],
  journals: JournalRow[],
  lines: JournalLineRow[],
  options: { startDate?: string; endDate?: string } = {},
): CashFlowReport {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const cashAccountIds = new Set(
    accounts
      .filter(
        (a) =>
          a.system_tag === "cash_bank" ||
          a.cash_flow_category === "cash_equivalent",
      )
      .map((a) => a.id),
  );

  let beginningCash = 0;
  let operatingInflow = 0;
  let operatingOutflow = 0;
  let netInvesting = 0;
  let netFinancing = 0;

  const linesByJournal = new Map<string, JournalLineRow[]>();
  for (const l of lines) {
    const arr = linesByJournal.get(l.journal_id) ?? [];
    arr.push(l);
    linesByJournal.set(l.journal_id, arr);
  }

  for (const j of journals) {
    if (j.status !== "posted") continue;
    if (options.endDate && j.journal_date > options.endDate) continue;

    const jLines = linesByJournal.get(j.id) ?? [];
    const cashDelta = jLines
      .filter((l) => cashAccountIds.has(l.account_id))
      .reduce((s, l) => s + (l.debit - l.credit), 0);

    if (cashDelta === 0) continue;

    if (options.startDate && j.journal_date < options.startDate) {
      beginningCash += cashDelta;
      continue;
    }

    // Klasifikasikan berdasarkan akun lawan non-kas pada jurnal yang sama
    const counterLines = jLines.filter((l) => !cashAccountIds.has(l.account_id));
    const hasInvesting = counterLines.some(
      (l) => accountMap.get(l.account_id)?.cash_flow_category === "investing",
    );
    const hasFinancing = counterLines.some(
      (l) => accountMap.get(l.account_id)?.cash_flow_category === "financing",
    );

    if (hasInvesting) {
      netInvesting += cashDelta;
    } else if (hasFinancing) {
      netFinancing += cashDelta;
    } else if (cashDelta > 0) {
      operatingInflow += cashDelta;
    } else {
      operatingOutflow += Math.abs(cashDelta);
    }
  }

  const netOperating = operatingInflow - operatingOutflow;
  const netChangeInCash = netOperating + netInvesting + netFinancing;
  const endingCash = beginningCash + netChangeInCash;

  return {
    beginningCash,
    operatingInflow,
    operatingOutflow,
    netOperating,
    netInvesting,
    netFinancing,
    netChangeInCash,
    endingCash,
  };
}

/**
 * 6. Daftar Umur Piutang & Tagihan Jatuh Tempo (AR Aging, FR-FJ7 & UC-21)
 */
export function buildArAging(
  invoices: SalesInvoiceRow[],
  customerMap: Map<string, string>,
  projectMap: Map<string, string>,
  referenceDateIso: string,
): ArAgingItem[] {
  const refTime = new Date(`${referenceDateIso}T00:00:00Z`).getTime();
  const items: ArAgingItem[] = [];

  for (const inv of invoices) {
    if (inv.doc_status !== "issued") continue;
    const outstanding = inv.total_amount - inv.paid_amount;
    if (outstanding <= 0) continue;

    const dueTime = new Date(`${inv.due_date}T00:00:00Z`).getTime();
    const diffDays = Math.floor((refTime - dueTime) / (1000 * 60 * 60 * 24));
    const daysOverdue = Math.max(0, diffDays);

    let agingBucket: ArAgingItem["agingBucket"] = "Belum Jatuh Tempo";
    if (daysOverdue > 60) {
      agingBucket = "> 60 Hari";
    } else if (daysOverdue > 30) {
      agingBucket = "31–60 Hari";
    } else if (daysOverdue >= 1) {
      agingBucket = "1–30 Hari";
    }

    items.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      customerName: customerMap.get(inv.customer_id) ?? "Klien",
      projectCode: projectMap.get(inv.project_id) ?? "-",
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      totalAmount: inv.total_amount,
      paidAmount: inv.paid_amount,
      outstandingAmount: outstanding,
      daysOverdue,
      agingBucket,
    });
  }

  return items.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

