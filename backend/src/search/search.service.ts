import { Injectable } from '@nestjs/common';
import { canAccess } from '../common/guards/access.guard.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { EXPENSES_MODULE } from '../expenses/expenses.controller.js';
import { INVOICES_MODULE } from '../invoices/invoices.controller.js';
import { ITEMS_MODULE } from '../items/items-module-key.js';
import { PURCHASE_BILLS_MODULE } from '../purchases/purchases.controllers.js';
import { QUOTATIONS_MODULE } from '../quotations/quotations.controller.js';
import { PAYMENTS_MODULE } from '../settlements/settlements.controller.js';
import { SHIPMENTS_MODULE } from '../shipments/shipments.controller.js';
import { TRANSFERS_MODULE } from '../stock-moves/stock-moves.controllers.js';
import { VEHICLES_MODULE } from '../vehicles/vehicles.controller.js';
import { quotationLabel } from '../sale-pricing/sale-rules.js';
import { DOCUMENT_LABELS, everyWord, has, searchWords } from './search-rules.js';
import type { SearchResultView } from './search-views.js';

/** Results per kind: the top bar shows a short list, the screen itself has the full search. */
const PER_KIND = 5;
const CUSTOMERS_MODULE = '/customers';
const VENDORS_MODULE = '/vendors';

const party = (word: string) => ({ party: { displayName: has(word) } });
const joined = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');

