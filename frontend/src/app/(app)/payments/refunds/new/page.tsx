import type { Metadata } from "next";
import { Suspense } from "react";
import { NewRefundScreen } from "@/features/payments/payment-screens";

export const metadata: Metadata = { title: "Refund an advance" };

type SearchParams = PageProps<"/payments/refunds/new">["searchParams"];

// `?advance=<settlement id>` opens the form on that receipt's or payment's
// advance (its "Refund the advance"). `searchParams` is request data, so it
// is read inside a Suspense boundary.
export default function NewRefundPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const { advance } = await searchParams;
  return <NewRefundScreen advanceId={typeof advance === "string" ? advance : undefined} />;
}
