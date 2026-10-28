import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { stageLabel } from "./shipment-rules";
import type { ShipmentStatus } from "./types";

const TONE: Record<ShipmentStatus, StatusTone> = {
  planned: "neutral",
  loading: "brand",
  "in-transit": "brand",
  "at-border": "warning",
  cleared: "success",
  delivered: "success",
};

export function ShipmentStageChip({ status }: { status: ShipmentStatus }) {
  return <StatusChip tone={TONE[status]}>{stageLabel(status)}</StatusChip>;
}
