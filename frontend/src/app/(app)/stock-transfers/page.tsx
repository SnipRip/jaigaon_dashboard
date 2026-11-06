import type { Metadata } from "next";
import { TransfersListScreen } from "@/features/stock-moves/stock-move-screens";

export const metadata: Metadata = { title: "Stock transfers" };

export default function StockTransfersPage() {
  return <TransfersListScreen />;
}
