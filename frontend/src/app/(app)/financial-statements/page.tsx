import type { Metadata } from "next";
import { FinancialStatementsScreen } from "@/features/books/financial-statements-screen";

export const metadata: Metadata = { title: "Financial statements" };

export default function FinancialStatementsPage() {
  return <FinancialStatementsScreen />;
}
