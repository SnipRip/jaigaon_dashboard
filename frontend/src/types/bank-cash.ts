// A bank or cash account as the backend returns it (backend/src/bank-cash-accounts).
export interface BankCashAccountView {
  id: string;
  name: string;
  kind: "BANK" | "OVERDRAFT" | "CASH";
  bankName: string | null;
  branch: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  upiId: string | null;
  openingBalance: number;
  openingDate: string;
  showOnInvoice: boolean;
  /** Null: the Tally ledger carries the account name. */
  tallyLedgerName: string | null;
  /** "Bank Accounts", "Bank OD A/c" or "Cash-in-Hand". */
  tallyGroup: string;
  isArchived: boolean;
}
