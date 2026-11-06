// Actual profit (SOW 14, 15): sales before GST less the FIFO cost of the
// goods less the expenses booked on the sale, cut by invoice, shipment,
// customer and item. Pure: the service loads the facts.
//
// - Sales and cost come from the issued invoice (taxable value, cost of the
//   batches its lines drew); item-cost expenses are already inside that cost
//   through the bill's landed rate, so they are never counted again.
// - An invoice's own expenses are spread over its lines by value; a truck's
//   expenses over every invoice it carries by value, so a truck whose
//   invoices fall in two periods splits its expenses between them.
// - Every view adds up to the same total: the shipment view has a row for
//   sales on no truck.
// - Overheads and shipment expenses not linked to a truck yet belong to no
//   sale: they come off once, as net profit.
import { shipmentProfit, type ShipmentProfit } from '../shipments/shipment-rules.js';

/** Sales, cost, expenses, profit and margin: the same sum the shipment page shows. */
export type Profit = ShipmentProfit;
export const profitOf = shipmentProfit;

const money = (value: number) => Math.round(value * 100) / 100;

export interface ProfitLine {
  itemId: string;
  itemName: string;
  sku: string | null;
  taxable: number;
  costOfGoods: number;
}

export interface ProfitInvoice {
  id: string;
  number: string;
  date: string;
  partyId: string;
  partyName: string;
  taxable: number;
  cost: number;
  lines: ProfitLine[];
  /** The truck carrying it (a link not released by a cancel). */
  shipmentId: string | null;
}

export interface ProfitShipment {
  id: string;
  number: string;
  vehicleNumber: string;
  destination: string;
  /** Taxable value of every issued invoice it carries, in or out of the period: the base its expenses are shared on. */
  invoices: { id: string; taxable: number }[];
}

export interface ProfitExpense {
  id: string;
  date: string;
  headName: string;
  /** Amount plus GST that cannot be claimed. */
  cost: number;
  allocation: 'ITEM_COST' | 'INVOICE' | 'SHIPMENT' | 'OVERHEAD';
  invoiceId: string | null;
  shipmentId: string | null;
}

export interface ProfitRow extends Profit {
  key: string;
  label: string;
  detail: string | null;
  /** Where the row links to: invoice, shipment, customer or item page. */
  kind: 'invoice' | 'shipment' | 'customer' | 'item' | null;
}

export interface HeadTotal {
  head: string;
  amount: number;
  count: number;
}

export interface ProfitReport {
  byInvoice: ProfitRow[];
  byShipment: ProfitRow[];
  byCustomer: ProfitRow[];
  byItem: ProfitRow[];
  total: Profit;
  overheads: { total: number; byHead: HeadTotal[] };
  /** Shipment expenses saved without a truck, and truck expenses with no sales value to share them on. */
  unassigned: { total: number; count: number };
  netProfit: number;
}

/** Splits `amount` over `weights` in proportion; the last share takes the rounding so they add up. */
export function shareByValue(amount: number, weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!total) return weights.map(() => 0);
  let given = 0;
  return weights.map((weight, index) => {
    const share = index === weights.length - 1 ? money(amount - given) : money((amount * weight) / total);
    given = money(given + share);
    return share;
  });
}

const sum = (values: number[]) => money(values.reduce((total, value) => total + value, 0));

/** Profit of a set of sales with the expenses each carries. */
interface Slice {
  sales: { taxable: number; cost: number };
  expenses: number;
}

const profitOfSlices = (slices: Slice[]) =>
  profitOf(
    slices.map((slice) => slice.sales),
    slices.map((slice) => slice.expenses),
  );

function groupRows<K>(entries: { key: K; slice: Slice }[]): Map<K, Slice[]> {
  const groups = new Map<K, Slice[]>();
  for (const { key, slice } of entries) groups.set(key, [...(groups.get(key) ?? []), slice]);
  return groups;
}

