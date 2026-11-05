import type { Metadata } from "next";
import { QuotationsListScreen } from "@/features/quotations/quotation-screens";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotationsPage() {
  return <QuotationsListScreen />;
}
