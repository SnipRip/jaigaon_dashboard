import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { allocationTargets, payeeAndAccountNames } from "@/features/expenses/allocation-targets";
import { ExpensesWorkspace } from "@/features/expenses/expenses-workspace";
import { expenses } from "@/features/expenses/sample-data";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <>
      <SampleDataNotice />
      <ExpensesWorkspace
        expenses={expenses}
        names={payeeAndAccountNames}
        targets={allocationTargets}
      />
    </>
  );
}
