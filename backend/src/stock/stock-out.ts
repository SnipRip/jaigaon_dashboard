// Stock leaving on a sale, inside the invoice's save transaction. The rows a
// sale can draw (the opening stock of the godown, then its bill batches dated
// on or before the invoice, oldest first) are locked FOR UPDATE before they
// are read, so two invoices at once queue on the same rows and never sell
// the same unit twice. Selling more than is in stock is refused: there is no
// setting to allow negative stock. Cancelling an invoice puts every draw back.
// Re-landing a bill or editing an opening stock restates the cost of what
// was already drawn from it, so an invoice's cost always matches its stock.
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
  /** For the refusal: "TMT bar 12 mm", "kg", "Main godown", and free units included in the quantity. */
  label: { item: string; unit: string; godown: string; free?: number };
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
    const { item, unit, godown, free } = request.label;
    const needs = free ? `${quantityText(request.quantity)} ${unit} (${quantityText(free)} of them free under a scheme)` : `${quantityText(request.quantity)} ${unit}`;
    throw new ConflictException(`Only ${quantityText(have)} ${unit} of ${item} is in stock at ${godown} on ${formatDate(date)}; this invoice needs ${needs}.`);
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

/** Puts back everything an invoice drew and forgets the draws (a cancelled invoice sold nothing). */
export async function returnStock(tx: Tx, invoiceId: string): Promise<void> {
  const draws = await tx.invoiceStockDraw.findMany({
    where: { invoiceLine: { invoiceId } },
    select: { batchId: true, quantity: true, invoiceLine: { select: { itemId: true, invoice: { select: { godownId: true } } } } },
    // Same lock order as drawStock's callers: by item.
    orderBy: [{ invoiceLine: { itemId: 'asc' } }],
  });
  for (const draw of draws) {
    if (draw.batchId) {
      await tx.$executeRaw`UPDATE "StockBatch" SET "remaining" = "remaining" + ${draw.quantity} WHERE "id" = ${draw.batchId}::uuid`;
    } else {
      const { itemId, invoice } = draw.invoiceLine;
      await tx.$executeRaw`UPDATE "ItemOpeningStock" SET "drawn" = "drawn" - ${draw.quantity}
        WHERE "itemId" = ${itemId}::uuid AND "godownId" = ${invoice.godownId}::uuid`;
    }
  }
  await tx.invoiceStockDraw.deleteMany({ where: { invoiceLine: { invoiceId } } });
}

/** A bill batch's landed rate changed: its draws now cost the new rate. */
export async function restateBatchCost(tx: Tx, batchId: string, landedRate: number): Promise<void> {
  const changed = await tx.invoiceStockDraw.findMany({ where: { batchId, NOT: { rate: landedRate } }, select: { invoiceLineId: true } });
  if (!changed.length) return;
  await tx.invoiceStockDraw.updateMany({ where: { batchId }, data: { rate: landedRate } });
  await recostLines(tx, changed.map((draw) => draw.invoiceLineId));
}

/** An opening stock's value or quantity changed: what was drawn from it costs its new rate. */
export async function restateOpeningCost(tx: Tx, itemId: string, godownId: string, rate: number): Promise<void> {
  const where = { batchId: null, invoiceLine: { itemId, invoice: { godownId, status: 'ISSUED' as const } } };
  const changed = await tx.invoiceStockDraw.findMany({ where: { ...where, NOT: { rate } }, select: { id: true, invoiceLineId: true } });
  if (!changed.length) return;
  await tx.invoiceStockDraw.updateMany({ where: { id: { in: changed.map((draw) => draw.id) } }, data: { rate } });
  await recostLines(tx, changed.map((draw) => draw.invoiceLineId));
}

/** Works out the lines' cost of goods from their draws again, and their invoices' totals. */
async function recostLines(tx: Tx, lineIds: string[]): Promise<void> {
  const lines = await tx.invoiceLine.findMany({
    where: { id: { in: [...new Set(lineIds)] } },
    select: { id: true, invoiceId: true, draws: { select: { quantity: true, rate: true } } },
  });
  for (const line of lines) {
    const costOfGoods = costOfDraws(line.draws.map((draw) => ({ quantity: toNumber(draw.quantity), rate: toNumber(draw.rate) })));
    await tx.invoiceLine.update({ where: { id: line.id }, data: { costOfGoods } });
  }
  for (const invoiceId of new Set(lines.map((line) => line.invoiceId))) {
    const sum = await tx.invoiceLine.aggregate({ where: { invoiceId }, _sum: { costOfGoods: true } });
    await tx.invoice.update({ where: { id: invoiceId }, data: { cost: sum._sum.costOfGoods ?? 0 } });
  }
}
