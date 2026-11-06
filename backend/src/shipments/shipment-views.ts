// Shipments as the API returns them: dates as YYYY-MM-DD, Decimals as
// numbers, the invoices it carries with the papers attached, the next stage
// and what still holds it back, and (detail) its expenses and profit.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import { invoicesLocked, missingFor, nextStage, shipmentProfit, type CarriedInvoice, type ShipmentProfit } from './shipment-rules.js';

export const shipmentInclude = {
  party: { select: { displayName: true } },
  transporter: { select: { displayName: true } },
  events: { orderBy: { date: 'asc' }, select: { stage: true, date: true, note: true, createdAt: true, by: { select: { displayName: true } } } },
  invoices: {
    // A cancelled shipment keeps its released invoices as history.
    orderBy: { invoice: { number: 'asc' } },
    select: {
      released: true,
      invoice: {
        select: {
          id: true,
          number: true,
          date: true,
          status: true,
          total: true,
          taxable: true,
          cost: true,
          documents: { select: { kind: true, number: true, date: true } },
        },
      },
    },
  },
} as const satisfies Prisma.ShipmentInclude;

export type ShipmentRow = Prisma.ShipmentGetPayload<{ include: typeof shipmentInclude }>;

export const carried = (row: ShipmentRow): CarriedInvoice[] =>
  row.invoices.map(({ invoice }) => ({ id: invoice.id, number: invoice.number, total: toNumber(invoice.total), documents: invoice.documents.map((doc) => doc.kind) }));

/** An expense as the shipment page lists it: on the truck itself, or on one of its invoices. */
export interface ShipmentExpenseView {
  id: string;
  number: string;
  date: string;
  head: string;
  description: string;
  payeeName: string;
  amount: number;
  cost: number;
  /** Null: spent on the shipment itself; else the invoice it was booked on. */
  invoice: { id: string; number: string } | null;
  cancelled: boolean;
}

export function toShipmentView(row: ShipmentRow, extra?: { expenses: ShipmentExpenseView[] }) {
  const live = !row.cancelledAt;
  const next = live ? nextStage(row.stage) : null;
  const invoices = carried(row);
  const view = {
    id: row.id,
    number: row.number,
    date: isoDate(row.date),
    partyId: row.partyId,
    partyName: row.party.displayName,
    stage: row.stage,
    vehicleNumber: row.vehicleNumber,
    transporterId: row.transporterId,
    transporterName: row.transporter?.displayName ?? null,
    driverName: row.driverName,
    driverPhone: row.driverPhone,
    destination: row.destination,
    borderPoint: row.borderPoint,
    customsAgent: row.customsAgent,
    sealNumber: row.sealNumber,
    packages: row.packages,
    grossWeightKg: toNumber(row.grossWeightKg),
    notes: row.notes,
    invoices: row.invoices.map(({ invoice }) => ({
      id: invoice.id,
      number: invoice.number,
      date: isoDate(invoice.date),
      status: invoice.status,
      total: toNumber(invoice.total),
      documents: invoice.documents.map((doc) => ({ kind: doc.kind, number: doc.number, date: isoDate(doc.date) })),
    })),
    events: row.events.map((event) => ({ stage: event.stage, date: isoDate(event.date), note: event.note, by: event.by?.displayName ?? null })),
    /** The stage it can move to, and the papers missing for it (empty: ready). */
    next: next ? { stage: next, missing: missingFor(next, invoices) } : null,
    /** Whether invoices may still be added or taken off (at the yard). */
    invoicesLocked: invoicesLocked(row.stage),
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
  };
  if (!extra) return { ...view, expenses: null, profit: null };
  const liveCosts = extra.expenses.filter((expense) => !expense.cancelled).map((expense) => expense.cost);
  const profit: ShipmentProfit = shipmentProfit(
    row.invoices.filter(({ invoice }) => invoice.status === 'ISSUED').map(({ invoice }) => ({ taxable: toNumber(invoice.taxable), cost: toNumber(invoice.cost) })),
    liveCosts,
  );
  return { ...view, expenses: extra.expenses, profit };
}

export type ShipmentView = ReturnType<typeof toShipmentView>;
