// Expense totals and allocation. No React.
//
// GST on an expense is claimed back unless the head has none; the value
// before GST is what reduces profit (context.md, gap 2).
import type { Expense } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

export const expenseGst = (expense: Pick<Expense, "amount" | "gstRatePct">) => money((expense.amount * expense.gstRatePct) / 100);

export const expenseTotal = (expense: Pick<Expense, "amount" | "gstRatePct">) => money(expense.amount + expenseGst(expense));

/** Expenses that reduce the profit of this target (invoice, shipment or bill). */
export const expensesFor = (expenses: Expense[], kind: Expense["allocation"]["kind"], targetId: string) =>
  expenses.filter((expense) => expense.allocation.kind === kind && expense.allocation.targetId === targetId);

/** Sum before GST. */
export const sumAmount = (expenses: Expense[]) => money(expenses.reduce((sum, expense) => sum + expense.amount, 0));

export const expenseNumber = (financialYear: string, sequence: number) =>
  `EXPN/${financialYear.replace("-", "").slice(2)}/${String(sequence).padStart(4, "0")}`;
