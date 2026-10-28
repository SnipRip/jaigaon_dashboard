import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { expenses } from "@/features/expenses/sample-data";
import { ExpenseHeadsMaster } from "@/features/masters/expense-heads-master";
import { expenseHeads } from "@/features/masters/sample-data";

export const metadata: Metadata = { title: "Expense heads" };

const expenseCounts = expenses.reduce<Record<string, number>>((counts, expense) => {
  counts[expense.headId] = (counts[expense.headId] ?? 0) + 1;
  return counts;
}, {});

export default function ExpenseHeadsPage() {
  return (
    <>
      <SampleDataNotice />
      <ExpenseHeadsMaster heads={expenseHeads} expenseCounts={expenseCounts} />
    </>
  );
}
