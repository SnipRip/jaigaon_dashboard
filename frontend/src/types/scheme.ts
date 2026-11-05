// Schemes as the backend returns them (backend/src/schemes).

export type SchemeLevel = "LINE" | "ORDER";
export type SchemeBenefit = "PERCENT" | "AMOUNT_PER_UNIT" | "FLAT_AMOUNT" | "FREE_QUANTITY";
export type SchemePartyScope = "ALL" | "INDIA" | "OVERSEAS" | "SELECTED";
export type SchemeRateSource = "SHEET" | "SPECIAL" | "MANUAL";

/** Exactly one of the three. */
export interface SchemeTargetView {
  itemId: string | null;
  categoryId: string | null;
  brandId: string | null;
}

export interface SchemeView {
  id: string;
  name: string;
  description: string | null;
  level: SchemeLevel;
  benefit: SchemeBenefit;
  /** Percent, ₹ per unit, ₹, or free units, by benefit. */
  value: number;
  /** Free quantity: units to buy for `value` free. */
  buyQuantity: number | null;
  /** ₹, the most one line (or the order) gets off. */
  maxDiscount: number | null;
  minQuantity: number | null;
  minValue: number | null;
  partyScope: SchemePartyScope;
  partyIds: string[];
  /** None: every item. */
  targets: SchemeTargetView[];
  rateSources: SchemeRateSource[];
  stackable: boolean;
  validFrom: string;
  validTill: string | null;
  notes: string | null;
  isArchived: boolean;
}

export interface AppliedSchemeView {
  schemeId: string;
  name: string;
  level: SchemeLevel;
  amount: number;
  freeQuantity: number;
}

/** `POST /schemes/evaluate`: what the schemes take off each line of a document. */
export interface SchemeResultView {
  lines: { key: string; gross: number; schemeDiscount: number; taxable: number; freeQuantity: number; applied: AppliedSchemeView[] }[];
  applied: AppliedSchemeView[];
  totalDiscount: number;
}
