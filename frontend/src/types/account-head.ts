// An expense or income head as the backend returns it (backend/src/account-heads).
export interface AccountHeadView {
  id: string;
  /** The Tally ledger name. */
  name: string;
  nature: "DIRECT_EXPENSE" | "INDIRECT_EXPENSE" | "DIRECT_INCOME" | "INDIRECT_INCOME";
  /** "Direct Expenses", "Indirect Expenses", "Direct Incomes" or "Indirect Incomes". */
  tallyGroup: string;
  /** Expense heads only. */
  gst: "FOLLOWS_BILL" | "OWN_RATE" | "NONE" | null;
  /** OWN_RATE only. */
  gstRatePct: number | null;
  /** Expense heads only. */
  allocation: "ITEM_COST" | "INVOICE" | "SHIPMENT" | "OVERHEAD" | null;
  notes: string | null;
  isArchived: boolean;
}
