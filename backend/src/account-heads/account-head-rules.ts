// How an expense or income head's fields fit together. The CHECK constraints
// in migration 20261103072017_account_heads hold the same rules.
import {
  BANK_CHARGES_LEDGER,
  DEFAULT_INTEREST_LEDGER,
  DEFAULT_INTEREST_RECEIVED_LEDGER,
  TALLY_GROUPS,
  type TallyGroupName,
} from '../common/tally/tally-groups.js';
import { HeadAllocation, HeadGst, HeadNature } from '../generated/prisma/enums.js';

/** Tally group each nature's ledger sits under: the user picks the nature, never the group. */
export const HEAD_GROUPS: Record<HeadNature, TallyGroupName> = {
  DIRECT_EXPENSE: 'Direct Expenses',
  INDIRECT_EXPENSE: 'Indirect Expenses',
  DIRECT_INCOME: 'Direct Incomes',
  INDIRECT_INCOME: 'Indirect Incomes',
};

/** GST slabs a head with its own rate may carry. */
export const HEAD_GST_RATES = [5, 12, 18, 28, 40];

/** Ledgers loan entries post to whether or not a loan names them (loans/loan-kinds.ts). */
export const LOAN_LEDGERS = [DEFAULT_INTEREST_LEDGER, BANK_CHARGES_LEDGER, DEFAULT_INTEREST_RECEIVED_LEDGER];

export const isExpense = (nature: HeadNature) => TALLY_GROUPS[HEAD_GROUPS[nature]].nature === 'Expense';

/** The fields the rules look at, after an update is merged onto the stored head. */
export interface HeadFacts {
  nature: HeadNature;
  gst: HeadGst | null;
  gstRatePct: number | null;
  allocation: HeadAllocation | null;
}

/**
 * Applies what a change implies: an income head drops the expense fields,
 * and a head that no longer has its own GST rate drops the rate, unless the
 * change sent them (then the rules refuse them).
 */
export function settleHead<T extends HeadFacts>(stored: T, changes: Partial<T>): T {
  const head: T = { ...stored, ...changes };
  if (!isExpense(head.nature)) {
    if (changes.gst === undefined) head.gst = null;
    if (changes.allocation === undefined) head.allocation = null;
  }
  if (head.gst !== HeadGst.OWN_RATE && changes.gstRatePct === undefined) head.gstRatePct = null;
  return head;
}

/** Null when the head is consistent, otherwise the first problem found. */
export function headProblem(head: HeadFacts): string | null {
  if (!isExpense(head.nature)) {
    return head.gst !== null || head.gstRatePct !== null || head.allocation !== null
      ? 'An income head has no GST behaviour or cost allocation'
      : null;
  }
  if (head.gst === null || head.allocation === null) {
    return 'An expense head needs its GST behaviour and where the cost lands';
  }
  if (head.gst === HeadGst.OWN_RATE) {
    if (head.gstRatePct === null || !HEAD_GST_RATES.includes(head.gstRatePct)) {
      return `Pick the head's GST rate: ${HEAD_GST_RATES.join(', ')}%`;
    }
  } else if (head.gstRatePct !== null) {
    return 'Only a head with its own GST rate carries a rate';
  }
  if (head.nature === HeadNature.INDIRECT_EXPENSE && head.allocation !== HeadAllocation.OVERHEAD) {
    return 'An indirect expense is a general overhead; make the head direct to tie it to a purchase, invoice or shipment';
  }
  return null;
}
