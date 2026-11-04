// Customer special rates (masters-plan.md, section E). The item master has
// no selling price; the rate sheet (price list) gives the day's rate.
import type { MasterRecord } from "@/features/masters/record-master";

/** What a special rate is set on: one item, or a whole category / sub-category. */
export interface RateTarget {
  itemId?: string;
  categoryId?: string;
}

export interface SpecialRate extends MasterRecord, RateTarget {
  customerId: string;
  kind: "net" | "discount";
  /** Net rate in ₹ per unit, or discount % off the day's rate (off MRP without one). */
  value: number;
  validFrom: string;
  /** Left out: until withdrawn. */
  validTill?: string;
  notes?: string;
}

/** Where a suggested rate came from, shown beside it. */
export type RateSource = "special" | "price-list";

/** A rate-sheet entry, as the sample screens read it. */
export interface SheetEntry {
  itemId: string;
  validFrom: string;
  validTill: string;
  sellingPrice: number;
  minSellingPrice?: number;
}
