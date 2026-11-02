import { toNumber } from '../common/decimal.js';
import type { Party } from '../generated/prisma/client.js';

// A party as the API returns it: amounts as numbers, and the balance worked
// out. Until receipts, payments and invoices are stored, the balance is the
// opening balance.
export type PartyView = Omit<
  Party,
  'creditLimit' | 'openingBalance' | 'createdAt' | 'updatedAt'
> & {
  creditLimit: number | null;
  openingBalance: number;
  /** What they owe us; negative when we owe them. */
  balance: number;
};

export function toPartyView({
  creditLimit,
  openingBalance,
  createdAt: _created,
  updatedAt: _updated,
  ...party
}: Party): PartyView {
  const opening = toNumber(openingBalance);
  return {
    ...party,
    creditLimit: toNumber(creditLimit),
    openingBalance: opening,
    balance: party.openingBalanceSide === 'RECEIVABLE' ? opening : -opening,
  };
}