// Global search (SOW 17): items, customers, vendors, quotations, invoices and
// their dispatch document numbers (IRN, e-way bill, Shipping Bill, LEO …),
// vendor bills, shipments, stock transfers, receipts and payments, expenses
// and vehicles. Every word of the query must appear in one of a record's
// fields. Each kind is searched only when the user's role may open the
// screen its results link to (the check RequireAccess makes there).
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(auth: AuthContext, query: string): Promise<SearchResultView[]> {
    const words = searchWords(query);
    if (!words.length) return [];
    const may = (module: string) => canAccess(auth, module, 'view');
    const when = (module: string, load: () => Promise<SearchResultView[]>) => (may(module) ? load() : Promise.resolve([]));
    const take = PER_KIND;

    const groups = await Promise.all([
      when(ITEMS_MODULE, async () => {
        const rows = await this.prisma.item.findMany({
          where: { isArchived: false, ...everyWord<Prisma.ItemWhereInput>(words, [(w) => ({ name: has(w) }), (w) => ({ sku: has(w) }), (w) => ({ brand: { name: has(w) } })]) },
          orderBy: { name: 'asc' },
          take,
          select: { id: true, name: true, sku: true, brand: { select: { name: true } } },
        });
        return rows.map((row) => ({ kind: 'Item', title: row.name, detail: joined(row.sku, row.brand?.name), href: `/items/${row.id}` }));
      }),
      this.parties(words, may(CUSTOMERS_MODULE), may(VENDORS_MODULE)),
      when(QUOTATIONS_MODULE, async () => {
        const rows = await this.prisma.quotation.findMany({
          where: everyWord<Prisma.QuotationWhereInput>(words, [(w) => ({ number: has(w) }), party]),
          orderBy: { date: 'desc' },
          take,
          select: { id: true, number: true, revision: true, party: { select: { displayName: true } } },
        });
        return rows.map((row) => ({ kind: 'Quotation', title: quotationLabel(row.number, row.revision), detail: row.party.displayName, href: `/quotations/${row.id}` }));
      }),
      when(INVOICES_MODULE, async () => {
        const rows = await this.prisma.invoice.findMany({
          where: everyWord<Prisma.InvoiceWhereInput>(words, [(w) => ({ number: has(w) }), (w) => ({ vehicleNumber: has(w) }), party]),
          orderBy: { date: 'desc' },
          take,
          select: { id: true, number: true, status: true, vehicleNumber: true, party: { select: { displayName: true } } },
        });
        return rows.map((row) => ({
          kind: 'Invoice',
          title: row.number,
          detail: joined(row.party.displayName, row.vehicleNumber, row.status === 'CANCELLED' ? 'cancelled' : null),
          href: `/invoices/${row.id}`,
        }));
      }),
      when(INVOICES_MODULE, async () => {
        const rows = await this.prisma.invoiceDocument.findMany({
          where: everyWord<Prisma.InvoiceDocumentWhereInput>(words, [(w) => ({ number: has(w) })]),
          orderBy: { date: 'desc' },
          take,
          select: { kind: true, number: true, invoice: { select: { id: true, number: true, party: { select: { displayName: true } } } } },
        });
        return rows.map((row) => ({
          kind: DOCUMENT_LABELS[row.kind],
          title: row.number,
          detail: joined(row.invoice.number, row.invoice.party.displayName),
          href: `/invoices/${row.invoice.id}`,
        }));
      }),
      when(PURCHASE_BILLS_MODULE, async () => {
        const rows = await this.prisma.purchaseBill.findMany({
          where: everyWord<Prisma.PurchaseBillWhereInput>(words, [
            (w) => ({ reference: has(w) }),
            (w) => ({ vendorBillNumber: has(w) }),
            (w) => ({ ewayBillNumber: has(w) }),
            (w) => ({ vehicleNumber: has(w) }),
            (w) => ({ vendor: { displayName: has(w) } }),
          ]),
          orderBy: { date: 'desc' },
          take,
          select: { id: true, reference: true, vendorBillNumber: true, ewayBillNumber: true, vendor: { select: { displayName: true } } },
        });
        return rows.map((row) => ({
          kind: 'Bill',
          title: row.reference,
          detail: joined(row.vendor.displayName, row.vendorBillNumber, row.ewayBillNumber ? `e-way bill ${row.ewayBillNumber}` : null),
          href: `/purchases/${row.id}`,
        }));
      }),
      when(SHIPMENTS_MODULE, async () => {
        const rows = await this.prisma.shipment.findMany({
          where: everyWord<Prisma.ShipmentWhereInput>(words, [(w) => ({ number: has(w) }), (w) => ({ vehicleNumber: has(w) }), (w) => ({ sealNumber: has(w) }), (w) => ({ destination: has(w) }), party]),
          orderBy: { date: 'desc' },
          take,
          select: { id: true, number: true, vehicleNumber: true, destination: true, cancelledAt: true, party: { select: { displayName: true } } },
        });
        return rows.map((row) => ({
          kind: 'Shipment',
          title: row.number,
          detail: joined(`${row.vehicleNumber} to ${row.destination}`, row.party.displayName, row.cancelledAt ? 'cancelled' : null),
          href: `/shipments/${row.id}`,
        }));
      }),
      when(TRANSFERS_MODULE, async () => {
        const rows = await this.prisma.stockTransfer.findMany({
          where: everyWord<Prisma.StockTransferWhereInput>(words, [(w) => ({ number: has(w) }), (w) => ({ vehicleNumber: has(w) })]),
          orderBy: { date: 'desc' },
          take,
          select: { id: true, number: true, vehicleNumber: true, status: true },
        });
        return rows.map((row) => ({
          kind: 'Stock transfer',
          title: row.number,
          detail: joined(row.vehicleNumber, row.status === 'CANCELLED' ? 'cancelled' : null),
          href: `/stock-transfers/${row.id}`,
        }));
      }),
      when(PAYMENTS_MODULE, async () => {
        const rows = await this.prisma.settlement.findMany({
          where: everyWord<Prisma.SettlementWhereInput>(words, [(w) => ({ number: has(w) }), (w) => ({ reference: has(w) }), party]),
          orderBy: { date: 'desc' },
          take,
          select: { id: true, number: true, direction: true, cancelledAt: true, party: { select: { displayName: true } } },
        });
        return rows.map((row) => ({
          kind: row.direction === 'RECEIPT' ? 'Receipt' : 'Payment',
          title: row.number,
          detail: joined(row.party.displayName, row.cancelledAt ? 'cancelled' : null),
          href: `/payments/entries/${row.id}`,
        }));
      }),
      when(EXPENSES_MODULE, async () => {
        const rows = await this.prisma.expense.findMany({
          where: everyWord<Prisma.ExpenseWhereInput>(words, [(w) => ({ number: has(w) }), (w) => ({ reference: has(w) }), (w) => ({ payee: has(w) }), (w) => ({ vendor: { displayName: has(w) } })]),
          orderBy: { date: 'desc' },
          take,
          select: { id: true, number: true, payee: true, cancelledAt: true, head: { select: { name: true } }, vendor: { select: { displayName: true } } },
        });
        return rows.map((row) => ({
          kind: 'Expense',
          title: row.number,
          detail: joined(row.head.name, row.vendor?.displayName ?? row.payee, row.cancelledAt ? 'cancelled' : null),
          href: `/expenses/${row.id}`,
        }));
      }),
      when(VEHICLES_MODULE, async () => {
        const rows = await this.prisma.vehicle.findMany({
          where: { isArchived: false, ...everyWord<Prisma.VehicleWhereInput>(words, [(w) => ({ number: has(w) }), (w) => ({ driverName: has(w) }), (w) => ({ transporter: { displayName: has(w) } })]) },
          orderBy: { number: 'asc' },
          take,
          select: { number: true, ownership: true, driverName: true, transporter: { select: { displayName: true } } },
        });
        return rows.map((row) => ({
          kind: 'Vehicle',
          title: row.number,
          detail: joined(row.ownership === 'OWN' ? 'Own' : row.transporter?.displayName, row.driverName),
          href: '/masters/vehicles',
        }));
      }),
    ]);
    return groups.flat();
  }

  /** Live customers and vendors; a party that is both shows under each role the user may open. */
  private async parties(words: string[], customers: boolean, vendors: boolean): Promise<SearchResultView[]> {
    if (!customers && !vendors) return [];
    const roles = [...(customers ? [{ isCustomer: true }] : []), ...(vendors ? [{ isVendor: true }] : [])];
    const rows = await this.prisma.party.findMany({
      where: {
        isArchived: false,
        OR: roles,
        ...everyWord<Prisma.PartyWhereInput>(words, [(w) => ({ displayName: has(w) }), (w) => ({ legalName: has(w) }), (w) => ({ gstin: has(w) }), (w) => ({ phone: has(w) }), (w) => ({ city: has(w) })]),
      },
      orderBy: { displayName: 'asc' },
      take: PER_KIND * 2,
      select: { id: true, displayName: true, isCustomer: true, isVendor: true, city: true, gstin: true },
    });
    const detail = (row: (typeof rows)[number]) => joined(row.city, row.gstin);
    return [
      ...rows.filter((row) => customers && row.isCustomer).slice(0, PER_KIND).map((row) => ({ kind: 'Customer', title: row.displayName, detail: detail(row), href: `/customers/${row.id}` })),
      ...rows.filter((row) => vendors && row.isVendor).slice(0, PER_KIND).map((row) => ({ kind: 'Vendor', title: row.displayName, detail: detail(row), href: `/vendors/${row.id}` })),
    ];
  }
}
