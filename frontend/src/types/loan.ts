// Loans as the backend returns them (backend/src/loans/loan-view.ts).
export type LoanDirection = "TAKEN" | "GIVEN";
export type LoanKind = "VEHICLE" | "EQUIPMENT" | "PROPERTY" | "BUSINESS" | "GOLD" | "OWNER" | "STAFF" | "DEPOSIT" | "OTHER";
export type LoanRepayment = "EMI" | "FLEXIBLE";
export type InterestFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "AT_MATURITY";
export type LoanDisbursal = "BEFORE_BOOKS" | "THROUGH_BANK" | "PAID_TO_SELLER";
export type LoanEntryKind = "EMI" | "PRINCIPAL" | "INTEREST" | "INTEREST_ADDED" | "DRAWDOWN";
export type InstalmentStatus = "PAID_BEFORE_BOOKS" | "PAID" | "OVERDUE" | "DUE_SOON" | "UPCOMING";

export interface InstalmentView {
  no: number;
  /** An EMI, a flexible loan's interest date, or its repay-by date. */
  kind: "EMI" | "INTEREST" | "MATURITY";
  dueDate: string;
  /** Null for an EMI paid before these books. */
  amount: number | null;
  principal: number | null;
  interest: number | null;
  balance: number | null;
  status: InstalmentStatus;
  entryId: string | null;
}

export interface VoucherLineView {
  ledger: string;
  group: string;
  debit: number;
  credit: number;
}

export interface VoucherView {
  type: "Opening balance" | "Receipt" | "Journal" | "Payment";
  date: string;
  number: string | null;
  lines: VoucherLineView[];
}

export interface LoanView {
  id: string;
  name: string;
  direction: LoanDirection;
  kind: LoanKind;
  repayment: LoanRepayment;
  /** The lender (taken) or the borrower (given). */
  partyName: string;
  loanAccountNumber: string | null;
  isSecured: boolean;
  security: string | null;
  principal: number;
  interestRatePct: number;
  disbursedOn: string;
  disbursal: LoanDisbursal;
  disbursalAccountId: string | null;
  assetLedgerName: string | null;
  paidBefore: number;
  openingOutstanding: number | null;
  tenureMonths: number | null;
  emiAmount: number | null;
  firstEmiDate: string | null;
  interestFrequency: InterestFrequency | null;
  firstInterestDate: string | null;
  maturityDate: string | null;
  repaymentAccountId: string;
  repaymentAccountName: string;
  interestLedgerName: string | null;
  tdsRatePct: number | null;
  tdsLedgerName: string | null;
  reminderDays: number;
  notes: string | null;
  isArchived: boolean;
  tallyGroup: string;
  outstanding: number;
  principalRepaid: number;
  interestTotal: number;
  nextDue: InstalmentView | null;
  overdueCount: number;
  status: "ACTIVE" | "CLOSED";
}

export interface LoanEntryView {
  id: string;
  kind: LoanEntryKind;
  instalmentNo: number | null;
  entryDate: string;
  principal: number;
  interest: number;
  tds: number;
  charges: number;
  bankAccountId: string | null;
  bankAccountName: string | null;
  reference: string | null;
  voucherNumber: string;
  cancelledAt: string | null;
  voucher: VoucherView;
}

export interface LoanDetailView extends LoanView {
  schedule: InstalmentView[];
  entries: LoanEntryView[];
  firstEntry: VoucherView;
}

export interface LoanReminderView {
  loanId: string;
  loanName: string;
  partyName: string;
  direction: LoanDirection;
  instalmentNo: number;
  kind: InstalmentView["kind"];
  dueDate: string;
  amount: number;
  status: "OVERDUE" | "DUE_SOON";
  repaymentAccountName: string;
}
