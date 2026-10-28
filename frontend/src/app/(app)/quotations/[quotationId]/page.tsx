import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { items } from "@/features/items/sample-data";
import { parties } from "@/features/parties/sample-data";
import { QuotationDetail } from "@/features/quotations/quotation-detail";
import { quotationLabel } from "@/features/quotations/quotation-rules";
import { quotations } from "@/features/quotations/sample-data";

type QuotationParams = PageProps<"/quotations/[quotationId]">["params"];

const findQuotation = (id: string) => quotations.find((quotation) => quotation.id === id);

export function generateStaticParams() {
  return quotations.map((quotation) => ({ quotationId: quotation.id }));
}

export async function generateMetadata({ params }: { params: QuotationParams }): Promise<Metadata> {
  const quotation = findQuotation((await params).quotationId);
  return { title: quotation ? quotationLabel(quotation) : "Quotation" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function QuotationPage({ params }: { params: QuotationParams }) {
  return (
    <Suspense>
      <QuotationView params={params} />
    </Suspense>
  );
}

async function QuotationView({ params }: { params: QuotationParams }) {
  const quotation = findQuotation((await params).quotationId);
  const party = quotation && parties.find((candidate) => candidate.id === quotation.partyId);
  if (!quotation || !party) notFound();

  return (
    <>
      <SampleDataNotice />
      <QuotationDetail initialQuotation={quotation} party={party} issuer={COMPANY_TAX_PROFILE} items={items} />
    </>
  );
}
