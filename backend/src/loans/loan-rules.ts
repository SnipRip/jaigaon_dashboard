// How a loan's fields fit together, and what an entry may be. The CHECK
// constraints in migration 20261103070000_loan_kinds hold the same rules.
import type {
  InterestFrequency,
  LoanDirection,
  LoanDisbursal,
  LoanEntryKind,
  LoanKind,
  LoanRepayment,
} from '../generated/prisma/enums.js';
import { isExpense } from '../account-heads/account-head-rules.js';
import { ENTRY_KINDS, KINDS_BY_DIRECTION, type InterestHead } from './loan-kinds.js';
import { round2 } from './loan-schedule.js';

/** The fields the rules look at, after an update is merged onto the stored loan. */
export interface LoanFacts {
  direction: LoanDirection;
  kind: LoanKind;
  repayment: LoanRepayment;
  isSecured: boolean;
  security: string | null;
  principal: number;
  interestRatePct: number;
  disbursedOn: string;
  disbursal: LoanDisbursal;
  disbursalAccountId: string | null;
  assetLedgerId: string | null;
  paidBefore: number;
  openingOutstanding: number | null;
  tenureMonths: number | null;
  emiAmount: number | null;
  firstEmiDate: string | null;
  interestFrequency: InterestFrequency | null;
  firstInterestDate: string | null;
  maturityDate: string | null;
  /** Null: the direction's default interest ledger. */
  interestHeadId?: string | null;
}

const EMI_FIELDS = ['tenureMonths', 'emiAmount', 'firstEmiDate'] as const;
const FLEXIBLE_FIELDS = ['interestFrequency', 'firstInterestDate', 'maturityDate'] as const;

/**
 * Applies what a change implies: a new disbursal kind or repayment style
 * clears the old one's fields that the change did not send, an interest-free
 * flexible loan has no interest dates, an unsecured loan has no security,
 * and a loan that changes direction goes back to that side's default
 * interest ledger unless the change names a head.
 */
export function settleLoan<T extends LoanFacts>(stored: T, changes: Partial<T>): T {
  const loan: T = { ...stored, ...changes };
  const clear = (key: keyof LoanFacts, empty: unknown) => {
    if (changes[key] === undefined) (loan as LoanFacts)[key] = empty as never;
  };
  if (changes.disbursal && changes.disbursal !== stored.disbursal) {
    if (loan.disbursal !== 'THROUGH_BANK') clear('disbursalAccountId', null);
    if (loan.disbursal !== 'PAID_TO_SELLER') clear('assetLedgerId', null);
    if (loan.disbursal !== 'BEFORE_BOOKS') {
      clear('paidBefore', 0);
      clear('openingOutstanding', null);
    }
  }
  if (changes.repayment && changes.repayment !== stored.repayment) {
    for (const key of changes.repayment === 'EMI' ? FLEXIBLE_FIELDS : EMI_FIELDS) clear(key, null);
    if (changes.repayment === 'FLEXIBLE') clear('paidBefore', 0);
  }
  if (loan.repayment === 'FLEXIBLE' && loan.interestRatePct === 0) {
    loan.interestFrequency = null;
    loan.firstInterestDate = null;
  }
  if (loan.interestFrequency === 'AT_MATURITY') loan.firstInterestDate = null;
  if (!loan.isSecured) loan.security = null;
  if (changes.direction && changes.direction !== stored.direction) clear('interestHeadId', null);
  return loan;
}

/**
 * Null when a general ledger can take this part of the loan: the asset it
 * paid for sits under Fixed Assets; TDS we deduct (taken) is a duty under
 * Duties & Taxes, TDS a borrower deducts (given) a claim under Current
 * Assets. `path` runs from the primary group down to the ledger's group.
 */
export function linkedLedgerProblem(
  use: 'asset' | 'tds',
  direction: LoanDirection,
  ledger: { name: string; isArchived: boolean; path: string[] } | null,
): string | null {
  const label = use === 'asset' ? 'Asset ledger' : 'TDS ledger';
  if (!ledger) return `${label}: pick a ledger from General ledgers`;
  if (ledger.isArchived) return `${label}: "${ledger.name}" is archived; restore it or pick another`;
  const wanted = use === 'asset' ? 'Fixed Assets' : direction === 'TAKEN' ? 'Duties & Taxes' : 'Current Assets';
  return ledger.path.includes(wanted) ? null : `${label}: "${ledger.name}" is not under ${wanted}`;
}

/**
 * Null when the head can take this loan's interest: a live expense head for
 * a loan we take (interest paid), a live income head for a loan we give
 * (interest received).
 */
export function interestHeadProblem(direction: LoanDirection, head: InterestHead | null): string | null {
  if (!head) return 'Interest ledger: pick a head from Expense & income heads';
  if (head.isArchived) return `Interest ledger: "${head.name}" is archived; restore it or pick another head`;
  const wanted = direction === 'TAKEN';
  if (isExpense(head.nature) !== wanted) {
    return wanted
      ? `Interest on a loan we take is an expense; "${head.name}" is an income head`
      : `Interest on a loan we give is an income; "${head.name}" is an expense head`;
  }
  return null;
}

