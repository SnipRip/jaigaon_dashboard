// Expense totals and allocation. No React.
//
// GST on an expense is claimed back unless the head has none; the value
// before GST is what reduces profit (context.md, gap 2).
import { findHead } from "@/features/masters/account-head-rules";
import type { AccountHead } from "@/features/masters/types";
import type { Expense } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

export const expenseGst = (expense: Pick<Expense, "amount" | "gstRatePct">) => money((expense.amount * expense.gstRatePct) / 100);

export const expenseTotal = (expense: Pick<Expense, "amount" | "gstRatePct">) => money(expense.amount + expenseGst(expense));

/** Expenses that reduce the profit of this target (invoice, shipment or bill). */
export const expensesFor = (expenses: Expense[], kind: Expense["allocation"]["kind"], targetId: string) =>
  expenses.filter((expense) => expense.allocation.kind === kind && expense.allocation.targetId === targetId);

/** Sum before GST. */
export const sumAmount = (expenses: Expense[]) => money(expenses.reduce((sum, expense) => sum + expense.amount, 0));

export interface HeadTotal {
  head: string;
  /** The head's Tally group; "–" when the head is not (or not yet) in the list. */
  group: string;
  count: number;
  amount: number;
  gst: number;
}

/**
 * Expenses summed per head, in the heads' own order. An expense whose head is
 * not in the list (archived, or the list still loading) is summed under the
 * name it was saved with, after the others.
 */
export function expensesByHead(expenses: Expense[], heads: AccountHead[]): HeadTotal[] {
  const totals = new Map<string, HeadTotal>();
  for (const expense of expenses) {
    const head = findHead(heads, expense.head);
    const key = head?.id ?? expense.head.toLowerCase();
    const total = totals.get(key) ?? { head: head?.name ?? expense.head, group: head?.tallyGroup ?? "–", count: 0, amount: 0, gst: 0 };
    total.count += 1;
    total.amount = money(total.amount + expense.amount);
    total.gst = money(total.gst + expenseGst(expense));
    totals.set(key, total);
  }
  const order = (key: string) => {
    const index = heads.findIndex((head) => head.id === key);
    return index === -1 ? heads.length : index;
  };
  return [...totals.entries()].sort(([a], [b]) => order(a) - order(b)).map(([, total]) => total);
}

/** The expenses-by-head report's rows (reports/report-definitions.ts). */
export const expenseRows = (expenses: Expense[], heads: AccountHead[]) => expensesByHead(expenses, heads).map((total) => ({ ...total }));
