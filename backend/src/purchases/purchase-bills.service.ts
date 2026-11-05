import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { dateOnly, isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import type { LandedCostMethod, Prisma } from '../generated/prisma/client.js';
import { loadItemFacts } from '../items/item-document-facts.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import { restateBatchCost } from '../stock/stock-out.js';
import type { CreatePurchaseBillDto, LastPurchaseRatesQueryDto, ListPurchaseBillsQueryDto } from './dto/purchase-bill.dto.js';
import { companyState, liveGodown, liveVendor } from './purchase-context.js';
import {
  allocateLandedCost,
  billDueDays,
  billFigures,
  billTax,
  chargeRate,
  lineWeightKg,
  money,
  pendingQuantity,
  type BillLineInput,
} from './purchase-rules.js';
import { billInclude, toBillView, type PurchaseBillView } from './purchase-views.js';

type Db = Prisma.TransactionClient;

const fail = (message: string): never => {
  throw new BadRequestException(message);
};

const LANDED_METHOD_TEXT: Record<LandedCostMethod, string> = { VALUE: 'value', QUANTITY: 'quantity', WEIGHT: 'weight' };

// Vendor bills. A goods bill brings its lines into stock (one batch per line)
// at the landed rate: the line's own cost plus its share of the freight on
// the bill and of every charges bill tagged to it. Tagging, voiding or
// changing the spread re-works the landed rates of that goods bill and its
// batches in the same transaction. Bills are not edited once saved: void and
// enter again, as the vendor's paper does not change.
@Injectable()
export class PurchaseBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
  ) {}

  async list(query: ListPurchaseBillsQueryDto): Promise<PurchaseBillView[]> {
    const bills = await this.prisma.purchaseBill.findMany({
      where: { kind: query.kind, vendorId: query.vendorId },
      include: billInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return bills.map(toBillView);
  }

  async get(id: string): Promise<PurchaseBillView> {
    return toBillView(await this.prisma.purchaseBill.findUniqueOrThrow({ where: { id }, include: billInclude }));
  }

  create(dto: CreatePurchaseBillDto, userId: string): Promise<PurchaseBillView> {
    return this.prisma.$transaction(async (tx) => {
      const vendor = await liveVendor(tx, dto.vendorId);
      const state = await companyState(tx);
      const goods = dto.kind === 'GOODS';
      const lines = goods ? (dto.lines ?? []) : [];
      const charges = dto.charges ?? [];
      if (goods) {
        if (lines.length === 0) fail('Add at least one item');
        if (vendor.isGta) fail('A goods transport agency bills freight only: enter it as a freight, loading or labour bill');
        if (!dto.godownId) fail('Pick the godown the goods came into');
        await liveGodown(tx, dto.godownId!);
        if (dto.landedCostForId) fail('Only a freight, loading or labour bill is added to a purchase');
      } else {
        if (dto.lines?.length) fail('A freight, loading or labour bill has no items');
        if (charges.length === 0) fail('Add at least one charge');
        if (dto.purchaseOrderId || dto.godownId) fail('A freight, loading or labour bill has no order or godown');
      }
      const dueDate = dto.dueDate ?? isoDate(new Date(dateOnly(dto.date).getTime() + billDueDays(vendor) * 86_400_000));
      if (dueDate < dto.date) fail('Due date is before the bill date');

      const twice = await tx.purchaseBill.findUnique({
        where: { vendorId_vendorBillNumber: { vendorId: vendor.id, vendorBillNumber: dto.vendorBillNumber } },
        select: { reference: true },
      });
      if (twice) throw new ConflictException(`Bill ${dto.vendorBillNumber} from this vendor is already entered as ${twice.reference}`);

      const tax = billTax(state, vendor, dto.sourceOfSupply ?? null);
      const facts = await loadItemFacts(tx, lines.map((line) => line.itemId), dto.date);
      await this.checkOrder(tx, dto, vendor.id);

      const heads = await tx.accountHead.findMany({
        where: { id: { in: [...new Set(charges.map((charge) => charge.headId))] } },
        select: { id: true, name: true, nature: true, gst: true, gstRatePct: true, allocation: true, isArchived: true },
      });
      const headOf = new Map(heads.map((head) => [head.id, head]));
      for (const charge of charges) {
        const head = headOf.get(charge.headId);
        if (!head || !head.nature.endsWith('EXPENSE')) fail('A charge must be booked under an expense head');
        if (head!.isArchived) fail(`${head!.name} is archived`);
      }
      if (dto.landedCostForId) {
        if (!charges.some((charge) => headOf.get(charge.headId)?.allocation === 'ITEM_COST')) {
          fail('Only charges under a head that lands on item cost (freight inward, unloading, labour) can be added to a purchase');
        }
        const target = await tx.purchaseBill.findUnique({ where: { id: dto.landedCostForId }, select: { kind: true, status: true } });
        if (!target || target.kind !== 'GOODS' || target.status !== 'OPEN') fail('Add the cost to an open goods bill');
      }

      const lineInputs: BillLineInput[] = lines.map((line) => {
        const item = facts.get(line.itemId)!;
        if (item.isArchived) fail(`${item.name} is archived`);
        if (line.quantity <= 0) fail(`Enter the quantity of ${item.name}`);
        return {
          quantity: line.quantity,
          rate: line.rate,
          discountPct: line.discountPct ?? 0,
          gstRatePct: line.gstRatePct,
          itcEligible: tax.itc && line.itcEligible !== false,
          weightKg: lineWeightKg(line.quantity, item.unit, item.weightKg),
        };
      });
      const chargeInputs = charges.map((charge) => {
        const head = headOf.get(charge.headId)!;
        const printed = charge.gstRatePct ?? 18;
        return { amount: charge.amount, gstRatePct: chargeRate(tax, { gst: head.gst, gstRatePct: toNumber(head.gstRatePct) }, printed) };
      });
      const figures = billFigures(dto.kind, lineInputs, chargeInputs, tax);

      const claimed = await this.numbers.issue(tx, 'PURCHASE', dto.date);
      const bill = await tx.purchaseBill.create({
        data: {
          kind: dto.kind,
          reference: claimed.number,
          issuedNumberId: claimed.id,
          vendorBillNumber: dto.vendorBillNumber,
          date: dateOnly(dto.date),
          dueDate: dateOnly(dueDate),
          vendorId: vendor.id,
          sourceOfSupply: dto.sourceOfSupply ?? vendor.placeOfSupply,
          regime: tax.regime,
          godownId: goods ? dto.godownId : null,
          purchaseOrderId: goods ? (dto.purchaseOrderId ?? null) : null,
          allocation: dto.allocation ?? 'VALUE',
          landedCostForId: dto.landedCostForId ?? null,
          ewayBillNumber: dto.ewayBillNumber ?? null,
          ewayBillDate: dto.ewayBillDate ? dateOnly(dto.ewayBillDate) : null,
          vehicleNumber: dto.vehicleNumber ?? null,
          notes: dto.notes ?? null,
          goodsValue: figures.goodsValue,
          chargesValue: figures.chargesValue,
          taxable: figures.taxable,
          cgst: figures.cgst,
          sgst: figures.sgst,
          igst: figures.igst,
          tax: figures.tax,
          itcClaimable: figures.itcClaimable,
          itcLost: figures.itcLost,
          roundOff: figures.roundOff,
          payable: figures.payable,
          cost: figures.cost,
          createdById: userId,
          lines: {
            create: lines.map((line, position) => {
              const item = facts.get(line.itemId)!;
              const own = figures.lines[position];
              return {
                position,
                itemId: line.itemId,
                orderLineId: line.orderLineId ?? null,
                description: item.name,
                hsn: item.hsn,
                unit: item.unit,
                quantity: line.quantity,
                rate: line.rate,
                discountPct: line.discountPct ?? 0,
                gstRatePct: line.gstRatePct,
                itcEligible: lineInputs[position].itcEligible,
                taxable: own.taxable,
                tax: own.tax,
                ownCost: own.ownCost,
                landedShare: 0,
                landedCost: own.ownCost,
                landedRate: 0,
              };
            }),
          },
          charges: {
            create: charges.map((charge, position) => ({
              position,
              headId: charge.headId,
              description: charge.description ?? null,
              amount: charge.amount,
              gstRatePct: figures.chargeRates[position],
              tax: figures.chargeTaxes[position],
            })),
          },
        },
        select: { id: true },
      });
      if (goods) await this.land(tx, bill.id);
      if (dto.landedCostForId) await this.land(tx, dto.landedCostForId);
      return toBillView(await tx.purchaseBill.findUniqueOrThrow({ where: { id: bill.id }, include: billInclude }));
    });
  }

  /** How a goods bill's freight and tagged charges spread over its lines. */
  setAllocation(id: string, allocation: LandedCostMethod): Promise<PurchaseBillView> {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.purchaseBill.findUniqueOrThrow({ where: { id }, select: { kind: true, status: true } });
      if (bill.kind !== 'GOODS' || bill.status !== 'OPEN') fail('Only an open goods bill spreads landed cost');
      await tx.purchaseBill.update({ where: { id }, data: { allocation } });
      await this.land(tx, id);
      return toBillView(await tx.purchaseBill.findUniqueOrThrow({ where: { id }, include: billInclude }));
    });
  }

  /**
   * Voids a bill. A goods bill takes its stock back out, so none of it may
   * have been sold, and its tagged charges bills must be voided (or moved)
   * first. A charges bill's cost comes off the purchase it was added to.
   */
  void(id: string): Promise<PurchaseBillView> {
    return this.prisma.$transaction(async (tx) => {
      const [bill] = await tx.$queryRaw<{ kind: string; status: string; landedCostForId: string | null; issuedNumberId: string | null }[]>`
        SELECT "kind", "status", "landedCostForId", "issuedNumberId" FROM "PurchaseBill" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!bill) fail('That bill does not exist');
      if (bill.status === 'VOID') throw new ConflictException('This bill is already void');
      if (bill.kind === 'GOODS') {
        const tagged = await tx.purchaseBill.count({ where: { landedCostForId: id, status: 'OPEN' } });
        if (tagged > 0) throw new ConflictException('Freight, loading or labour bills are added to this purchase. Void them first.');
        const batches = await tx.stockBatch.findMany({ where: { billLine: { billId: id } }, select: { quantity: true, remaining: true } });
        if (batches.some((batch) => !batch.remaining.equals(batch.quantity))) {
          throw new ConflictException('Some of this stock has already gone out, so the bill cannot be voided');
        }
        await tx.stockBatch.deleteMany({ where: { billLine: { billId: id } } });
      }
      await tx.purchaseBill.update({ where: { id }, data: { status: 'VOID' } });
      if (bill.issuedNumberId) await this.numbers.cancel(tx, bill.issuedNumberId);
      if (bill.landedCostForId) await this.land(tx, bill.landedCostForId);
      return toBillView(await tx.purchaseBill.findUniqueOrThrow({ where: { id }, include: billInclude }));
    });
  }

  /** The rate last paid for each item: from this vendor first, else from any vendor. */
  async lastRates(query: LastPurchaseRatesQueryDto): Promise<{ itemId: string; rate: number; date: string; vendorName: string; fromThisVendor: boolean }[]> {
    if (query.itemIds.length === 0) return [];
    const latest = (vendorId?: string) =>
      this.prisma.purchaseBillLine.findMany({
        where: { itemId: { in: query.itemIds }, bill: { status: 'OPEN', vendorId } },
        orderBy: [{ itemId: 'asc' }, { bill: { date: 'desc' } }, { bill: { createdAt: 'desc' } }],
        distinct: ['itemId'],
        select: { itemId: true, rate: true, bill: { select: { date: true, vendor: { select: { displayName: true } } } } },
      });
    const [own, any] = await Promise.all([query.vendorId ? latest(query.vendorId) : Promise.resolve([]), latest()]);
    const ownOf = new Map(own.map((row) => [row.itemId, row]));
    return query.itemIds.flatMap((itemId) => {
      const row = ownOf.get(itemId) ?? any.find((candidate) => candidate.itemId === itemId);
      return row
        ? [{ itemId, rate: toNumber(row.rate), date: isoDate(row.bill.date), vendorName: row.bill.vendor.displayName, fromThisVendor: ownOf.has(itemId) }]
        : [];
    });
  }

  /** An order the bill fills: open, the same vendor, and lines still pending. */
  private async checkOrder(tx: Db, dto: CreatePurchaseBillDto, vendorId: string) {
    const lines = dto.lines ?? [];
    const linked = lines.filter((line) => line.orderLineId);
    if (!dto.purchaseOrderId) {
      if (linked.length) fail('Pick the purchase order these lines fill');
      return;
    }
    await tx.$queryRaw`SELECT 1 FROM "PurchaseOrder" WHERE "id" = ${dto.purchaseOrderId}::uuid FOR UPDATE`;
    const order = await tx.purchaseOrder.findUnique({
      where: { id: dto.purchaseOrderId },
      select: {
        vendorId: true,
        status: true,
        number: true,
        lines: { select: { id: true, itemId: true, quantity: true, billLines: { where: { bill: { status: 'OPEN' } }, select: { quantity: true } } } },
      },
    });
    if (!order) return fail('That purchase order does not exist');
    if (order.vendorId !== vendorId) fail(`Order ${order.number} is with another vendor`);
    if (order.status !== 'OPEN') fail(`Order ${order.number} is ${order.status.toLowerCase()}`);
    const orderLines = new Map(order.lines.map((line) => [line.id, line]));
    const taking = new Map<string, number>();
    for (const line of linked) {
      const orderLine = orderLines.get(line.orderLineId!);
      if (!orderLine) fail(`A line is not on order ${order.number}`);
      if (orderLine!.itemId !== line.itemId) fail(`A line's item differs from order ${order.number}`);
      taking.set(orderLine!.id, (taking.get(orderLine!.id) ?? 0) + line.quantity);
    }
    for (const [lineId, quantity] of taking) {
      const orderLine = orderLines.get(lineId)!;
      const received = orderLine.billLines.reduce((sum, row) => sum + toNumber(row.quantity), 0);
      const pending = pendingQuantity(toNumber(orderLine.quantity), received);
      if (quantity > pending + 1e-9) fail(`More than order ${order.number} still has to come on a line (${pending} pending). Bill the extra without the order line.`);
    }
  }

  /**
   * Works out a goods bill's landed rates again: its own freight plus every
   * open charges bill tagged to it, spread by the bill's method, then writes
   * them to the lines and the stock batches (made here on first landing).
   */
  private async land(tx: Db, goodsBillId: string) {
    const bill = await tx.purchaseBill.findUniqueOrThrow({
      where: { id: goodsBillId },
      select: {
        reference: true,
        status: true,
        date: true,
        godownId: true,
        allocation: true,
        chargesValue: true,
        lines: { orderBy: { position: 'asc' }, include: { item: { select: { weightKg: true, name: true } }, batch: { select: { id: true } } } },
        taggedCharges: { where: { status: 'OPEN' }, select: { cost: true } },
      },
    });
    if (bill.status !== 'OPEN') return;
    const charges = money(toNumber(bill.chargesValue) + bill.taggedCharges.reduce((sum, tagged) => sum + toNumber(tagged.cost), 0));
    const lines = bill.lines.map((line) => ({
      quantity: toNumber(line.quantity),
      weightKg: lineWeightKg(toNumber(line.quantity), line.unit, toNumber(line.item.weightKg)),
      taxable: toNumber(line.taxable),
      ownCost: toNumber(line.ownCost),
    }));
    const rows = allocateLandedCost(lines, charges, bill.allocation);
    if (!rows) {
      const unknown = bill.lines.find((_, index) => lines[index].weightKg === null);
      fail(`${bill.reference}: the weight of ${unknown?.item.name ?? 'an item'} is unknown, so it cannot be spread by ${LANDED_METHOD_TEXT[bill.allocation]}. Set its weight per unit, or spread by value.`);
    }
    for (const [index, line] of bill.lines.entries()) {
      const row = rows![index];
      await tx.purchaseBillLine.update({ where: { id: line.id }, data: row });
      if (line.batch) {
        await tx.stockBatch.update({ where: { id: line.batch.id }, data: { landedRate: row.landedRate } });
        // Goods already sold from this batch now cost the new rate on their invoices.
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
}
