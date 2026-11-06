import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { dateOnly, isoDate, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { PrismaService } from '../database/prisma.service.js';
import { customerOwes } from '../invoices/invoice-rules.js';
import type { Prisma, SettlementDirection } from '../generated/prisma/client.js';
import type { SaleRegime } from '../generated/prisma/enums.js';
import { NumberSeriesService } from '../number-series/number-series.service.js';
import type { AllocationDto, ApplyAdvanceDto, SettlementDto } from './dto/settlement.dto.js';
import {
  accountProblem,
  advanceLeft,
  ageBucket,
  allocationProblem,
  balanceOf,
  brcProblem,
  cashLimitProblem,
  dateProblem,
  invoiceDueDate,
  msmeDueDate,
  partyProblem,
  REFUND_DIRECTION,
  refundPartyProblem,
  refundShapeProblem,
  targetFits,
  WORD,
  type AllocationPlan,
} from './settlement-rules.js';
import { settlementInclude, toSettlementView, type OpenDocumentView, type SettlementView } from './settlement-views.js';

type Tx = Prisma.TransactionClient;
type Db = Tx | PrismaService;

const money = (value: number) => Math.round(value * 100) / 100;
/** An aggregate's sum, 0 when there were no rows. */
const sumOf = (value: Prisma.Decimal | null) => (value ? value.toNumber() : 0);
/** What a customer settles on an invoice (goods value only on an export with IGST paid). */
const owedOn = (invoice: { regime: SaleRegime; total: Prisma.Decimal; igst: Prisma.Decimal }) =>
  customerOwes({ regime: invoice.regime, total: toNumber(invoice.total), igst: toNumber(invoice.igst) });
const fail = (message: string | null) => {
  if (message) throw new BadRequestException(message);
};

interface PartyFacts {
  isCustomer: boolean;
  isVendor: boolean;
  isArchived: boolean;
  openingBalance: Prisma.Decimal;
  openingBalanceSide: 'RECEIVABLE' | 'PAYABLE';
}

interface Target extends AllocationPlan {
  allocation: AllocationDto;
  exportInvoice: boolean;
}

/** Opening balances settle in the direction they run: what customers owe us comes in, what we owe vendors goes out. */
const OPENING_SIDE = { RECEIPT: 'RECEIVABLE', PAYMENT: 'PAYABLE' } as const;
const SERIES = { RECEIPT: 'RECEIPT', PAYMENT: 'PAYMENT' } as const;

// Receipts from customers and payments to vendors (applied to bills and to
// expenses bought on credit). In one transaction: the
// party row is locked (so two cash receipts the same day, or two settlements
// of the same opening balance, cannot cross), then each invoice or bill it is
// applied to (so a cancel or void, or another settlement, waits); balances
// are worked out from live allocations, the number comes from the RECEIPT or
// PAYMENT series, and a BRC on an export receipt is attached to each export
// invoice that has none yet. Never edited: cancel and enter again; what is
// left unapplied can be applied later, or refunded: a refund is an entry of
// the other direction applied to the advance (kind ADVANCE; settlement-rules.ts).
// Lock order everywhere: party, then documents / advances in id order.
@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumberSeriesService,
  ) {}

  async list(direction?: SettlementDirection, partyId?: string): Promise<SettlementView[]> {
    const rows = await this.prisma.settlement.findMany({
      where: { direction, partyId },
      include: settlementInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toSettlementView);
  }

  async get(id: string): Promise<SettlementView> {
    return toSettlementView(await this.prisma.settlement.findUniqueOrThrow({ where: { id }, include: settlementInclude }));
  }

  create(dto: SettlementDto, userId: string): Promise<SettlementView> {
    return this.prisma.$transaction(async (tx) => {
      const today = todayInIndia();
      const party = await lockParty(tx, dto.partyId);
      const refund = dto.allocations.some((allocation) => allocation.kind === 'ADVANCE');
      fail(refund ? refundPartyProblem(dto.direction, party) : partyProblem(dto.direction, party));

      const account = await tx.bankCashAccount.findUnique({ where: { id: dto.accountId }, select: { kind: true, isArchived: true, openingDate: true, name: true, bankName: true } });
      fail(accountProblem(dto.mode, account));
      fail(dateProblem(dto.date, isoDate(account!.openingDate), today));

      const tds = dto.tds ?? 0;
      if (!(dto.amount + tds > 0)) fail('Enter the amount');
      if (refund) {
        const applied = money(dto.allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
        fail(refundShapeProblem({ kinds: dto.allocations.map((allocation) => allocation.kind), amount: dto.amount, tds, applied, hasBrc: Boolean(dto.brcNumber || dto.brcDate) }));
      }
      if (dto.direction === 'RECEIPT' && dto.mode === 'CASH') {
        const sameDay = await tx.settlement.aggregate({
          where: { direction: 'RECEIPT', mode: 'CASH', partyId: dto.partyId, date: dateOnly(dto.date), cancelledAt: null },
          _sum: { amount: true },
        });
        fail(cashLimitProblem(dto.direction, dto.mode, dto.amount, sumOf(sameDay._sum.amount)));
      }

      const targets = await this.targets(tx, dto.direction, dto.partyId, party!, dto.allocations);
      fail(allocationProblem(targets, money(dto.amount + tds)));

      const brc = dto.brcNumber || dto.brcDate ? { number: dto.brcNumber ?? '', date: dto.brcDate ?? '' } : null;
      if (brc && (!brc.number || !brc.date)) fail('Enter both the BRC number and its date');
      fail(brcProblem(brc, dto.date, today, targets.some((target) => target.exportInvoice)));

      const id = randomUUID();
      const issued = await this.numbers.issue(tx, SERIES[dto.direction], dto.date, { typed: dto.number ?? undefined, documentId: id });
      await tx.settlement.create({
        data: {
          id,
          direction: dto.direction,
          number: issued.number,
          issuedNumberId: issued.id,
          date: dateOnly(dto.date),
          partyId: dto.partyId,
          accountId: dto.accountId,
          mode: dto.mode,
          amount: dto.amount,
          tds,
          reference: dto.reference ?? null,
          brcNumber: brc?.number ?? null,
          brcDate: brc ? dateOnly(brc.date) : null,
          notes: dto.notes ?? null,
          createdById: userId,
          allocations: { create: targets.map((target) => allocationData(target.allocation)) },
        },
      });

      if (brc) {
        // The BRC realises these export invoices: attach it to each that has none yet (invoice page, dispatch documents).
        for (const target of targets.filter((candidate) => candidate.exportInvoice)) {
          const invoiceId = target.allocation.documentId;
          const has = await tx.invoiceDocument.findUnique({ where: { invoiceId_kind: { invoiceId, kind: 'BRC' } }, select: { id: true } });
          if (has) continue;
          await tx.invoiceDocument.create({
            data: {
              invoiceId,
              kind: 'BRC',
              number: brc.number,
              date: dateOnly(brc.date),
              details: { amount: target.amount, bank: (account!.bankName ?? account!.name).slice(0, 120) },
              savedById: userId,
            },
          });
        }
      }
      return toSettlementView(await tx.settlement.findUniqueOrThrow({ where: { id }, include: settlementInclude }));
    });
  }

  /** Applies what a settlement kept as an advance to open documents of the same party. */
  applyAdvance(id: string, dto: ApplyAdvanceDto): Promise<SettlementView> {
    return this.prisma.$transaction(async (tx) => {
      // The party first (a refund of this advance locks party, then advance), then the entry.
      const owner = await tx.settlement.findUnique({ where: { id }, select: { partyId: true } });
      if (!owner) throw new NotFoundException('That receipt or payment does not exist');
      const party = await lockParty(tx, owner.partyId);
      const [settlement] = await tx.$queryRaw<{ direction: SettlementDirection; partyId: string; amount: Prisma.Decimal; tds: Prisma.Decimal; cancelledAt: Date | null }[]>`
        SELECT "direction", "partyId", "amount", "tds", "cancelledAt" FROM "Settlement" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (settlement.cancelledAt) throw new ConflictException(`This ${WORD[settlement.direction]} is cancelled`);
      if (dto.allocations.length === 0) fail('Pick what to apply it to');
      if (dto.allocations.some((allocation) => allocation.kind === 'ADVANCE')) fail('An advance is refunded on a refund entry of its own');
      const applied = await tx.settlementAllocation.aggregate({ where: { settlementId: id }, _sum: { amount: true } });
      const refunded = (await settledOf(tx, [{ kind: 'ADVANCE', id }])).get(id) ?? 0;
      const free = advanceLeft(toNumber(settlement.amount), toNumber(settlement.tds), sumOf(applied._sum.amount), refunded);
      // A document it already part-settles may take more: a second row adds to the first.
      const targets = await this.targets(tx, settlement.direction, settlement.partyId, party!, dto.allocations);
      fail(allocationProblem(targets, free));
      await tx.settlementAllocation.createMany({ data: targets.map((target) => ({ settlementId: id, ...allocationData(target.allocation) })) });
      return toSettlementView(await tx.settlement.findUniqueOrThrow({ where: { id }, include: settlementInclude }));
    });
  }

  /** Cancels a receipt or payment entered by mistake: its allocations stop counting and its number stays cancelled. */
  cancel(id: string, reason: string): Promise<SettlementView> {
    return this.prisma.$transaction(async (tx) => {
      const [settlement] = await tx.$queryRaw<{ direction: SettlementDirection; issuedNumberId: string; cancelledAt: Date | null }[]>`
        SELECT "direction", "issuedNumberId", "cancelledAt" FROM "Settlement" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!settlement) throw new NotFoundException('That receipt or payment does not exist');
      if (settlement.cancelledAt) throw new ConflictException(`This ${WORD[settlement.direction]} is already cancelled`);
      const refunds = await liveSettlementNumbers(tx, { advanceId: id });
      if (refunds.length) throw new ConflictException(`Part of this ${WORD[settlement.direction]}’s advance was refunded by ${refunds.join(', ')}. Cancel the refund first.`);
      await this.numbers.cancel(tx, settlement.issuedNumberId);
      const row = await tx.settlement.update({ where: { id }, data: { cancelledAt: new Date(), cancelReason: reason }, include: settlementInclude });
      return toSettlementView(row);
    });
  }

  /**
   * Everything money can be settled against in one direction: issued
   * invoices (receipts) or open bills (payments), and opening balances that
   * run that way, each with what live settlements applied and what is left.
   * Fully settled ones are included, for statements.
   */
  async documents(direction: SettlementDirection, partyId?: string): Promise<OpenDocumentView[]> {
    const today = todayInIndia();
    const rows: Omit<OpenDocumentView, 'settled' | 'balance' | 'ageBucket'>[] = [];
    if (direction === 'RECEIPT') {
      const invoices = await this.prisma.invoice.findMany({
        where: { status: 'ISSUED', partyId },
        select: { id: true, number: true, date: true, kind: true, regime: true, total: true, igst: true, partyId: true, party: { select: { displayName: true, creditDays: true } } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      });
      for (const invoice of invoices) {
        const date = isoDate(invoice.date);
        rows.push({
          kind: 'INVOICE',
          id: invoice.id,
          number: invoice.number,
          date,
          dueDate: invoiceDueDate(date, invoice.party.creditDays),
          partyId: invoice.partyId,
          partyName: invoice.party.displayName,
          total: owedOn(invoice),
          flag: invoice.kind === 'EXPORT' ? 'EXPORT' : null,
        });
      }
    } else {
      const bills = await this.prisma.purchaseBill.findMany({
        where: { status: 'OPEN', vendorId: partyId },
        select: { id: true, reference: true, vendorBillNumber: true, date: true, dueDate: true, payable: true, vendorId: true, vendor: { select: { displayName: true, udyamNumber: true } } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      });
      const expenses = await this.prisma.expense.findMany({
        where: { cancelledAt: null, accountId: null, vendorId: partyId ?? { not: null } },
        select: { id: true, number: true, description: true, date: true, dueDate: true, total: true, vendorId: true, vendor: { select: { displayName: true, udyamNumber: true } } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      });
      for (const expense of expenses) {
        rows.push({
          kind: 'EXPENSE',
          id: expense.id,
          number: `${expense.number} (${expense.description})`,
          date: isoDate(expense.date),
          dueDate: isoDate(expense.dueDate!),
          partyId: expense.vendorId!,
          partyName: expense.vendor!.displayName,
          total: toNumber(expense.total),
          flag: expense.vendor!.udyamNumber ? 'MSME' : null,
        });
      }
      for (const bill of bills) {
        const date = isoDate(bill.date);
        const msme = Boolean(bill.vendor.udyamNumber);
        rows.push({
          kind: 'BILL',
          id: bill.id,
          number: `${bill.reference} (${bill.vendorBillNumber})`,
          date,
          dueDate: msme ? msmeDueDate(date, isoDate(bill.dueDate)) : isoDate(bill.dueDate),
          partyId: bill.vendorId,
          partyName: bill.vendor.displayName,
          total: toNumber(bill.payable),
          flag: msme ? 'MSME' : null,
        });
      }
    }
    const openings = await this.prisma.party.findMany({
      where: {
        id: partyId,
        ...(direction === 'RECEIPT' ? { isCustomer: true } : { isVendor: true }),
        openingBalanceSide: OPENING_SIDE[direction],
        openingBalance: { gt: 0 },
      },
      select: { id: true, displayName: true, openingBalance: true, udyamNumber: true },
    });
    for (const party of openings) {
      rows.unshift({
        kind: 'OPENING',
        id: party.id,
        number: 'Opening balance',
        date: null,
        dueDate: null,
        partyId: party.id,
        partyName: party.displayName,
        total: toNumber(party.openingBalance),
        flag: direction === 'PAYMENT' && party.udyamNumber ? 'MSME' : null,
      });
    }

    const settled = await settledOf(this.prisma, rows.map((row) => ({ kind: row.kind, id: row.id })));
    return rows.map((row) => {
      const done = settled.get(row.id) ?? 0;
      return { ...row, settled: done, balance: balanceOf(row.total, done), ageBucket: ageBucket(row.dueDate, today) };
    });
  }

  /** Locks and checks each target; returns its label, open balance and whether it is an export invoice. An ADVANCE is another entry of this party, of the other direction, still holding an advance. */
  private async targets(tx: Tx, direction: SettlementDirection, partyId: string, party: PartyFacts, allocations: AllocationDto[]): Promise<Target[]> {
    const seen = new Set<string>();
    for (const allocation of allocations) {
      if (!targetFits(direction, allocation.kind)) fail(direction === 'RECEIPT' ? 'A receipt is applied to invoices' : 'A payment is applied to bills and expenses');
      if (allocation.kind === 'OPENING' && allocation.documentId !== partyId) fail('Only this party’s own opening balance can be settled');
      if (seen.has(allocation.documentId)) fail('Each document is listed once');
      seen.add(allocation.documentId);
    }
    const invoiceIds = allocations.filter((allocation) => allocation.kind === 'INVOICE').map((allocation) => allocation.documentId).sort();
    const billIds = allocations.filter((allocation) => allocation.kind === 'BILL').map((allocation) => allocation.documentId).sort();
    if (invoiceIds.length) await tx.$queryRaw`SELECT 1 FROM "Invoice" WHERE "id" = ANY(${invoiceIds}::uuid[]) ORDER BY "id" FOR UPDATE`;
    if (billIds.length) await tx.$queryRaw`SELECT 1 FROM "PurchaseBill" WHERE "id" = ANY(${billIds}::uuid[]) ORDER BY "id" FOR UPDATE`;
    const expenseIds = allocations.filter((allocation) => allocation.kind === 'EXPENSE').map((allocation) => allocation.documentId).sort();
    if (expenseIds.length) await tx.$queryRaw`SELECT 1 FROM "Expense" WHERE "id" = ANY(${expenseIds}::uuid[]) ORDER BY "id" FOR UPDATE`;
    const advanceIds = allocations.filter((allocation) => allocation.kind === 'ADVANCE').map((allocation) => allocation.documentId).sort();
    if (advanceIds.length) await tx.$queryRaw`SELECT 1 FROM "Settlement" WHERE "id" = ANY(${advanceIds}::uuid[]) ORDER BY "id" FOR UPDATE`;

    const invoices = new Map(
      (await tx.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, number: true, partyId: true, status: true, kind: true, regime: true, total: true, igst: true } })).map((row) => [row.id, row]),
    );
    const bills = new Map(
      (await tx.purchaseBill.findMany({ where: { id: { in: billIds } }, select: { id: true, reference: true, vendorId: true, status: true, payable: true } })).map((row) => [row.id, row]),
    );
    const expenses = new Map(
      (await tx.expense.findMany({ where: { id: { in: expenseIds } }, select: { id: true, number: true, vendorId: true, accountId: true, cancelledAt: true, total: true } })).map((row) => [row.id, row]),
    );
    const advances = new Map(
      (
        await tx.settlement.findMany({
          where: { id: { in: advanceIds } },
          select: { id: true, number: true, direction: true, partyId: true, amount: true, tds: true, cancelledAt: true, allocations: { select: { amount: true, advanceId: true } } },
        })
      ).map((row) => [row.id, row]),
    );
    const settled = await settledOf(tx, allocations.map((allocation) => ({ kind: allocation.kind, id: allocation.documentId })));

    return allocations.map((allocation): Target => {
      const done = settled.get(allocation.documentId) ?? 0;
      if (allocation.kind === 'INVOICE') {
        const invoice = invoices.get(allocation.documentId);
        if (!invoice || invoice.partyId !== partyId) fail('One of the invoices is not this customer’s');
        if (invoice!.status !== 'ISSUED') fail(`Invoice ${invoice!.number} is cancelled`);
        return { allocation, label: invoice!.number, amount: allocation.amount, balance: balanceOf(owedOn(invoice!), done), exportInvoice: invoice!.kind === 'EXPORT' };
      }
      if (allocation.kind === 'BILL') {
        const bill = bills.get(allocation.documentId);
        if (!bill || bill.vendorId !== partyId) fail('One of the bills is not this vendor’s');
        if (bill!.status !== 'OPEN') fail(`Bill ${bill!.reference} is void`);
        return { allocation, label: bill!.reference, amount: allocation.amount, balance: balanceOf(toNumber(bill!.payable), done), exportInvoice: false };
      }
      if (allocation.kind === 'EXPENSE') {
        const expense = expenses.get(allocation.documentId);
        if (!expense || expense.vendorId !== partyId || expense.accountId) fail('One of the expenses is not owed to this vendor');
        if (expense!.cancelledAt) fail(`Expense ${expense!.number} is cancelled`);
        return { allocation, label: expense!.number, amount: allocation.amount, balance: balanceOf(toNumber(expense!.total), done), exportInvoice: false };
      }
      if (allocation.kind === 'ADVANCE') {
        const advance = advances.get(allocation.documentId);
        const kept = REFUND_DIRECTION[direction];
        if (!advance || advance.partyId !== partyId) fail('One of the advances is not this party’s');
        if (advance!.direction !== kept) fail(`${advance!.number} is a ${WORD[advance!.direction]}: a ${WORD[direction]} refunds a ${WORD[kept]}’s advance`);
        if (advance!.cancelledAt) fail(`${advance!.number} is cancelled`);
        if (advance!.allocations.some((row) => row.advanceId)) fail(`${advance!.number} is itself a refund`);
        const applied = advance!.allocations.reduce((sum, row) => sum + toNumber(row.amount), 0);
        const balance = advanceLeft(toNumber(advance!.amount), toNumber(advance!.tds), applied, done);
        return { allocation, label: `the advance on ${advance!.number}`, amount: allocation.amount, balance, exportInvoice: false };
      }
      const opening = party.openingBalanceSide === OPENING_SIDE[direction] ? toNumber(party.openingBalance) : 0;
      if (opening <= 0) fail(`This party has no opening balance to ${direction === 'RECEIPT' ? 'collect' : 'pay'}`);
      return { allocation, label: 'the opening balance', amount: allocation.amount, balance: balanceOf(opening, done), exportInvoice: false };
    });
  }
}