/** Null when the loan is consistent, otherwise the first problem found. */
export function loanProblem(loan: LoanFacts): string | null {
  if (!KINDS_BY_DIRECTION[loan.direction].includes(loan.kind)) {
    return loan.direction === 'TAKEN' ? 'That kind is for a loan we give' : 'That kind is for a loan we take';
  }
  if (loan.direction === 'GIVEN' && loan.disbursal === 'PAID_TO_SELLER') {
    return 'A loan we give goes out through our bank, or was already running';
  }
  if (loan.maturityDate !== null && loan.maturityDate < loan.disbursedOn) {
    return 'The repay-by date cannot fall before the loan was taken';
  }

  if (loan.repayment === 'EMI') {
    if (loan.tenureMonths === null || loan.emiAmount === null || loan.firstEmiDate === null) {
      return 'An EMI loan needs its tenure, EMI and first EMI date';
    }
    if (loan.firstEmiDate < loan.disbursedOn) return 'The first EMI cannot fall before the loan was taken';
    if (loan.interestFrequency !== null || loan.firstInterestDate !== null || loan.maturityDate !== null) {
      return 'Interest dates and a repay-by date are for loans without an EMI';
    }
  } else {
    if (loan.tenureMonths !== null || loan.emiAmount !== null || loan.firstEmiDate !== null) {
      return 'A loan without an EMI has no tenure, EMI or EMI date';
    }
    if (loan.interestRatePct > 0 && loan.interestFrequency === null) return 'Pick how often interest falls due';
    if (loan.interestFrequency === 'AT_MATURITY' && loan.maturityDate === null) {
      return 'Interest due at the end needs the repay-by date';
    }
    if (loan.interestFrequency !== null && loan.interestFrequency !== 'AT_MATURITY') {
      if (loan.firstInterestDate === null) return 'Pick the first interest date';
      if (loan.firstInterestDate < loan.disbursedOn) return 'The first interest date cannot fall before the loan was taken';
    }
  }

  switch (loan.disbursal) {
    case 'BEFORE_BOOKS':
      if (loan.openingOutstanding === null) return 'Enter what was owed when these books start';
      if (loan.repayment === 'EMI') {
        if (loan.openingOutstanding > loan.principal) return 'What is still owed cannot be more than the loan amount';
        if (loan.paidBefore >= (loan.tenureMonths ?? 0)) return 'EMIs already paid must be fewer than the tenure';
      } else if (loan.paidBefore !== 0) {
        return 'EMIs already paid apply only to an EMI loan';
      }
      break;
    case 'THROUGH_BANK':
      if (!loan.disbursalAccountId) return 'Pick the bank account the money went through';
      break;
    case 'PAID_TO_SELLER':
      if (!loan.assetLedgerId) return 'Pick the asset the loan paid for (a ledger under Fixed Assets)';
      break;
  }
  if (loan.disbursal !== 'BEFORE_BOOKS' && (loan.paidBefore !== 0 || loan.openingOutstanding !== null)) {
    return 'What was owed before these books applies only to a loan already running';
  }

  if (loan.repayment === 'EMI') {
    const balance = loan.openingOutstanding ?? loan.principal;
    if ((loan.emiAmount ?? 0) <= round2((balance * loan.interestRatePct) / 1200)) {
      return 'The EMI does not cover the monthly interest';
    }
  }
  return null;
}

/** The fields of an entry the rules look at. */
export interface EntryShape {
  kind: LoanEntryKind;
  instalmentNo: number | null;
  principal: number;
  interest: number;
  tds: number;
  charges: number;
  bankAccountId: string | null;
}

/** Null when the entry fits the loan, otherwise the first problem found. */
export function entryProblem(loan: Pick<LoanFacts, 'direction' | 'repayment'>, entry: EntryShape): string | null {
  if (!ENTRY_KINDS[loan.repayment].includes(entry.kind)) {
    return loan.repayment === 'EMI'
      ? 'An EMI loan takes EMIs, principal and interest entries'
      : 'A loan without an EMI takes principal, interest and drawdown entries';
  }
  if (entry.tds > entry.interest) return 'TDS cannot be more than the interest';
  if (entry.charges > 0 && loan.direction === 'GIVEN') return 'Bank charges apply only to a loan we take';
  if (round2(entry.principal + entry.interest + entry.charges) <= 0) return 'Enter the amount';
  switch (entry.kind) {
    case 'EMI':
      if (entry.instalmentNo === null) return 'Pick the EMI this pays';
      break;
    case 'PRINCIPAL':
    case 'DRAWDOWN':
      if (entry.principal <= 0) return 'Enter the principal';
      if (entry.interest > 0 || entry.tds > 0) return 'A principal entry has no interest; record interest on its own';
      if (entry.instalmentNo !== null) return 'A principal entry does not settle a scheduled row';
      if (entry.kind === 'DRAWDOWN' && entry.charges > 0) return 'Charges go on a payment, not on money drawn';
      break;
    case 'INTEREST':
    case 'INTEREST_ADDED':
      if (entry.interest <= 0) return 'Enter the interest';
      if (entry.principal > 0) return 'An interest entry has no principal';
      if (loan.repayment === 'EMI' && entry.instalmentNo !== null) {
        return 'Interest on an EMI loan (pre-EMI or penal) does not settle an EMI';
      }
      if (entry.kind === 'INTEREST_ADDED') {
        if (entry.charges > 0) return 'Charges go on a payment, not on interest added';
        if (loan.direction === 'GIVEN' && entry.tds > 0) {
          return 'TDS on interest we earn is deducted by the borrower when they pay';
        }
      }
      break;
  }
  if (entry.kind === 'INTEREST_ADDED' ? entry.bankAccountId !== null : entry.bankAccountId === null) {
    return entry.kind === 'INTEREST_ADDED' ? 'Interest added to the loan moves no money' : 'Pick the bank or cash account';
  }
  return null;
}
