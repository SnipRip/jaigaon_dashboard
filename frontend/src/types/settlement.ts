// Receipts and payments as the backend returns them (backend/src/settlements).

export type SettlementDirectionView = "RECEIPT" | "PAYMENT";
export type PaymentModeView = "BANK_TRANSFER" | "CHEQUE" | "UPI" | "CASH";
/** What money is applied to: an invoice (receipts), a bill (payments) or the party's opening balance. */
export type SettlementTargetView = "INVOICE" | "BILL" | "OPENING";
export type AgeBucketView = "NOT_DUE" | "DAYS_1_30" | "DAYS_31_60" | "DAYS_61_90" | "OVER_90";

export interface SettlementAllocationView {
  kind: SettlementTargetView;
  /** Invoice or bill id; the party's id for an opening balance. */
  documentId: string;
  number: string;
  amount: number;
  appliedAt: string;
}

export interface SettlementView {
  id: string;
  direction: SettlementDirectionView;
  number: string;
  date: string;
  partyId: string;
  partyName: string;
  accountId: string;
  accountName: string;
  mode: PaymentModeView;
  amount: number;
  tds: number;
  reference: string | null;
  brc: { number: string; date: string } | null;
  notes: string | null;
  allocations: SettlementAllocationView[];
  applied: number;
  /** Kept as an advance; can be applied later. */
  unapplied: number;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

/** An invoice, bill or opening balance with what is settled and left; fully settled ones are included. */
export interface OpenDocumentView {
  kind: SettlementTargetView;
  id: string;
  number: string;
  /** Null for an opening balance. */
  date: string | null;
  /** MSME bills: the 45-day cap. Null for an opening balance (due already). */
  dueDate: string | null;
  partyId: string;
  partyName: string;
  total: number;
  settled: number;
  balance: number;
  ageBucket: AgeBucketView;
  flag: "EXPORT" | "MSME" | null;
}
