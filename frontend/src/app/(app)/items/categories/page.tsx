import type { Metadata } from "next";
import { ItemCategoriesScreen } from "@/features/items/item-screens";

export const metadata: Metadata = { title: "Item categories" };

export default function ItemCategoriesPage() {
  return <ItemCategoriesScreen />;
}
