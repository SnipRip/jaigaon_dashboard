import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { dateOnly, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { loadItemFacts } from '../items/item-document-facts.js';
import { enteredColumns, toBaseLine } from '../items/line-units.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import type { PurchaseOrderDto } from './dto/purchase-order.dto.js';
import { companyState, liveGodown, liveVendor } from './purchase-context.js';
import { billFigures, billTax } from './purchase-rules.js';
import { orderInclude, toOrderView, type PurchaseOrderView } from './purchase-views.js';

type Db = Prisma.TransactionClient;

// Purchase orders: what we asked a vendor for, at the agreed rate. No stock
// moves here; goods bills against the order bring it in, and the order shows
// what each line has received and what is still to come.
@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
  ) {}

  async list(vendorId?: string): Promise<PurchaseOrderView[]> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { vendorId },
      include: orderInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return this.views(this.prisma, orders);
  }

  async get(id: string): Promise<PurchaseOrderView> {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id }, include: orderInclude });
    return (await this.views(this.prisma, [order]))[0];
  }

  create(dto: PurchaseOrderDto, userId: string): Promise<PurchaseOrderView> {
    return this.prisma.$transaction(async (tx) => {
      const lines = await this.check(tx, dto);
      const claimed = await this.numbers.issue(tx, 'PURCHASE_ORDER', dto.date);
      const order = await tx.purchaseOrder.create({
        data: { ...this.row(dto), number: claimed.number, issuedNumberId: claimed.id, createdById: userId, lines: { create: lines } },
        include: orderInclude,
      });
      return (await this.views(tx, [order]))[0];
    });
  }

  /** Only an open order that nothing has been received against can change. */
  update(id: string, dto: PurchaseOrderDto): Promise<PurchaseOrderView> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockUnreceived(tx, id, 'changed');
      const lines = await this.check(tx, dto);
      await tx.purchaseOrderLine.deleteMany({ where: { orderId: id } });
      const order = await tx.purchaseOrder.update({
        where: { id },
        data: { ...this.row(dto), lines: { create: lines } },
        include: orderInclude,
      });
      return (await this.views(tx, [order]))[0];
    });
  }

  /** Short close: nothing more is expected, whatever is still pending. */
  async close(id: string): Promise<PurchaseOrderView> {
    const { count } = await this.prisma.purchaseOrder.updateMany({ where: { id, status: 'OPEN' }, data: { status: 'CLOSED' } });
    if (count === 0) throw new ConflictException('Only an open order can be closed');
    return this.get(id);
  }

  /** Cancels an order nothing has come in against; its number stays cancelled in the register. */
  cancel(id: string): Promise<PurchaseOrderView> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockUnreceived(tx, id, 'cancelled');
      await tx.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
      if (order.issuedNumberId) await this.numbers.cancel(tx, order.issuedNumberId);
      const row = await tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: orderInclude });
      return (await this.views(tx, [row]))[0];
    });
  }

  private async lockUnreceived(tx: Db, id: string, done: 'changed' | 'cancelled') {
    const [order] = await tx.$queryRaw<{ status: string; issuedNumberId: string | null }[]>`
      SELECT "status", "issuedNumberId" FROM "PurchaseOrder" WHERE "id" = ${id}::uuid FOR UPDATE`;
    if (!order) throw new BadRequestException('That order does not exist');
    if (order.status !== 'OPEN') throw new ConflictException(`Only an open order can be ${done}`);
    const received = await tx.purchaseBill.count({ where: { purchaseOrderId: id, status: 'OPEN' } });
    if (received > 0) throw new ConflictException(`Goods have been billed against this order, so it cannot be ${done}. Close it instead.`);
    return order;
  }

  private async check(tx: Db, dto: PurchaseOrderDto) {
    await liveVendor(tx, dto.vendorId);
    await liveGodown(tx, dto.godownId);
    if (dto.expectedDate && dto.expectedDate < dto.date) throw new BadRequestException('Expected date is before the order date');
    const facts = await loadItemFacts(tx, dto.lines.map((line) => line.itemId), dto.date);
    return dto.lines.map((line, position) => {
      const item = facts.get(line.itemId)!;
      if (item.isArchived) throw new BadRequestException(`${item.name} is archived`);
      if (line.quantity <= 0) throw new BadRequestException(`Enter the quantity of ${item.name}`);
      const gstRatePct = line.gstRatePct ?? item.gstRatePct;
      if (gstRatePct === null) throw new BadRequestException(`${item.name} has no GST rate: set its HSN in the HSN master, or enter the rate`);
      const units = toBaseLine(item, line);
      return { position, itemId: line.itemId, quantity: units.quantity, ...enteredColumns(units), discountPct: line.discountPct ?? 0, gstRatePct };
    });
  }

  private row(dto: PurchaseOrderDto) {
    return {
      vendorId: dto.vendorId,
      date: dateOnly(dto.date),
      expectedDate: dto.expectedDate ? dateOnly(dto.expectedDate) : null,
      godownId: dto.godownId,
      terms: dto.terms ?? null,
      notes: dto.notes ?? null,
    };
  }

  /** Views with units and totals; one query each for the vendors, units and our state. */
  private async views(db: Db | PrismaService, orders: Prisma.PurchaseOrderGetPayload<{ include: typeof orderInclude }>[]) {
    if (orders.length === 0) return [];
    const tx = db as Db;
    const [state, vendors, facts] = await Promise.all([
      companyState(tx),
      tx.party.findMany({
        where: { id: { in: [...new Set(orders.map((order) => order.vendorId))] } },
        select: { id: true, treatment: true, placeOfSupply: true, isGta: true },
      }),
      loadItemFacts(tx, orders.flatMap((order) => order.lines.map((line) => line.itemId)), todayInIndia()),
    ]);
    const units = new Map([...facts.values()].map((item) => [item.id, item.unit]));
    const vendorOf = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    return orders.map((order) => {
      // As entered: typed quantity × typed rate is the line's value exactly.
      const lines = order.lines.map((line) => ({
        quantity: toNumber(line.lineQuantity),
        rate: toNumber(line.lineRate),
        discountPct: toNumber(line.discountPct),
        gstRatePct: toNumber(line.gstRatePct),
        itcEligible: true,
        weightKg: null,
      }));
      const figures = billFigures('GOODS', lines, [], billTax(state, vendorOf.get(order.vendorId)!, null));
      return toOrderView(order, units, { taxable: figures.taxable, tax: figures.tax, total: figures.payable });
    });
  }
}
