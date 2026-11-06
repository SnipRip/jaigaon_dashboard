import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpenseDetailScreen } from "@/features/expenses/expense-screens";

export const metadata: Metadata = { title: "Expense" };

type ExpenseParams = PageProps<"/expenses/[expenseId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function ExpensePage({ params }: { params: ExpenseParams }) {
  return (
    <Suspense>
      <Expense params={params} />
    </Suspense>
  );
}

async function Expense({ params }: { params: ExpenseParams }) {
  return <ExpenseDetailScreen expenseId={(await params).expenseId} />;
}
