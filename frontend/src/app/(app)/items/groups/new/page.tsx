import type { Metadata } from "next";
import { hsnCodes } from "@/features/hsn/sample-data";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { ItemGroupForm } from "@/features/items/item-group-form";
import { brands, categories, gstRates, itemGroups, items, units } from "@/features/items/sample-data";

export const metadata: Metadata = { title: "New item group" };

export default function NewItemGroupPage() {
  return (
    <>
      <SampleDataNotice />
      <ItemGroupForm catalog={{ categories, groups: itemGroups, items, hsnCodes }} brands={brands} units={units} gstRates={gstRates} />
    </>
  );
}
