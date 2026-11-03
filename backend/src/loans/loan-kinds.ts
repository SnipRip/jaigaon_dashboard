// What each kind of loan is in Tally, and which entries and vouchers fit it
// (agent/accounts-plan.md, "Every kind of loan").
import { HEAD_GROUPS } from '../account-heads/account-head-rules.js';
import {
  DEFAULT_INTEREST_LEDGER,
  DEFAULT_INTEREST_RECEIVED_LEDGER,
  DEFAULT_TDS_PAYABLE_LEDGER,
  DEFAULT_TDS_RECEIVABLE_LEDGER,
  type TallyGroupName,
} from '../common/tally/tally-groups.js';
import type {
  HeadNature,
  InterestFrequency,
  LoanDirection,
  LoanEntryKind,
  LoanKind,
  LoanRepayment,
  NumberedKind,
} from '../generated/prisma/enums.js';

export interface LedgerRef {
  ledger: string;
  /** A Tally group, or a sub-group the user made under one. */
  group: string;
}

/** A general ledger a loan points at, with its group. */
export interface LinkedLedger {
  name: string;
  group: { name: string } | null;
}

const refOf = (ledger: LinkedLedger, fallback: TallyGroupName): LedgerRef => ({ ledger: ledger.name, group: ledger.group?.name ?? fallback });

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

/** The head a loan's interest posts to: an expense head (taken) or an income head (given). */
export interface InterestHead {
  name: string;
  nature: HeadNature;
  isArchived: boolean;
}

/** Interest paid is an expense, interest received an income: the loan's head, else the direction's default ledger. */
export const interestLedger = (loan: { direction: LoanDirection; interestHead: InterestHead | null }): LedgerRef => {
  if (loan.interestHead) return { ledger: loan.interestHead.name, group: HEAD_GROUPS[loan.interestHead.nature] };
  return loan.direction === 'TAKEN'
    ? { ledger: DEFAULT_INTEREST_LEDGER, group: 'Indirect Expenses' }
    : { ledger: DEFAULT_INTEREST_RECEIVED_LEDGER, group: 'Indirect Incomes' };
};

/** TDS we deduct is a duty we owe; TDS a borrower deducts is ours to claim. */
export const tdsLedger = (loan: { direction: LoanDirection; tdsLedger: LinkedLedger | null }): LedgerRef =>
  loan.direction === 'TAKEN'
    ? loan.tdsLedger
      ? refOf(loan.tdsLedger, 'Duties & Taxes')
      : { ledger: DEFAULT_TDS_PAYABLE_LEDGER, group: 'Duties & Taxes' }
    : loan.tdsLedger
      ? refOf(loan.tdsLedger, 'Loans & Advances (Asset)')
      : { ledger: DEFAULT_TDS_RECEIVABLE_LEDGER, group: 'Loans & Advances (Asset)' };

/** The Fixed Assets ledger a loan paid the seller for. */
export const assetLedger = (ledger: LinkedLedger): LedgerRef => refOf(ledger, 'Fixed Assets');

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
