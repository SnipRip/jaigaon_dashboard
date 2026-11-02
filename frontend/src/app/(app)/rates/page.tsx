import type { Metadata } from "next";
import { RatesScreen } from "@/features/rates/rates-screen";

export const metadata: Metadata = { title: "Rates & price levels" };

export default function RatesPage() {
  return <RatesScreen />;
}
