import type { Metadata } from "next";
import { OrderFormScreen } from "@/features/purchase-orders/order-screens";

export const metadata: Metadata = { title: "New purchase order" };

export default function NewPurchaseOrderPage() {
  return <OrderFormScreen />;
}
