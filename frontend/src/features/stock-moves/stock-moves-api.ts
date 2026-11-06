"use client";

import useSWR from "swr";
import { useItemMasters } from "@/features/items/catalog-api";
import { apiGet, apiRequest } from "@/lib/api-client";
import type { AdjustmentDirectionView, AdjustmentReasonView, StockAdjustmentView, StockTransferView } from "@/types/stock-moves";

export const STOCK_TRANSFERS_PATH = "/stock-transfers";
export const STOCK_ADJUSTMENTS_PATH = "/stock-adjustments";

interface LineBody {
  itemId: string;
  quantity: number;
}

export interface TransferBody {
  date: string;
  fromGodownId: string;
  toGodownId: string;
  vehicleNumber: string | null;
  notes: string | null;
  lines: LineBody[];
}

export interface AdjustmentBody {
  date: string;
  godownId: string;
  direction: AdjustmentDirectionView;
  reason: AdjustmentReasonView;
  notes: string | null;
  /** `rate` only for stock added. */
  lines: (LineBody & { rate?: number })[];
}

export const createTransfer = (body: TransferBody) => apiRequest<StockTransferView>(STOCK_TRANSFERS_PATH, { method: "POST", body });
export const cancelTransfer = (id: string, reason: string) =>
  apiRequest<StockTransferView>(`${STOCK_TRANSFERS_PATH}/${id}/cancel`, { method: "POST", body: { reason } });
export const createAdjustment = (body: AdjustmentBody) => apiRequest<StockAdjustmentView>(STOCK_ADJUSTMENTS_PATH, { method: "POST", body });
export const cancelAdjustment = (id: string, reason: string) =>
  apiRequest<StockAdjustmentView>(`${STOCK_ADJUSTMENTS_PATH}/${id}/cancel`, { method: "POST", body: { reason } });

/**
 * What the transfer or adjustment screens read: the documents of one kind
 * and the item master with godowns (stock per godown). One SWR key each, so
 * moving between the list, a form and a document does not load again.
 */
export function useStockMoveData<T>(path: typeof STOCK_TRANSFERS_PATH | typeof STOCK_ADJUSTMENTS_PATH) {
  const list = useSWR<T[]>(path, apiGet);
  const { masters, error: mastersError, reload: reloadMasters } = useItemMasters();
  const data = list.data && masters ? { documents: list.data, masters } : undefined;
  return {
    data,
    error: list.error ?? mastersError,
    /** After a save or cancel: the documents and the items (their stock moved). */
    reload: async () => {
      await Promise.all([list.mutate(), reloadMasters()]);
    },
  };
}