export function buildProfitReport(invoices: ProfitInvoice[], shipments: ProfitShipment[], expenses: ProfitExpense[], overheadExpenses: ProfitExpense[]): ProfitReport {
  const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));

  // Each truck's expenses shared over everything it carries, by value.
  const truckShare = new Map<string, number>();
  let unassignedTotal = 0;
  let unassignedCount = 0;
  for (const shipment of shipments) {
    const costs = expenses.filter((expense) => expense.allocation === 'SHIPMENT' && expense.shipmentId === shipment.id).map((expense) => expense.cost);
    const onTruck = sum(costs);
    if (!onTruck) continue;
    const shares = shareByValue(
      onTruck,
      shipment.invoices.map((invoice) => invoice.taxable),
    );
    if (shares.every((share) => share === 0)) {
      unassignedTotal = money(unassignedTotal + onTruck);
      unassignedCount += costs.length;
      continue;
    }
    shipment.invoices.forEach((invoice, index) => truckShare.set(invoice.id, shares[index] ?? 0));
  }
  for (const expense of expenses) {
    if (expense.allocation === 'SHIPMENT' && (!expense.shipmentId || !shipmentById.has(expense.shipmentId))) {
      unassignedTotal = money(unassignedTotal + expense.cost);
      unassignedCount += 1;
    }
  }

  const expensesOn = (invoice: ProfitInvoice) =>
    money(
      sum(expenses.filter((expense) => expense.allocation === 'INVOICE' && expense.invoiceId === invoice.id).map((expense) => expense.cost)) +
        (truckShare.get(invoice.id) ?? 0),
    );

  const invoiceSlices = invoices.map((invoice) => ({
    invoice,
    slice: { sales: { taxable: invoice.taxable, cost: invoice.cost }, expenses: expensesOn(invoice) },
  }));

  const byInvoice: ProfitRow[] = invoiceSlices.map(({ invoice, slice }) => ({
    key: invoice.id,
    label: invoice.number,
    detail: invoice.shipmentId ? `${invoice.partyName} · ${shipmentById.get(invoice.shipmentId)?.number ?? ''}` : invoice.partyName,
    kind: 'invoice',
    ...profitOfSlices([slice]),
  }));

  const byTruck = groupRows(invoiceSlices.map(({ invoice, slice }) => ({ key: invoice.shipmentId, slice })));
  const byShipment: ProfitRow[] = [];
  for (const [shipmentId, slices] of byTruck) {
    const shipment = shipmentId ? shipmentById.get(shipmentId) : undefined;
    if (!shipment) continue;
    const inPeriod = slices.length;
    const partly = inPeriod < shipment.invoices.length ? ` · ${inPeriod} of ${shipment.invoices.length} invoices in this period` : '';
    byShipment.push({
      key: shipment.id,
      label: shipment.number,
      detail: `${shipment.vehicleNumber} to ${shipment.destination}${partly}`,
      kind: 'shipment',
      ...profitOfSlices(slices),
    });
  }
  const offTruck = invoiceSlices.filter(({ invoice }) => !invoice.shipmentId || !shipmentById.has(invoice.shipmentId));
  if (offTruck.length) {
    byShipment.push({
      key: 'none',
      label: 'Not on a truck',
      detail: `${offTruck.length} invoice${offTruck.length === 1 ? '' : 's'}: local sales and exports not loaded`,
      kind: null,
      ...profitOfSlices(offTruck.map(({ slice }) => slice)),
    });
  }

  const customers = groupRows(invoiceSlices.map(({ invoice, slice }) => ({ key: invoice.partyId, slice })));
  const byCustomer: ProfitRow[] = [...customers].map(([partyId, slices]) => ({
    key: partyId,
    label: invoices.find((invoice) => invoice.partyId === partyId)?.partyName ?? '',
    detail: `${slices.length} invoice${slices.length === 1 ? '' : 's'}`,
    kind: 'customer',
    ...profitOfSlices(slices),
  }));

  // An invoice's expenses over its lines by value.
  const lineEntries = invoiceSlices.flatMap(({ invoice, slice }) => {
    const shares = shareByValue(
      slice.expenses,
      invoice.lines.map((line) => line.taxable),
    );
    return invoice.lines.map((line, index) => ({
      line,
      slice: { sales: { taxable: line.taxable, cost: line.costOfGoods }, expenses: shares[index] ?? 0 },
    }));
  });
  const items = groupRows(lineEntries.map(({ line, slice }) => ({ key: line.itemId, slice })));
  const byItem: ProfitRow[] = [...items].map(([itemId, slices]) => {
    const line = lineEntries.find((entry) => entry.line.itemId === itemId)?.line;
    return { key: itemId, label: line?.itemName ?? '', detail: line?.sku ?? null, kind: 'item', ...profitOfSlices(slices) };
  });

  const total = profitOfSlices(invoiceSlices.map(({ slice }) => slice));
  const heads = new Map<string, HeadTotal>();
  for (const expense of overheadExpenses) {
    const row = heads.get(expense.headName) ?? { head: expense.headName, amount: 0, count: 0 };
    heads.set(expense.headName, { ...row, amount: money(row.amount + expense.cost), count: row.count + 1 });
  }
  const overheadTotal = sum(overheadExpenses.map((expense) => expense.cost));

  return {
    byInvoice,
    byShipment,
    byCustomer,
    byItem,
    total,
    overheads: { total: overheadTotal, byHead: [...heads.values()].sort((a, b) => b.amount - a.amount) },
    unassigned: { total: unassignedTotal, count: unassignedCount },
    netProfit: money(total.profit - overheadTotal - unassignedTotal),
  };
}
