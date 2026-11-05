"use client";

import { useMemo } from "react";
import useSWR, { mutate as revalidate } from "swr";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { useItemMasters } from "@/features/items/catalog-api";
import { PARTIES_PATH, toParty } from "@/features/parties/parties-api";
import { apiGet } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import type { PurchaseBillView, PurchaseOrderView } from "@/types/purchase";
import { PURCHASE_BILLS_PATH, PURCHASE_ORDERS_PATH, toBill } from "./purchases-api";

/** Vendors, archived ones too so old bills keep their names. */
const VENDORS_PATH = `${PARTIES_PATH}?role=vendor&includeArchived=true`;

/**
 * What every purchase screen reads: bills, vendors, our GST state and the
 * item master. Orders only when asked for. One SWR key each, shared across
 * the screens, so moving between them does not load again.
 */
export function usePurchaseData({ orders = false } = {}) {
  const bills = useSWR<PurchaseBillView[]>(PURCHASE_BILLS_PATH, apiGet);
  const orderList = useSWR<PurchaseOrderView[]>(orders ? PURCHASE_ORDERS_PATH : null, apiGet);
  const vendors = useSWR<PartyView[]>(VENDORS_PATH, apiGet);
  const { profile, error: profileError } = useCompanyProfile();
  const { masters, error: mastersError, reload: reloadMasters } = useItemMasters();

  const data = useMemo(() => {
    if (!bills.data || !vendors.data || !profile || !masters || (orders && !orderList.data)) return undefined;
    return {
      bills: bills.data.map(toBill),
      orders: orderList.data ?? [],
      parties: vendors.data.map(toParty),
      companyState: profile.stateCode,
      masters,
    };
  }, [bills.data, orderList.data, vendors.data, profile, masters, orders]);

  return {
    data,
    error: bills.error ?? orderList.error ?? vendors.error ?? profileError ?? mastersError,
    /** After a save: bills, orders and the items (their stock and costs moved). */
    reload: async () => {
      // Orders anywhere (the list and each order's page) show what was received.
      const isOrderKey = (key: unknown) => typeof key === "string" && key.startsWith(PURCHASE_ORDERS_PATH);
      await Promise.all([bills.mutate(), revalidate(isOrderKey), reloadMasters()]);
    },
  };
}
