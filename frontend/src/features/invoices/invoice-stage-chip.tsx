import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import type { InvoiceStage } from "./invoice-rules";

const TONE: Record<InvoiceStage, StatusTone> = {
  Draft: "neutral",
  Issued: "brand",
  Dispatched: "brand",
  "Cleared customs": "warning",
  "Payment realised": "success",
  Cancelled: "danger",
};

export function InvoiceStageChip({ stage }: { stage: InvoiceStage }) {
  return <StatusChip tone={TONE[stage]}>{stage}</StatusChip>;
}
