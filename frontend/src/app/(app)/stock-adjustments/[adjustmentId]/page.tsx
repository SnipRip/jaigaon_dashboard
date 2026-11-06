import type { Metadata } from "next";
import { Suspense } from "react";
import { AdjustmentScreen } from "@/features/stock-moves/stock-move-screens";

export const metadata: Metadata = { title: "Stock adjustment" };

type AdjustmentParams = PageProps<"/stock-adjustments/[adjustmentId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function StockAdjustmentPage({ params }: { params: AdjustmentParams }) {
  return (
    <Suspense>
      <Adjustment params={params} />
    </Suspense>
  );
}

async function Adjustment({ params }: { params: AdjustmentParams }) {
  return <AdjustmentScreen adjustmentId={(await params).adjustmentId} />;
}
