// Invoices as the API returns them: Decimals as numbers, dates as YYYY-MM-DD.
// Each line carries its FIFO draws, so the screen can show where the goods
// (and their cost) came from.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { AppliedScheme } from '../schemes/scheme-rules.js';

export const invoiceInclude = {
  party: { select: { displayName: true } },
  godown: { select: { name: true } },
  quotation: { select: { id: true, number: true, revision: true } },
  lines: {
    orderBy: { position: 'asc' },
    include: {
      draws: {
        select: { quantity: true, rate: true, batch: { select: { date: true, billLine: { select: { bill: { select: { id: true, reference: true } } } } } } },
      },
    },
  },
} as const satisfies Prisma.InvoiceInclude;

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export const toInvoiceView = (invoice: InvoiceRow) => ({
  id: invoice.id,
  kind: invoice.kind,
  number: invoice.number,
  date: isoDate(invoice.date),
  partyId: invoice.partyId,
  partyName: invoice.party.displayName,
  godownId: invoice.godownId,
  godownName: invoice.godown.name,
  status: invoice.status,
  regime: invoice.regime,
  placeOfSupply: invoice.placeOfSupply,
  lutArn: invoice.lutArn,
  destinationCountry: invoice.destinationCountry,
  currency: invoice.currency,
  shipToLine: invoice.shipToLine,
  shipToCity: invoice.shipToCity,
  vehicleNumber: invoice.vehicleNumber,
  notes: invoice.notes,
  quotation: invoice.quotation && {
    id: invoice.quotation.id,
    label: invoice.quotation.revision ? `${invoice.quotation.number}-R${invoice.quotation.revision}` : invoice.quotation.number,
  },
  totals: {
    gross: toNumber(invoice.gross),
    schemeDiscount: toNumber(invoice.schemeDiscount),
    taxable: toNumber(invoice.taxable),
    cgst: toNumber(invoice.cgst),
    sgst: toNumber(invoice.sgst),
    igst: toNumber(invoice.igst),
    tax: toNumber(invoice.tax),
    roundOff: toNumber(invoice.roundOff),
    total: toNumber(invoice.total),
    cost: toNumber(invoice.cost),
  },
  lines: invoice.lines.map((line) => ({
    id: line.id,
    itemId: line.itemId,
    description: line.description,
    hsn: line.hsn,
    unit: line.unit,
    quantity: toNumber(line.quantity),
    rate: toNumber(line.rate),
    discountPct: toNumber(line.discountPct),
    rateSource: line.rateSource,
    suggestedRate: toNumber(line.suggestedRate),
    schemeDiscount: toNumber(line.schemeDiscount),
    freeQuantity: toNumber(line.freeQuantity),
    schemes: line.schemes as unknown as AppliedScheme[],
    gstRatePct: toNumber(line.gstRatePct),
    taxable: toNumber(line.taxable),
    tax: toNumber(line.tax),
    costOfGoods: toNumber(line.costOfGoods),
    /** Oldest first; no bill means the opening stock. Empty once cancelled (the stock went back). */
    draws: line.draws
      .map((draw) => ({
      quantity: toNumber(draw.quantity),
      rate: toNumber(draw.rate),
      billId: draw.batch?.billLine.bill.id ?? null,
      billReference: draw.batch?.billLine.bill.reference ?? null,
      batchDate: draw.batch ? isoDate(draw.batch.date) : null,
    }))
      .sort((a, b) => (a.batchDate ?? '').localeCompare(b.batchDate ?? '')),
  })),
  cancelledAt: invoice.cancelledAt,
  cancelReason: invoice.cancelReason,
  createdAt: invoice.createdAt,
});

export type InvoiceView = ReturnType<typeof toInvoiceView>;
