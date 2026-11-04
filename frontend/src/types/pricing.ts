// Pricing records as the backend returns them (backend/src/pricing).

/** One item or one category / sub-category, never both. */
export interface RateTargetView {
  itemId: string | null;
  categoryId: string | null;
}

export interface SpecialRateView extends RateTargetView {
  id: string;
  partyId: string;
  kind: "NET" | "DISCOUNT";
  /** Rupees per base unit for NET, percent off the day's rate (else MRP) for DISCOUNT. */
  value: number;
  validFrom: string;
  /** Null: until withdrawn. */
  validTill: string | null;
  notes: string | null;
  isArchived: boolean;
}

export type RateSourceView = "special" | "price-list";

/** `POST /rates/line-options`: what one quotation or invoice line can take. */
export interface LineRateOptionsView {
  itemId: string;
  date: string;
  /** Special rate, else today's rate-sheet price; null when neither: the user types it. */
  rate: number | null;
  source: RateSourceView | null;
  mrp: number | null;
  todaysRate: { id: string; rate: number; validFrom: string; validTill: string } | null;
  specialRate: { id: string; kind: "NET" | "DISCOUNT"; value: number; validTill: string | null; rate: number } | null;
  /** With no entry today: the latest that ended. A hint only. */
  previousSheetRate: { rate: number; validFrom: string; validTill: string } | null;
  /** Minimum on today's entry. */
  floor: number | null;
  /** The day's cost from the sheet, else the last landed cost; null before any stock. */
  marginCost: number | null;
  costs: { lastLandedCost: number | null; stockCost: number | null };
}
