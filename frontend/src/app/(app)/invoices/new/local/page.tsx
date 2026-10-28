import type { Metadata } from "next";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { hsnCodes } from "@/features/hsn/sample-data";
import { InvoiceForm } from "@/features/invoices/invoice-form";
import { invoiceNumber } from "@/features/invoices/invoice-rules";
import { nextSequence } from "@/features/invoices/sample-data";
import { categories, itemGroups, items } from "@/features/items/sample-data";
import { parties } from "@/features/parties/sample-data";
import { quotationLabel } from "@/features/quotations/quotation-rules";
import { quotations } from "@/features/quotations/sample-data";
import { lutRegister } from "@/features/tax-export/sample-data";

export const metadata: Metadata = { title: "New local invoice" };

type SearchParams = PageProps<"/invoices/new/local">["searchParams"];

// `?quotation=<id>` starts the invoice from that quotation (Convert to
// invoice). `searchParams` is request data, so it is read inside Suspense.
export default function NewLocalInvoicePage({ searchParams }: { searchParams: SearchParams }) {
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
  const { quotation: quotationId } = await searchParams;
  const quotation = quotations.find((candidate) => candidate.id === quotationId);
  return (
    <InvoiceForm
      kind="local"
      customers={parties.filter((party) => party.roles.includes("customer"))}
      catalog={{ categories, groups: itemGroups, items, hsnCodes }}
      luts={lutRegister}
      companyState={COMPANY_TAX_PROFILE.stateCode}
      suggestedNumber={invoiceNumber("local", "2026-27", nextSequence.local)}
      fromQuotation={quotation && { label: quotationLabel(quotation), partyId: quotation.partyId, lines: quotation.lines }}
    />
  );
}
