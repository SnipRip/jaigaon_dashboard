import type { Metadata } from "next";
import { Suspense } from "react";
import { TransferScreen } from "@/features/stock-moves/stock-move-screens";

export const metadata: Metadata = { title: "Stock transfer" };

type TransferParams = PageProps<"/stock-transfers/[transferId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function StockTransferPage({ params }: { params: TransferParams }) {
  return (
    <Suspense>
      <Transfer params={params} />
    </Suspense>
  );
}

async function Transfer({ params }: { params: TransferParams }) {
  return <TransferScreen transferId={(await params).transferId} />;
}
