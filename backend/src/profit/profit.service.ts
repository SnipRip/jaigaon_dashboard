import { BadRequestException, Injectable } from '@nestjs/common';
import { dateOnly, isoDate, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { financialYearOf } from '../common/financial-year.js';
import { PrismaService } from '../database/prisma.service.js';
import type { ProfitQueryDto } from './dto/profit-query.dto.js';
import { buildProfitReport, type ProfitExpense, type ProfitInvoice, type ProfitReport, type ProfitShipment } from './profit-rules.js';

export interface ProfitReportView extends ProfitReport {
  from: string;
  to: string;
}

// Read-only, three queries: the period's issued invoices with their lines,
// the trucks carrying them (with every invoice on each, the base their
// expenses are shared on), and the live expenses that touch them plus the
// period's overheads and unlinked shipment expenses.
@Injectable()
export class ProfitService {
  constructor(private readonly prisma: PrismaService) {}

  async report(query: ProfitQueryDto): Promise<ProfitReportView> {
    const to = query.to ?? todayInIndia();
    const from = query.from ?? `${financialYearOf(to).slice(0, 4)}-04-01`;
    if (from > to) throw new BadRequestException('The first day is after the last day');
    const period = { gte: dateOnly(from), lte: dateOnly(to) };

    const invoiceRows = await this.prisma.invoice.findMany({
      where: { status: 'ISSUED', date: period },
      orderBy: [{ date: 'asc' }, { number: 'asc' }],
      select: {
        id: true,
        number: true,
        date: true,
        partyId: true,
        party: { select: { displayName: true } },
        taxable: true,
        cost: true,
        lines: {
          orderBy: { position: 'asc' },
          select: { itemId: true, taxable: true, costOfGoods: true, item: { select: { name: true, sku: true } } },
        },
        shipments: { where: { released: false }, take: 1, select: { shipmentId: true } },
      },
    });
    const invoiceIds = invoiceRows.map((row) => row.id);
    const shipmentIds = [...new Set(invoiceRows.flatMap((row) => row.shipments.map((link) => link.shipmentId)))];

    const [shipmentRows, expenseRows] = await Promise.all([
      this.prisma.shipment.findMany({
        where: { id: { in: shipmentIds } },
        select: {
          id: true,
          number: true,
          vehicleNumber: true,
          destination: true,
          invoices: { where: { released: false, invoice: { status: 'ISSUED' } }, select: { invoice: { select: { id: true, taxable: true } } } },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          cancelledAt: null,
          OR: [
            { allocation: 'INVOICE', invoiceId: { in: invoiceIds } },
            { allocation: 'SHIPMENT', shipmentId: { in: shipmentIds } },
            { allocation: 'SHIPMENT', shipmentId: null, date: period },
            { allocation: 'OVERHEAD', date: period },
          ],
        },
        select: { id: true, date: true, cost: true, allocation: true, invoiceId: true, shipmentId: true, head: { select: { name: true } } },
      }),
    ]);

    const invoices: ProfitInvoice[] = invoiceRows.map((row) => ({
      id: row.id,
      number: row.number,
      date: isoDate(row.date),
      partyId: row.partyId,
      partyName: row.party.displayName,
      taxable: toNumber(row.taxable),
      cost: toNumber(row.cost),
      lines: row.lines.map((line) => ({
        itemId: line.itemId,
        itemName: line.item.name,
        sku: line.item.sku,
        taxable: toNumber(line.taxable),
        costOfGoods: toNumber(line.costOfGoods),
      })),
      shipmentId: row.shipments[0]?.shipmentId ?? null,
    }));
    const shipments: ProfitShipment[] = shipmentRows.map((row) => ({
      id: row.id,
      number: row.number,
      vehicleNumber: row.vehicleNumber,
      destination: row.destination,
      invoices: row.invoices.map(({ invoice }) => ({ id: invoice.id, taxable: toNumber(invoice.taxable) })),
    }));
    const expenses: ProfitExpense[] = expenseRows.map((row) => ({
      id: row.id,
      date: isoDate(row.date),
      headName: row.head.name,
      cost: toNumber(row.cost),
      allocation: row.allocation,
      invoiceId: row.invoiceId,
      shipmentId: row.shipmentId,
    }));

    const overheads = expenses.filter((expense) => expense.allocation === 'OVERHEAD');
    const onSales = expenses.filter((expense) => expense.allocation !== 'OVERHEAD');
    return { from, to, ...buildProfitReport(invoices, shipments, onSales, overheads) };
  }
}
