import type { Metadata } from "next";
import { Suspense } from "react";
import { PartyScreen } from "@/features/parties/party-screens";

type PartyParams = PageProps<"/vendors/[partyId]">["params"];

export const metadata: Metadata = { title: "Vendor" };

// `params` is request data, so it is read inside a Suspense boundary.
export default function VendorPage({ params }: { params: PartyParams }) {
  return (
    <Suspense>
      <VendorDetail params={params} />
    </Suspense>
  );
}

async function VendorDetail({ params }: { params: PartyParams }) {
  return <PartyScreen role="vendor" partyId={(await params).partyId} />;
}
