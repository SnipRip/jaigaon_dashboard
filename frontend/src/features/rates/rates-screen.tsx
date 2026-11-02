"use client";

import { useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { useItemMasters } from "@/features/items/catalog-api";
import { resolveItemDefaults } from "@/features/items/item-rules";
import { withArchived } from "@/features/masters/masters-api";
import { PARTIES_PATH, toParty } from "@/features/parties/parties-api";
import { apiGet } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import type { PriceLevelView, QuantitySlabView, SpecialRateView } from "@/types/pricing";
import { PRICE_LEVELS_PATH, QUANTITY_SLABS_PATH, RATE_QUOTE_PATH, SPECIAL_RATES_PATH, toPriceLevel, toQuantitySlab, toSpecialRate } from "./rates-api";
import { RatesWorkspace } from "./rates-workspace";

/** Customers, archived ones too so old special rates keep their names. */
const CUSTOMERS_LIST_PATH = `${PARTIES_PATH}?role=customer&includeArchived=true`;

// The Rates & price levels screen, loading the item master, customers and
// the pricing masters from the backend.
export function RatesScreen() {
  const { masters, error: itemsError, reload: reloadItems } = useItemMasters();
  const levels = useSWR<PriceLevelView[]>(withArchived(PRICE_LEVELS_PATH), apiGet);
  const rates = useSWR<SpecialRateView[]>(withArchived(SPECIAL_RATES_PATH), apiGet);
  const slabs = useSWR<QuantitySlabView[]>(withArchived(QUANTITY_SLABS_PATH), apiGet);
  const customers = useSWR<PartyView[]>(CUSTOMERS_LIST_PATH, apiGet);
  // Any pricing change can move a quoted rate, so the rate check asks again.
  const { mutate } = useSWRConfig();
  const requote = () => void mutate((key) => typeof key === "string" && key.startsWith(RATE_QUOTE_PATH));

  const book = useMemo(
    () =>
      levels.data && rates.data && slabs.data
        ? { levels: levels.data.map(toPriceLevel), specialRates: rates.data.map(toSpecialRate), slabs: slabs.data.map(toQuantitySlab) }
        : undefined,
    [levels.data, rates.data, slabs.data],
  );
  const parties = useMemo(() => customers.data?.map(toParty), [customers.data]);
  const units = useMemo(
    () => (masters ? Object.fromEntries(masters.catalog.items.map((item) => [item.id, resolveItemDefaults(masters.catalog, item).unit.value ?? ""])) : {}),
    [masters],
  );

  if (!masters || !book || !parties) {
    return <LoadNotice error={itemsError ?? levels.error ?? rates.error ?? slabs.error ?? customers.error} what="rates" />;
  }
  return (
    <RatesWorkspace
      items={masters.catalog.items}
      categories={masters.catalog.categories}
      units={units}
      customers={parties}
      book={book}
      onChanged={{
        items: () => void reloadItems().then(requote),
        levels: () => void Promise.all([levels.mutate(), customers.mutate()]).then(requote),
        specialRates: () => void rates.mutate().then(requote),
        slabs: () => void slabs.mutate().then(requote),
      }}
    />
  );
}
