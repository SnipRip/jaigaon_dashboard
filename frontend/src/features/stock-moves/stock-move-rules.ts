// Words and choices for the stock transfer and adjustment screens. No React.
// The backend enforces the same reason → direction rule
// (backend/src/stock-moves/stock-move-rules.ts).
import type { StatusTone } from "@/components/ui/status-chip";
import type { AdjustmentDirectionView, AdjustmentReasonView, StockMoveStatusView } from "@/types/stock-moves";

export const REASONS: { value: AdjustmentReasonView; label: string; directions: AdjustmentDirectionView[] }[] = [
  { value: "DAMAGED", label: "Damaged", directions: ["OUT"] },
  { value: "LOST", label: "Lost or stolen", directions: ["OUT"] },
  { value: "CONSUMED", label: "Used up (own work, samples)", directions: ["OUT"] },
  { value: "COUNT_SHORT", label: "Short on a stock count", directions: ["OUT"] },
  { value: "COUNT_EXCESS", label: "More on a stock count", directions: ["IN"] },
  { value: "FOUND", label: "Found", directions: ["IN"] },
  { value: "OTHER", label: "Other (say why in the notes)", directions: ["IN", "OUT"] },
];

export const reasonLabel = (reason: AdjustmentReasonView) => REASONS.find((option) => option.value === reason)?.label ?? reason;

export const reasonsFor = (direction: AdjustmentDirectionView) => REASONS.filter((option) => option.directions.includes(direction));

export const DIRECTION_TEXT: Record<AdjustmentDirectionView, string> = {
  OUT: "Take stock out",
  IN: "Add stock",
};

export const STATUS_TEXT: Record<StockMoveStatusView, { label: string; tone: StatusTone }> = {
  POSTED: { label: "Posted", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};
