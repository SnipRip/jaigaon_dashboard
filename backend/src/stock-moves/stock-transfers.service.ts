import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { dateOnly } from '../common/dates.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { loadItemFacts } from '../items/item-document-facts.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import { liveGodown } from '../purchases/purchase-context.js';
import { costOfDraws } from '../stock/fifo-rules.js';
import { putBack } from '../stock/stock-out.js';
import type { StockTransferDto } from './dto/stock-move.dto.js';
import { drawLines, lockUntouchedBatches } from './stock-move-draws.js';
import { repeatedItem, transferProblem } from './stock-move-rules.js';
import { toTransferView, transferInclude, type StockTransferView } from './stock-move-views.js';

const money = (value: number) => Math.round(value * 100) / 100;
const fail = (message: string | null) => {
  if (message) throw new BadRequestException(message);
};

// Stock moved from one godown to another. On save, in one transaction: each
// line is drawn FIFO out of the source godown exactly as a sale would draw it
// (src/stock), and every slice it took becomes a batch in the destination
// godown at the same rate, dated the transfer. Nothing is bought or sold, so
// the stock's value does not change; only where it lies. Transfers are not
// edited: cancel (only while none of the moved stock has gone out again) and
// enter a new one.
@Injectable()
export class StockTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
  ) {}

  async list(): Promise<StockTransferView[]> {
    const rows = await this.prisma.stockTransfer.findMany({ include: transferInclude, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] });
    return rows.map(toTransferView);
  }

  async get(id: string): Promise<StockTransferView> {
    return toTransferView(await this.prisma.stockTransfer.findUniqueOrThrow({ where: { id }, include: transferInclude }));
  }

  create(dto: StockTransferDto, userId: string): Promise<StockTransferView> {
    return this.prisma.$transaction(
      async (tx) => {
        fail(transferProblem(dto.fromGodownId, dto.toGodownId));
        if (repeatedItem(dto.lines.map((line) => line.itemId))) fail('Each item goes on one line only');
        await liveGodown(tx, dto.fromGodownId);
        await liveGodown(tx, dto.toGodownId);
        const facts = await loadItemFacts(tx, dto.lines.map((line) => line.itemId), dto.date);
        const from = await tx.godown.findUniqueOrThrow({ where: { id: dto.fromGodownId }, select: { name: true } });

        const draws = await drawLines(tx, { godownId: dto.fromGodownId, godownName: from.name, date: dto.date, document: 'this transfer', lines: dto.lines, facts });
        const claimed = await this.numbers.issue(tx, 'STOCK_TRANSFER', dto.date, { typed: dto.number ?? undefined });
        const lineValues = draws.map(costOfDraws);
        const transfer = await tx.stockTransfer.create({
          data: {
            number: claimed.number,
            issuedNumberId: claimed.id,
            date: dateOnly(dto.date),
            fromGodownId: dto.fromGodownId,
            toGodownId: dto.toGodownId,
            value: money(lineValues.reduce((sum, value) => sum + value, 0)),
            vehicleNumber: dto.vehicleNumber ?? null,
            notes: dto.notes ?? null,
            createdById: userId,
            lines: {
              create: dto.lines.map((line, index) => ({
                position: index,
                itemId: line.itemId,
                unit: facts.get(line.itemId)!.unit,
                quantity: line.quantity,
                value: lineValues[index],
                draws: { create: draws[index].map((draw) => ({ batchId: draw.batchId, quantity: draw.quantity, rate: draw.rate })) },
              })),
            },
          },
          select: { id: true, lines: { select: { id: true, position: true, itemId: true } } },
        });

        // Each slice lands in the destination as its own batch, remembering
        // where it came from so a later change to that cost follows it.
        await tx.stockBatch.createMany({
          data: transfer.lines.flatMap((line) =>
            draws[line.position].map((draw) => ({
              itemId: line.itemId,
              godownId: dto.toGodownId,
              transferLineId: line.id,
              sourceBatchId: draw.batchId,
              date: dateOnly(dto.date),
              quantity: draw.quantity,
              remaining: draw.quantity,
              landedRate: draw.rate,
            })),
          ),
        });
        await tx.issuedNumber.update({ where: { id: claimed.id }, data: { documentId: transfer.id } });
        return toTransferView(await tx.stockTransfer.findUniqueOrThrow({ where: { id: transfer.id }, include: transferInclude }));
      },
      // Fifty lines each locking their batches take longer than Prisma's 5 s default.
      { timeout: 20_000 },
    );
  }

  /** Takes the stock back out of the destination and returns it to the source; the number is cancelled. */
  cancel(id: string, reason: string): Promise<StockTransferView> {
    return this.prisma.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw<{ status: string; issuedNumberId: string; fromGodownId: string }[]>`
        SELECT "status", "issuedNumberId", "fromGodownId" FROM "StockTransfer" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!current) fail('That transfer does not exist');
      if (current.status === 'CANCELLED') throw new ConflictException('This transfer is already cancelled');

      const lines = await tx.stockTransferLine.findMany({
        where: { transferId: id },
        select: { id: true, itemId: true, draws: { select: { batchId: true, quantity: true } } },
        orderBy: { itemId: 'asc' },
      });
      const batchIds = await lockUntouchedBatches(
        tx,
        Prisma.sql`"transferLineId" IN (${Prisma.join(lines.map((line) => Prisma.sql`${line.id}::uuid`))})`,
        'Some of the moved stock has already been sold or moved on from the other godown, so this transfer cannot be cancelled',
      );
      await tx.stockBatch.deleteMany({ where: { id: { in: batchIds } } });
      await putBack(
        tx,
        lines.flatMap((line) => line.draws.map((draw) => ({ ...draw, itemId: line.itemId, godownId: current.fromGodownId }))),
      );
      await tx.stockMoveDraw.deleteMany({ where: { transferLine: { transferId: id } } });
      await this.numbers.cancel(tx, current.issuedNumberId);
      const row = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
        include: transferInclude,
      });
      return toTransferView(row);
    });
  }
}
