import type { Metadata } from "next";
import { hsnCodes } from "@/features/hsn/sample-data";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { ItemForm } from "@/features/items/item-form";
import { brands, categories, godowns, gstRates, itemGroups, items, units } from "@/features/items/sample-data";

export const metadata: Metadata = { title: "New item" };

export default function NewItemPage() {
  return (
    <>
      <SampleDataNotice />
      <ItemForm
        catalog={{ categories, groups: itemGroups, items, hsnCodes }}
        brands={brands}
        units={units}
        godowns={godowns}
        gstRates={gstRates}
      />
    </>
  );
}
