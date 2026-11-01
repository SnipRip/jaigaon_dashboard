import type { Metadata } from "next";
import { ItemGroupScreen } from "@/features/items/item-screens";

export const metadata: Metadata = { title: "New item group" };

export default function NewItemGroupPage() {
  return <ItemGroupScreen />;
}
