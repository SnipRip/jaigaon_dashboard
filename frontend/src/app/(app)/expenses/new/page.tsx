import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { allocationTargets } from "@/features/expenses/allocation-targets";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { expenseNumber } from "@/features/expenses/expense-rules";
import { nextExpenseSequence } from "@/features/expenses/sample-data";
import { expenseHeads, moneyAccounts } from "@/features/masters/sample-data";
import { parties } from "@/features/parties/sample-data";

export const metadata: Metadata = { title: "New expense" };

export default function NewExpensePage() {
  return (
    <>
      <SampleDataNotice />
      <ExpenseForm
        heads={expenseHeads}
        vendors={parties.filter((party) => party.roles.includes("vendor")).map((party) => ({ value: party.id, label: party.displayName }))}
        accounts={moneyAccounts.filter((account) => !account.archived).map((account) => ({ value: account.id, label: account.name }))}
        targets={allocationTargets}
        suggestedNumber={expenseNumber("2026-27", nextExpenseSequence)}
      />
    </>
  );
}
