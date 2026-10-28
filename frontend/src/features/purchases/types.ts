// Vendor bills, after Zoho Books (India). Two kinds: a goods bill brings
// stock in; a charges bill is freight, loading, unloading or labour, which
// can be tagged to a goods bill so its cost lands on those items.
import type { InvoiceLine } from "@/features/invoices/types";

export type BillKind = "goods" | "charges";

export type ChargeHead = "freight" | "loading" | "unloading" | "labour" | "other";

/** Zoho's per-line "ITC eligibility". Ineligible GST (Section 17(5)) becomes cost. */
export type ItcEligibility = "eligible" | "ineligible";

/** A goods line. Same shape as an invoice line: HSN, unit and GST come from the item. */
export interface BillLine extends InvoiceLine {
  itc: ItcEligibility;
}

export interface BillCharge {
  head: ChargeHead;
  description?: string;
  /** Before GST. */
  amount: number;
  /**
   * Charges bills: the rate printed on the vendor's bill. On a goods bill the
   * charge always takes the bill's own rate, so this is left out.
   */
  gstRatePct?: number;
}

/** How tagged charges spread over a goods bill's items. */
export type LandedCostMethod = "value" | "quantity" | "weight";

export interface EwayBillRecord {
  /** 12 digits. */
  number: string;
  date: string;
  vehicleNumber?: string;
}

export interface Bill {
  id: string;
  kind: BillKind;
  /** Our own series, PUR/2627/0001. */
  reference: string;
  /** As printed on the vendor's bill. */
  vendorBillNumber: string;
  date: string;
  dueDate: string;
  status: "draft" | "open" | "void";
  vendorId: string;
  /** GST state the goods or service come from. Usually the vendor's state. */
  sourceOfSupply?: string;
  lines: BillLine[];
  /** Goods bills: charges printed on the same bill. Charges bills: the bill itself. */
  charges: BillCharge[];
  ewayBill?: EwayBillRecord;
  /** Charges bills: the goods bill whose items carry this cost. */
  landedCostFor?: string;
  /** Goods bills. */
  allocation: LandedCostMethod;
  /** Paid so far. Payments are recorded on Payments & outstanding, not built yet. */
  paid: number;
  /** Name of the uploaded scan, once file storage exists. */
  fileName?: string;
  notes?: string;
}
