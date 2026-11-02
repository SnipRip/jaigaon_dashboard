// Pricing masters (masters-plan.md, section E): price levels assigned to
// customers, customer special rates, and quantity slabs.
import type { MasterRecord } from "@/features/masters/record-master";

/** What a special rate or slab is set on: one item, or a whole category / sub-category. */
export interface RateTarget {
  itemId?: string;
  categoryId?: string;
}

export interface PriceLevel extends MasterRecord {
  name: string;
  /** Off MRP, never below the item's minimum selling price. */
  discountPct: number;
  description?: string;
  /** The level's own discount for a category or sub-category (the sub-category's wins). */
  categoryDiscounts: { categoryId: string; discountPct: number }[];
  /** Customers on the level. Sample levels leave it out. */
  customerCount?: number;
}

export interface SpecialRate extends MasterRecord, RateTarget {
  customerId: string;
  kind: "net" | "discount";
  /** Net rate in ₹ per unit, or discount % off MRP. */
  value: number;
  validFrom: string;
  /** Left out: until withdrawn. */
  validTill?: string;
  notes?: string;
}

export interface QuantitySlab extends MasterRecord, RateTarget {
  /** In the item's base unit. */
  minQuantity: number;
  /** Extra discount off the rate that would otherwise apply. */
  discountPct: number;
}

/** Where a quoted rate came from, shown beside it. */
export type RateSource = "special" | "price-level" | "standard" | "minimum";
