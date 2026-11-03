import type { Metadata } from "next";
import { NumberSeriesScreen } from "@/features/number-series/number-series-screen";

export const metadata: Metadata = { title: "Number series" };

export default function NumberSeriesPage() {
  return <NumberSeriesScreen />;
}
