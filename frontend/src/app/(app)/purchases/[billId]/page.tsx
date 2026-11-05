import type { Metadata } from "next";
import { Suspense } from "react";
import { BillScreen } from "@/features/purchases/purchase-screens";

export const metadata: Metadata = { title: "Bill" };

type BillParams = PageProps<"/purchases/[billId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function BillPage({ params }: { params: BillParams }) {
  return (
    <Suspense>
      <BillView params={params} />
    </Suspense>
  );
}

async function BillView({ params }: { params: BillParams }) {
  return <BillScreen billId={(await params).billId} />;
}
