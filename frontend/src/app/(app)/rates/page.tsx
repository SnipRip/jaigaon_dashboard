import type { Metadata } from "next";
import { RatesScreen } from "@/features/rates/rates-screen";

export const metadata: Metadata = { title: "Special rates" };

export default function RatesPage() {
  return <RatesScreen />;
}
