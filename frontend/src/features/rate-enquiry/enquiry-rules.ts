// Rate enquiry figures in the browser. Rates themselves come from the
// backend (GET /rate-enquiry); this only adds up the draft and filters.
import { marginPct } from "@/features/rates/rate-rules";
import type { RateEnquiryItemView } from "@/types/rate-enquiry";

export interface DraftLine {
  item: RateEnquiryItemView;
  quantity: number;
}

export interface DraftTotals {
  value: number;
  profit: number;
  marginPct: number;
  /** Lines with no rate today: typed on the quotation. */
  unpriced: number;
  /** False when a priced line has no cost yet (no stock ever bought), so profit leaves it out. */
  costKnown: boolean;
}

const paise = (amount: number) => Math.round(amount * 100) / 100;

/** The item's margin at its rate, against the day's cost; null without either. */
export function itemMargin(item: RateEnquiryItemView): number | null {
  const { rate, marginCost } = item.options;
  return rate === null || marginCost === null ? null : marginPct(rate, marginCost);
}

export const lineValue = (line: DraftLine) => (line.item.options.rate === null ? 0 : paise(line.quantity * line.item.options.rate));

export function draftTotals(lines: DraftLine[]): DraftTotals {
  const priced = lines.filter((line) => line.item.options.rate !== null);
  const costed = priced.filter((line) => line.item.options.marginCost !== null);
  const value = paise(priced.reduce((sum, line) => sum + lineValue(line), 0));
  const costedValue = costed.reduce((sum, line) => sum + lineValue(line), 0);
  const cost = costed.reduce((sum, line) => sum + line.quantity * line.item.options.marginCost!, 0);
  return {
    value,
    profit: paise(costedValue - cost),
    marginPct: marginPct(costedValue, cost),
    unpriced: lines.length - priced.length,
    costKnown: costed.length === priced.length,
  };
}

/** Every search word must appear in the name, SKU, category, sub-category or brand. */
export function matchesSearch(item: RateEnquiryItemView, query: string): boolean {
  const haystack = [item.name, item.sku, item.categoryName, item.subCategoryName, item.brandName].filter(Boolean).join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
