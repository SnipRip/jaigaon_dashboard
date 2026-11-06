import type { Metadata } from "next";
import { NewExpenseScreen } from "@/features/expenses/expense-screens";

export const metadata: Metadata = { title: "New expense" };

export default function NewExpensePage() {
  return <NewExpenseScreen />;
}
