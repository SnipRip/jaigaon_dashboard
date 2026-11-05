import type { Metadata } from "next";
import { OrdersListScreen } from "@/features/purchase-orders/order-screens";

export const metadata: Metadata = { title: "Purchase orders" };

export default function PurchaseOrdersPage() {
  return <OrdersListScreen />;
}
