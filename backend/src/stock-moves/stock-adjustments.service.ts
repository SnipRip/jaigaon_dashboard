import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { dateOnly } from '../common/dates.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { loadItemFacts } from '../items/item-document-facts.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import { liveGodown } from '../purchases/purchase-context.js';
import { costOfDraws, type StockDraw } from '../stock/fifo-rules.js';
import { putBack } from '../stock/stock-out.js';
import type { StockAdjustmentDto } from './dto/stock-move.dto.js';
import { drawLines, lockUntouchedBatches } from './stock-move-draws.js';
import { reasonProblem, repeatedItem, valueAt } from './stock-move-rules.js';
import { adjustmentInclude, toAdjustmentView, type StockAdjustmentView } from './stock-move-views.js';

const money = (value: number) => Math.round(value * 100) / 100;
const fail = (message: string | null) => {
  if (message) throw new BadRequestException(message);
};

// Tally's stock journal for stock that is neither bought nor sold, in one
// godown. Taken out (damaged, lost, used up, short on a count): drawn FIFO
// like a sale, and written off at what it cost. Added (more on a count,
// found): a new batch at the rate typed. Numbered from the STOCK_JOURNAL
// series. Not edited: cancel (stock it added only while untouched) and enter
// a new one.
@Injectable()
export class StockAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
  ) {}

  async list(): Promise<StockAdjustmentView[]> {
    const rows = await this.prisma.stockAdjustment.findMany({ include: adjustmentInclude, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] });
    return rows.map(toAdjustmentView);
  }

  async get(id: string): Promise<StockAdjustmentView> {
    return toAdjustmentView(await this.prisma.stockAdjustment.findUniqueOrThrow({ where: { id }, include: adjustmentInclude }));
  }

  create(dto: StockAdjustmentDto, userId: string): Promise<StockAdjustmentView> {
    return this.prisma.$transaction(
      async (tx) => {
        fail(reasonProblem(dto.direction, dto.reason));
        if (repeatedItem(dto.lines.map((line) => line.itemId))) fail('Each item goes on one line only');
        await liveGodown(tx, dto.godownId);
        const facts = await loadItemFacts(tx, dto.lines.map((line) => line.itemId), dto.date);
        const adding = dto.direction === 'IN';
        if (adding) {
          const missing = dto.lines.find((line) => line.rate === undefined || line.rate === null);
          if (missing) fail(`Enter the rate for ${facts.get(missing.itemId)!.name}: stock added needs a cost`);
        }

        let draws: StockDraw[][] = [];
        if (!adding) {
          const godown = await tx.godown.findUniqueOrThrow({ where: { id: dto.godownId }, select: { name: true } });
          draws = await drawLines(tx, { godownId: dto.godownId, godownName: godown.name, date: dto.date, document: 'this adjustment', lines: dto.lines, facts });
        }
        const lineValues = dto.lines.map((line, index) => (adding ? valueAt(line.quantity, line.rate!) : costOfDraws(draws[index])));
        const claimed = await this.numbers.issue(tx, 'STOCK_JOURNAL', dto.date, { typed: dto.number ?? undefined });
        const adjustment = await tx.stockAdjustment.create({
          data: {
            number: claimed.number,
            issuedNumberId: claimed.id,
            date: dateOnly(dto.date),
            godownId: dto.godownId,
            direction: dto.direction,
            reason: dto.reason,
            value: money(lineValues.reduce((sum, value) => sum + value, 0)),
            notes: dto.notes ?? null,
            createdById: userId,
            lines: {
              create: dto.lines.map((line, index) => ({
                position: index,
                itemId: line.itemId,
                unit: facts.get(line.itemId)!.unit,
                quantity: line.quantity,
                rate: adding ? line.rate : null,
                value: lineValues[index],
                draws: adding ? undefined : { create: draws[index].map((draw) => ({ batchId: draw.batchId, quantity: draw.quantity, rate: draw.rate })) },
              })),
            },
          },
          select: { id: true, lines: { select: { id: true, position: true, itemId: true } } },
        });
        if (adding) {
          await tx.stockBatch.createMany({
            data: adjustment.lines.map((line) => ({
              itemId: line.itemId,
              godownId: dto.godownId,
              adjustmentLineId: line.id,
              date: dateOnly(dto.date),
              quantity: dto.lines[line.position].quantity,
              remaining: dto.lines[line.position].quantity,
              landedRate: dto.lines[line.position].rate!,
            })),
          });
        }
        await tx.issuedNumber.update({ where: { id: claimed.id }, data: { documentId: adjustment.id } });
        return toAdjustmentView(await tx.stockAdjustment.findUniqueOrThrow({ where: { id: adjustment.id }, include: adjustmentInclude }));
      },
      { timeout: 20_000 },
    );
  }

  /** Stock written off goes back; stock added comes out again (only while untouched). The number is cancelled. */
  cancel(id: string, reason: string): Promise<StockAdjustmentView> {
    return this.prisma.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw<{ status: string; issuedNumberId: string; godownId: string; direction: string }[]>`
        SELECT "status", "issuedNumberId", "godownId", "direction" FROM "StockAdjustment" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!current) fail('That adjustment does not exist');
      if (current.status === 'CANCELLED') throw new ConflictException('This adjustment is already cancelled');

      const lines = await tx.stockAdjustmentLine.findMany({
        where: { adjustmentId: id },
        select: { id: true, itemId: true, draws: { select: { batchId: true, quantity: true } } },
        orderBy: { itemId: 'asc' },
      });
      if (current.direction === 'IN') {
        const batchIds = await lockUntouchedBatches(
          tx,
          Prisma.sql`"adjustmentLineId" IN (${Prisma.join(lines.map((line) => Prisma.sql`${line.id}::uuid`))})`,
          'Some of the stock this added has already been sold or moved, so it cannot be cancelled',
        );
        await tx.stockBatch.deleteMany({ where: { id: { in: batchIds } } });
      } else {
        await putBack(
          tx,
          lines.flatMap((line) => line.draws.map((draw) => ({ ...draw, itemId: line.itemId, godownId: current.godownId }))),
        );
        await tx.stockMoveDraw.deleteMany({ where: { adjustmentLine: { adjustmentId: id } } });
      }
      await this.numbers.cancel(tx, current.issuedNumberId);
      const row = await tx.stockAdjustment.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
        include: adjustmentInclude,
      });
      return toAdjustmentView(row);
    });
  }
}
