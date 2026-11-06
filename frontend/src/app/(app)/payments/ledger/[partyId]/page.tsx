import type { Metadata } from "next";
import { Suspense } from "react";
import { LedgerScreen } from "@/features/payments/payment-screens";

export const metadata: Metadata = { title: "Party statement" };

type LedgerParams = PageProps<"/payments/ledger/[partyId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function LedgerPage({ params }: { params: LedgerParams }) {
  return (
    <Suspense>
      <Ledger params={params} />
    </Suspense>
  );
}

async function Ledger({ params }: { params: LedgerParams }) {
  return <LedgerScreen partyId={(await params).partyId} />;
}
