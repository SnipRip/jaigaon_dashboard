// The Tally vouchers a loan produces, so the accountant can see each entry
// before the sync exists (agent/accounts-plan.md, "Entries"). Debits equal
// credits in every voucher.
import { BANK_CHARGES_LEDGER } from '../common/tally/tally-groups.js';
import type { LoanDirection, LoanDisbursal, LoanEntryKind } from '../generated/prisma/enums.js';
import { voucherTypeOf, type LedgerRef, type VoucherType } from './loan-kinds.js';
import { round2 } from './loan-schedule.js';

export interface VoucherLine extends LedgerRef {
  debit: number;
  credit: number;
}

export interface Voucher {
  /** Tally voucher type, or "Opening balance" for a loan already running. */
  type: VoucherType | 'Opening balance';
  date: string;
  number: string | null;
  lines: VoucherLine[];
}

const debit = (ref: LedgerRef, amount: number): VoucherLine => ({ ...ref, debit: round2(amount), credit: 0 });
const credit = (ref: LedgerRef, amount: number): VoucherLine => ({ ...ref, debit: 0, credit: round2(amount) });
const nonZero = (lines: VoucherLine[]) => lines.filter((line) => line.debit > 0 || line.credit > 0);

/** The loan's first entry: its opening balance, or the voucher that moved the money. */
export function firstEntry(loan: {
  direction: LoanDirection;
  disbursal: LoanDisbursal;
  disbursedOn: string;
  principal: number;
  openingOutstanding: number | null;
  loanLedger: LedgerRef;
  /** The bank the money went through (THROUGH_BANK) or the asset it paid for (PAID_TO_SELLER). */
  counterpart: LedgerRef | null;
}): Voucher {
  const taken = loan.direction === 'TAKEN';
  if (loan.disbursal === 'BEFORE_BOOKS' || !loan.counterpart) {
    const owed = loan.openingOutstanding ?? loan.principal;
    return {
      type: 'Opening balance',
      date: loan.disbursedOn,
      number: null,
      lines: [taken ? credit(loan.loanLedger, owed) : debit(loan.loanLedger, owed)],
    };
  }
  const [from, to] = taken ? [loan.counterpart, loan.loanLedger] : [loan.loanLedger, loan.counterpart];
  return {
    type: loan.disbursal === 'PAID_TO_SELLER' ? 'Journal' : taken ? 'Receipt' : 'Payment',
    date: loan.disbursedOn,
    number: null,
    lines: [debit(from, loan.principal), credit(to, loan.principal)],
  };
}

export interface EntryAmounts {
  principal: number;
  interest: number;
  tds: number;
  charges: number;
}

/** One entry's voucher. TDS goes with the interest; the bank side is what actually moved. */
export function entryVoucher(entry: EntryAmounts & {
  direction: LoanDirection;
  kind: LoanEntryKind;
  date: string;
  voucherNumber: string;
  loanLedger: LedgerRef;
  interestLedger: LedgerRef;
  tdsLedger: LedgerRef;
  /** Null for interest added to the loan. */
  bank: LedgerRef | null;
}): Voucher {
  const { principal: p, interest: i, tds: t, charges: c, loanLedger, interestLedger, tdsLedger, bank } = entry;
  const charges = { ledger: BANK_CHARGES_LEDGER, group: 'Indirect Expenses' } as const;
  let lines: VoucherLine[];
  if (entry.kind === 'INTEREST_ADDED') {
    lines =
      entry.direction === 'TAKEN'
        ? [debit(interestLedger, i), credit(tdsLedger, t), credit(loanLedger, i - t)]
        : [debit(loanLedger, i), credit(interestLedger, i)];
  } else if (entry.kind === 'DRAWDOWN') {
    lines = entry.direction === 'TAKEN' ? [debit(bank!, p), credit(loanLedger, p)] : [debit(loanLedger, p), credit(bank!, p)];
  } else if (entry.direction === 'TAKEN') {
    lines = [debit(loanLedger, p), debit(interestLedger, i), debit(charges, c), credit(tdsLedger, t), credit(bank!, p + i + c - t)];
  } else {
    lines = [debit(bank!, p + i - t), debit(tdsLedger, t), credit(loanLedger, p), credit(interestLedger, i)];
  }
  return { type: voucherTypeOf(entry.direction, entry.kind), date: entry.date, number: entry.voucherNumber, lines: nonZero(lines) };
}
