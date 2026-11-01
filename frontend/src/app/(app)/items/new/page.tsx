import type { Metadata } from "next";
import { ItemScreen } from "@/features/items/item-screens";

export const metadata: Metadata = { title: "New item" };

export default function NewItemPage() {
  return <ItemScreen />;
}
