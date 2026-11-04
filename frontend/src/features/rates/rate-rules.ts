// Which rate a customer gets for an item (client, 4 Nov 2026), in order: a
// special rate in force for that customer; else the rate-sheet price in force
// on the date; else none, and the user types it. The item master has no
// selling price. A special rate set on the item beats one on its
// sub-category, which beats one on its category. A discount special rate is
// taken off the day's rate, else off MRP.
// No React. The backend applies the same rules (backend/src/pricing/
// pricing-rules.ts, POST /rates/line-options); this copy prices the screens
// that are still on sample data.
import type { Item } from "@/features/items/types";
import type { RateSource, RateTarget, SheetEntry, SpecialRate } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

type PricedItem = Pick<Item, "id" | "categoryId" | "subCategoryId" | "mrp">;

export const RATE_SOURCE_TEXT: Record<RateSource, string> = {
  special: "Special rate",
  "price-list": "Today's rate",
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

/** The entry in force on the date: latest start, then the shorter range. */
export function sheetEntryOn(sheet: SheetEntry[], itemId: string, date: string): SheetEntry | undefined {
  return sheet
    .filter((entry) => entry.itemId === itemId && entry.validFrom <= date && entry.validTill >= date)
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom) || a.validTill.localeCompare(b.validTill))[0];
}

export interface QuotedRate {
  /** Undefined: no special rate and no rate-sheet price. */
  rate?: number;
  source?: RateSource;
  special?: SpecialRate;
}

export function rateFor(
  item: PricedItem,
  customerId: string | undefined,
  date: string,
  specialRates: SpecialRate[],
  listed?: SheetEntry,
): QuotedRate {
  const special = customerId
    ? mostSpecific(specialRates.filter((rate) => rate.customerId === customerId && specialRateInForce(rate, date)), item)[0]
    : undefined;
  if (special) {
    const base = listed?.sellingPrice ?? item.mrp;
    if (special.kind === "net") return { rate: special.value, source: "special", special };
    if (base !== undefined) return { rate: money(base * (1 - special.value / 100)), source: "special", special };
  }
  return listed ? { rate: listed.sellingPrice, source: "price-list" } : {};
}

/** Profit as a share of the selling rate. */
export const marginPct = (rate: number, cost: number) => (rate ? ((rate - cost) / rate) * 100 : 0);
