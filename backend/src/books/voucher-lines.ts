// Builds voucher lines from signed amounts (debit positive), as every
// document's postings do. Pure.
import { round2 } from '../loans/loan-schedule.js';
import type { Posting } from './statements.js';

export interface LedgerRef {
  ledger: string;
  group: string;
}

/** One line: a positive amount is a debit, a negative one a credit. */
export const lineOf = (target: LedgerRef, amount: number): Posting => {
  const value = round2(amount);
  return { ledger: target.ledger, group: target.group, debit: value > 0 ? value : 0, credit: value < 0 ? -value : 0 };
};

/** The lines of one voucher, leaving out ledgers it does not touch. */
export const voucher = (...entries: [LedgerRef, number][]): Posting[] =>
  entries.filter(([, amount]) => round2(amount) !== 0).map(([target, amount]) => lineOf(target, amount));

/** Debits less credits: 0 for a voucher that balances. */
export const imbalance = (lines: Posting[]) => round2(lines.reduce((sum, line) => sum + line.debit - line.credit, 0));
