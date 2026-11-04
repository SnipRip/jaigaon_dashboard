// An item's cost is never typed on the item master: every batch has its own
// landed rate (bill rate + its share of freight, unloading and GST that
// cannot be claimed), so the same rod costs more off the Delhi truck than
// the Bihar one, and it differs by vendor. The item only shows costs worked
// out from its batches. Until purchase bills are stored, the opening stock
// is the only batch an item has.
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';

export interface ItemCosts {
  /** Landed rate of the newest batch: what restocking costs, so margins and floors use it. Null before any stock. */
  lastLandedCost: number | null;
  /** Stock value ÷ quantity on hand (FIFO value of what is left). Null with nothing in stock. */
  stockCost: number | null;
}

/** The rows `itemCosts` reads, to add to an item query's `select` or `include`. */
export const itemCostSource = {
  openingStock: { select: { quantity: true, value: true } },
} as const;

type Batch = { quantity: Prisma.Decimal; value: Prisma.Decimal };

/** Per base unit, rounded to paise. */
export function itemCosts(batches: Batch[]): ItemCosts {
  let quantity = 0;
  let value = 0;
  for (const batch of batches) {
    quantity += toNumber(batch.quantity);
    value += toNumber(batch.value);
  }
  const perUnit = quantity > 0 ? Math.round((value / quantity) * 100) / 100 : null;
  // The opening batches all date from the same day, so the newest batch is
  // the opening stock as a whole; purchase lines will set lastLandedCost.
  return { lastLandedCost: perUnit, stockCost: perUnit };
}
