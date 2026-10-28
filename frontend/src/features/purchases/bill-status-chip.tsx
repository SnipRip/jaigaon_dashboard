import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import type { BillStatus } from "./purchase-rules";

const TONE: Record<BillStatus, StatusTone> = {
  Draft: "neutral",
  Open: "brand",
  Overdue: "danger",
  "Partially paid": "warning",
  Paid: "success",
  Void: "neutral",
};

export function BillStatusChip({ status }: { status: BillStatus }) {
  return <StatusChip tone={TONE[status]}>{status}</StatusChip>;
}
