// Re-works a goods bill's landed rates inside the caller's transaction: its
// own freight, every open charges bill tagged to it and every live expense
// allocated to its items, spread by the bill's method; written to the lines
// and the stock batches (made here on first landing). Goods already sold
// from a batch take the new rate on their invoices (restateBatchCost).
// Called by vendor bills (save, spread change, void) and expenses (save,
// cancel).
import { BadRequestException } from '@nestjs/common';
import { toNumber } from '../common/decimal.js';
import type { LandedCostMethod, Prisma } from '../generated/prisma/client.js';
import { restateBatchCost } from '../stock/stock-out.js';
import { allocateLandedCost, lineWeightKg, money } from './purchase-rules.js';

const LANDED_METHOD_TEXT: Record<LandedCostMethod, string> = { VALUE: 'value', QUANTITY: 'quantity', WEIGHT: 'weight' };

export async function landBill(tx: Prisma.TransactionClient, goodsBillId: string): Promise<void> {
  const bill = await tx.purchaseBill.findUniqueOrThrow({
    where: { id: goodsBillId },
    select: {
      reference: true,
      status: true,
      date: true,
      godownId: true,
      allocation: true,
      chargesValue: true,
      tax: true,
      itcClaimable: true,
      lines: { orderBy: { position: 'asc' }, include: { item: { select: { weightKg: true, name: true } }, batch: { select: { id: true } } } },
      taggedCharges: { where: { status: 'OPEN' }, select: { cost: true } },
      expenses: { where: { cancelledAt: null }, select: { cost: true } },
    },
  });
  if (bill.status !== 'OPEN') return;
  const added = [...bill.taggedCharges, ...bill.expenses].reduce((sum, tagged) => sum + toNumber(tagged.cost), 0);
  // With nothing claimable on the bill (we are composition or unregistered),
  // the GST on its own freight and loading is cost too.
  const chargeTaxIsCost = toNumber(bill.itcClaimable) <= 0;
  const ownChargeTax = chargeTaxIsCost ? toNumber(bill.tax) - bill.lines.reduce((sum, line) => sum + toNumber(line.tax), 0) : 0;
  const charges = money(toNumber(bill.chargesValue) + ownChargeTax + added);
  const lines = bill.lines.map((line) => ({
    quantity: toNumber(line.quantity),
    weightKg: lineWeightKg(toNumber(line.quantity), line.unit, toNumber(line.item.weightKg)),
    taxable: toNumber(line.taxable),
    ownCost: toNumber(line.ownCost),
  }));
  const rows = allocateLandedCost(lines, charges, bill.allocation);
  if (!rows) {
    const unknown = bill.lines.find((_, index) => lines[index].weightKg === null);
    throw new BadRequestException(
      `${bill.reference}: the weight of ${unknown?.item.name ?? 'an item'} is unknown, so it cannot be spread by ${LANDED_METHOD_TEXT[bill.allocation]}. Set its weight per unit, or spread by value.`,
    );
  }
  for (const [index, line] of bill.lines.entries()) {
    const row = rows[index];
    await tx.purchaseBillLine.update({ where: { id: line.id }, data: row });
    if (line.batch) {
      await tx.stockBatch.update({ where: { id: line.batch.id }, data: { landedRate: row.landedRate } });
      await restateBatchCost(tx, line.batch.id, row.landedRate);
    } else {
      await tx.stockBatch.create({
        data: {
          itemId: line.itemId,
          godownId: bill.godownId!,
          billLineId: line.id,
          date: bill.date,
          quantity: line.quantity,
          remaining: line.quantity,
          landedRate: row.landedRate,
        },
      });
    }
  }
}
