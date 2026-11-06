import type { Metadata } from "next";
import { AdjustmentsListScreen } from "@/features/stock-moves/stock-move-screens";

export const metadata: Metadata = { title: "Stock adjustments" };

export default function StockAdjustmentsPage() {
  return <AdjustmentsListScreen />;
}
