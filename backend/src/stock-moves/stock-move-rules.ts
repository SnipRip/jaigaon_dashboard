// What a stock transfer or adjustment must obey before any stock is touched.
// Pure; the services load the godowns and items and draw the stock.
import type { StockAdjustmentDirection, StockAdjustmentReason } from '../generated/prisma/enums.js';

/** Which way each reason moves stock; OTHER may go either way. */
export const REASON_DIRECTIONS: Record<StockAdjustmentReason, StockAdjustmentDirection[]> = {
  DAMAGED: ['OUT'],
  LOST: ['OUT'],
  CONSUMED: ['OUT'],
  COUNT_SHORT: ['OUT'],
  COUNT_EXCESS: ['IN'],
  FOUND: ['IN'],
  OTHER: ['IN', 'OUT'],
};

export const REASON_TEXT: Record<StockAdjustmentReason, string> = {
  DAMAGED: 'damaged',
  LOST: 'lost or stolen',
  CONSUMED: 'used up',
  COUNT_SHORT: 'short on a count',
  COUNT_EXCESS: 'more on a count',
  FOUND: 'found',
  OTHER: 'other',
};

export function reasonProblem(direction: StockAdjustmentDirection, reason: StockAdjustmentReason): string | null {
  if (REASON_DIRECTIONS[reason].includes(direction)) return null;
  return direction === 'IN' ? `Stock ${REASON_TEXT[reason]} is taken out, not added` : `Stock ${REASON_TEXT[reason]} is added, not taken out`;
}

/** Each item once per document, so its stock is drawn in one go. */
export function repeatedItem(itemIds: string[]): string | null {
  const seen = new Set<string>();
  for (const id of itemIds) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

export const transferProblem = (fromGodownId: string, toGodownId: string): string | null =>
  fromGodownId === toGodownId ? 'Pick two different godowns' : null;

/** Stock added at a typed rate is worth quantity × rate, to paise. */
export const valueAt = (quantity: number, rate: number) => Math.round(quantity * rate * 100) / 100;
