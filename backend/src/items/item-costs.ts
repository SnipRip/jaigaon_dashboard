// An item's cost is never typed on the item master: every batch has its own
// landed rate (bill rate + its share of freight, unloading and GST that
// cannot be claimed), so the same rod costs more off the Delhi truck than
// the Bihar one, and it differs by vendor. The item only shows costs worked
// out from its batches: the opening stock, plus one batch per goods bill line
// (StockBatch, src/purchases). Sales draw both down FIFO (src/stock): a batch's
// remaining falls, and the opening stock's drawn rises.
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';

export interface ItemCosts {
  /** Landed rate of the newest batch: what restocking costs, so margins and floors use it. Null before any stock. */
  lastLandedCost: number | null;
  /** Stock value ÷ quantity on hand (FIFO value of what is left). Null with nothing in stock. */
  stockCost: number | null;
}

/** The rows `itemCosts` and `stockOnHand` read, to add to an item query's `select` or `include`. */
export const itemCostSource = {
  openingStock: { select: { quantity: true, value: true, drawn: true } },
  stockBatches: {
    select: { quantity: true, remaining: true, landedRate: true, date: true, createdAt: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  },
} as const satisfies Prisma.ItemInclude;

export interface CostSource {
  /** `drawn`: sold out of it so far (missing counts as none). */
  openingStock: { quantity: Prisma.Decimal; value: Prisma.Decimal; drawn?: Prisma.Decimal }[];
  /** Newest first, as itemCostSource orders them. */
  stockBatches: { remaining: Prisma.Decimal; landedRate: Prisma.Decimal }[];
}

const paise = (value: number) => Math.round(value * 100) / 100;

/** Quantity on hand, in thousandths so 0.1 + 0.2 kg stays 0.3. */
export function stockOnHand(source: CostSource): number {
  const thousandths = (value: Prisma.Decimal) => Math.round(toNumber(value) * 1000);
  const opening = source.openingStock.reduce((sum, row) => sum + thousandths(row.quantity) - (row.drawn ? thousandths(row.drawn) : 0), 0);
  const batches = source.stockBatches.reduce((sum, row) => sum + thousandths(row.remaining), 0);
  return (opening + batches) / 1000;
}

/** Per base unit, rounded to paise. */
export function itemCosts(source: CostSource): ItemCosts {
  // The opening stock's rate is its value over all of it; what is left is valued at that rate.
  let openingQuantity = 0;
  let openingValue = 0;
  let quantity = 0;
  let value = 0;
  for (const row of source.openingStock) {
    const total = toNumber(row.quantity);
    const left = total - (row.drawn ? toNumber(row.drawn) : 0);
    openingQuantity += total;
    openingValue += toNumber(row.value);
    quantity += left;
    value += total > 0 ? (toNumber(row.value) * left) / total : 0;
  }
  const openingRate = openingQuantity > 0 ? openingValue / openingQuantity : null;
  for (const batch of source.stockBatches) {
    const remaining = toNumber(batch.remaining);
    quantity += remaining;
    value += remaining * toNumber(batch.landedRate);
  }
  const newest = source.stockBatches[0];
  return {
    lastLandedCost: newest ? paise(toNumber(newest.landedRate)) : openingRate === null ? null : paise(openingRate),
    stockCost: quantity > 0 ? paise(value / quantity) : null,
  };
}
