// Shapes of the smaller masters (masters-plan.md, sections A, C, F). Each is
// edited through RecordMaster; the backend will own them later.
import type { MasterRecord } from "./record-master";

export interface Brand extends MasterRecord {
  name: string;
  /** Category id the brand mostly sells in. */
  categoryId?: string;
  authorised: boolean;
  notes?: string;
}

export type UnitKind = "count" | "weight" | "volume" | "length" | "area";

export interface Unit extends MasterRecord {
  /** As printed on documents: kg, pcs, bag. */
  symbol: string;
  name: string;
  kind: UnitKind;
  /** Decimals allowed in quantities. */
  decimals: number;
  /** The unit code e-way bills and e-invoices use (UQC). */
  uqc: string;
}

export interface Godown extends MasterRecord {
  name: string;
  address: string;
  kind: "store" | "yard" | "site";
  isDefault: boolean;
  inCharge?: string;
  phone?: string;
}

export interface MoneyAccount extends MasterRecord {
  name: string;
  kind: "bank" | "cash";
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  openingBalance: number;
  /** Sample running balance until postings exist. */
  balance: number;
  /** Bank details printed on invoices for payment. */
  onInvoice: boolean;
}

export interface Transporter extends MasterRecord {
  name: string;
  /** GSTIN, or the 15-character TRANSIN for an unregistered transporter: goes on the e-way bill. */
  transporterId: string;
  phone?: string;
  /** Bills as a goods transport agency: freight under reverse charge. */
  isGta: boolean;
  /** The vendor record its bills are entered against. */
  vendorId?: string;
  notes?: string;
}

export interface Vehicle extends MasterRecord {
  number: string;
  type: "truck-10" | "truck-6" | "trailer" | "pickup";
  capacityTons: number;
  ownership: "own" | "hired";
  transporterId?: string;
  driverName?: string;
  driverPhone?: string;
}

export type SeriesDocument =
  | "quotation"
  | "invoice"
  | "export-invoice"
  | "bill"
  | "receipt"
  | "payment"
  | "credit-note"
  | "debit-note"
  | "shipment"
  | "expense"
  | "stock-journal";

export interface NumberSeries extends MasterRecord {
  document: SeriesDocument;
  prefix: string;
  financialYear: string;
  nextNumber: number;
  /** Digits the number is padded to. */
  padding: number;
}

export interface ExpenseHead extends MasterRecord {
  name: string;
  kind: "direct" | "indirect";
  /** follows-bill: takes the goods bill's rate; own-rate: the rate below; none: no GST. */
  gst: "follows-bill" | "own-rate" | "none";
  gstRatePct?: number;
  /** Where the cost lands for actual profit (SOW 14). */
  allocation: "item-cost" | "invoice" | "shipment" | "overhead";
  notes?: string;
}
