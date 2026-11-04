"use client";

import { useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { useItemMasters } from "@/features/items/catalog-api";
import { withArchived } from "@/features/masters/masters-api";
import { PARTIES_PATH, toParty } from "@/features/parties/parties-api";
import { apiGet } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import type { SpecialRateView } from "@/types/pricing";
import { LINE_OPTIONS_PATH, SPECIAL_RATES_PATH, toSpecialRate } from "./rates-api";
import { RatesWorkspace } from "./rates-workspace";

/** Customers, archived ones too so old special rates keep their names. */
const CUSTOMERS_LIST_PATH = `${PARTIES_PATH}?role=customer&includeArchived=true`;

// The Rates screen, loading the item master, customers and special rates
// from the backend.
export function RatesScreen() {
  const { masters, error: itemsError } = useItemMasters();
  const rates = useSWR<SpecialRateView[]>(withArchived(SPECIAL_RATES_PATH), apiGet);
  const customers = useSWR<PartyView[]>(CUSTOMERS_LIST_PATH, apiGet);
  // A changed special rate moves the checked rate, so the check asks again.
  const { mutate } = useSWRConfig();
  const requote = () => void mutate((key) => Array.isArray(key) && key[0] === LINE_OPTIONS_PATH);

  const specialRates = useMemo(() => rates.data?.map(toSpecialRate), [rates.data]);
  const parties = useMemo(() => customers.data?.map(toParty), [customers.data]);

  if (!masters || !specialRates || !parties) {
    return <LoadNotice error={itemsError ?? rates.error ?? customers.error} what="rates" />;
  }
  return (
    <RatesWorkspace
      items={masters.catalog.items}
      categories={masters.catalog.categories}
      customers={parties}
      specialRates={specialRates}
      onChanged={() => void rates.mutate().then(requote)}
    />
  );
}
