// Receipts and payments as the API returns them: Decimals as numbers, dates
// as YYYY-MM-DD, each allocation with the number of what it settled; an
// entry kept as an advance lists the live refunds that gave part of it back.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import { advanceLeft, type AgeBucket, type TargetKind } from './settlement-rules.js';

const money = (value: number) => Math.round(value * 100) / 100;

export const settlementInclude = {
  party: { select: { displayName: true } },
  account: { select: { name: true, kind: true } },
  allocations: {
    orderBy: { createdAt: 'asc' },
    include: {
      invoice: { select: { number: true, kind: true } },
      bill: { select: { reference: true, vendorBillNumber: true } },
      expense: { select: { number: true } },
      advance: { select: { number: true, date: true } },
    },
  },
  refundedBy: {
    where: { settlement: { cancelledAt: null } },
    orderBy: { createdAt: 'asc' },
    select: { amount: true, settlement: { select: { id: true, number: true, date: true } } },
  },
} as const satisfies Prisma.SettlementInclude;

type SettlementRow = Prisma.SettlementGetPayload<{ include: typeof settlementInclude }>;

interface AllocationTarget {
  kind: TargetKind;
  documentId: string;
  number: string;
  /** The advance's own date (a refund voucher names the receipt voucher's number and date, CGST rule 51); null otherwise. */
  advanceDate: string | null;
}

const targetOf = (allocation: SettlementRow['allocations'][number]): AllocationTarget => {
  if (allocation.invoiceId) return { kind: 'INVOICE', documentId: allocation.invoiceId, number: allocation.invoice!.number, advanceDate: null };
  if (allocation.billId) return { kind: 'BILL', documentId: allocation.billId, number: allocation.bill!.reference, advanceDate: null };
  if (allocation.expenseId) return { kind: 'EXPENSE', documentId: allocation.expenseId, number: allocation.expense!.number, advanceDate: null };
  if (allocation.advanceId) return { kind: 'ADVANCE', documentId: allocation.advanceId, number: allocation.advance!.number, advanceDate: isoDate(allocation.advance!.date) };
  return { kind: 'OPENING', documentId: allocation.openingPartyId!, number: 'Opening balance', advanceDate: null };
};

export const toSettlementView = (row: SettlementRow) => {
  const amount = toNumber(row.amount);
  const tds = toNumber(row.tds);
  const allocations = row.allocations.map((allocation) => ({ ...targetOf(allocation), amount: toNumber(allocation.amount), appliedAt: allocation.createdAt }));
  const applied = money(allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
  const refunds = row.refundedBy.map((refund) => ({ id: refund.settlement.id, number: refund.settlement.number, date: isoDate(refund.settlement.date), amount: toNumber(refund.amount) }));
  const refunded = money(refunds.reduce((sum, refund) => sum + refund.amount, 0));
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
    /** This entry gives back advances (a payment to a customer, a receipt from a vendor). */
    refund: allocations.some((allocation) => allocation.kind === 'ADVANCE'),
    /** Live refunds of this entry's advance. */
    refunds,
    refunded,
    /** Kept as an advance: can be applied or refunded later while the settlement stands. */
    unapplied: advanceLeft(amount, tds, applied, refunded),
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
