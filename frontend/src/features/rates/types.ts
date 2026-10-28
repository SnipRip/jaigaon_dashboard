// Pricing masters (masters-plan.md, section E): price levels assigned to
// customers, customer special rates, and quantity slabs.
import type { MasterRecord } from "@/features/masters/record-master";

export interface PriceLevel extends MasterRecord {
  name: string;
  /** Off MRP, never below the item's minimum selling price. */
  discountPct: number;
  description?: string;
}

export interface SpecialRate extends MasterRecord {
  customerId: string;
  itemId: string;
  kind: "net" | "discount";
  /** Net rate in ₹ per unit, or discount % off MRP. */
  value: number;
  validTill: string;
  notes?: string;
}

export interface QuantitySlab extends MasterRecord {
  itemId: string;
  /** In the item's base unit. */
  minQuantity: number;
  /** Extra discount off the rate that would otherwise apply. */
  discountPct: number;
}

/** Where a quoted rate came from, shown beside it. */
export type RateSource = "special" | "price-level" | "standard" | "minimum";
