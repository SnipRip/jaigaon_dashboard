import { Injectable } from '@nestjs/common';
import { dateOnly, isoDate, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { financialYearOf } from '../common/financial-year.js';
import { canAccess } from '../common/guards/access.guard.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { PrismaService } from '../database/prisma.service.js';
import { DOCUMENTS_MODULE } from '../document-register/document-register.controller.js';
import { DocumentRegisterService } from '../document-register/document-register.service.js';
import { INVOICES_MODULE } from '../invoices/invoices.controller.js';
import { stockOnHand } from '../items/item-costs.js';
import { ITEMS_MODULE } from '../items/items-module-key.js';
import { PROFIT_MODULE } from '../profit/profit.controller.js';
import { ProfitService } from '../profit/profit.service.js';
import { PURCHASE_BILLS_MODULE } from '../purchases/purchases.controllers.js';
import { QUOTATIONS_MODULE } from '../quotations/quotations.controller.js';
import { PAYMENTS_MODULE } from '../settlements/settlements.controller.js';
import { SettlementsService } from '../settlements/settlements.service.js';
import { SHIPMENTS_MODULE } from '../shipments/shipments.controller.js';
import { carried, shipmentInclude } from '../shipments/shipment-views.js';
import { missingFor, nextStage } from '../shipments/shipment-rules.js';
import type { ShipmentStage } from '../generated/prisma/enums.js';
import { recentWeeks, sumByWeek } from './dashboard-rules.js';
import type { DashboardView } from './dashboard-views.js';

/** How many names a card lists before "and N more". */
const FIRST = 3;
const PENDING_QUOTATIONS = 8;
const LATEST_SHIPMENTS = 4;

const STAGE_GROUP: Record<ShipmentStage, keyof NonNullable<DashboardView['shipments']>['counts']> = {
  PLANNED: 'planned',
  LOADING: 'planned',
  IN_TRANSIT: 'onTheRoad',
  AT_BORDER: 'onTheRoad',
  CLEARED: 'done',
  DELIVERED: 'done',
};

const sum = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;

// The Dashboard's figures in one read-only call, for this financial year to
// today. Each section is worked out only when the user's role may open the
// screen it links to (the same check RequireAccess makes on that screen's
// routes); otherwise it is null and the card is not shown. Sections reuse the
// screens' own services, so a number here always matches the page it links to.
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profitReport: ProfitService,
    private readonly settlements: SettlementsService,
    private readonly register: DocumentRegisterService,
  ) {}

  async summary(auth: AuthContext): Promise<DashboardView> {
    const to = todayInIndia();
    const from = `${financialYearOf(to).slice(0, 4)}-04-01`;
    const weeks = recentWeeks(to);
    const may = (module: string) => canAccess(auth, module, 'view');
    const when = <T>(module: string, load: () => Promise<T>) => (may(module) ? load() : Promise.resolve(null));

    const [sales, purchases, profit, outstanding, documents, stock, quotations, shipments] = await Promise.all([
      when(INVOICES_MODULE, () => this.sales(from, to, weeks)),
      when(PURCHASE_BILLS_MODULE, () => this.purchases(from, to, weeks)),
      when(PROFIT_MODULE, () => this.profit(from, to, weeks)),
      when(PAYMENTS_MODULE, () => this.outstanding()),
      when(DOCUMENTS_MODULE, () => this.documents()),
      when(ITEMS_MODULE, () => this.stock()),
      when(QUOTATIONS_MODULE, () => this.quotations()),
      when(SHIPMENTS_MODULE, () => this.shipments()),
    ]);
    return { from, to, weeks, sales, purchases, profit, outstanding, documents, stock, quotations, shipments };
  }

  private async sales(from: string, to: string, weeks: string[]): Promise<DashboardView['sales']> {
    const rows = await this.prisma.invoice.findMany({
      where: { status: 'ISSUED', date: { gte: dateOnly(from), lte: dateOnly(to) } },
      select: { date: true, kind: true, taxable: true },
    });
    const amounts = rows.map((row) => ({ date: isoDate(row.date), amount: toNumber(row.taxable) }));
    return {
      total: sum(amounts.map((row) => row.amount)),
      invoices: rows.length,
      exportInvoices: rows.filter((row) => row.kind === 'EXPORT').length,
      byWeek: sumByWeek(weeks, amounts),
    };
  }

  private async purchases(from: string, to: string, weeks: string[]): Promise<DashboardView['purchases']> {
    const [goods, untaggedCharges] = await Promise.all([
      this.prisma.purchaseBill.findMany({
        where: { kind: 'GOODS', status: 'OPEN', date: { gte: dateOnly(from), lte: dateOnly(to) } },
        select: { date: true, vendorId: true, taxable: true },
      }),
      // Freight or labour not yet put on a purchase's items, at any date.
      this.prisma.purchaseBill.count({ where: { kind: 'CHARGES', status: 'OPEN', landedCostForId: null } }),
    ]);
    const amounts = goods.map((row) => ({ date: isoDate(row.date), amount: toNumber(row.taxable) }));
    return {
      total: sum(amounts.map((row) => row.amount)),
      bills: goods.length,
      vendors: new Set(goods.map((row) => row.vendorId)).size,
      byWeek: sumByWeek(weeks, amounts),
      untaggedCharges,
    };
  }

  private async profit(from: string, to: string, weeks: string[]): Promise<DashboardView['profit']> {
    const report = await this.profitReport.report({ from, to });
    // Invoice rows carry no date; only the chart's weeks need one.
    const dated = await this.prisma.invoice.findMany({
      where: { id: { in: report.byInvoice.map((row) => row.key) }, date: { gte: dateOnly(weeks[0]) } },
      select: { id: true, date: true },
    });
    const dateOf = new Map(dated.map((row) => [row.id, isoDate(row.date)]));
    return {
      ...report.total,
      overheads: report.overheads.total,
      netProfit: report.netProfit,
      byWeek: sumByWeek(
        weeks,
        report.byInvoice.filter((row) => dateOf.has(row.key)).map((row) => ({ date: dateOf.get(row.key)!, amount: row.profit })),
      ),
    };
  }

  private async outstanding(): Promise<DashboardView['outstanding']> {
    const [receivable, payable] = await Promise.all([this.settlements.documents('RECEIPT'), this.settlements.documents('PAYMENT')]);
    const open = (documents: typeof receivable) => documents.filter((document) => document.balance > 0);
    const owedToUs = open(receivable);
    const owedByUs = open(payable);
    const due = (direction: 'RECEIPT' | 'PAYMENT', documents: typeof receivable) =>
      documents
        .filter((document) => document.dueDate)
        .map((document) => ({
          direction,
          kind: document.kind,
          id: document.id,
          partyId: document.partyId,
          partyName: document.partyName,
          number: document.number,
          balance: document.balance,
          dueDate: document.dueDate!,
        }));
    return {
      receivable: sum(owedToUs.map((document) => document.balance)),
      openInvoices: owedToUs.filter((document) => document.kind === 'INVOICE').length,
      payable: sum(owedByUs.map((document) => document.balance)),
      dues: [...due('RECEIPT', owedToUs), ...due('PAYMENT', owedByUs.filter((document) => document.flag === 'MSME'))],
    };
  }

  private async documents(): Promise<DashboardView['documents']> {
    const { missing } = await this.register.register();
    return {
      missing: missing.length,
      holdingTrucks: missing.filter((paper) => paper.holdsTruck).length,
      first: missing.slice(0, FIRST).map((paper) => ({ kind: paper.kind, invoiceNumber: paper.invoice.number })),
    };
  }

  /** Live items with a reorder level that are at or below it. */
  private async stock(): Promise<DashboardView['stock']> {
    const items = await this.prisma.item.findMany({
      where: { isArchived: false, reorderLevel: { gt: 0 } },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        reorderLevel: true,
        openingStock: { select: { quantity: true, drawn: true } },
        stockBatches: { where: { remaining: { gt: 0 } }, select: { remaining: true } },
      },
    });
    const low = items.filter((item) => stockOnHand(item) <= toNumber(item.reorderLevel));
    return { low: low.length, first: low.slice(0, FIRST).map((item) => item.name) };
  }

  /** Drafts, sent and accepted quotations not yet invoiced, newest first. */
  private async quotations(): Promise<DashboardView['quotations']> {
    const rows = await this.prisma.quotation.findMany({
      where: { status: { in: ['DRAFT', 'SENT', 'ACCEPTED'] } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: PENDING_QUOTATIONS,
      select: { id: true, number: true, revision: true, total: true, validUntil: true, status: true, party: { select: { displayName: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      number: row.number,
      revision: row.revision,
      partyName: row.party.displayName,
      total: toNumber(row.total),
      validUntil: isoDate(row.validUntil),
      status: row.status,
    }));
  }

  /** Live trucks by stage group, and the latest few with the papers holding each up. */
  private async shipments(): Promise<DashboardView['shipments']> {
    const [byStage, latest] = await Promise.all([
      this.prisma.shipment.groupBy({ by: ['stage'], where: { cancelledAt: null }, _count: { _all: true } }),
      this.prisma.shipment.findMany({
        where: { cancelledAt: null },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: LATEST_SHIPMENTS,
        include: shipmentInclude,
      }),
    ]);
    const counts = { planned: 0, onTheRoad: 0, done: 0 };
    for (const row of byStage) counts[STAGE_GROUP[row.stage]] += row._count._all;
    return {
      counts,
      latest: latest.map((row) => {
        const next = nextStage(row.stage);
        return {
          id: row.id,
          number: row.number,
          vehicleNumber: row.vehicleNumber,
          stage: row.stage,
          partyName: row.party.displayName,
          nextStage: next,
          waitingFor: next ? [...new Set(missingFor(next, carried(row)).map((paper) => paper.kind))] : [],
        };
      }),
    };
  }
}
