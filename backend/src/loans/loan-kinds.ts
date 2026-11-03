// What each kind of loan is in Tally, and which entries and vouchers fit it
// (agent/accounts-plan.md, "Every kind of loan").
import {
  DEFAULT_INTEREST_LEDGER,
  DEFAULT_INTEREST_RECEIVED_LEDGER,
  DEFAULT_TDS_PAYABLE_LEDGER,
  DEFAULT_TDS_RECEIVABLE_LEDGER,
  type TallyGroupName,
} from '../common/tally/tally-groups.js';
import type {
  InterestFrequency,
  LoanDirection,
  LoanEntryKind,
  LoanKind,
  LoanRepayment,
  NumberedKind,
} from '../generated/prisma/enums.js';

export interface LedgerRef {
  ledger: string;
  group: TallyGroupName;
}

/** Kinds that fit each direction (the Loan_direction CHECK holds the same). */
export const KINDS_BY_DIRECTION: Record<LoanDirection, LoanKind[]> = {
  TAKEN: ['VEHICLE', 'EQUIPMENT', 'PROPERTY', 'BUSINESS', 'GOLD', 'OWNER', 'OTHER'],
  GIVEN: ['BUSINESS', 'STAFF', 'DEPOSIT', 'OTHER'],
};

/** The group a loan's own ledger sits under. */
export function loanGroup(loan: { direction: LoanDirection; kind: LoanKind; isSecured: boolean }): TallyGroupName {
  if (loan.direction === 'GIVEN') return loan.kind === 'DEPOSIT' ? 'Deposits (Asset)' : 'Loans & Advances (Asset)';
  return loan.isSecured ? 'Secured Loans' : 'Unsecured Loans';
}

/** Interest paid is an expense; interest received an income. */
export const interestLedger = (loan: { direction: LoanDirection; interestLedgerName: string | null }): LedgerRef =>
  loan.direction === 'TAKEN'
    ? { ledger: loan.interestLedgerName ?? DEFAULT_INTEREST_LEDGER, group: 'Indirect Expenses' }
    : { ledger: loan.interestLedgerName ?? DEFAULT_INTEREST_RECEIVED_LEDGER, group: 'Indirect Incomes' };

/** TDS we deduct is a duty we owe; TDS a borrower deducts is ours to claim. */
export const tdsLedger = (loan: { direction: LoanDirection; tdsLedgerName: string | null }): LedgerRef =>
  loan.direction === 'TAKEN'
    ? { ledger: loan.tdsLedgerName ?? DEFAULT_TDS_PAYABLE_LEDGER, group: 'Duties & Taxes' }
    : { ledger: loan.tdsLedgerName ?? DEFAULT_TDS_RECEIVABLE_LEDGER, group: 'Loans & Advances (Asset)' };

/** Entries each repayment style takes. An EMI loan's interest entries are pre-EMI or penal interest. */
export const ENTRY_KINDS: Record<LoanRepayment, LoanEntryKind[]> = {
  EMI: ['EMI', 'PRINCIPAL', 'INTEREST'],
  FLEXIBLE: ['PRINCIPAL', 'INTEREST', 'INTEREST_ADDED', 'DRAWDOWN'],
};

export type VoucherType = 'Payment' | 'Receipt' | 'Journal';

/** Money out is a Payment, money in a Receipt; interest added to the loan moves no money. */
export function voucherTypeOf(direction: LoanDirection, kind: LoanEntryKind): VoucherType {
  if (kind === 'INTEREST_ADDED') return 'Journal';
  const moneyOut = kind === 'DRAWDOWN' ? direction === 'GIVEN' : direction === 'TAKEN';
  return moneyOut ? 'Payment' : 'Receipt';
}

/** The number series each voucher type is numbered from. */
export const SERIES_OF: Record<VoucherType, NumberedKind> = {
  Payment: 'PAYMENT',
  Receipt: 'RECEIPT',
  Journal: 'JOURNAL',
};

export const FREQUENCY_MONTHS: Record<Exclude<InterestFrequency, 'AT_MATURITY'>, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};
