// Sales invoices as the backend returns them (backend/src/invoices).
import type { LineRateSourceView, SaleRegimeView } from "./quotation";
import type { AppliedSchemeView } from "./scheme";

export type InvoiceKindView = "LOCAL" | "EXPORT";
export type InvoiceStatusView = "ISSUED" | "CANCELLED";

/** One FIFO slice of a line's goods: a bill batch, or the opening stock (no bill). */
export interface InvoiceDrawView {
  quantity: number;
  rate: number;
  billId: string | null;
  billReference: string | null;
  batchDate: string | null;
}

export interface InvoiceLineView {
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
  /** What the goods sent out (free units too) cost, from the draws. */
  costOfGoods: number;
  /** Oldest first; empty once the invoice is cancelled. */
  draws: InvoiceDrawView[];
}

export interface InvoiceView {
  id: string;
  kind: InvoiceKindView;
  number: string;
  date: string;
  partyId: string;
  partyName: string;
  godownId: string;
  godownName: string;
  status: InvoiceStatusView;
  regime: SaleRegimeView;
  placeOfSupply: string | null;
  lutArn: string | null;
  destinationCountry: string | null;
  currency: "INR" | "BTN";
  shipToLine: string | null;
  shipToCity: string | null;
  vehicleNumber: string | null;
  notes: string | null;
  quotation: { id: string; label: string } | null;
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
  lines: InvoiceLineView[];
  cancelledAt: string | null;
  cancelReason: string | null;
}
