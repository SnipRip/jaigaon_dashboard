import type { Metadata } from "next";
import { Suspense } from "react";
import { NewExpenseScreen } from "@/features/expenses/expense-screens";

export const metadata: Metadata = { title: "New expense" };

// Reads ?shipment= (opened from a shipment page), so it renders inside a Suspense boundary.
export default function NewExpensePage() {
  return (
    <Suspense>
      <NewExpenseScreen />
    </Suspense>
  );
}
