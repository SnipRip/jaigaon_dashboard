import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { dateOnly, isoDate, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma, ShipmentStage } from '../generated/prisma/client.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import { liveVendor } from '../purchases/purchase-context.js';
import type { LinkExpensesDto, ShipmentDto, ShipmentQueryDto, ShipmentStageDto } from './dto/shipment.dto.js';
import { liveShipment } from './shipment-locks.js';
import { invoiceProblem, invoicesLocked, nextStage, papersProblem, SHIPMENT_STAGES, STAGE_NAMES, stageDateProblem, stageIndex } from './shipment-rules.js';
import { carried, shipmentInclude, toShipmentView, type ShipmentExpenseView, type ShipmentView } from './shipment-views.js';

type Tx = Prisma.TransactionClient;

const fail = (message: string | null) => {
  if (message) throw new BadRequestException(message);
};

const expenseSelect = {
  id: true,
  number: true,
  date: true,
  description: true,
  amount: true,
  cost: true,
  payee: true,
  cancelledAt: true,
  head: { select: { name: true } },
  vendor: { select: { displayName: true } },
  invoice: { select: { id: true, number: true } },
} as const satisfies Prisma.ExpenseSelect;

// Shipments: a truck to Bhutan with one buyer's export invoices. In each
// transaction the shipment row is locked FOR UPDATE first, then the
// invoices (id order) or expenses it touches, so a stage move, an edit, a
// cancel and an expense linked to it never interleave; invoice cancel locks
// the invoice and asks for a live shipment (shipment-locks.ts). The number
// comes from the SHIPMENT series. Not a voucher (posts nothing): transport
// details may be corrected; the invoices only while it is at our yard.
@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
  ) {}

  async list(query: ShipmentQueryDto): Promise<ShipmentView[]> {
    const rows = await this.prisma.shipment.findMany({
      where: { partyId: query.partyId },
      include: shipmentInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => toShipmentView(row));
  }

  /** One shipment with its expenses (on the truck and on its invoices) and its profit. */
  async get(id: string): Promise<ShipmentView> {
    return this.detail(this.prisma, id);
  }

  create(dto: ShipmentDto, userId: string): Promise<ShipmentView> {
    return this.prisma.$transaction(async (tx) => {
      fail(dto.date > todayInIndia() ? 'The loading date is after today' : null);
      await this.checkParties(tx, dto);
      await this.claimInvoices(tx, dto, null);
      const id = randomUUID();
      const issued = await this.numbers.issue(tx, 'SHIPMENT', dto.date, { typed: dto.number ?? undefined, documentId: id });
      await tx.shipment.create({
        data: {
          id,
          number: issued.number,
          issuedNumberId: issued.id,
          ...this.fields(dto),
          createdById: userId,
          invoices: { create: dto.invoiceIds.map((invoiceId) => ({ invoiceId })) },
          events: { create: { stage: 'PLANNED', date: dateOnly(dto.date), byId: userId } },
        },
      });
      return this.detail(tx, id);
    });
  }

  /** Corrects the transport details; the buyer and invoices only while the truck is at our yard. */
  update(id: string, dto: ShipmentDto): Promise<ShipmentView> {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await liveShipment(tx, id);
      const current = await tx.shipmentInvoice.findMany({ where: { shipmentId: id }, select: { invoiceId: true } });
      const same = current.length === dto.invoiceIds.length && current.every((row) => dto.invoiceIds.includes(row.invoiceId));
      if (invoicesLocked(shipment.stage) && (!same || dto.partyId !== shipment.partyId)) {
        fail('The truck has left the yard: its invoices can no longer change');
      }
      fail(dto.date > todayInIndia() ? 'The loading date is after today' : null);
      const later = await tx.shipmentEvent.findFirst({ where: { shipmentId: id, stage: { not: 'PLANNED' } }, orderBy: { date: 'asc' }, select: { date: true } });
      if (later && dto.date > isoDate(later.date)) fail('The loading date is after a later stage');
      await this.checkParties(tx, dto);
      await this.claimInvoices(tx, dto, id);
      await tx.shipmentInvoice.deleteMany({ where: { shipmentId: id, invoiceId: { notIn: dto.invoiceIds } } });
      await tx.shipmentInvoice.createMany({ data: dto.invoiceIds.map((invoiceId) => ({ shipmentId: id, invoiceId })), skipDuplicates: true });
      await tx.shipment.update({ where: { id }, data: this.fields(dto) });
      await tx.shipmentEvent.updateMany({ where: { shipmentId: id, stage: 'PLANNED' }, data: { date: dateOnly(dto.date) } });
      return this.detail(tx, id);
    });
  }

  /** Moves to the next stage once every invoice has the papers it needs. */
  advance(id: string, dto: ShipmentStageDto, userId: string): Promise<ShipmentView> {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await liveShipment(tx, id);
      const next = nextStage(shipment.stage);
      if (!next) throw new ConflictException('This shipment is already delivered');
      if (dto.stage !== next) throw new ConflictException(`This shipment is already ${STAGE_NAMES[shipment.stage]}; reload the page`);
      const row = await tx.shipment.findUniqueOrThrow({ where: { id }, include: shipmentInclude });
      // Papers are attached on the invoices, which are not locked here: a
      // paper removed meanwhile only makes the stage early, never wrong money.
      fail(papersProblem(next, carried(row)));
      const last = row.events.at(-1)!;
      fail(stageDateProblem(dto.date, isoDate(last.date), todayInIndia()));
      await tx.shipmentEvent.create({ data: { shipmentId: id, stage: next, date: dateOnly(dto.date), note: dto.note ?? null, byId: userId } });
      await tx.shipment.update({ where: { id }, data: { stage: next } });
      return this.detail(tx, id);
    });
  }

  /** Undoes the latest stage (moved by mistake). */
  stepBack(id: string): Promise<ShipmentView> {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await liveShipment(tx, id);
      if (shipment.stage === 'PLANNED') fail('The shipment is at its first stage');
      const previous: ShipmentStage = SHIPMENT_STAGES[stageIndex(shipment.stage) - 1];
      await tx.shipmentEvent.deleteMany({ where: { shipmentId: id, stage: shipment.stage } });
      await tx.shipment.update({ where: { id }, data: { stage: previous } });
      return this.detail(tx, id);
    });
  }

  /** Cancels a shipment entered by mistake: its number is cancelled and its invoices may go on another truck. */
  cancel(id: string, reason: string): Promise<ShipmentView> {
    return this.prisma.$transaction(async (tx) => {
      await liveShipment(tx, id);
      const linked = await tx.expense.findMany({ where: { shipmentId: id, cancelledAt: null }, select: { number: true } });
      if (linked.length) {
        throw new ConflictException(`Expenses are linked to this shipment (${linked.map((row) => row.number).join(', ')}). Unlink or cancel them first.`);
      }
      const { issuedNumberId } = await tx.shipment.findUniqueOrThrow({ where: { id }, select: { issuedNumberId: true } });
      await this.numbers.cancel(tx, issuedNumberId);
      await tx.shipmentInvoice.updateMany({ where: { shipmentId: id }, data: { released: true } });
      await tx.shipment.update({ where: { id }, data: { cancelledAt: new Date(), cancelReason: reason } });
      return this.detail(tx, id);
    });
  }

  /** Links shipment expenses saved before the shipment was (allocation SHIPMENT, no shipment yet). */
  linkExpenses(id: string, dto: LinkExpensesDto): Promise<ShipmentView> {
    return this.prisma.$transaction(async (tx) => {
      await liveShipment(tx, id);
      const ids = [...dto.expenseIds].sort();
      const rows = await tx.$queryRaw<{ id: string; number: string; allocation: string; shipmentId: string | null; cancelledAt: Date | null }[]>`
        SELECT "id", "number", "allocation", "shipmentId", "cancelledAt" FROM "Expense"
        WHERE "id" = ANY(${ids}::uuid[]) ORDER BY "id" FOR UPDATE`;
      if (rows.length !== ids.length) fail('One of those expenses does not exist');
      for (const row of rows) {
        if (row.cancelledAt) fail(`${row.number} is cancelled`);
        if (row.allocation !== 'SHIPMENT') fail(`${row.number} is not a shipment expense`);
        if (row.shipmentId) fail(`${row.number} is already linked to a shipment`);
      }
      await tx.expense.updateMany({ where: { id: { in: ids } }, data: { shipmentId: id } });
      return this.detail(tx, id);
    });
  }

  /** Takes an expense linked by mistake off the shipment; it waits to be linked again. */
  unlinkExpense(id: string, expenseId: string): Promise<ShipmentView> {
    return this.prisma.$transaction(async (tx) => {
      await liveShipment(tx, id);
      const [row] = await tx.$queryRaw<{ shipmentId: string | null }[]>`SELECT "shipmentId" FROM "Expense" WHERE "id" = ${expenseId}::uuid FOR UPDATE`;
      if (row?.shipmentId !== id) fail('That expense is not linked to this shipment');
      await tx.expense.update({ where: { id: expenseId }, data: { shipmentId: null } });
      return this.detail(tx, id);
    });
  }

  private fields(dto: ShipmentDto) {
    return {
      date: dateOnly(dto.date),
      partyId: dto.partyId,
      vehicleNumber: dto.vehicleNumber,
      transporterId: dto.transporterId ?? null,
      driverName: dto.driverName ?? null,
      driverPhone: dto.driverPhone ?? null,
      destination: dto.destination,
      borderPoint: dto.borderPoint,
      customsAgent: dto.customsAgent ?? null,
      sealNumber: dto.sealNumber ?? null,
      packages: dto.packages ?? null,
      grossWeightKg: dto.grossWeightKg ?? null,
      notes: dto.notes ?? null,
    };
  }

  private async checkParties(tx: Tx, dto: ShipmentDto) {
    const buyer = await tx.party.findUnique({ where: { id: dto.partyId }, select: { isCustomer: true } });
    if (!buyer?.isCustomer) fail('Pick the buyer');
    if (dto.transporterId) await liveVendor(tx, dto.transporterId);
  }

  /** Locks the invoices in id order and checks each may ride on this truck. */
  private async claimInvoices(tx: Tx, dto: ShipmentDto, shipmentId: string | null) {
    const ids = [...dto.invoiceIds].sort();
    const rows = await tx.$queryRaw<{ id: string; number: string; kind: 'LOCAL' | 'EXPORT'; status: 'ISSUED' | 'CANCELLED'; partyId: string; date: Date }[]>`
      SELECT "id", "number", "kind", "status", "partyId", "date" FROM "Invoice"
      WHERE "id" = ANY(${ids}::uuid[]) ORDER BY "id" FOR UPDATE`;
    if (rows.length !== ids.length) fail('One of those invoices does not exist');
    const taken = await tx.shipmentInvoice.findMany({
      where: { invoiceId: { in: ids }, released: false, ...(shipmentId ? { shipmentId: { not: shipmentId } } : {}) },
      select: { invoiceId: true, shipment: { select: { number: true } } },
    });
    for (const row of rows) {
      const onShipment = taken.find((take) => take.invoiceId === row.id)?.shipment.number ?? null;
      fail(invoiceProblem({ ...row, date: isoDate(row.date), onShipment }, dto.partyId, dto.date));
    }
  }

  private async detail(db: Tx | PrismaService, id: string): Promise<ShipmentView> {
    const row = await db.shipment.findUnique({ where: { id }, include: shipmentInclude });
    if (!row) throw new NotFoundException('That shipment does not exist');
    const invoiceIds = row.invoices.map(({ invoice }) => invoice.id);
    const expenses = await db.expense.findMany({
      where: { OR: [{ shipmentId: id }, ...(invoiceIds.length ? [{ invoiceId: { in: invoiceIds } }] : [])] },
      select: expenseSelect,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return toShipmentView(row, {
      expenses: expenses.map(
        (expense): ShipmentExpenseView => ({
          id: expense.id,
          number: expense.number,
          date: isoDate(expense.date),
          head: expense.head.name,
          description: expense.description,
          payeeName: expense.vendor?.displayName ?? expense.payee ?? '',
          amount: toNumber(expense.amount),
          cost: toNumber(expense.cost),
          invoice: expense.invoice,
          cancelled: Boolean(expense.cancelledAt),
        }),
      ),
    });
  }
}
