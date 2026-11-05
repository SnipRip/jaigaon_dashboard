import type { Metadata } from "next";
import { PurchasesListScreen } from "@/features/purchases/purchase-screens";

export const metadata: Metadata = { title: "Vendor bills" };

export default function PurchasesPage() {
  return <PurchasesListScreen />;
}
