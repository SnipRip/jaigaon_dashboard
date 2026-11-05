// First in, first out: a sale takes the oldest stock first (the opening stock,
// then bill batches by date), and its cost is what those slices cost. Pure;
// src/stock/stock-out.ts loads and locks the slices and writes the result.
// Quantities are worked in thousandths so 0.1 + 0.2 kg stays 0.3.

/** Stock that can be drawn: a bill batch, or the opening stock (batchId null). Oldest first. */
export interface StockSlice {
  batchId: string | null;
  available: number;
  /** Per base unit. */
  rate: number;
}

export interface StockDraw {
  batchId: string | null;
  quantity: number;
  rate: number;
}

const thousandths = (value: number) => Math.round(value * 1000);

/**
 * Takes `quantity` from the slices in order. `short` is what they could not
 * cover (0 when there was enough); the draws then cover only what there was.
 */
export function planFifo(slices: StockSlice[], quantity: number): { draws: StockDraw[]; short: number } {
  let wanted = thousandths(quantity);
  const draws: StockDraw[] = [];
  for (const slice of slices) {
    if (wanted <= 0) break;
    const take = Math.min(wanted, thousandths(slice.available));
    if (take <= 0) continue;
    draws.push({ batchId: slice.batchId, quantity: take / 1000, rate: slice.rate });
    wanted -= take;
  }
  return { draws, short: Math.max(wanted, 0) / 1000 };
}

/** What the drawn goods cost, to paise. */
export const costOfDraws = (draws: Pick<StockDraw, 'quantity' | 'rate'>[]) =>
  Math.round(draws.reduce((sum, draw) => sum + draw.quantity * draw.rate, 0) * 100) / 100;

/** The opening stock's rate: its value over its quantity, to four places like a batch's landed rate. */
export const openingRate = (quantity: number, value: number) => (quantity > 0 ? Math.round((value / quantity) * 10000) / 10000 : 0);

/** What is left to draw from the opening stock. */
export const openingLeft = (quantity: number, drawn: number) => (thousandths(quantity) - thousandths(drawn)) / 1000;
