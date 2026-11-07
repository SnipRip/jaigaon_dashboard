"use client";

import { useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { active, useItemMasters } from "@/features/items/catalog-api";
import { withArchived } from "@/features/masters/masters-api";
import { PARTIES_PATH } from "@/features/parties/parties-api";
import { apiGet } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import type { SchemeView } from "@/types/scheme";
import { EVALUATE_SCHEMES_PATH, SCHEMES_PATH } from "./schemes-api";
import { SchemesWorkspace } from "./schemes-workspace";
import { itemLabel } from "@/features/items/item-rules";

const CUSTOMERS_PATH = `${PARTIES_PATH}?role=customer&includeArchived=true`;

// The Schemes screen: loads schemes, the item master (items, categories,
// brands) and customers, and builds the pickers' options once per load.
export function SchemesScreen() {
  const { masters, error: mastersError } = useItemMasters();
  const schemes = useSWR<SchemeView[]>(withArchived(SCHEMES_PATH), apiGet);
  const customers = useSWR<PartyView[]>(CUSTOMERS_PATH, apiGet);
  const { mutate } = useSWRConfig();

  const options = useMemo(() => {
    if (!masters || !customers.data) return undefined;
    const { categories, items } = masters.catalog;
    const targetOptions = [
      ...categories.flatMap((category) => [
        { value: `category:${category.id}`, label: `All of ${category.name}`, group: "Category" },
        ...category.subCategories.map((sub) => ({ value: `category:${sub.id}`, label: `All of ${category.name} › ${sub.name}`, group: "Sub-category" })),
      ]),
      ...active(masters.brands).map((brand) => ({ value: `brand:${brand.id}`, label: `${brand.name} (brand)`, group: "Brand" })),
      ...items.map((item) => ({ value: `item:${item.id}`, label: itemLabel(item), group: "Item" })),
    ];
    return {
      targetOptions,
      itemOptions: items.map((item) => ({ value: item.id, label: itemLabel(item) })),
      // Archived customers only for the names on old schemes; pickers use the live ones.
      customerOptions: customers.data.filter((party) => !party.isArchived).map((party) => ({ value: party.id, label: party.displayName })),
    };
  }, [masters, customers.data]);

  if (!schemes.data || !options) return <LoadNotice error={mastersError ?? schemes.error ?? customers.error} what="schemes" />;
  return (
    <SchemesWorkspace
      schemes={schemes.data}
      {...options}
      // A changed scheme changes what open checks show.
      onChanged={() => void schemes.mutate().then(() => mutate((key) => Array.isArray(key) && key[0] === EVALUATE_SCHEMES_PATH))}
    />
  );
}
