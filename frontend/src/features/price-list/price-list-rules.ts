// The price list's figures in the browser, for the table's live margin and
// checks before a save. The backend applies the same rules
// (backend/src/price-list/price-list-rules.ts) and has the last word.
import { marginPct } from "@/features/rates/rate-rules";
import type { ItemMasterPricesView, ItemPriceView } from "@/types/price-list";

const money = (value: number) => Math.round(value * 100) / 100;

type EntryPrices = Pick<ItemPriceView, "sellingPrice" | "mrp" | "minSellingPrice" | "costPrice">;

/** The prices in force on a day. No entry: no price (the item master has none). */
export interface DayPrices extends ItemMasterPricesView {
  sellingPrice: number | null;
  minSellingPrice: number | null;
}

/** The prices that apply with an entry: its own, its blank MRP and cost from the item. */
export const effectivePrices = (entry: EntryPrices | null, item: ItemMasterPricesView): DayPrices => ({
  sellingPrice: entry?.sellingPrice ?? null,
  mrp: entry?.mrp ?? item.mrp,
  minSellingPrice: entry?.minSellingPrice ?? null,
  costPrice: entry?.costPrice ?? item.costPrice,
});

/** Margin on the price, in %, rounded as the backend rounds it. */
export const marginOf = (price: number, cost: number | null) => (cost === null ? null : money(marginPct(price, cost)));

/** The price that gives this margin on the cost. */
export const priceFromMargin = (cost: number, margin: number) => money(cost / (1 - margin / 100));

export const MARGIN_LIMITS = { min: -100, below: 100 };

/** What stops a price from saving; null when it is fine. */
export function priceProblem(prices: DayPrices): string | null {
  if (prices.sellingPrice === null) return "Type the price or a margin";
  if (!(prices.sellingPrice > 0)) return "Price is more than ₹0";
  if (prices.mrp !== null && prices.sellingPrice > prices.mrp) return `Above MRP ${prices.mrp}`;
  if (prices.minSellingPrice !== null && prices.sellingPrice < prices.minSellingPrice) return `Below minimum ${prices.minSellingPrice}`;
  return null;
}

/** Margin colours, as on the Rates screen: red under 8%, amber under 12%. */
export const marginTone = (margin: number) => (margin < 8 ? "danger" : margin < 12 ? "warning" : "success");
