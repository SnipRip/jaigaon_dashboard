import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { HsnWorkspace } from "@/features/hsn/hsn-workspace";
import { hsnCodes } from "@/features/hsn/sample-data";
import { resolveItemDefaults } from "@/features/items/item-rules";
import { categories, gstRates, itemGroups, items } from "@/features/items/sample-data";

export const metadata: Metadata = { title: "HSN / SAC codes" };

export default function HsnPage() {
  const catalog = { categories, groups: itemGroups, items, hsnCodes };
  const usage: Record<string, number> = {};
  for (const item of items) {
    const code = resolveItemDefaults(catalog, item).hsn.value;
    if (code) usage[code] = (usage[code] ?? 0) + 1;
  }

  return (
    <>
      <SampleDataNotice />
      <HsnWorkspace initialCodes={hsnCodes} usage={usage} gstRates={gstRates} />
    </>
  );
}
