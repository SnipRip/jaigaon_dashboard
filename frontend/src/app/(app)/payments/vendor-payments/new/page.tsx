import type { Metadata } from "next";
import { Suspense } from "react";
import { NewSettlementScreen } from "@/features/payments/payment-screens";

export const metadata: Metadata = { title: "Pay a vendor" };

type SearchParams = PageProps<"/payments/vendor-payments/new">["searchParams"];

// `?document=<id>` opens the form on that invoice, bill or opening balance
// (`?invoice=` / `?bill=` too, from the invoice and bill pages).
// `searchParams` is request data, so it is read inside a Suspense boundary.
export default function NewVendorPaymentPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const pick = params.document ?? params.invoice ?? params.bill;
  return <NewSettlementScreen direction="PAYMENT" documentId={typeof pick === "string" ? pick : undefined} />;
}
