// Stock leaving on a sale, a transfer or a write-off, inside that
// document's save transaction. The rows it can draw (the opening stock of the godown, then its bill batches dated
// on or before the invoice, oldest first) are locked FOR UPDATE before they
// are read, so two invoices at once queue on the same rows and never sell
// the same unit twice. Taking more than is in stock is refused: there is no
// setting to allow negative stock. Cancelling puts every draw back.
// Re-landing a bill or editing an opening stock restates the cost of what
// was already drawn from it, so an invoice's cost always matches its stock;
// stock a transfer moved carries the new rate on into the other godown.
import { ConflictException } from '@nestjs/common';
import { formatDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import { costOfDraws, openingLeft, openingRate, planFifo, type StockDraw, type StockSlice } from './fifo-rules.js';

type Tx = Prisma.TransactionClient;

export interface StockOutRequest {
  itemId: string;
  godownId: string;
  /** YYYY-MM-DD: batches that came in later are not drawn. */
  date: string;
  quantity: number;
  /** For the refusal: "TMT bar 12 mm", "kg", "Main godown", free units included in the quantity, and "this transfer" (default "this invoice"). */
  label: { item: string; unit: string; godown: string; free?: number; document?: string };
}

const quantityText = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(value);

/** Locks and draws one line's goods; returns the draws to store under the line. */
export async function drawStock(tx: Tx, request: StockOutRequest): Promise<StockDraw[]> {
  const { itemId, godownId, date } = request;
  const [opening] = await tx.$queryRaw<{ quantity: unknown; value: unknown; drawn: unknown }[]>`
    SELECT "quantity", "value", "drawn" FROM "ItemOpeningStock"
    WHERE "itemId" = ${itemId}::uuid AND "godownId" = ${godownId}::uuid FOR UPDATE`;
  const batches = await tx.$queryRaw<{ id: string; remaining: unknown; landedRate: unknown }[]>`
    SELECT "id", "remaining", "landedRate" FROM "StockBatch"
    WHERE "itemId" = ${itemId}::uuid AND "godownId" = ${godownId}::uuid AND "remaining" > 0 AND "date" <= ${date}::date
    ORDER BY "date", "createdAt", "id" FOR UPDATE`;

  const slices: StockSlice[] = [];
  if (opening) {
    slices.push({
      batchId: null,
      available: openingLeft(Number(opening.quantity), Number(opening.drawn)),
      rate: openingRate(Number(opening.quantity), Number(opening.value)),
    });
  }
  for (const batch of batches) slices.push({ batchId: batch.id, available: Number(batch.remaining), rate: Number(batch.landedRate) });

  const plan = planFifo(slices, request.quantity);
  if (plan.short > 0) {
    const have = request.quantity - plan.short;
    const { item, unit, godown, free, document = 'this invoice' } = request.label;
    const needs = free ? `${quantityText(request.quantity)} ${unit} (${quantityText(free)} of them free under a scheme)` : `${quantityText(request.quantity)} ${unit}`;
    throw new ConflictException(`Only ${quantityText(have)} ${unit} of ${item} is in stock at ${godown} on ${formatDate(date)}; ${document} needs ${needs}.`);
  }
  for (const draw of plan.draws) {
    if (draw.batchId) {
      await tx.$executeRaw`UPDATE "StockBatch" SET "remaining" = "remaining" - ${draw.quantity}::numeric WHERE "id" = ${draw.batchId}::uuid`;
    } else {
      await tx.$executeRaw`UPDATE "ItemOpeningStock" SET "drawn" = "drawn" + ${draw.quantity}::numeric
        WHERE "itemId" = ${itemId}::uuid AND "godownId" = ${godownId}::uuid`;
    }
  }
  return plan.draws;
}

/** A stored draw to put back: from a batch, or from the godown's opening stock (batchId null). */
export interface DrawToReturn {
  batchId: string | null;
  quantity: Prisma.Decimal;
  itemId: string;
  godownId: string;
}

/** Puts draws back where they came from. Callers pass them in item order, as drawStock's callers lock. */
export async function putBack(tx: Tx, draws: DrawToReturn[]): Promise<void> {
  for (const draw of draws) {
    if (draw.batchId) {
      await tx.$executeRaw`UPDATE "StockBatch" SET "remaining" = "remaining" + ${draw.quantity} WHERE "id" = ${draw.batchId}::uuid`;
    } else {
      await tx.$executeRaw`UPDATE "ItemOpeningStock" SET "drawn" = "drawn" - ${draw.quantity}
        WHERE "itemId" = ${draw.itemId}::uuid AND "godownId" = ${draw.godownId}::uuid`;
    }
  }
}

/** Puts back everything an invoice drew and forgets the draws (a cancelled invoice sold nothing). */
export async function returnStock(tx: Tx, invoiceId: string): Promise<void> {
  const draws = await tx.invoiceStockDraw.findMany({
    where: { invoiceLine: { invoiceId } },
    select: { batchId: true, quantity: true, invoiceLine: { select: { itemId: true, invoice: { select: { godownId: true } } } } },
    orderBy: [{ invoiceLine: { itemId: 'asc' } }],
  });
  await putBack(
    tx,
    draws.map((draw) => ({ batchId: draw.batchId, quantity: draw.quantity, itemId: draw.invoiceLine.itemId, godownId: draw.invoiceLine.invoice.godownId })),
  );
  await tx.invoiceStockDraw.deleteMany({ where: { invoiceLine: { invoiceId } } });
}

/** A batch's landed rate changed: its draws now cost the new rate, and so does stock moved out of it. */
export async function restateBatchCost(tx: Tx, batchId: string, landedRate: number): Promise<void> {
  const changed = await tx.invoiceStockDraw.findMany({ where: { batchId, NOT: { rate: landedRate } }, select: { invoiceLineId: true } });
  if (changed.length) {
    await tx.invoiceStockDraw.updateMany({ where: { batchId }, data: { rate: landedRate } });
    await recostLines(tx, changed.map((draw) => draw.invoiceLineId));
  }
  await restateMoveDraws(tx, { batchId }, landedRate);
}

/** An opening stock's value or quantity changed: what was drawn from it costs its new rate. */
export async function restateOpeningCost(tx: Tx, itemId: string, godownId: string, rate: number): Promise<void> {
  const where = { batchId: null, invoiceLine: { itemId, invoice: { godownId, status: 'ISSUED' as const } } };
  const changed = await tx.invoiceStockDraw.findMany({ where: { ...where, NOT: { rate } }, select: { id: true, invoiceLineId: true } });
  if (changed.length) {
    await tx.invoiceStockDraw.updateMany({ where: { id: { in: changed.map((draw) => draw.id) } }, data: { rate } });
    await recostLines(tx, changed.map((draw) => draw.invoiceLineId));
  }
  await restateMoveDraws(
    tx,
    {
      batchId: null,
      OR: [
        { transferLine: { itemId, transfer: { fromGodownId: godownId, status: 'POSTED' } } },
        { adjustmentLine: { itemId, adjustment: { godownId, status: 'POSTED' } } },
      ],
    },
    rate,
  );
}

/**
 * Transfer and write-off draws matching `where` now cost `rate`. A transfer
 * draw's batch in the other godown takes the same rate, and so on along any
 * further transfer or sale of it.
 */
async function restateMoveDraws(tx: Tx, where: Prisma.StockMoveDrawWhereInput, rate: number): Promise<void> {
  const draws = await tx.stockMoveDraw.findMany({
    where: { ...where, NOT: { rate } },
    select: { id: true, batchId: true, transferLineId: true, adjustmentLineId: true },
  });
  if (!draws.length) return;
  await tx.stockMoveDraw.updateMany({ where: { id: { in: draws.map((draw) => draw.id) } }, data: { rate } });
  for (const draw of draws) {
    if (!draw.transferLineId) continue;
    const moved = await tx.stockBatch.findMany({ where: { transferLineId: draw.transferLineId, sourceBatchId: draw.batchId }, select: { id: true } });
    for (const batch of moved) {
      await tx.stockBatch.update({ where: { id: batch.id }, data: { landedRate: rate } });
      await restateBatchCost(tx, batch.id, rate);
    }
  }
  const pick = (key: 'transferLineId' | 'adjustmentLineId') => [...new Set(draws.map((draw) => draw[key]).filter((id): id is string => id !== null))];
  await revalueTransferLines(tx, pick('transferLineId'));
  await revalueAdjustmentLines(tx, pick('adjustmentLineId'));
}

async function revalueTransferLines(tx: Tx, lineIds: string[]): Promise<void> {
  if (!lineIds.length) return;
  const lines = await tx.stockTransferLine.findMany({ where: { id: { in: lineIds } }, select: { id: true, transferId: true, draws: { select: { quantity: true, rate: true } } } });
  for (const line of lines) await tx.stockTransferLine.update({ where: { id: line.id }, data: { value: costOfDraws(numbers(line.draws)) } });
  for (const transferId of new Set(lines.map((line) => line.transferId))) {
    const sum = await tx.stockTransferLine.aggregate({ where: { transferId }, _sum: { value: true } });
    await tx.stockTransfer.update({ where: { id: transferId }, data: { value: sum._sum.value ?? 0 } });
  }
}

async function revalueAdjustmentLines(tx: Tx, lineIds: string[]): Promise<void> {
  if (!lineIds.length) return;
  const lines = await tx.stockAdjustmentLine.findMany({ where: { id: { in: lineIds } }, select: { id: true, adjustmentId: true, draws: { select: { quantity: true, rate: true } } } });
  for (const line of lines) await tx.stockAdjustmentLine.update({ where: { id: line.id }, data: { value: costOfDraws(numbers(line.draws)) } });
  for (const adjustmentId of new Set(lines.map((line) => line.adjustmentId))) {
    const sum = await tx.stockAdjustmentLine.aggregate({ where: { adjustmentId }, _sum: { value: true } });
    await tx.stockAdjustment.update({ where: { id: adjustmentId }, data: { value: sum._sum.value ?? 0 } });
  }
}

const numbers = (draws: { quantity: Prisma.Decimal; rate: Prisma.Decimal }[]) =>
  draws.map((draw) => ({ quantity: toNumber(draw.quantity), rate: toNumber(draw.rate) }));

/** Works out the lines' cost of goods from their draws again, and their invoices' totals. */
async function recostLines(tx: Tx, lineIds: string[]): Promise<void> {
  const lines = await tx.invoiceLine.findMany({
    where: { id: { in: [...new Set(lineIds)] } },
    select: { id: true, invoiceId: true, draws: { select: { quantity: true, rate: true } } },
  });
  for (const line of lines) {
    const costOfGoods = costOfDraws(numbers(line.draws));
    await tx.invoiceLine.update({ where: { id: line.id }, data: { costOfGoods } });
  }
  for (const invoiceId of new Set(lines.map((line) => line.invoiceId))) {
    const sum = await tx.invoiceLine.aggregate({ where: { invoiceId }, _sum: { costOfGoods: true } });
    await tx.invoice.update({ where: { id: invoiceId }, data: { cost: sum._sum.costOfGoods ?? 0 } });
  }
}
