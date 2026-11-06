import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { dateOnly, isoDate, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { financialYearOf } from '../common/financial-year.js';
import { canAccess } from '../common/guards/access.guard.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { HEAD_GROUPS } from '../account-heads/account-head-rules.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { itemCostSource, itemCosts, stockOnHand, stockValue } from '../items/item-costs.js';
import { inherited } from '../items/item-rules.js';
import { ProfitService } from '../profit/profit.service.js';
import { quotationLabel } from '../sale-pricing/sale-rules.js';
import { SettlementsService } from '../settlements/settlements.service.js';
import type { ReportQueryDto } from './dto/report-query.dto.js';
import {
  gstSummaryRows,
  hsnRows,
  isReportId,
  marginPct,
  paise,
  placeLabel,
  quotationStage,
  REPORT_SOURCES,
  REPORTS_MODULE,
  shipmentStage,
  stockStatus,
  sumOf,
  type ReportId,
  type ReportRow,
} from './report-rules.js';

export interface ReportView {
  /** The period the rows cover; null for a report of today's position (stock, outstanding). */
  from: string | null;
  to: string | null;
  rows: ReportRow[];
}

type Period = { gte: Date; lte: Date };

/** Reports that show where things stand today rather than a period. */
const AS_OF_TODAY: ReportId[] = ['stock-summary', 'outstanding'];

const unitOf = { defaultUnit: { select: { symbol: true } } } as const;
const n = toNumber;

// Reports & MIS (SOW 16): every report's rows worked out from stored
// documents. Totals come from what each document stored when it was saved
// (the same figures its own page shows); profit, outstanding and stock reuse
// the services behind those screens. A report is open only to a role that
// may view Reports and every screen its data comes from.
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profit: ProfitService,
    private readonly settlements: SettlementsService,
  ) {}

  async report(auth: AuthContext, id: string, query: ReportQueryDto): Promise<ReportView> {
    if (!isReportId(id)) throw new NotFoundException('There is no such report');
    if (![REPORTS_MODULE, ...REPORT_SOURCES[id]].every((module) => canAccess(auth, module, 'view'))) {
      throw new ForbiddenException('Your role does not allow this report');
    }
    if (AS_OF_TODAY.includes(id)) return { from: null, to: null, rows: await this.rowsAsOfToday(id) };

    const to = query.to ?? todayInIndia();
    const from = query.from ?? `${financialYearOf(to).slice(0, 4)}-04-01`;
    if (from > to) throw new BadRequestException('The first day is after the last day');
    return { from, to, rows: await this.rowsForPeriod(id, { gte: dateOnly(from), lte: dateOnly(to) }, from, to) };
  }

  private rowsAsOfToday(id: ReportId): Promise<ReportRow[]> {
    return id === 'stock-summary' ? this.stockSummary() : this.outstanding();
  }

  private rowsForPeriod(id: ReportId, period: Period, from: string, to: string): Promise<ReportRow[]> {
    switch (id) {
      case 'sales-register':
        return this.salesRegister(period);
      case 'quotations':
        return this.quotations(period);
      case 'purchase-register':
        return this.purchaseRegister(period);
      case 'gst-summary':
        return this.gstSummary(period);
      case 'hsn-summary':
        return this.hsnSummary(period);
      case 'sales-by-state':
        return this.salesByState(period);
      case 'expenses':
        return this.expensesByHead(period);
      case 'shipments':
        return this.shipments(period, from, to);
      default:
        return this.exportRegister(period);
    }
  }

  private async salesRegister(period: Period): Promise<ReportRow[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { status: 'ISSUED', date: period },
      orderBy: [{ date: 'asc' }, { number: 'asc' }],
      select: { id: true, date: true, number: true, destinationCountry: true, taxable: true, cgst: true, sgst: true, igst: true, total: true, party: { select: { displayName: true, gstin: true } } },
    });
    return rows.map((row) => ({
      date: isoDate(row.date),
      number: row.number,
      customer: row.party.displayName,
      gstin: row.party.gstin ?? row.destinationCountry ?? 'Unregistered',
      taxable: n(row.taxable),
      cgst: n(row.cgst),
      sgst: n(row.sgst),
      igst: n(row.igst),
      total: n(row.total),
      href: `/invoices/${row.id}`,
    }));
  }

  private async quotations(period: Period): Promise<ReportRow[]> {
    const rows = await this.prisma.quotation.findMany({
      where: { date: period },
      orderBy: [{ date: 'asc' }, { number: 'asc' }],
      select: { id: true, date: true, number: true, revision: true, status: true, taxable: true, cost: true, total: true, party: { select: { displayName: true } } },
    });
    return rows.map((row) => ({
      date: isoDate(row.date),
      number: quotationLabel(row.number, row.revision),
      customer: row.party.displayName,
      value: n(row.total),
      margin: marginPct(n(row.taxable), n(row.cost)),
      stage: quotationStage(row.status),
      href: `/quotations/${row.id}`,
    }));
  }

  private async purchaseRegister(period: Period): Promise<ReportRow[]> {
    const rows = await this.prisma.purchaseBill.findMany({
      where: { status: 'OPEN', date: period },
      orderBy: [{ date: 'asc' }, { reference: 'asc' }],
      select: { id: true, date: true, reference: true, vendorBillNumber: true, regime: true, taxable: true, tax: true, itcClaimable: true, payable: true, vendor: { select: { displayName: true } } },
    });
    return rows.map((row) => {
      const reverse = row.regime === 'REVERSE_CHARGE';
      return {
        date: isoDate(row.date),
        reference: row.reference,
        vendorBill: row.vendorBillNumber,
        vendor: row.vendor.displayName,
        taxable: n(row.taxable),
        tax: reverse ? 0 : n(row.tax),
        itc: n(row.itcClaimable),
        rcm: reverse ? n(row.tax) : 0,
        payable: n(row.payable),
        href: `/purchases/${row.id}`,
      };
    });
  }

  private async gstSummary(period: Period): Promise<ReportRow[]> {
    const heads = { cgst: true, sgst: true, igst: true } as const;
    const [sales, bills, expenses] = await Promise.all([
      this.prisma.invoice.findMany({ where: { status: 'ISSUED', date: period }, select: { ...heads, regime: true, taxable: true } }),
      this.prisma.purchaseBill.findMany({ where: { status: 'OPEN', date: period }, select: { ...heads, tax: true, itcClaimable: true, regime: true } }),
      this.prisma.expense.findMany({ where: { cancelledAt: null, itcEligible: true, date: period }, select: heads }),
    ]);
    const split = (row: { cgst: Prisma.Decimal; sgst: Prisma.Decimal; igst: Prisma.Decimal }) => ({ cgst: n(row.cgst), sgst: n(row.sgst), igst: n(row.igst) });
    return gstSummaryRows(
      sales.map(split),
      bills.map((bill) => ({ ...split(bill), tax: n(bill.tax), itcClaimable: n(bill.itcClaimable), reverseCharge: bill.regime === 'REVERSE_CHARGE' })),
      expenses.map(split),
      sumOf(
        sales.filter((sale) => sale.regime === 'EXPORT_LUT'),
        (sale) => n(sale.taxable),
      ),
    );
  }

  private async hsnSummary(period: Period): Promise<ReportRow[]> {
    const [lines, units] = await Promise.all([
      this.prisma.invoiceLine.findMany({
        where: { invoice: { status: 'ISSUED', date: period } },
        select: { hsn: true, unit: true, gstRatePct: true, quantity: true, taxable: true, tax: true },
      }),
      this.prisma.unit.findMany({ select: { symbol: true, uqc: true } }),
    ]);
    const uqcOf = new Map(units.map((unit) => [unit.symbol, unit.uqc]));
    return hsnRows(
      lines.map((line) => ({
        hsn: line.hsn,
        uqc: uqcOf.get(line.unit) ?? 'OTH',
        ratePct: n(line.gstRatePct),
        quantity: n(line.quantity),
        taxable: n(line.taxable),
        tax: n(line.tax),
      })),
    );
  }

  private async salesByState(period: Period): Promise<ReportRow[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { status: 'ISSUED', date: period },
      select: { kind: true, placeOfSupply: true, destinationCountry: true, taxable: true },
    });
    const places = new Map<string, { place: string; invoices: number; taxable: number }>();
    for (const row of rows) {
      const place = placeLabel(row);
      const entry = places.get(place) ?? { place, invoices: 0, taxable: 0 };
      entry.invoices += 1;
      entry.taxable = paise(entry.taxable + n(row.taxable));
      places.set(place, entry);
    }
    return [...places.values()].sort((a, b) => b.taxable - a.taxable);
  }

  private async stockSummary(): Promise<ReportRow[]> {
    const items = await this.prisma.item.findMany({
      where: { isArchived: false },
      orderBy: [{ name: 'asc' }, { sku: 'asc' }],
      select: {
        id: true,
        sku: true,
        name: true,
        reorderLevel: true,
        ...itemCostSource,
        unit: { select: { symbol: true } },
        group: { select: unitOf },
        category: { select: unitOf },
        subCategory: { select: unitOf },
      },
    });
    return items.map((item) => {
      const stock = stockOnHand(item);
      const cost = itemCosts(item).stockCost ?? 0;
      return {
        sku: item.sku,
        item: item.name,
        stock,
        unit: inherited(item.unit?.symbol, item.group?.defaultUnit?.symbol, item.subCategory?.defaultUnit?.symbol, item.category.defaultUnit?.symbol) ?? '',
        cost,
        value: stockValue(item),
        status: stockStatus(stock, n(item.reorderLevel)),
        href: `/items/${item.id}`,
      };
    });
  }

  private async expensesByHead(period: Period): Promise<ReportRow[]> {
    const rows = await this.prisma.expense.findMany({
      where: { cancelledAt: null, date: period },
      select: { amount: true, tax: true, head: { select: { id: true, name: true, nature: true } } },
    });
    const heads = new Map<string, { head: string; group: string; count: number; amount: number; gst: number }>();
    for (const row of rows) {
      const entry = heads.get(row.head.id) ?? { head: row.head.name, group: HEAD_GROUPS[row.head.nature], count: 0, amount: 0, gst: 0 };
      entry.count += 1;
      entry.amount = paise(entry.amount + n(row.amount));
      entry.gst = paise(entry.gst + n(row.tax));
      heads.set(row.head.id, entry);
    }
    return [...heads.values()].sort((a, b) => b.amount - a.amount);
  }

  /** What each customer owes us and what we owe each vendor, from the open documents the Payments screen shows. */
  private async outstanding(): Promise<ReportRow[]> {
    const [receivable, payable] = await Promise.all([this.settlements.documents('RECEIPT'), this.settlements.documents('PAYMENT')]);
    const parties = new Map<string, { party: string; side: string; documents: number; balance: number; href: string }>();
    const add = (side: string, documents: typeof receivable) => {
      for (const document of documents.filter((open) => open.balance > 0)) {
        const key = `${side}|${document.partyId}`;
        const entry = parties.get(key) ?? { party: document.partyName, side, documents: 0, balance: 0, href: `/payments/ledger/${document.partyId}` };
        entry.documents += 1;
        entry.balance = paise(entry.balance + document.balance);
        parties.set(key, entry);
      }
    };
    add('Owes us', receivable);
    add('We owe', payable);
    return [...parties.values()].sort((a, b) => a.side.localeCompare(b.side) || b.balance - a.balance);
  }

  /** Trucks loaded in the period or carrying its invoices, with the profit report's figures for them. */
  private async shipments(period: Period, from: string, to: string): Promise<ReportRow[]> {
    const report = await this.profit.report({ from, to });
    const profitOf = new Map(report.byShipment.filter((row) => row.kind === 'shipment').map((row) => [row.key, row]));
    const rows = await this.prisma.shipment.findMany({
      where: { cancelledAt: null, OR: [{ date: period }, { id: { in: [...profitOf.keys()] } }] },
      orderBy: [{ date: 'asc' }, { number: 'asc' }],
      select: { id: true, date: true, number: true, vehicleNumber: true, stage: true, party: { select: { displayName: true } } },
    });
    return rows.map((row) => {
      const figures = profitOf.get(row.id);
      return {
        date: isoDate(row.date),
        number: row.number,
        buyer: row.party.displayName,
        vehicle: row.vehicleNumber,
        stage: shipmentStage(row.stage),
        sales: figures?.sales ?? 0,
        expenses: figures?.expenses ?? 0,
        profit: figures?.profit ?? 0,
        href: `/shipments/${row.id}`,
      };
    });
  }

  private async exportRegister(period: Period): Promise<ReportRow[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { status: 'ISSUED', kind: 'EXPORT', date: period },
      orderBy: [{ date: 'asc' }, { number: 'asc' }],
      select: {
        id: true,
        date: true,
        number: true,
        regime: true,
        lutArn: true,
        taxable: true,
        party: { select: { displayName: true } },
        documents: { where: { kind: { in: ['SHIPPING_BILL', 'LEO', 'BRC'] } }, select: { kind: true, number: true } },
      },
    });
    return rows.map((row) => {
      const numberOf = (kind: 'SHIPPING_BILL' | 'LEO' | 'BRC') => row.documents.find((document) => document.kind === kind)?.number ?? 'Pending';
      return {
        date: isoDate(row.date),
        number: row.number,
        buyer: row.party.displayName,
        route: row.regime === 'EXPORT_IGST' ? 'IGST paid' : `LUT ${row.lutArn ?? ''}`.trim(),
        value: n(row.taxable),
        shippingBill: numberOf('SHIPPING_BILL'),
        leo: numberOf('LEO'),
        brc: numberOf('BRC'),
        href: `/invoices/${row.id}`,
      };
    });
  }
}
