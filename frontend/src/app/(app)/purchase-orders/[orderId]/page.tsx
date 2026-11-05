import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderScreen } from "@/features/purchase-orders/order-screens";

export const metadata: Metadata = { title: "Purchase order" };

type OrderParams = PageProps<"/purchase-orders/[orderId]">["params"];

// `params` is request data, so it is read inside a Suspense boundary.
export default function PurchaseOrderPage({ params }: { params: OrderParams }) {
  return (
    <Suspense>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: { params: OrderParams }) {
  return <OrderScreen orderId={(await params).orderId} />;
}
