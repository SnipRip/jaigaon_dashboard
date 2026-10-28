import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { hsnCodes } from "@/features/hsn/sample-data";
import { resolveItemDefaults } from "@/features/items/item-rules";
import { categories, itemGroups, items } from "@/features/items/sample-data";
import { units } from "@/features/masters/sample-data";
import { UnitsMaster } from "@/features/masters/units-master";

export const metadata: Metadata = { title: "Units" };

const catalog = { categories, groups: itemGroups, items, hsnCodes };
const itemCounts = items.reduce<Record<string, number>>((counts, item) => {
  const unit = resolveItemDefaults(catalog, item).unit.value;
  if (unit) counts[unit] = (counts[unit] ?? 0) + 1;
  return counts;
}, {});

export default function UnitsPage() {
  return (
    <>
      <SampleDataNotice />
      <UnitsMaster units={units} itemCounts={itemCounts} />
    </>
  );
}
