// Which rate a customer gets for an item (SOW 3 and 4), in this order:
// a special rate in force for that customer and item; else the customer's
// price level off MRP; else the item's selling price. A quantity slab then
// takes its extra discount. Nothing goes below the minimum selling price.
// No React; extends the rule already prototyped in rate-enquiry/pricing.ts.
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import type { PriceLevel, QuantitySlab, RateSource, SpecialRate } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

export interface PricingBook {
  levels: PriceLevel[];
  specialRates: SpecialRate[];
  slabs: QuantitySlab[];
}

export const RATE_SOURCE_TEXT: Record<RateSource, string> = {
  special: "Special rate",
  "price-level": "Price level",
  standard: "Standard rate",
  minimum: "Held at minimum price",
};

export const specialRateInForce = (rate: SpecialRate, date: string) => !rate.archived && rate.validTill >= date;

export function rateFor(item: Item, customer: Pick<Party, "id" | "priceLevel"> | undefined, quantity: number, date: string, book: PricingBook) {
  const special = customer && book.specialRates.find((rate) => rate.customerId === customer.id && rate.itemId === item.id && specialRateInForce(rate, date));
  const level = customer?.priceLevel ? book.levels.find((candidate) => candidate.name === customer.priceLevel && !candidate.archived) : undefined;

  let rate = item.sellingPrice;
  let source: RateSource = "standard";
  if (special) {
    rate = special.kind === "net" ? special.value : (item.mrp ?? item.sellingPrice) * (1 - special.value / 100);
    source = "special";
  } else if (level && item.mrp) {
    rate = item.mrp * (1 - level.discountPct / 100);
    source = "price-level";
  }

  const slab = book.slabs
    .filter((candidate) => candidate.itemId === item.id && !candidate.archived && quantity >= candidate.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  if (slab) rate *= 1 - slab.discountPct / 100;

  if (item.minSellingPrice && rate < item.minSellingPrice) {
    rate = item.minSellingPrice;
    source = "minimum";
  }
  return { rate: money(rate), source, slab, level, special };
}

/** Profit as a share of the selling rate. */
export const marginPct = (rate: number, cost: number) => (rate ? ((rate - cost) / rate) * 100 : 0);
