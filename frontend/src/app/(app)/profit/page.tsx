import type { Metadata } from "next";
import { ProfitScreen } from "@/features/profit/profit-screen";

export const metadata: Metadata = { title: "Actual profit" };

export default function ProfitPage() {
  return <ProfitScreen />;
}
