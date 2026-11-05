// Quotations as the API returns them: Decimals as numbers, dates as YYYY-MM-DD.
import { isoDate } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { AppliedScheme } from '../schemes/scheme-rules.js';

export const quotationInclude = {
  party: { select: { displayName: true } },
  lines: { orderBy: { position: 'asc' } },
  revisions: { orderBy: { revision: 'asc' } },
  // The live invoice it was converted to (a cancelled one no longer counts).
  invoices: { where: { status: 'ISSUED' }, select: { id: true, number: true } },
} as const satisfies Prisma.QuotationInclude;

type QuotationRow = Prisma.QuotationGetPayload<{ include: typeof quotationInclude }>;

export const toQuotationView = (quotation: QuotationRow) => ({
  id: quotation.id,
  number: quotation.number,
  revision: quotation.revision,
  date: isoDate(quotation.date),
  validUntil: isoDate(quotation.validUntil),
  partyId: quotation.partyId,
  partyName: quotation.party.displayName,
  status: quotation.status,
  regime: quotation.regime,
  terms: quotation.terms,
  notes: quotation.notes,
  totals: {
    gross: toNumber(quotation.gross),
    schemeDiscount: toNumber(quotation.schemeDiscount),
    taxable: toNumber(quotation.taxable),
    cgst: toNumber(quotation.cgst),
    sgst: toNumber(quotation.sgst),
    igst: toNumber(quotation.igst),
    tax: toNumber(quotation.tax),
    roundOff: toNumber(quotation.roundOff),
    total: toNumber(quotation.total),
    cost: toNumber(quotation.cost),
  },
  lines: quotation.lines.map((line) => ({
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
    costAtQuote: toNumber(line.costAtQuote),
  })),
  history: quotation.revisions.map((row) => ({ revision: row.revision, date: isoDate(row.date), total: toNumber(row.total), note: row.note })),
  invoice: quotation.invoices[0] ?? null,
  createdAt: quotation.createdAt,
});

export type QuotationView = ReturnType<typeof toQuotationView>;
