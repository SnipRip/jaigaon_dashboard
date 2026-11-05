import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import type { PurchaseOrderView } from "@/types/purchase";

export type OrderStage = "To receive" | "Partly received" | "Received" | "Closed" | "Cancelled";

/** One word for where an order stands: its status, else what has come in. */
export function orderStage(order: Pick<PurchaseOrderView, "status" | "receipt">): OrderStage {
  if (order.status === "CANCELLED") return "Cancelled";
  if (order.receipt === "RECEIVED") return "Received";
  if (order.status === "CLOSED") return "Closed";
  return order.receipt === "PARTLY_RECEIVED" ? "Partly received" : "To receive";
}

const TONE: Record<OrderStage, StatusTone> = {
  "To receive": "brand",
  "Partly received": "warning",
  Received: "success",
  Closed: "neutral",
  Cancelled: "danger",
};

export function OrderStatusChip({ order, today }: { order: PurchaseOrderView; today: string | null }) {
  const stage = orderStage(order);
  const late = (stage === "To receive" || stage === "Partly received") && today && order.expectedDate && order.expectedDate < today;
  return (
    <span className="inline-flex flex-wrap gap-1">
      <StatusChip tone={TONE[stage]}>{stage}</StatusChip>
      {late && <StatusChip tone="danger">Late</StatusChip>}
    </span>
  );
}
