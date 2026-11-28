import type { AccountRow, JournalLineRow, JournalRow } from "@/types/database.types";

export interface MonthlyFinancialPoint {
  monthKey: string;
  label: string;
  revenue: number;
  expense: number;
  netCash: number;
  txCount: number;
}

export interface AgingBucketItem {
  label: string;
  bucketKey: string;
  color: string;
  dotColor: string;
  amount: number;
}

export interface ProjectBillingStat {
  id: string;
  code: string;
  name: string;
  contract: number;
  billed: number;
  paid: number;
  pct: number;
}

export function buildMonthlySeries(
  accounts: AccountRow[],
  journals: JournalRow[],
  lines: JournalLineRow[],
  language: string = "id",
): MonthlyFinancialPoint[] {
  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const cashAccountIds = new Set(
    accounts
      .filter(
        (a) =>
          a.system_tag === "cash_bank" ||
          a.cash_flow_category === "cash_equivalent",
      )
      .map((a) => a.id),
  );

  const linesByJournal = new Map<string, JournalLineRow[]>();
  for (const l of lines) {
    const arr = linesByJournal.get(l.journal_id) ?? [];
    arr.push(l);
    linesByJournal.set(l.journal_id, arr);
  }

  const buckets = new Map<
    string,
    { revenue: number; expense: number; netCash: number; txCount: number }
  >();

  for (const j of journals) {
    if (j.status !== "posted") continue;
    const monthKey = j.journal_date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;

    const current = buckets.get(monthKey) ?? {
      revenue: 0,
      expense: 0,
      netCash: 0,
      txCount: 0,
    };
    current.txCount += 1;

    const jLines = linesByJournal.get(j.id) ?? [];
    for (const l of jLines) {
      const acc = accMap.get(l.account_id);
      if (!acc) continue;
      if (j.journal_type !== "closing") {
        if (acc.account_type === "revenue") {
          current.revenue += l.credit - l.debit;
        } else if (acc.account_type === "expense") {
          current.expense += l.debit - l.credit;
        }
      }
      if (cashAccountIds.has(l.account_id)) {
        current.netCash += l.debit - l.credit;
      }
    }
    buckets.set(monthKey, current);
  }

  const locale = language === "en" ? "en-US" : "id-ID";

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, val]) => {
      const [yStr = "", mStr = ""] = monthKey.split("-");
      const mIdx = Number(mStr) - 1;
      const dateObj = new Date(Number(yStr), mIdx, 1);
      const monthName = !isNaN(dateObj.getTime())
        ? new Intl.DateTimeFormat(locale, { month: "short" }).format(dateObj)
        : mStr;
      return {
        monthKey,
        label: `${monthName} ${yStr.slice(2)}`,
        revenue: Math.max(0, val.revenue),
        expense: Math.max(0, val.expense),
        netCash: val.netCash,
        txCount: val.txCount,
      };
    });
}
