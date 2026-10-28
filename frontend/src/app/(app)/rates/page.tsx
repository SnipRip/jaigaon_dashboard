import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { hsnCodes } from "@/features/hsn/sample-data";
import { resolveItemDefaults } from "@/features/items/item-rules";
import { categories, itemGroups, items } from "@/features/items/sample-data";
import { parties } from "@/features/parties/sample-data";
import { RatesWorkspace } from "@/features/rates/rates-workspace";
import { priceLevels, quantitySlabs, specialRates } from "@/features/rates/sample-data";

export const metadata: Metadata = { title: "Rates & price levels" };

const catalog = { categories, groups: itemGroups, items, hsnCodes };
const units = Object.fromEntries(items.map((item) => [item.id, resolveItemDefaults(catalog, item).unit.value ?? ""]));

export default function RatesPage() {
  return (
    <>
      <SampleDataNotice />
      <RatesWorkspace
        items={items}
        units={units}
        customers={parties.filter((party) => party.roles.includes("customer"))}
        book={{ levels: priceLevels, specialRates, slabs: quantitySlabs }}
      />
    </>
  );
}
