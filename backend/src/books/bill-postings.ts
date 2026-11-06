// What an open vendor bill puts in the books: a Purchase voucher, as Tally
// books it (agent/accounts-plan.md, "What each document posts").
//   Goods bill:   Dr Purchase - GST Local (our state) or Interstate (other
//                 state, import) with the goods we claim GST on; Dr Purchase -
//                 No Input Credit with goods whose GST is cost (17(5),
//                 composition, unregistered), their GST included; Dr each
//                 freight or loading charge's head; Dr Input CGST + SGST /
//                 IGST (the claimable part)          Cr vendor
//   Charges bill: Dr each charge's head, Dr Input GST    Cr vendor
//   GTA freight (reverse charge): the vendor is owed the value only, and
//                 the GST is ours to pay: Cr CGST + SGST / IGST Payable on RCM.
// Rounding goes to Round Off (a debit when we pay a little more). What the
// goods cost enters closing stock (closing-stock.ts). Pure.
import type { PurchaseRegime } from '../generated/prisma/enums.js';
import { round2 } from '../loans/loan-schedule.js';
import type { Posting } from './statements.js';
import type { SystemLedgers } from './system-ledgers.js';
import { voucher, type LedgerRef } from './voucher-lines.js';

export interface PostedBill {
  regime: PurchaseRegime;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  itcClaimable: number;
  roundOff: number;
  payable: number;
  lines: { taxable: number; ownCost: number; itcEligible: boolean }[];
  /** Freight and loading on a goods bill, or a charges bill's charges, each under its head's ledger. */
  charges: { head: LedgerRef; amount: number }[];
}

/** The claimable GST by component; with part of it lost (17(5) lines), each component in proportion. */
function inputTax(bill: PostedBill): { cgst: number; sgst: number; igst: number } {
  if (bill.itcClaimable >= bill.tax) return { cgst: bill.cgst, sgst: bill.sgst, igst: bill.igst };
  if (bill.itcClaimable <= 0 || bill.tax <= 0) return { cgst: 0, sgst: 0, igst: 0 };
  const share = bill.itcClaimable / bill.tax;
  const cgst = round2(bill.cgst * share);
  const sgst = round2(bill.sgst * share);
  return { cgst, sgst, igst: round2(bill.itcClaimable - cgst - sgst) };
}

export function billPostings(bill: PostedBill, vendor: LedgerRef, ledgers: SystemLedgers): Posting[] {
  const claimed = bill.lines.filter((line) => line.itcEligible).reduce((sum, line) => sum + line.taxable, 0);
  const notClaimed = bill.lines.filter((line) => !line.itcEligible).reduce((sum, line) => sum + line.ownCost, 0);
  const purchase = ledgers(bill.regime === 'INTRA_STATE' ? 'PURCHASE_LOCAL' : 'PURCHASE_INTERSTATE');
  const input = inputTax(bill);
  const reverseCharge = bill.regime === 'REVERSE_CHARGE';

  // Several charges may share a head: one line per head.
  const byHead = new Map<string, [LedgerRef, number]>();
  for (const charge of bill.charges) {
    const key = charge.head.ledger.toLowerCase();
    const entry = byHead.get(key) ?? [charge.head, 0];
    entry[1] += charge.amount;
    byHead.set(key, entry);
  }

  return voucher(
    [purchase, claimed],
    [ledgers('PURCHASE_NO_ITC'), notClaimed],
    ...byHead.values(),
    [ledgers('INPUT_CGST'), input.cgst],
    [ledgers('INPUT_SGST'), input.sgst],
    [ledgers('INPUT_IGST'), input.igst],
    [ledgers('ROUND_OFF'), bill.roundOff],
    [vendor, -bill.payable],
    [ledgers('RCM_CGST'), reverseCharge ? -bill.cgst : 0],
    [ledgers('RCM_SGST'), reverseCharge ? -bill.sgst : 0],
    [ledgers('RCM_IGST'), reverseCharge ? -bill.igst : 0],
  );
}
