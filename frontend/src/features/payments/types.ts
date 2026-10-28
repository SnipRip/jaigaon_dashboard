// Money in from customers (receipts) and money out to vendors (payments),
// each applied to one or more invoices or bills (SOW 16), Zoho-style.

export type PaymentMode = "bank-transfer" | "cheque" | "upi" | "cash";

export interface Allocation {
  /** Invoice id for a receipt, bill id for a payment. */
  documentId: string;
  amount: number;
}

export interface Settlement {
  id: string;
  direction: "in" | "out";
  /** RCT/2627/0031 or PAY/2627/0024 */
  number: string;
  date: string;
  partyId: string;
  amount: number;
  mode: PaymentMode;
  accountId: string;
  /** UTR, cheque or UPI reference. */
  reference?: string;
  allocations: Allocation[];
  /** Receipts against export invoices: the bank's realisation certificate. */
  brc?: { number: string; date: string };
  /** TDS the customer deducted, or we deducted from the vendor. */
  tds?: number;
  notes?: string;
}

/** An invoice or bill with money still to come in or go out. */
export interface OpenDocument {
  id: string;
  direction: "in" | "out";
  number: string;
  date: string;
  dueDate: string;
  partyId: string;
  total: number;
  settled: number;
  balance: number;
  href: string;
  /** Export invoice (BRC needed) or MSME vendor bill (45-day rule). */
  flag?: "export" | "msme";
}
