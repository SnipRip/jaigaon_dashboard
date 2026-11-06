// Where a drawn slice of stock came from, for invoices, transfers and
// adjustments alike: a vendor bill, an earlier transfer into this godown, an
// adjustment that added it, or the godown's opening stock (no batch).
import type { Prisma } from '../generated/prisma/client.js';

/** Select this as a draw's `batch` to work out its source. */
export const batchSourceSelect = {
  select: {
    date: true,
    billLine: { select: { bill: { select: { id: true, reference: true } } } },
    transferLine: { select: { transfer: { select: { id: true, number: true } } } },
    adjustmentLine: { select: { adjustment: { select: { id: true, number: true } } } },
  },
} as const satisfies Prisma.StockBatchDefaultArgs;

type BatchSource = Prisma.StockBatchGetPayload<typeof batchSourceSelect> | null;

export interface DrawSource {
  kind: 'bill' | 'transfer' | 'adjustment' | 'opening';
  /** The bill, transfer or adjustment; null for opening stock. */
  id: string | null;
  label: string;
}

export function drawSource(batch: BatchSource): DrawSource {
  if (batch?.billLine) return { kind: 'bill', id: batch.billLine.bill.id, label: batch.billLine.bill.reference };
  if (batch?.transferLine) return { kind: 'transfer', id: batch.transferLine.transfer.id, label: batch.transferLine.transfer.number };
  if (batch?.adjustmentLine) return { kind: 'adjustment', id: batch.adjustmentLine.adjustment.id, label: batch.adjustmentLine.adjustment.number };
  return { kind: 'opening', id: null, label: 'Opening stock' };
}
