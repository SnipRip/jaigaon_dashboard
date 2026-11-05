import type { Metadata } from "next";
import { Suspense } from "react";
import { NewQuotationScreen } from "@/features/quotations/quotation-screens";

export const metadata: Metadata = { title: "New quotation" };

type SearchParams = PageProps<"/quotations/new">["searchParams"];

// `?customer=<id>&lines=SKU:qty,SKU:qty` comes from Rate enquiry's
// "Continue as a quotation". `searchParams` is request data, so it is read
// inside a Suspense boundary.
export default function NewQuotationPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const { customer, lines } = await searchParams;
  return <NewQuotationScreen customer={typeof customer === "string" ? customer : undefined} lines={typeof lines === "string" ? lines : undefined} />;
}
