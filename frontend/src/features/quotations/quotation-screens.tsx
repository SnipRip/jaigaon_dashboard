"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { useItemMasters } from "@/features/items/catalog-api";
import { PARTIES_PATH, toParty } from "@/features/parties/parties-api";
import { apiGet } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import type { QuotationView } from "@/types/quotation";
import { QuotationDetail } from "./quotation-detail";
import { QuotationForm } from "./quotation-form";
import { QuotationsWorkspace } from "./quotations-workspace";
import { issuerOf, QUOTATIONS_PATH, toQuotation } from "./quotations-api";

/** Customers, archived ones too so old quotations keep their names. */
const CUSTOMERS_PATH = `${PARTIES_PATH}?role=customer&includeArchived=true`;

// The quotation pages' client screens: quotations, customers, our company
// profile and the item master, from the backend.
function useQuotationData() {
  const quotations = useSWR<QuotationView[]>(QUOTATIONS_PATH, apiGet);
  const customers = useSWR<PartyView[]>(CUSTOMERS_PATH, apiGet);
  const { profile, error: profileError } = useCompanyProfile();
  const { masters, error: mastersError, reload: reloadMasters } = useItemMasters();
  const data = useMemo(() => {
    if (!quotations.data || !customers.data || !profile || !masters) return undefined;
    return {
      quotations: quotations.data.map(toQuotation),
      parties: customers.data.map(toParty),
      issuer: issuerOf(profile),
      masters,
    };
  }, [quotations.data, customers.data, profile, masters]);
  return {
    data,
    error: quotations.error ?? customers.error ?? profileError ?? mastersError,
    reload: async () => {
      await Promise.all([quotations.mutate(), reloadMasters()]);
    },
  };
}

export function QuotationsListScreen() {
  const { data, error } = useQuotationData();
  if (!data) return <LoadNotice error={error} what="quotations" />;
  return <QuotationsWorkspace quotations={data.quotations} parties={data.parties} items={data.masters.catalog.items} company={data.issuer} />;
}

/** `customer` and `lines` ("itemId:qty,itemId:qty"; a SKU in older links) come from Rate enquiry. */
export function NewQuotationScreen({ customer, lines }: { customer?: string; lines?: string }) {
  const { data, error, reload } = useQuotationData();
  if (!data) return <LoadNotice error={error} what="the quotation form" />;
  const { items } = data.masters.catalog;
  const carried = (lines ? lines.split(",") : [])
    .map((entry) => {
      const [key, quantity] = entry.split(":");
      const item = items.find((candidate) => candidate.id === key) ?? items.find((candidate) => candidate.sku === key);
      return item && Number(quantity) > 0 ? { itemId: item.id, quantity: Number(quantity) } : undefined;
    })
    .filter((line) => line !== undefined);
  const customers = data.parties.filter((party) => !party.archived);
  return (
    <QuotationForm
      customers={customers}
      catalog={data.masters.catalog}
      company={data.issuer}
      initial={{ partyId: customers.some((party) => party.id === customer) ? customer : undefined, lines: carried }}
      onSaved={reload}
    />
  );
}

export function ReviseQuotationScreen({ quotationId }: { quotationId: string }) {
  const { data, error, reload } = useQuotationData();
  if (!data) return <LoadNotice error={error} what="the quotation" />;
  const quotation = data.quotations.find((candidate) => candidate.id === quotationId);
  if (!quotation?.stored) return <LoadNotice error={new Error("This quotation does not exist.")} what="the quotation" />;
  return (
    <QuotationForm customers={data.parties} catalog={data.masters.catalog} company={data.issuer} revising={quotation.stored} onSaved={reload} />
  );
}

export function QuotationScreen({ quotationId }: { quotationId: string }) {
  const { data, error, reload } = useQuotationData();
  if (!data) return <LoadNotice error={error} what="the quotation" />;
  const quotation = data.quotations.find((candidate) => candidate.id === quotationId);
  const party = quotation && data.parties.find((candidate) => candidate.id === quotation.partyId);
  if (!quotation || !party) return <LoadNotice error={new Error("This quotation does not exist.")} what="the quotation" />;
  return <QuotationDetail quotation={quotation} party={party} issuer={data.issuer} items={data.masters.catalog.items} onChanged={reload} />;
}
