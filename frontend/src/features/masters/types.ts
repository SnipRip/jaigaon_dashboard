// Shapes of the smaller masters (masters-plan.md, sections A, C, F). Each is
// edited through RecordMaster. Brands, units and godowns are saved through
// the backend (masters-api.ts); the rest are still sample data.
import type { MasterRecord } from "./record-master";

export interface Brand extends MasterRecord {
  name: string;
  /** Category id the brand mostly sells in. */
  categoryId?: string;
  authorised: boolean;
  notes?: string;
  /** Items carrying the brand. */
  itemCount?: number;
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
  /** Items with this as their own base unit. */
  itemCount?: number;
}

export interface Godown extends MasterRecord {
  name: string;
  address: string;
  kind: "store" | "yard" | "site";
  isDefault: boolean;
  inCharge?: string;
  phone?: string;
}

export type MoneyAccountKind = "bank" | "overdraft" | "cash";

export interface MoneyAccount extends MasterRecord {
  name: string;
  /** Overdraft covers cash credit too: the only kind that may open below zero. */
  kind: MoneyAccountKind;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  upiId?: string;
  /** Negative: overdraft already drawn. */
  openingBalance: number;
  /** YYYY-MM-DD the opening balance is as of. */
  openingDate: string;
  /** The one account whose bank details print on invoices for payment. */
  showOnInvoice: boolean;
  /** Blank: the Tally ledger carries the account name. */
  tallyLedgerName?: string;
  /** Tally group the ledger goes under (from the backend). */
  tallyGroup?: string;
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
