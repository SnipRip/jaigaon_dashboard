import type { Metadata } from "next";
import { PriceListScreen } from "@/features/price-list/price-list-screen";

export const metadata: Metadata = { title: "Price list" };

export default function PriceListPage() {
  return <PriceListScreen />;
}
