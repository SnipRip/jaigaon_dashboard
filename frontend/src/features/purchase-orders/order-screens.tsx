"use client";

import { LoadNotice } from "@/components/ui/load-notice";
import { toGodown } from "@/features/masters/masters-api";
import { usePurchaseData } from "@/features/purchases/use-purchase-data";
import { OrderDetail } from "./order-detail";
import { OrderForm } from "./order-form";
import { OrdersWorkspace } from "./orders-workspace";

// The purchase order pages' client screens, on the same data as the bills.

export function OrdersListScreen() {
  const { data, error } = usePurchaseData({ orders: true });
  if (!data) return <LoadNotice error={error} what="purchase orders" />;
  return <OrdersWorkspace orders={data.orders} />;
}

export function OrderFormScreen({ orderId }: { orderId?: string }) {
  const { data, error, reload } = usePurchaseData({ orders: true });
  if (!data) return <LoadNotice error={error} what="the order form" />;
  const order = orderId ? data.orders.find((candidate) => candidate.id === orderId) : undefined;
  if (orderId && !order) return <LoadNotice error={new Error("This order does not exist.")} what="the order" />;
  return (
    <OrderForm
      key={order?.id ?? "new"}
      vendors={data.parties.filter((party) => !party.archived)}
      catalog={data.masters.catalog}
      godowns={data.masters.godowns.map(toGodown)}
      company={data.company}
      order={order}
      onSaved={reload}
    />
  );
}

export function OrderScreen({ orderId }: { orderId: string }) {
  const { data, error, reload } = usePurchaseData({ orders: true });
  if (!data) return <LoadNotice error={error} what="the order" />;
  const order = data.orders.find((candidate) => candidate.id === orderId);
  if (!order) return <LoadNotice error={new Error("This order does not exist.")} what="the order" />;
  return <OrderDetail order={order} onChanged={reload} />;
}
