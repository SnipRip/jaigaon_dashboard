// Stock transfers and adjustments as the API returns them: Decimals as
// numbers, dates as YYYY-MM-DD. Each line carries its FIFO draws with where
// the stock came from (a vendor bill, an earlier transfer or adjustment, or
// the opening stock), so the screen can show what the cost is made of.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import { batchSourceSelect, drawSource } from '../stock/draw-source.js';

const drawSelect = {
  orderBy: [{ batch: { date: 'asc' } }, { id: 'asc' }],
  select: { quantity: true, rate: true, batch: batchSourceSelect },
} as const satisfies Prisma.StockMoveDrawFindManyArgs;

const lineItem = { select: { name: true, sku: true } } as const;

type DrawRow = Prisma.StockMoveDrawGetPayload<{ select: typeof drawSelect.select }>;

const toDraw = (draw: DrawRow) => ({
  quantity: toNumber(draw.quantity),
  rate: toNumber(draw.rate),
  batchDate: draw.batch ? isoDate(draw.batch.date) : null,
  source: drawSource(draw.batch),
});

const cancelFields = (row: { status: string; cancelledAt: Date | null; cancelReason: string | null; createdAt: Date }) => ({
  status: row.status as 'POSTED' | 'CANCELLED',
  cancelledAt: row.cancelledAt,
  cancelReason: row.cancelReason,
  createdAt: row.createdAt,
});

export const transferInclude = {
  fromGodown: { select: { name: true } },
  toGodown: { select: { name: true } },
  createdBy: { select: { displayName: true } },
  lines: {
    orderBy: { position: 'asc' },
    include: {
      item: lineItem,
      draws: drawSelect,
      // What is left of each batch it made in the other godown: once any has gone out, it cannot be cancelled.
      batches: { select: { quantity: true, remaining: true } },
    },
  },
} as const satisfies Prisma.StockTransferInclude;

type TransferRow = Prisma.StockTransferGetPayload<{ include: typeof transferInclude }>;

export const toTransferView = (transfer: TransferRow) => ({
  id: transfer.id,
  number: transfer.number,
  date: isoDate(transfer.date),
  fromGodownId: transfer.fromGodownId,
  fromGodownName: transfer.fromGodown.name,
  toGodownId: transfer.toGodownId,
  toGodownName: transfer.toGodown.name,
  value: toNumber(transfer.value),
  vehicleNumber: transfer.vehicleNumber,
  vehicleId: transfer.vehicleId,
  notes: transfer.notes,
  createdBy: transfer.createdBy?.displayName ?? null,
  /** Some of the moved stock has been sold or moved on, so it cannot be cancelled. */
  usedAtDestination: transfer.lines.some((line) => line.batches.some((batch) => !batch.remaining.equals(batch.quantity))),
  lines: transfer.lines.map((line) => ({
    id: line.id,
    itemId: line.itemId,
    itemName: line.item.name,
    sku: line.item.sku,
    unit: line.unit,
    quantity: toNumber(line.quantity),
    value: toNumber(line.value),
    /** Oldest first; empty once cancelled (the stock went back). */
    draws: line.draws.map(toDraw),
  })),
  ...cancelFields(transfer),
});

export type StockTransferView = ReturnType<typeof toTransferView>;

export const adjustmentInclude = {
  godown: { select: { name: true } },
  createdBy: { select: { displayName: true } },
  lines: {
    orderBy: { position: 'asc' },
    include: {
      item: lineItem,
      draws: drawSelect,
      batch: { select: { quantity: true, remaining: true } },
    },
  },
} as const satisfies Prisma.StockAdjustmentInclude;

type AdjustmentRow = Prisma.StockAdjustmentGetPayload<{ include: typeof adjustmentInclude }>;

export const toAdjustmentView = (adjustment: AdjustmentRow) => ({
  id: adjustment.id,
  number: adjustment.number,
  date: isoDate(adjustment.date),
  godownId: adjustment.godownId,
  godownName: adjustment.godown.name,
  direction: adjustment.direction,
  reason: adjustment.reason,
  value: toNumber(adjustment.value),
  notes: adjustment.notes,
  createdBy: adjustment.createdBy?.displayName ?? null,
  /** Stock it added has been sold or moved on, so it cannot be cancelled. */
  usedSince: adjustment.lines.some((line) => line.batch && !line.batch.remaining.equals(line.batch.quantity)),
  lines: adjustment.lines.map((line) => ({
    id: line.id,
    itemId: line.itemId,
    itemName: line.item.name,
    sku: line.item.sku,
    unit: line.unit,
    quantity: toNumber(line.quantity),
    /** Stock added: the rate typed. Taken out: null, see the draws. */
    rate: toNumber(line.rate),
    value: toNumber(line.value),
    draws: line.draws.map(toDraw),
  })),
  ...cancelFields(adjustment),
});

export type StockAdjustmentView = ReturnType<typeof toAdjustmentView>;
