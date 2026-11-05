import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderFormScreen } from "@/features/purchase-orders/order-screens";

export const metadata: Metadata = { title: "Edit purchase order" };

type OrderParams = PageProps<"/purchase-orders/[orderId]/edit">["params"];

export default function EditPurchaseOrderPage({ params }: { params: OrderParams }) {
  return (
    <Suspense>
      <EditOrder params={params} />
    </Suspense>
  );
}

async function EditOrder({ params }: { params: OrderParams }) {
  return <OrderFormScreen orderId={(await params).orderId} />;
}
