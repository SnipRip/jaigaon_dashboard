// What an invoice may be, before it is priced and stock is drawn. Pure.
import type { GstTreatment, InvoiceKind, NumberedKind, QuotationStatus, SaleRegime } from '../generated/prisma/enums.js';

/** Local tax invoices and export invoices have separate series that share one uniqueness scope. */
export const SERIES_OF: Record<InvoiceKind, NumberedKind> = { LOCAL: 'SALES_INVOICE', EXPORT: 'EXPORT_INVOICE' };

/** An export invoice is for buyers outside India (or an SEZ); a local one for everyone else. */
export function kindProblem(kind: InvoiceKind, treatment: GstTreatment): string | null {
  const abroad = treatment === 'OVERSEAS' || treatment === 'SEZ';
  if (kind === 'EXPORT' && !abroad) return 'An export invoice is for a buyer outside India or in an SEZ. Make a local invoice.';
  if (kind === 'LOCAL' && treatment === 'OVERSEAS') return 'This buyer is outside India. Make an export invoice.';
  return null;
}

/** A quotation the customer has been given, or has accepted, can become an invoice once. */
export function conversionProblem(status: QuotationStatus): string | null {
  if (status === 'SENT' || status === 'ACCEPTED') return null;
  if (status === 'CONVERTED') return 'This quotation is already invoiced';
  return `A ${status.toLowerCase()} quotation cannot be invoiced`;
}

/** Each line takes its quantity plus the free units schemes gave out of stock. */
export const quantityOut = (line: { quantity: number; freeQuantity: number }) => Math.round((line.quantity + line.freeQuantity) * 1000) / 1000;

/**
 * What the customer owes on an invoice. With IGST paid on an export the
 * buyer pays only the goods value: we pay the IGST and claim it back
 * (agent/context.md, "Export routes"), so it is not theirs to settle.
 */
export const customerOwes = (invoice: { regime: SaleRegime; total: number; igst: number }) =>
  invoice.regime === 'EXPORT_IGST' ? Math.round((invoice.total - invoice.igst) * 100) / 100 : invoice.total;
