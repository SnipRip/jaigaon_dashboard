// Which rate a customer gets for an item (SOW 3 and 4), in this order:
// a special rate in force for that customer; else the customer's price level
// off MRP; else the item's selling price. A quantity slab then takes its
// extra discount. Nothing goes below the minimum selling price. A special
// rate, slab or level discount set on the item beats one on its
// sub-category, which beats one on its category.
// No React. The backend applies the same rules (backend/src/pricing/
// pricing-rules.ts, `GET /rates/quote`); this copy prices the screens that
// are still on sample data.
import type { Item } from "@/features/items/types";
import type { PriceLevel, QuantitySlab, RateSource, RateTarget, SpecialRate } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

export interface PricingBook {
  levels: PriceLevel[];
  specialRates: SpecialRate[];
  slabs: QuantitySlab[];
}

type PricedItem = Pick<Item, "id" | "categoryId" | "subCategoryId" | "mrp" | "sellingPrice" | "minSellingPrice">;

export const RATE_SOURCE_TEXT: Record<RateSource, string> = {
  special: "Special rate",
  "price-level": "Price level",
  standard: "Standard rate",
  minimum: "Held at minimum price",
};

export const specialRateInForce = (rate: SpecialRate, date: string) =>
  !rate.archived && rate.validFrom <= date && (!rate.validTill || rate.validTill >= date);

/** 0 item, 1 sub-category, 2 category; undefined when the target does not fit the item. */
function targetRank(target: RateTarget, item: PricedItem) {
  if (target.itemId) return target.itemId === item.id ? 0 : undefined;
  if (!target.categoryId) return undefined;
  if (target.categoryId === item.subCategoryId) return 1;
  return target.categoryId === item.categoryId ? 2 : undefined;
}

function mostSpecific<T extends RateTarget>(entries: T[], item: PricedItem): T[] {
  const ranked = entries.map((entry) => ({ entry, rank: targetRank(entry, item) })).filter((row) => row.rank !== undefined);
  const best = Math.min(...ranked.map((row) => row.rank!));
  return ranked.filter((row) => row.rank === best).map((row) => row.entry);
}

export function levelDiscountFor(level: PriceLevel, item: PricedItem) {
  const forCategory = (id?: string) => (id ? level.categoryDiscounts.find((row) => row.categoryId === id)?.discountPct : undefined);
  return forCategory(item.subCategoryId) ?? forCategory(item.categoryId) ?? level.discountPct;
}

export function rateFor(item: PricedItem, customer: { id: string; priceLevelId?: string } | undefined, quantity: number, date: string, book: PricingBook) {
  const special = customer
    ? mostSpecific(book.specialRates.filter((rate) => rate.customerId === customer.id && specialRateInForce(rate, date)), item)[0]
    : undefined;
  const level = customer?.priceLevelId ? book.levels.find((candidate) => candidate.id === customer.priceLevelId && !candidate.archived) : undefined;

  let rate = item.sellingPrice;
  let source: RateSource = "standard";
  let levelDiscountPct: number | undefined;
  if (special) {
    rate = special.kind === "net" ? special.value : (item.mrp ?? item.sellingPrice) * (1 - special.value / 100);
    source = "special";
  } else if (level && item.mrp) {
    levelDiscountPct = levelDiscountFor(level, item);
    rate = item.mrp * (1 - levelDiscountPct / 100);
    source = "price-level";
  }

  const slab = mostSpecific(
    book.slabs.filter((candidate) => !candidate.archived && quantity >= candidate.minQuantity),
    item,
  ).sort((a, b) => b.minQuantity - a.minQuantity)[0];
  if (slab) rate *= 1 - slab.discountPct / 100;

  if (item.minSellingPrice && rate < item.minSellingPrice) {
    rate = item.minSellingPrice;
    source = "minimum";
  }
  return { rate: money(rate), source, slab, level: levelDiscountPct === undefined ? undefined : level, levelDiscountPct, special };
}

/** Profit as a share of the selling rate. */
export const marginPct = (rate: number, cost: number) => (rate ? ((rate - cost) / rate) * 100 : 0);
