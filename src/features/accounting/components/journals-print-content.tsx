import { AccountingPrintLayout } from "@/features/accounting/components/accounting-print-layout";
import { formatAccountRef } from "@/lib/formatters";
import {
  getLocalizedAccountName,
  getLocalizedTransactionDescription,
  formatJournalDateI18n,
} from "@/lib/glossary";
import { useLanguage } from "@/lib/i18n";
import type {
  AccountRow,
  CompanyProfileRow,
  JournalLineRow,
  JournalRow,
} from "@/types/database.types";

export interface JournalsPrintContentProps {
  printAreaId?: string;
  company: CompanyProfileRow | null;
  printDocTitle: string;
  periodLabel: string;
  sortedJournals: JournalRow[];
  lines: JournalLineRow[];
  accountMap: Map<string, AccountRow>;
}

export function JournalsPrintContent({
  printAreaId = "print-area-journal",
  company,
  printDocTitle,
  periodLabel,
  sortedJournals,
  lines,
  accountMap,
}: JournalsPrintContentProps) {
  const { t, language } = useLanguage();

  return (
    <AccountingPrintLayout
      printAreaId={printAreaId}
      company={company}
      docTitle={printDocTitle}
      periodLabel={periodLabel}
    >
      <table className="print-table">
        <colgroup>
          <col style={{ width: "12%" }} />
          <col style={{ width: "38%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "21%" }} />
          <col style={{ width: "21%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="print-center">{t("accounting:journals.col_date", "Tanggal")}</th>
            <th className="print-center">{t("accounting:journals.col_description", "Deskripsi")}</th>
            <th className="print-center">{t("accounting:journals.col_ref", "Ref")}</th>
            <th className="print-center">{t("accounting:journals.col_debit", "Debit")}</th>
            <th className="print-center">{t("accounting:journals.col_credit", "Kredit")}</th>
          </tr>
        </thead>
        <tbody>
          {sortedJournals.length === 0 ? (
            <tr>
              <td colSpan={5} className="print-center" style={{ padding: "28px", color: "#6b7280" }}>
                {t("accounting:journals.print_empty", "Belum ada transaksi pada periode ini.")}
              </td>
            </tr>
          ) : (
            sortedJournals.map((j) => {
              const jLines = lines
                .filter((l) => l.journal_id === j.id)
                .sort((a, b) => a.line_no - b.line_no);
              const debitLines = jLines.filter((l) => l.debit > 0);
              const creditLines = jLines.filter((l) => l.credit > 0);
              const journalRows = [...debitLines, ...creditLines];

              return (
                <tr key={j.id} className="align-top">
                  <td className="print-center whitespace-nowrap">
                    {formatJournalDateI18n(j.journal_date, language)}
                  </td>
                  <td>
                    <div className="print-deskripsi-wrap">
                      {debitLines.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`d-${idx}`} className="print-account-debit">
                            {acc ? getLocalizedAccountName(acc, language) : t("accounting:journals.debit_account", "Akun Debit")}
                          </div>
                        );
                      })}
                      {creditLines.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`c-${idx}`} className="print-account-credit">
                            {acc ? getLocalizedAccountName(acc, language) : t("accounting:journals.credit_account", "Akun Kredit")}
                          </div>
                        );
                      })}
                    </div>
                    {j.description && (
                      <div className="print-memo">
                        ({getLocalizedTransactionDescription(j.description, language)})
                      </div>
                    )}
                  </td>
                  <td className="print-center">
                    <div className="print-ref-wrap">
                      {journalRows.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`r-${idx}`} className="print-ref-item">
                            {formatAccountRef(acc?.code)}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="print-amount-wrap">
                      {journalRows.map((row, idx) => {
                        if (row.debit > 0) {
                          return (
                            <div key={`deb-${idx}`} className="print-amount-row">
                              <span className="print-currency">Rp</span>
                              <span className="print-val">{row.debit.toLocaleString("id-ID")}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={`deb-blank-${idx}`} className="print-amount-row print-blank" aria-hidden="true">
                            <span className="print-currency">Rp</span>
                            <span className="print-val">0</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="print-amount-wrap">
                      {journalRows.map((row, idx) => {
                        if (row.credit > 0) {
                          return (
                            <div key={`cred-${idx}`} className="print-amount-row">
                              <span className="print-currency">Rp</span>
                              <span className="print-val">{Math.abs(row.credit).toLocaleString("id-ID")}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={`cred-blank-${idx}`} className="print-amount-row print-blank" aria-hidden="true">
                            <span className="print-currency">Rp</span>
                            <span className="print-val">0</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </AccountingPrintLayout>
  );
}