async function lockParty(tx: Tx, partyId: string): Promise<PartyFacts | null> {
  const [party] = await tx.$queryRaw<PartyFacts[]>`
    SELECT "isCustomer", "isVendor", "isArchived", "openingBalance", "openingBalanceSide"
    FROM "Party" WHERE "id" = ${partyId}::uuid FOR UPDATE`;
  return party ?? null;
}

const allocationData = (allocation: AllocationDto) => ({
  invoiceId: allocation.kind === 'INVOICE' ? allocation.documentId : null,
  billId: allocation.kind === 'BILL' ? allocation.documentId : null,
  expenseId: allocation.kind === 'EXPENSE' ? allocation.documentId : null,
  openingPartyId: allocation.kind === 'OPENING' ? allocation.documentId : null,
  advanceId: allocation.kind === 'ADVANCE' ? allocation.documentId : null,
  amount: allocation.amount,
});

/** What live (not cancelled) settlements applied to each target, keyed by its id (an ADVANCE: what live refunds gave back). */
export async function settledOf(db: Db, targets: { kind: string; id: string }[]): Promise<Map<string, number>> {
  const ids = (kind: string) => targets.filter((target) => target.kind === kind).map((target) => target.id);
  const [invoiceIds, billIds, partyIds, expenseIds, advanceIds] = [ids('INVOICE'), ids('BILL'), ids('OPENING'), ids('EXPENSE'), ids('ADVANCE')];
  const where = { settlement: { cancelledAt: null } };
  const [invoices, bills, openings, expenses, advances] = await Promise.all([
    invoiceIds.length ? db.settlementAllocation.groupBy({ by: ['invoiceId'], where: { ...where, invoiceId: { in: invoiceIds } }, _sum: { amount: true } }) : [],
    billIds.length ? db.settlementAllocation.groupBy({ by: ['billId'], where: { ...where, billId: { in: billIds } }, _sum: { amount: true } }) : [],
    partyIds.length ? db.settlementAllocation.groupBy({ by: ['openingPartyId'], where: { ...where, openingPartyId: { in: partyIds } }, _sum: { amount: true } }) : [],
    expenseIds.length ? db.settlementAllocation.groupBy({ by: ['expenseId'], where: { ...where, expenseId: { in: expenseIds } }, _sum: { amount: true } }) : [],
    advanceIds.length ? db.settlementAllocation.groupBy({ by: ['advanceId'], where: { ...where, advanceId: { in: advanceIds } }, _sum: { amount: true } }) : [],
  ]);
  const result = new Map<string, number>();
  for (const row of invoices) result.set(row.invoiceId!, sumOf(row._sum.amount));
  for (const row of bills) result.set(row.billId!, sumOf(row._sum.amount));
  for (const row of openings) result.set(row.openingPartyId!, sumOf(row._sum.amount));
  for (const row of expenses) result.set(row.expenseId!, sumOf(row._sum.amount));
  for (const row of advances) result.set(row.advanceId!, sumOf(row._sum.amount));
  return result;
}

/** Live receipts or payments applied to a document, for the refusal when it is cancelled or voided. */
export async function liveSettlementNumbers(tx: Tx, target: { invoiceId?: string; billId?: string; expenseId?: string; advanceId?: string }): Promise<string[]> {
  const rows = await tx.settlementAllocation.findMany({
    where: { ...target, settlement: { cancelledAt: null } },
    select: { settlement: { select: { number: true } } },
    distinct: ['settlementId'],
  });
  return rows.map((row) => row.settlement.number);
}
