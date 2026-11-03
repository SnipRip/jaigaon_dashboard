"use client";

import { expenseRows } from "@/features/expenses/expense-rules";
import type { Expense } from "@/features/expenses/types";
import { useAccountHeads } from "@/features/masters/use-account-heads";
import { ReportView } from "./report-view";
import type { Report } from "./types";

// The expenses-by-head report names each head as the heads master has it now,
// with its Tally group; until the heads load it shows the saved names.
export function ExpensesByHeadView({ report, expenses }: { report: Report; expenses: Expense[] }) {
  const { heads } = useAccountHeads();
  return <ReportView report={heads ? { ...report, rows: expenseRows(expenses, heads) } : report} />;
}
