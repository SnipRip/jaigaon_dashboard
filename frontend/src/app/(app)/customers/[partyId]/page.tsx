import type { Metadata } from "next";
import { Suspense } from "react";
import { PartyScreen } from "@/features/parties/party-screens";

type PartyParams = PageProps<"/customers/[partyId]">["params"];

export const metadata: Metadata = { title: "Customer" };

// `params` is request data, so it is read inside a Suspense boundary.
export default function CustomerPage({ params }: { params: PartyParams }) {
  return (
    <Suspense>
      <CustomerDetail params={params} />
    </Suspense>
  );
}

async function CustomerDetail({ params }: { params: PartyParams }) {
  return <PartyScreen role="customer" partyId={(await params).partyId} />;
}
