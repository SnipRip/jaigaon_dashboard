import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { categories, items } from "@/features/items/sample-data";
import { BrandsMaster } from "@/features/masters/brands-master";
import { brands } from "@/features/masters/sample-data";

export const metadata: Metadata = { title: "Brands" };

const itemCounts = items.reduce<Record<string, number>>((counts, item) => {
  if (item.brand) counts[item.brand] = (counts[item.brand] ?? 0) + 1;
  return counts;
}, {});

export default function BrandsPage() {
  return (
    <>
      <SampleDataNotice />
      <BrandsMaster brands={brands} categories={categories.map(({ id, name }) => ({ id, name }))} itemCounts={itemCounts} />
    </>
  );
}
