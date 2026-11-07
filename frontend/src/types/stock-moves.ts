// Stock transfers and adjustments as the backend returns them
// (backend/src/stock-moves), and where a drawn slice of stock came from
// (backend/src/stock/draw-source.ts, also on invoice lines).

export interface DrawSourceView {
  kind: "bill" | "transfer" | "adjustment" | "opening";
  /** The bill, transfer or adjustment; null for opening stock. */
  id: string | null;
  label: string;
}

/** One FIFO slice a line took, oldest first. */
export interface StockDrawView {
  quantity: number;
  rate: number;
  batchDate: string | null;
  source: DrawSourceView;
}

export type StockMoveStatusView = "POSTED" | "CANCELLED";
export type AdjustmentDirectionView = "IN" | "OUT";
export type AdjustmentReasonView = "DAMAGED" | "LOST" | "CONSUMED" | "COUNT_SHORT" | "COUNT_EXCESS" | "FOUND" | "OTHER";

interface StockMoveLineView {
  id: string;
  itemId: string;
  itemName: string;
  sku: string | null;
  unit: string;
  quantity: number;
  value: number;
  /** Empty once cancelled (the stock went back), and for stock an adjustment added. */
  draws: StockDrawView[];
}

interface StockMoveCommon {
  id: string;
  number: string;
  date: string;
  status: StockMoveStatusView;
  value: number;
  notes: string | null;
  createdBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface StockTransferView extends StockMoveCommon {
  fromGodownId: string;
  fromGodownName: string;
  toGodownId: string;
  toGodownName: string;
  vehicleNumber: string | null;
  /** Picked from the vehicle master; null when typed. */
  vehicleId: string | null;
  /** Some moved stock has been sold or moved on, so it cannot be cancelled. */
  usedAtDestination: boolean;
  lines: StockMoveLineView[];
}

export interface StockAdjustmentView extends StockMoveCommon {
  godownId: string;
  godownName: string;
  direction: AdjustmentDirectionView;
  reason: AdjustmentReasonView;
  /** Stock it added has been sold or moved on, so it cannot be cancelled. */
  usedSince: boolean;
  lines: (StockMoveLineView & { rate: number | null })[];
}
