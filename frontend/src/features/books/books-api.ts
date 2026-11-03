// Paths and display helpers for the chart of accounts and the statements
// (backend/src/books). Amounts arrive debit-positive.
import { formatRate } from "@/lib/format";
import type { LedgerBalanceView, LedgerSource } from "@/types/ledger";

export const booksPath = (statement: "trial-balance" | "profit-and-loss" | "balance-sheet", asOf: string) => `/books/${statement}?asOf=${asOf}`;

/** "₹1,200.00 Dr" / "₹1,200.00 Cr"; zero is a dash. */
export const drCr = (amount: number) => (amount ? `${formatRate(Math.abs(amount))} ${amount > 0 ? "Dr" : "Cr"}` : "–");

/** An amount in its column; zero is blank so the eye finds the figures. */
export const figure = (amount: number) => (amount ? formatRate(amount) : "");

export const SOURCE_LABELS: Record<LedgerSource, string> = {
  ledger: "General ledger",
  head: "Expense & income head",
  bankCash: "Bank & cash",
  loan: "Loan",
  party: "Customer / vendor",
  stock: "Items (opening stock)",
  unlisted: "Not in any master",
};

/** Where a ledger is edited. A party's page depends on the group it sits in. */
export function sourceHref(ledger: LedgerBalanceView, groupName: string): string | null {
  switch (ledger.source) {
    case "ledger":
      return "/masters/ledgers";
    case "head":
      return "/masters/expense-heads";
    case "bankCash":
      return "/masters/bank-cash";
    case "loan":
      return ledger.sourceId ? `/loans/${ledger.sourceId}` : "/loans";
    case "party":
      return ledger.sourceId ? `/${groupName === "Sundry Debtors" ? "customers" : "vendors"}/${ledger.sourceId}` : null;
    case "stock":
      return "/items";
    default:
      return null;
  }
}
