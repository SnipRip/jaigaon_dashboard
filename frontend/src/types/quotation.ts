// Quotations as the backend returns them (backend/src/quotations).
import type { AppliedSchemeView } from "./scheme";

export type QuotationStatusView = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "CONVERTED";
export type LineRateSourceView = "SPECIAL" | "SHEET" | "LAST_QUOTED" | "LAST_SOLD" | "MANUAL";
export type SaleRegimeView = "INTRA_STATE" | "INTER_STATE" | "EXPORT_LUT" | "EXPORT_IGST";

export interface QuotationLineView {
  id: string;
  itemId: string;
  description: string;
  hsn: string;
  unit: string;
  quantity: number;
  rate: number;
  discountPct: number;
  rateSource: LineRateSourceView;
  suggestedRate: number | null;
  schemeDiscount: number;
  freeQuantity: number;
  schemes: AppliedSchemeView[];
  gstRatePct: number;
  taxable: number;
  tax: number;
  /** Last landed cost per unit when saved; null before any stock. */
  costAtQuote: number | null;
}

export interface QuotationView {
  id: string;
  number: string;
  revision: number;
  date: string;
  validUntil: string;
  partyId: string;
  partyName: string;
  status: QuotationStatusView;
  regime: SaleRegimeView;
  terms: string | null;
  notes: string | null;
  totals: {
    gross: number;
    schemeDiscount: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    tax: number;
    roundOff: number;
    total: number;
    cost: number;
  };
  lines: QuotationLineView[];
  history: { revision: number; date: string; total: number; note: string }[];
  /** The live invoice it was converted to. */
  invoice: { id: string; number: string } | null;
}
