import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { allocationTargets, payeeAndAccountNames } from "@/features/expenses/allocation-targets";
import { ExpensesWorkspace } from "@/features/expenses/expenses-workspace";
import { expenses } from "@/features/expenses/sample-data";
import { expenseHeads } from "@/features/masters/sample-data";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <>
      <SampleDataNotice />
      <ExpensesWorkspace
        expenses={expenses}
        heads={expenseHeads.map(({ id, name }) => ({ id, name }))}
        names={payeeAndAccountNames}
        targets={allocationTargets}
      />
    </>
  );
}
