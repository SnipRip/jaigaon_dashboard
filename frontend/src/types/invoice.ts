// Sales invoices as the backend returns them (backend/src/invoices).
import type { LineRateSourceView, SaleRegimeView } from "./quotation";
import type { AppliedSchemeView } from "./scheme";
import type { StockDrawView } from "./stock-moves";

export type InvoiceKindView = "LOCAL" | "EXPORT";
export type InvoiceStatusView = "ISSUED" | "CANCELLED";

/** One FIFO slice of a line's goods, with where it came from (a bill, a transfer in, an adjustment, the opening stock). */
export type InvoiceDrawView = StockDrawView;

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

export type DispatchDocumentKindView =
  | "E_INVOICE"
  | "LORRY_CHALLAN"
  | "EWAY_BILL"
  | "CUSTOMS_INVOICE"
  | "PACKING_LIST"
  | "SHIPPING_BILL"
  | "LEO"
  | "BRC";

/** One attached dispatch document; amounts and weights in `details` are numbers. */
export interface InvoiceDocumentView {
  kind: DispatchDocumentKindView;
  number: string;
  date: string;
  details: Record<string, string | number>;
  updatedAt: string;
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
  /** Picked from the vehicle master; null when typed. */
  vehicleId: string | null;
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
    /** Live receipts (and TDS) applied so far. */
    received: number;
    cost: number;
  };
  lines: InvoiceLineView[];
  /** In the order they happen. */
  documents: InvoiceDocumentView[];
  cancelledAt: string | null;
  cancelReason: string | null;
}
