"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { useItemMasters } from "@/features/items/catalog-api";
import { BANK_CASH_PATH } from "@/features/masters/masters-api";
import { PARTIES_PATH, toParty } from "@/features/parties/parties-api";
import { useSalesSettings } from "@/features/sales-settings/sales-settings-api";
import { issuerOf, QUOTATIONS_PATH } from "@/features/quotations/quotations-api";
import { quotationLabel } from "@/features/quotations/quotation-rules";
import { LUTS_PATH, toLut } from "@/features/tax-export/luts-api";
import { apiGet } from "@/lib/api-client";
import type { BankCashAccountView } from "@/types/bank-cash";
import type { InvoiceView } from "@/types/invoice";
import type { LutView } from "@/types/lut";
import type { PartyView } from "@/types/party";
import type { QuotationView } from "@/types/quotation";
import { InvoiceDetail } from "./invoice-detail";
import { InvoiceForm } from "./invoice-form";
import { INVOICES_PATH, toInvoice } from "./invoices-api";
import { InvoicesWorkspace } from "./invoices-workspace";
import type { InvoiceKind } from "./types";

/** Customers, archived ones too so old invoices keep their names. */
const CUSTOMERS_PATH = `${PARTIES_PATH}?role=customer&includeArchived=true`;

// The invoice pages' client screens: invoices, customers, our company
// profile, the item master (with godowns) and the LUT register, from the backend.
function useInvoiceData() {
  const invoices = useSWR<InvoiceView[]>(INVOICES_PATH, apiGet);
  const customers = useSWR<PartyView[]>(CUSTOMERS_PATH, apiGet);
  const luts = useSWR<LutView[]>(LUTS_PATH, apiGet);
  const accounts = useSWR<BankCashAccountView[]>(BANK_CASH_PATH, apiGet);
  const { profile, error: profileError } = useCompanyProfile();
  const { masters, error: mastersError, reload: reloadMasters } = useItemMasters();
  const data = useMemo(() => {
    if (!invoices.data || !customers.data || !luts.data || !profile || !masters) return undefined;
    return {
      invoices: invoices.data.map(toInvoice),
      parties: customers.data.map(toParty),
      luts: luts.data.map(toLut),
      issuer: issuerOf(profile),
      /** Printed on invoices; the bill prints without it while accounts load or none is marked. */
      bank: accounts.data?.find((account) => account.showOnInvoice && !account.isArchived && account.kind !== "CASH"),
      masters,
    };
  }, [invoices.data, customers.data, luts.data, profile, masters, accounts.data]);
  return {
    data,
    error: invoices.error ?? customers.error ?? luts.error ?? profileError ?? mastersError,
    /** After a save or cancel: invoices, the items (stock moved) and quotations (one may be converted). */
    reload: async () => {
      await Promise.all([invoices.mutate(), reloadMasters()]);
    },
    /** One invoice as the server returned it (a document saved): swapped in, nothing else reloaded. */
    replace: (view: InvoiceView) =>
      void invoices.mutate((list) => list?.map((row) => (row.id === view.id ? view : row)), { revalidate: false }),
  };
}

export function InvoicesListScreen() {
  const { data, error } = useInvoiceData();
  if (!data) return <LoadNotice error={error} what="invoices" />;
  return <InvoicesWorkspace invoices={data.invoices} parties={data.parties} company={data.issuer} />;
}

/** `quotationId` starts the invoice from that quotation (Convert to invoice). */
export function NewInvoiceScreen({ kind, quotationId }: { kind: InvoiceKind; quotationId?: string }) {
  const { data, error, reload } = useInvoiceData();
  const quotation = useSWR<QuotationView>(quotationId ? `${QUOTATIONS_PATH}/${quotationId}` : null, apiGet);
  // Sales settings failing to load must not stop billing: every item is then listed.
  const { settings, error: settingsError } = useSalesSettings();
  if (!data || (quotationId && !quotation.data && !quotation.error) || (!settings && !settingsError)) return <LoadNotice error={error} what="the invoice form" />;
  const from = quotation.data;
  return (
    <InvoiceForm
      kind={kind}
      customers={data.parties.filter((party) => !party.archived)}
      catalog={data.masters.catalog}
      godowns={data.masters.godowns.filter((godown) => !godown.isArchived)}
      luts={data.luts}
      company={data.issuer}
      inStockOnly={settings?.invoiceInStockOnly ?? false}
      fromQuotation={
        from && {
          id: from.id,
          label: quotationLabel(from),
          partyId: from.partyId,
          // In the unit it was quoted in.
          lines: from.lines.map((line) => ({
            itemId: line.itemId,
            unit: line.entered.unit,
            quantity: line.entered.quantity,
            rate: line.entered.rate,
            discountPct: line.discountPct,
          })),
        }
      }
      onSaved={async () => {
        await reload();
        if (from) await quotation.mutate();
      }}
    />
  );
}

export function InvoiceScreen({ invoiceId }: { invoiceId: string }) {
  const { data, error, reload, replace } = useInvoiceData();
  if (!data) return <LoadNotice error={error} what="the invoice" />;
  const invoice = data.invoices.find((candidate) => candidate.id === invoiceId);
  const party = invoice && data.parties.find((candidate) => candidate.id === invoice.partyId);
  if (!invoice || !party) return <LoadNotice error={new Error("This invoice does not exist.")} what="the invoice" />;
  return <InvoiceDetail key={invoice.stored?.status} initialInvoice={invoice} party={party} issuer={data.issuer} bank={data.bank} onChanged={reload} onStored={replace} />;
}
