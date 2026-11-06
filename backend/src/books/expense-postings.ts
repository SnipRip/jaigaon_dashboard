// What a live expense puts in the books (agent/accounts-plan.md, "What each
// document posts"):
//   Paid:      Payment voucher   Dr its head (the cost), Dr Input CGST + SGST /
//                                IGST (claimable GST)        Cr bank / cash (total)
//   On credit: Purchase voucher  the same debits             Cr vendor (total)
// GST that cannot be claimed (s.17(5)) is in the cost, so it lands on the
// head. An expense on a purchase's items also enters closing stock
// (closing-stock.ts), as a freight bill added to the purchase does. Pure.
import type { Posting } from './statements.js';
import type { SystemLedgers } from './system-ledgers.js';
import { voucher, type LedgerRef } from './voucher-lines.js';

export interface PostedExpense {
  cgst: number;
  sgst: number;
  igst: number;
  itcEligible: boolean;
  total: number;
  cost: number;
}

/** `creditTo` is the bank or cash account it was paid from, or the vendor it is owed to. */
export function expensePostings(expense: PostedExpense, head: LedgerRef, creditTo: LedgerRef, ledgers: SystemLedgers): Posting[] {
  const claim = expense.itcEligible ? 1 : 0;
  return voucher(
    [head, expense.cost],
    [ledgers('INPUT_CGST'), claim * expense.cgst],
    [ledgers('INPUT_SGST'), claim * expense.sgst],
    [ledgers('INPUT_IGST'), claim * expense.igst],
    [creditTo, -expense.total],
  );
}

/** Tally's voucher type for an expense. */
export const expenseVoucherType = (paid: boolean) => (paid ? 'Payment' : 'Purchase');
