// What a receipt or a vendor payment puts in the books, as Tally books it
// (agent/accounts-plan.md, "What each document posts"). TDS settles the
// party's balance like money:
//   Receipt: Dr bank / cash (amount), Dr TDS Receivable (TDS)   Cr customer (both)
//   Payment: Dr vendor (both)   Cr bank / cash (amount), Cr TDS Payable on Vendor Payments (TDS)
// An advance posts the same way: the party's ledger simply runs the other
// way until it is applied. Pure.
import type { SettlementDirection } from '../generated/prisma/enums.js';
import type { Posting } from './statements.js';
import type { SystemLedgers } from './system-ledgers.js';
import { voucher, type LedgerRef } from './voucher-lines.js';

export interface PostedSettlement {
  direction: SettlementDirection;
  amount: number;
  tds: number;
}

export function settlementPostings(settlement: PostedSettlement, party: LedgerRef, account: LedgerRef, ledgers: SystemLedgers): Posting[] {
  const { amount, tds } = settlement;
  if (settlement.direction === 'RECEIPT') {
    return voucher([account, amount], [ledgers('TDS_RECEIVABLE'), tds], [party, -(amount + tds)]);
  }
  return voucher([party, amount + tds], [account, -amount], [ledgers('TDS_PAYABLE_VENDOR'), -tds]);
}
