import type { Metadata } from "next";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { hsnCodes } from "@/features/hsn/sample-data";
import { categories, itemGroups, items } from "@/features/items/sample-data";
import { parties } from "@/features/parties/sample-data";
import { QuotationForm } from "@/features/quotations/quotation-form";
import { quotationNumber } from "@/features/quotations/quotation-rules";
import { nextQuotationSequence } from "@/features/quotations/sample-data";
import { priceLevels, quantitySlabs, specialRates } from "@/features/rates/sample-data";

export const metadata: Metadata = { title: "New quotation" };

type SearchParams = PageProps<"/quotations/new">["searchParams"];

// `?customer=<id>&lines=SKU:qty,SKU:qty` comes from Rate enquiry's
// "Continue as a quotation". `searchParams` is request data, so it is read
// inside a Suspense boundary.
export default function NewQuotationPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SampleDataNotice />
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const { customer, lines } = await searchParams;
  const carried = (typeof lines === "string" ? lines.split(",") : [])
    .map((entry) => {
      const [sku, quantity] = entry.split(":");
      const item = items.find((candidate) => candidate.sku === sku);
      return item && Number(quantity) > 0 ? { itemId: item.id, quantity: Number(quantity) } : undefined;
    })
    .filter((line) => line !== undefined);
  const partyId = typeof customer === "string" && parties.some((party) => party.id === customer) ? customer : undefined;

  return (
    <QuotationForm
      customers={parties.filter((party) => party.roles.includes("customer"))}
      catalog={{ categories, groups: itemGroups, items, hsnCodes }}
      book={{ levels: priceLevels, specialRates, slabs: quantitySlabs }}
      companyState={COMPANY_TAX_PROFILE.stateCode}
      suggestedNumber={quotationNumber("2026-27", nextQuotationSequence)}
      initial={{ partyId, lines: carried }}
    />
  );
}
