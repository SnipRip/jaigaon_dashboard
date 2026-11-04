// Dated item prices (agent/price-list-plan.md). Prices change almost every
// day, so an item can have a price for a single day or a range of days.
// Entries layer rather than refuse to overlap: on a date, the entry with the
// latest start wins, then the shorter range (a single day beats a week),
// then the one saved last. With no entry in force there is no list rate:
// the item master has no selling price (client, 4 Nov 2026).

export interface ItemPriceFacts {
  id: string;
  itemId: string;
  /** YYYY-MM-DD. */
  validFrom: string;
  /** YYYY-MM-DD; the same as validFrom for a single day. */
  validTill: string;
  sellingPrice: number;
  /** Null: the item's MRP. */
  mrp: number | null;
  /** The floor for these days; null for none. */
  minSellingPrice: number | null;
  /** Null: the item's last landed cost. */
  costPrice: number | null;
  isArchived: boolean;
  /** ISO timestamp; breaks a tie between two entries with the same dates. */
  updatedAt: string;
}

/** What an entry's blanks fall back to. The item has no selling price of its own. */
export interface ItemMasterPrices {
  mrp: number | null;
  /** The item's last landed cost (items/item-costs.ts); null before any stock. */
  costPrice: number | null;
}

/** The prices in force with an entry. */
export interface DayPrices extends ItemMasterPrices {
  sellingPrice: number;
  minSellingPrice: number | null;
}

const money = (value: number) => Math.round(value * 100) / 100;

export const covers = (
  entry: Pick<ItemPriceFacts, 'validFrom' | 'validTill' | 'isArchived'>,
  date: string,
) => !entry.isArchived && entry.validFrom <= date && entry.validTill >= date;

/** Orders entries so the one that wins comes first. */
const beats = (a: ItemPriceFacts, b: ItemPriceFacts) =>
  b.validFrom.localeCompare(a.validFrom) ||
  a.validTill.localeCompare(b.validTill) ||
  b.updatedAt.localeCompare(a.updatedAt);

/** The entry of one item in force on the date, if any. */
export function priceInForce<T extends ItemPriceFacts>(
  entries: T[],
  date: string,
): T | undefined {
  return entries.filter((entry) => covers(entry, date)).sort(beats)[0];
}

/** Entries grouped by item. */
export function byItem<T extends Pick<ItemPriceFacts, 'itemId'>>(
  entries: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const group = groups.get(entry.itemId);
    if (group) group.push(entry);
    else groups.set(entry.itemId, [entry]);
  }
  return groups;
}

/** The prices that apply with this entry: its own, its blanks from the item. */
export const effectivePrices = (
  entry: Pick<
    ItemPriceFacts,
    'sellingPrice' | 'mrp' | 'minSellingPrice' | 'costPrice'
  >,
  item: ItemMasterPrices,
): DayPrices => ({
  sellingPrice: entry.sellingPrice,
  mrp: entry.mrp ?? item.mrp,
  minSellingPrice: entry.minSellingPrice,
  costPrice: entry.costPrice ?? item.costPrice,
});

/** Margin on the selling price, in % (as the Rates screen shows it). */
export const marginOf = (price: number, cost: number | null) =>
  cost === null ? null : price ? money(((price - cost) / price) * 100) : 0;

/** The price that gives this margin on the cost. */
export const priceFromMargin = (cost: number, marginPct: number) =>
  money(cost / (1 - marginPct / 100));

/** A margin someone may ask for: a loss down to -100%, a profit under 100%. */
export function marginProblem(marginPct: number): string | null {
  return marginPct >= -100 && marginPct < 100
    ? null
    : 'A margin is from -100% to under 100%';
}

/** Checks before a save; null when the entry is fine. */
export function itemPriceProblem(
  entry: Pick<
    ItemPriceFacts,
    | 'validFrom'
    | 'validTill'
    | 'sellingPrice'
    | 'mrp'
    | 'minSellingPrice'
    | 'costPrice'
  >,
  item: ItemMasterPrices,
): string | null {
  if (entry.validTill < entry.validFrom)
    return 'Valid till is before valid from';
  if (entry.sellingPrice <= 0) return 'The price is more than ₹0';
  const prices = effectivePrices(entry, item);
  if (prices.mrp !== null && prices.sellingPrice > prices.mrp) {
    return `The price is above the MRP of ₹${prices.mrp}${entry.mrp === null ? " (the item's); give an MRP for these days" : ''}`;
  }
  if (
    prices.minSellingPrice !== null &&
    prices.sellingPrice < prices.minSellingPrice
  ) {
    return `The price is below the minimum of ₹${prices.minSellingPrice}`;
  }
  return null;
}
