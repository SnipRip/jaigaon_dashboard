import type { Metadata } from "next";
import { NewTransferScreen } from "@/features/stock-moves/stock-move-screens";

export const metadata: Metadata = { title: "New stock transfer" };

export default function NewStockTransferPage() {
  return <NewTransferScreen />;
}
