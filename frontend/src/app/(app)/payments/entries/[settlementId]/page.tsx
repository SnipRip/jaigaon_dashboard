import type { Metadata } from "next";
import { Suspense } from "react";
import { SettlementScreen } from "@/features/payments/payment-screens";

export const metadata: Metadata = { title: "Receipt or payment" };

type EntryParams = PageProps<"/payments/entries/[settlementId]">["params"];

// One receipt or payment. `params` is request data, so it is read inside a Suspense boundary.
export default function EntryPage({ params }: { params: EntryParams }) {
  return (
    <Suspense>
      <Entry params={params} />
    </Suspense>
  );
}

async function Entry({ params }: { params: EntryParams }) {
  return <SettlementScreen settlementId={(await params).settlementId} />;
}
