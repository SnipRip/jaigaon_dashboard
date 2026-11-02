// Pricing records as the backend returns them (backend/src/pricing).

/** One item or one category / sub-category, never both. */
export interface RateTargetView {
  itemId: string | null;
  categoryId: string | null;
}

export interface PriceLevelView {
  id: string;
  name: string;
  /** Off MRP, for every category without its own figure. */
  discountPct: number;
  description: string | null;
  isArchived: boolean;
  categoryDiscounts: { categoryId: string; discountPct: number }[];
  customerCount: number;
}

export interface SpecialRateView extends RateTargetView {
  id: string;
  partyId: string;
  kind: "NET" | "DISCOUNT";
  /** Rupees per base unit for NET, percent off MRP for DISCOUNT. */
  value: number;
  validFrom: string;
  /** Null: until withdrawn. */
  validTill: string | null;
  notes: string | null;
  isArchived: boolean;
}

export interface QuantitySlabView extends RateTargetView {
  id: string;
  minQuantity: number;
  discountPct: number;
  isArchived: boolean;
}

export type RateSourceView = "special" | "price-level" | "standard" | "minimum";

/** `GET /rates/quote`: the rate a customer gets, and why. */
export interface RateQuoteView {
  rate: number;
  source: RateSourceView;
  special?: SpecialRateView;
  level?: { id: string; name: string; discountPct: number };
  slab?: QuantitySlabView;
  sellingPrice: number;
  mrp: number | null;
  minSellingPrice: number | null;
  costPrice: number;
  date: string;
}
