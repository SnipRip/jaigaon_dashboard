import type { Metadata } from "next";
import { ExpenseHeadsMaster } from "@/features/masters/expense-heads-master";

export const metadata: Metadata = { title: "Expense & income heads" };

export default function ExpenseHeadsPage() {
  return <ExpenseHeadsMaster />;
}
