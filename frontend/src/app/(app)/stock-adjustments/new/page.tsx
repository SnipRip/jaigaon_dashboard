import type { Metadata } from "next";
import { NewAdjustmentScreen } from "@/features/stock-moves/stock-move-screens";

export const metadata: Metadata = { title: "New stock adjustment" };

export default function NewStockAdjustmentPage() {
  return <NewAdjustmentScreen />;
}
