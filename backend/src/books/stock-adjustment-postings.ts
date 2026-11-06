// What a stock adjustment puts in the books, as Tally books it. Stock taken
// out (damaged, lost, used up, short on a count) is a loss at what it cost:
//   Dr Stock Written Off (Indirect Expenses)   Cr Stock Adjustment (Purchase Accounts)
// Stock added (found, more on a count) is a gain at the cost entered:
//   Dr Stock Adjustment                        Cr Stock Excess Found (Indirect Incomes)
// Closing stock falls or rises by the same amount, so gross profit stays as
// it was (the Stock Adjustment ledger and closing stock cancel out in the
// trading account) and the loss or gain lands in net profit. Transfers move
// stock between godowns at cost and post nothing. Pure.
import type { Posting } from './statements.js';
import { SEEDED_NAMES } from './system-ledgers.js';

export interface PostedAdjustment {
  direction: 'IN' | 'OUT';
  value: number;
}

/** The ledger names, looked up by system role so a renamed group still works. */
export interface StockLedgerNames {
  writeOff: string;
  found: string;
  adjustment: string;
}

export const DEFAULT_STOCK_LEDGERS: StockLedgerNames = {
  writeOff: SEEDED_NAMES.STOCK_WRITE_OFF,
  found: SEEDED_NAMES.STOCK_FOUND,
  adjustment: SEEDED_NAMES.STOCK_ADJUSTMENT,
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The journal lines of every adjustment, and how far closing stock moves (added less written off). */
export function stockAdjustmentPostings(adjustments: PostedAdjustment[], names: StockLedgerNames): { postings: Posting[]; closingChange: number } {
  const postings: Posting[] = [];
  let closingChange = 0;
  for (const { direction, value } of adjustments) {
    if (value <= 0) continue;
    if (direction === 'OUT') {
      postings.push(
        { ledger: names.writeOff, group: 'Indirect Expenses', debit: value, credit: 0 },
        { ledger: names.adjustment, group: 'Purchase Accounts', debit: 0, credit: value },
      );
      closingChange -= value;
    } else {
      postings.push(
        { ledger: names.adjustment, group: 'Purchase Accounts', debit: value, credit: 0 },
        { ledger: names.found, group: 'Indirect Incomes', debit: 0, credit: value },
      );
      closingChange += value;
    }
  }
  return { postings, closingChange: round2(closingChange) };
}
