// Purchase orders and bills as the API returns them: Decimals as numbers,
// dates as YYYY-MM-DD.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import { pendingQuantity } from './purchase-rules.js';

const optionalDate = (date: Date | null) => (date ? isoDate(date) : null);

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

export const billInclude = {
  vendor: { select: { displayName: true } },
  godown: { select: { name: true } },
  purchaseOrder: { select: { number: true } },
  landedCostFor: { select: { reference: true } },
  lines: { orderBy: { position: 'asc' }, include: { batch: { select: { remaining: true } } } },
  charges: { orderBy: { position: 'asc' }, include: { head: { select: { name: true } } } },
  taggedCharges: { where: { status: 'OPEN' }, select: { id: true, reference: true, cost: true } },
  // Live payments applied to it (src/settlements), oldest first.
  allocations: {
    where: { settlement: { cancelledAt: null } },
    orderBy: [{ settlement: { date: 'asc' } }, { settlement: { createdAt: 'asc' } }],
    select: { amount: true, settlement: { select: { id: true, number: true, date: true, mode: true } } },
  },
} as const satisfies Prisma.PurchaseBillInclude;

type BillRow = Prisma.PurchaseBillGetPayload<{ include: typeof billInclude }>;

export const toBillView = (bill: BillRow) => ({
  id: bill.id,
  kind: bill.kind,
  reference: bill.reference,
  vendorBillNumber: bill.vendorBillNumber,
  date: isoDate(bill.date),
  dueDate: isoDate(bill.dueDate),
  vendorId: bill.vendorId,
  vendorName: bill.vendor.displayName,
  sourceOfSupply: bill.sourceOfSupply,
  regime: bill.regime,
  godownId: bill.godownId,
  godownName: bill.godown?.name ?? null,
  purchaseOrderId: bill.purchaseOrderId,
  purchaseOrderNumber: bill.purchaseOrder?.number ?? null,
  allocation: bill.allocation,
  landedCostForId: bill.landedCostForId,
  landedCostForReference: bill.landedCostFor?.reference ?? null,
  taggedCharges: bill.taggedCharges.map((tagged) => ({ id: tagged.id, reference: tagged.reference, cost: toNumber(tagged.cost) })),
  ewayBillNumber: bill.ewayBillNumber,
  ewayBillDate: optionalDate(bill.ewayBillDate),
  vehicleNumber: bill.vehicleNumber,
  notes: bill.notes,
  status: bill.status,
  totals: {
    goodsValue: toNumber(bill.goodsValue),
    chargesValue: toNumber(bill.chargesValue),
    taxable: toNumber(bill.taxable),
    cgst: toNumber(bill.cgst),
    sgst: toNumber(bill.sgst),
    igst: toNumber(bill.igst),
    tax: toNumber(bill.tax),
    itcClaimable: toNumber(bill.itcClaimable),
    itcLost: toNumber(bill.itcLost),
    roundOff: toNumber(bill.roundOff),
    payable: toNumber(bill.payable),
    cost: toNumber(bill.cost),
    /** Paid so far: live payments (and TDS) applied to this bill. */
    paid: Math.round(bill.allocations.reduce((sum, allocation) => sum + toNumber(allocation.amount), 0) * 100) / 100,
  },
  /** Each live payment and what it applied to this bill (TDS included). */
  payments: bill.allocations.map((allocation) => ({
    settlementId: allocation.settlement.id,
    number: allocation.settlement.number,
    date: isoDate(allocation.settlement.date),
    mode: allocation.settlement.mode,
    amount: toNumber(allocation.amount),
  })),
  lines: bill.lines.map((line) => ({
    id: line.id,
    itemId: line.itemId,
    orderLineId: line.orderLineId,
    description: line.description,
    hsn: line.hsn,
    unit: line.unit,
    quantity: toNumber(line.quantity),
    rate: toNumber(line.rate),
    discountPct: toNumber(line.discountPct),
    gstRatePct: toNumber(line.gstRatePct),
    itcEligible: line.itcEligible,
    taxable: toNumber(line.taxable),
    tax: toNumber(line.tax),
    ownCost: toNumber(line.ownCost),
    landedShare: toNumber(line.landedShare),
    landedCost: toNumber(line.landedCost),
    landedRate: toNumber(line.landedRate),
    /** Still in stock from this line; null once the bill is void. */
    remaining: line.batch ? toNumber(line.batch.remaining) : null,
  })),
  charges: bill.charges.map((charge) => ({
    id: charge.id,
    headId: charge.headId,
    headName: charge.head.name,
    description: charge.description,
    amount: toNumber(charge.amount),
    gstRatePct: toNumber(charge.gstRatePct),
    tax: toNumber(charge.tax),
  })),
  createdAt: bill.createdAt,
});

export type PurchaseBillView = ReturnType<typeof toBillView>;

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const orderInclude = {
  vendor: { select: { displayName: true } },
  godown: { select: { name: true } },
  lines: {
    orderBy: { position: 'asc' },
    include: {
      item: { select: { name: true, sku: true } },
      billLines: { where: { bill: { status: 'OPEN' } }, select: { quantity: true } },
    },
  },
  bills: { where: { status: 'OPEN' }, select: { id: true, reference: true, date: true }, orderBy: { date: 'asc' } },
} as const satisfies Prisma.PurchaseOrderInclude;

type OrderRow = Prisma.PurchaseOrderGetPayload<{ include: typeof orderInclude }>;

export type ReceiptState = 'NOT_RECEIVED' | 'PARTLY_RECEIVED' | 'RECEIVED';

export function toOrderView(order: OrderRow, units: Map<string, string>, figures: { taxable: number; tax: number; total: number }) {
  const lines = order.lines.map((line) => {
    const quantity = toNumber(line.quantity);
    const received = Math.round(line.billLines.reduce((sum, row) => sum + toNumber(row.quantity), 0) * 1000) / 1000;
    return {
      id: line.id,
      itemId: line.itemId,
      itemName: line.item.name,
      sku: line.item.sku,
      unit: units.get(line.itemId) ?? 'unit',
      quantity,
      rate: toNumber(line.rate),
      discountPct: toNumber(line.discountPct),
      gstRatePct: toNumber(line.gstRatePct),
      received,
      pending: pendingQuantity(quantity, received),
    };
  });
  const anyReceived = lines.some((line) => line.received > 0);
  const receipt: ReceiptState = lines.every((line) => line.pending === 0) ? 'RECEIVED' : anyReceived ? 'PARTLY_RECEIVED' : 'NOT_RECEIVED';
  return {
    id: order.id,
    number: order.number,
    date: isoDate(order.date),
    expectedDate: optionalDate(order.expectedDate),
    vendorId: order.vendorId,
    vendorName: order.vendor.displayName,
    godownId: order.godownId,
    godownName: order.godown.name,
    status: order.status,
    receipt,
    terms: order.terms,
    notes: order.notes,
    lines,
    bills: order.bills.map((bill) => ({ id: bill.id, reference: bill.reference, date: isoDate(bill.date) })),
    totals: figures,
    createdAt: order.createdAt,
  };
}

export type PurchaseOrderView = ReturnType<typeof toOrderView>;
