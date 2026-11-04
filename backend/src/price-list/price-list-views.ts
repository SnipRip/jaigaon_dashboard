// Price list records as the API returns them: Decimals as numbers, dates as
// YYYY-MM-DD. The views also serve as the facts price-list-rules.ts reads.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Item, ItemPrice } from '../generated/prisma/client.js';
import { itemCosts } from '../items/item-costs.js';
import type { ItemMasterPrices, ItemPriceFacts } from './price-list-rules.js';

export interface ItemPriceView extends ItemPriceFacts {
  notes: string | null;
  /** Display name of whoever saved it last. */
  updatedBy: string | null;
  createdAt: string;
}

/** One item on the price list for a date. */
export interface PriceSheetRowView {
  itemId: string;
  name: string;
  sku: string;
  /** Base unit symbol, inherited from group or category when the item has none. */
  unit: string | null;
  categoryId: string;
  subCategoryId: string | null;
  item: ItemMasterPrices;
  /** The entry in force on the date; null: no list rate that day. */
  entry: ItemPriceView | null;
  /** Other live entries covering the date that this one overrides. */
  overridden: number;
}

export interface PriceSheetView {
  date: string;
  rows: PriceSheetRowView[];
}

export const itemPriceInclude = {
  updatedBy: { select: { displayName: true } },
} as const;

export const toItemPriceView = (
  price: ItemPrice & { updatedBy?: { displayName: string } | null },
): ItemPriceView => ({
  id: price.id,
  itemId: price.itemId,
  validFrom: isoDate(price.validFrom),
  validTill: isoDate(price.validTill),
  sellingPrice: toNumber(price.sellingPrice),
  mrp: toNumber(price.mrp),
  minSellingPrice: toNumber(price.minSellingPrice),
  costPrice: toNumber(price.costPrice),
  isArchived: price.isArchived,
  updatedAt: price.updatedAt.toISOString(),
  notes: price.notes,
  updatedBy: price.updatedBy?.displayName ?? null,
  createdAt: price.createdAt.toISOString(),
});

/** `item` is selected with `itemCostSource` so its cost can be worked out. */
export const toItemMasterPrices = (
  item: Pick<Item, 'mrp'> & {
    openingStock: Parameters<typeof itemCosts>[0];
  },
): ItemMasterPrices => ({
  mrp: toNumber(item.mrp),
  costPrice: itemCosts(item.openingStock).lastLandedCost,
});
