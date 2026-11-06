import type { Metadata } from "next";
import { ExpensesScreen } from "@/features/expenses/expense-screens";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return <ExpensesScreen />;
}
