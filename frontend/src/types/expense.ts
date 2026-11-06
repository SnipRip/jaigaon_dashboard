// Expenses as the backend returns them (backend/src/expenses).
import type { PaymentModeView } from "./settlement";

export type ExpenseAllocationView = "ITEM_COST" | "INVOICE" | "SHIPMENT" | "OVERHEAD";

export interface ExpenseVoucherLineView {
  ledger: string;
  group: string;
  debit: number;
  credit: number;
}

export interface ExpenseView {
  id: string;
  number: string;
  date: string;
  head: { id: string; name: string; tallyGroup: string };
  description: string;
  reference: string | null;
  vendorId: string | null;
  /** The vendor's name, or the payee typed for a cash slip. */
  payeeName: string;
  /** Null when bought on credit from the vendor. */
  accountId: string | null;
  accountName: string | null;
  mode: PaymentModeView | null;
  /** On credit: when the vendor is to be paid. */
  dueDate: string | null;
  taxSplit: "INTRA" | "INTER" | "NONE";
  amount: number;
  gstRatePct: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  itcEligible: boolean;
  total: number;
  /** What reduces profit: the amount plus GST that cannot be claimed. */
  cost: number;
  allocation: ExpenseAllocationView;
  /** The goods bill, invoice or shipment the cost lands on; null for overhead or a shipment expense not linked yet. */
  target: { kind: "BILL" | "INVOICE" | "SHIPMENT"; id: string; number: string } | null;
  settled: number;
  /** Still owed to the vendor (on credit only). */
  balance: number;
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  /** Detail only: the voucher it posts; null once cancelled. */
  voucher: { type: "Payment" | "Purchase"; lines: ExpenseVoucherLineView[] } | null;
}
