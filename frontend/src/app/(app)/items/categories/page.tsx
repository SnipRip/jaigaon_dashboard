import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { CategoriesWorkspace } from "@/features/items/categories-workspace";
import { categories, gstRates, items, units } from "@/features/items/sample-data";

export const metadata: Metadata = { title: "Item categories" };

export default function ItemCategoriesPage() {
  return (
    <>
      <SampleDataNotice />
      <CategoriesWorkspace initialCategories={categories} items={items} units={units} gstRates={gstRates} />
    </>
  );
}
