// Shipment rules, pure: the stages a truck to Bhutan goes through, the
// papers each stage needs on every invoice it carries, which invoices a
// shipment may carry, the dates a stage may take, and what it earned. The
// frontend's features/shipments/shipment-rules.ts shows the same stages.
import type { DispatchDocumentKind, ShipmentStage } from '../generated/prisma/enums.js';
import { nameInText } from '../invoices/dispatch-document-rules.js';

export const SHIPMENT_STAGES: ShipmentStage[] = ['PLANNED', 'LOADING', 'IN_TRANSIT', 'AT_BORDER', 'CLEARED', 'DELIVERED'];

export const STAGE_NAMES: Record<ShipmentStage, string> = {
  PLANNED: 'planned',
  LOADING: 'loading',
  IN_TRANSIT: 'on the way',
  AT_BORDER: 'at the border',
  CLEARED: 'customs cleared',
  DELIVERED: 'delivered',
};

/** Above this an e-way bill is needed (Rule 138; client, 28 Oct 2026). */
export const EWAY_BILL_LIMIT = 50_000;

/**
 * Papers a truck needs before it may reach each stage: it leaves the yard
 * with the IRN, lorry challan and e-way bill; reaches the border with the
 * customs invoice, packing list and shipping bill (filed by the agent);
 * crosses once customs give the LEO.
 */
export const STAGE_PAPERS: Partial<Record<ShipmentStage, DispatchDocumentKind[]>> = {
  IN_TRANSIT: ['E_INVOICE', 'LORRY_CHALLAN', 'EWAY_BILL'],
  AT_BORDER: ['CUSTOMS_INVOICE', 'PACKING_LIST', 'SHIPPING_BILL'],
  CLEARED: ['LEO'],
};

export const stageIndex = (stage: ShipmentStage) => SHIPMENT_STAGES.indexOf(stage);

/** The next stage, or null once delivered. */
export const nextStage = (stage: ShipmentStage): ShipmentStage | null => SHIPMENT_STAGES[stageIndex(stage) + 1] ?? null;

/** The invoices may change only while the truck is still at our yard. */
export const invoicesLocked = (stage: ShipmentStage) => stageIndex(stage) >= stageIndex('IN_TRANSIT');

export interface CarriedInvoice {
  id: string;
  number: string;
  /** Grand total, for the e-way bill limit. */
  total: number;
  /** Kinds of papers attached. */
  documents: DispatchDocumentKind[];
}

/** Every paper missing on any invoice for the truck to reach `stage` (all earlier stages' papers too). */
export function missingFor(stage: ShipmentStage, invoices: CarriedInvoice[]): { invoiceId: string; invoice: string; kind: DispatchDocumentKind }[] {
  const needed = SHIPMENT_STAGES.slice(0, stageIndex(stage) + 1).flatMap((step) => STAGE_PAPERS[step] ?? []);
  return invoices.flatMap((invoice) =>
    needed
      .filter((kind) => !invoice.documents.includes(kind) && (kind !== 'EWAY_BILL' || invoice.total > EWAY_BILL_LIMIT))
      .map((kind) => ({ invoiceId: invoice.id, invoice: invoice.number, kind })),
  );
}

/** The refusal text for papers still missing. */
export function papersProblem(stage: ShipmentStage, invoices: CarriedInvoice[]): string | null {
  const missing = missingFor(stage, invoices);
  if (!missing.length) return null;
  const byInvoice = new Map<string, string[]>();
  for (const { invoice, kind } of missing) byInvoice.set(invoice, [...(byInvoice.get(invoice) ?? []), nameInText(kind)]);
  const list = [...byInvoice].map(([invoice, kinds]) => `${invoice}: ${kinds.join(', ')}`).join('; ');
  return `Before ${STAGE_NAMES[stage]}, attach ${list}`;
}

export interface InvoiceFacts {
  number: string;
  kind: 'LOCAL' | 'EXPORT';
  status: 'ISSUED' | 'CANCELLED';
  partyId: string;
  /** YYYY-MM-DD */
  date: string;
  /** The live shipment already carrying it, other than this one. */
  onShipment: string | null;
}

/** One buyer's issued export invoices, dated on or before loading, not on another truck. */
export function invoiceProblem(invoice: InvoiceFacts, partyId: string, date: string): string | null {
  if (invoice.kind !== 'EXPORT') return `${invoice.number} is a local invoice: shipments carry export invoices`;
  if (invoice.status !== 'ISSUED') return `${invoice.number} is cancelled`;
  if (invoice.partyId !== partyId) return `${invoice.number} is another buyer's: one buyer per truck`;
  if (invoice.date > date) return `${invoice.number} is dated after the loading date`;
  if (invoice.onShipment) return `${invoice.number} is already on shipment ${invoice.onShipment}`;
  return null;
}

/** A stage is dated on or after the stage before it, and not after today. */
export function stageDateProblem(date: string, previous: string, today: string): string | null {
  if (date > today) return 'The date is after today';
  if (date < previous) return 'The date is before the stage before it';
  return null;
}

/** Indian (WB73E1234) or Bhutanese (BG2A1234, BP-1-A1234) plates, stored upper case without spaces. */
export const VEHICLE_PATTERN = /^[A-Z]{2}-?\d{1,2}-?[A-Z]{0,3}-?\d{4}$/;
export const normaliseVehicle = (value: string) => value.toUpperCase().replace(/\s+/g, '');

const money = (value: number) => Math.round(value * 100) / 100;

export interface ShipmentProfit {
  sales: number;
  cost: number;
  /** Expenses on its invoices plus on the shipment itself (their cost: amount plus GST not claimable). */
  expenses: number;
  profit: number;
  marginPct: number;
}

/** Actual profit (SOW 15): sales before GST, less the FIFO cost of the goods, less every expense on it. */
export function shipmentProfit(invoices: { taxable: number; cost: number }[], expenseCosts: number[]): ShipmentProfit {
  const sales = money(invoices.reduce((sum, invoice) => sum + invoice.taxable, 0));
  const cost = money(invoices.reduce((sum, invoice) => sum + invoice.cost, 0));
  const expenses = money(expenseCosts.reduce((sum, value) => sum + value, 0));
  const profit = money(sales - cost - expenses);
  return { sales, cost, expenses, profit, marginPct: sales ? Math.round((profit / sales) * 10_000) / 100 : 0 };
}
