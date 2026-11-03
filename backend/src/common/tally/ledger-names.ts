// Tally keeps one list of names for every ledger and group, ignoring case:
// a loan, a party, a bank account, a head and a general ledger can never
// share a name, and none may take a group's name. Each master checks here
// before it saves a new or changed name (agent/accounts-plan.md).
import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';

export type LedgerOwner = 'group' | 'ledger' | 'head' | 'bankCash' | 'loan' | 'party';

const OWNER_TEXT: Record<LedgerOwner, string> = {
  group: 'a group',
  ledger: 'a general ledger',
  head: 'an expense or income head',
  bankCash: 'a bank or cash account',
  loan: 'a loan',
  party: 'a customer or vendor',
};

/** Throws 409 when another ledger or group already has this name. `self` is the record being saved. */
export async function assertLedgerNameFree(
  tx: Prisma.TransactionClient,
  name: string,
  self?: { owner: LedgerOwner; id: string },
): Promise<void> {
  const same = { equals: name.trim(), mode: 'insensitive' as const };
  const other = (owner: LedgerOwner) => (self?.owner === owner ? { id: { not: self.id } } : {});
  const [group, ledger, head, bankCash, loan, party] = await Promise.all([
    tx.ledgerGroup.findFirst({ where: { name: same, ...other('group') }, select: { id: true } }),
    tx.ledger.findFirst({ where: { name: same, ...other('ledger') }, select: { id: true } }),
    tx.accountHead.findFirst({ where: { name: same, ...other('head') }, select: { id: true } }),
    tx.bankCashAccount.findFirst({
      where: { OR: [{ tallyLedgerName: same }, { tallyLedgerName: null, name: same }], ...other('bankCash') },
      select: { id: true },
    }),
    tx.loan.findFirst({ where: { name: same, ...other('loan') }, select: { id: true } }),
    tx.party.findFirst({ where: { displayName: same, ...other('party') }, select: { id: true } }),
  ]);
  const found = (
    [
      ['group', group],
      ['ledger', ledger],
      ['head', head],
      ['bankCash', bankCash],
      ['loan', loan],
      ['party', party],
    ] as const
  ).find(([, row]) => row !== null);
  if (found) throw new ConflictException(`"${name.trim()}" is already ${OWNER_TEXT[found[0]]}: Tally needs every ledger and group name to be different`);
}
