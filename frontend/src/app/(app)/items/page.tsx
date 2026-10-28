import type { Metadata } from "next";
import { hsnCodes } from "@/features/hsn/sample-data";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { ItemsWorkspace } from "@/features/items/items-workspace";
import { categories, itemGroups, items } from "@/features/items/sample-data";

export const metadata: Metadata = { title: "Items" };

export default function ItemsPage() {
  return (
    <>
      <SampleDataNotice />
      <ItemsWorkspace catalog={{ categories, groups: itemGroups, items, hsnCodes }} />
    </>
  );
}
