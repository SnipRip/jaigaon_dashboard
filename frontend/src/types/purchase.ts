// Purchase orders and vendor bills as the backend returns them (backend/src/purchases).

export type LandedCostMethodView = "VALUE" | "QUANTITY" | "WEIGHT";
export type PurchaseRegimeView = "INTRA_STATE" | "INTER_STATE" | "NO_GST" | "REVERSE_CHARGE" | "IMPORT";

export interface PurchaseBillLineView {
  id: string;
  itemId: string;
  orderLineId: string | null;
  description: string;
  hsn: string;
  unit: string;
  quantity: number;
  rate: number;
  discountPct: number;
  gstRatePct: number;
  itcEligible: boolean;
  taxable: number;
  tax: number;
  ownCost: number;
  landedShare: number;
  landedCost: number;
  /** Per base unit, to 4 decimals: what stock from this line is valued at. */
  landedRate: number;
  /** Still in stock from this line; null once the bill is void. */
  remaining: number | null;
}

export interface PurchaseBillView {
  id: string;
  kind: "GOODS" | "CHARGES";
  reference: string;
  vendorBillNumber: string;
  date: string;
  dueDate: string;
  vendorId: string;
  vendorName: string;
  sourceOfSupply: string | null;
  regime: PurchaseRegimeView;
  godownId: string | null;
  godownName: string | null;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  allocation: LandedCostMethodView;
  landedCostForId: string | null;
  landedCostForReference: string | null;
  taggedCharges: { id: string; reference: string; cost: number }[];
  ewayBillNumber: string | null;
  ewayBillDate: string | null;
  vehicleNumber: string | null;
  notes: string | null;
  status: "OPEN" | "VOID";
  totals: {
    goodsValue: number;
    chargesValue: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    tax: number;
    itcClaimable: number;
    itcLost: number;
    roundOff: number;
    payable: number;
    cost: number;
    /** Live payments (and TDS) applied so far. */
    paid: number;
  };
  lines: PurchaseBillLineView[];
  charges: { id: string; headId: string; headName: string; description: string | null; amount: number; gstRatePct: number; tax: number }[];
}

export interface PurchaseOrderLineView {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  rate: number;
  discountPct: number;
  gstRatePct: number;
  received: number;
  pending: number;
}

export interface PurchaseOrderView {
  id: string;
  number: string;
  date: string;
  expectedDate: string | null;
  vendorId: string;
  vendorName: string;
  godownId: string;
  godownName: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  receipt: "NOT_RECEIVED" | "PARTLY_RECEIVED" | "RECEIVED";
  terms: string | null;
  notes: string | null;
  lines: PurchaseOrderLineView[];
  bills: { id: string; reference: string; date: string }[];
  totals: { taxable: number; tax: number; total: number };
}

export interface LastPurchaseRateView {
  itemId: string;
  rate: number;
  date: string;
  vendorName: string;
  fromThisVendor: boolean;
}
