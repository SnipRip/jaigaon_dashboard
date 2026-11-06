// Receipts and payments as the API returns them: Decimals as numbers, dates
// as YYYY-MM-DD, each allocation with the number of what it settled.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { AgeBucket, TargetKind } from './settlement-rules.js';

const money = (value: number) => Math.round(value * 100) / 100;

export const settlementInclude = {
  party: { select: { displayName: true } },
  account: { select: { name: true, kind: true } },
  allocations: {
    orderBy: { createdAt: 'asc' },
    include: {
      invoice: { select: { number: true, kind: true } },
      bill: { select: { reference: true, vendorBillNumber: true } },
    },
  },
} as const satisfies Prisma.SettlementInclude;

type SettlementRow = Prisma.SettlementGetPayload<{ include: typeof settlementInclude }>;

const targetOf = (allocation: SettlementRow['allocations'][number]): { kind: TargetKind; documentId: string; number: string } => {
  if (allocation.invoiceId) return { kind: 'INVOICE', documentId: allocation.invoiceId, number: allocation.invoice!.number };
  if (allocation.billId) return { kind: 'BILL', documentId: allocation.billId, number: allocation.bill!.reference };
  return { kind: 'OPENING', documentId: allocation.openingPartyId!, number: 'Opening balance' };
};

export const toSettlementView = (row: SettlementRow) => {
  const amount = toNumber(row.amount);
  const tds = toNumber(row.tds);
  const allocations = row.allocations.map((allocation) => ({ ...targetOf(allocation), amount: toNumber(allocation.amount), appliedAt: allocation.createdAt }));
  const applied = money(allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
  return {
    id: row.id,
    direction: row.direction,
    number: row.number,
    date: isoDate(row.date),
    partyId: row.partyId,
    partyName: row.party.displayName,
    accountId: row.accountId,
    accountName: row.account.name,
    mode: row.mode,
    amount,
    tds,
    reference: row.reference,
    brc: row.brcNumber && row.brcDate ? { number: row.brcNumber, date: isoDate(row.brcDate) } : null,
    notes: row.notes,
    allocations,
    applied,
    /** Kept as an advance: can be applied later while the settlement stands. */
    unapplied: money(amount + tds - applied),
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
  };
};

export type SettlementView = ReturnType<typeof toSettlementView>;

/** An invoice, bill or opening balance money is settled against, with what is left and when it falls due. */
export interface OpenDocumentView {
  kind: TargetKind;
  /** Invoice or bill id; the party's id for an opening balance. */
  id: string;
  number: string;
  /** Null for an opening balance. */
  date: string | null;
  /** The MSME 45-day cap for MSME vendors; null for an opening balance (already due). */
  dueDate: string | null;
  partyId: string;
  partyName: string;
  total: number;
  settled: number;
  balance: number;
  ageBucket: AgeBucket;
  /** Export invoice (BRC on receipt) or MSME vendor bill (45-day rule). */
  flag: 'EXPORT' | 'MSME' | null;
}
