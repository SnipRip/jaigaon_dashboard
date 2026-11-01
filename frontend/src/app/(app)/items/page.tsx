import type { Metadata } from "next";
import { ItemsScreen } from "@/features/items/item-screens";

export const metadata: Metadata = { title: "Items" };

export default function ItemsPage() {
  return <ItemsScreen />;
}
