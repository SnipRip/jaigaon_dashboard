// Sale GST and line rate sources for quotations and invoices. Pure.
// The frontend shows the same live from features/gst/gst-rules.ts saleTax.
import { chargesGst, outsideStateProblem, type OurRegistration } from '../common/gst/our-registration.js';
import type { TaxSplit } from '../common/gst/tax-split.js';
import type { ExportRoute, GstTreatment, InvoiceKind, LineRateSource, SaleRegime } from '../generated/prisma/enums.js';

/**
 * Overseas and SEZ buyers: export under LUT (0%) or with IGST paid; else
 * CGST + SGST when the place of supply is our state, IGST from another.
 * A composition dealer or unregistered business charges no GST (bill of
 * supply) and may not sell outside its state: `problem` says why.
 */
export function saleRegime(
  company: OurRegistration,
  party: { treatment: GstTreatment; placeOfSupply: string | null; exportRoute: ExportRoute | null },
): { regime: SaleRegime; split: TaxSplit; problem: string | null } {
  const regular = regularSale(company.stateCode, party);
  if (chargesGst(company)) return { ...regular, problem: null };
  return { regime: 'BILL_OF_SUPPLY', split: 'NONE', problem: regular.regime === 'INTRA_STATE' ? null : outsideStateProblem(company) };
}

function regularSale(
  companyState: string,
  party: { treatment: GstTreatment; placeOfSupply: string | null; exportRoute: ExportRoute | null },
): { regime: SaleRegime; split: TaxSplit } {
  if (party.treatment === 'OVERSEAS' || party.treatment === 'SEZ') {
    return party.exportRoute === 'IGST' ? { regime: 'EXPORT_IGST', split: 'INTER' } : { regime: 'EXPORT_LUT', split: 'NONE' };
  }
  // A walk-in buyer or one with no state on record buys here.
  return !party.placeOfSupply || party.placeOfSupply === companyState
    ? { regime: 'INTRA_STATE', split: 'INTRA' }
    : { regime: 'INTER_STATE', split: 'INTER' };
}

export interface OfferedRates {
  special: number | null;
  sheet: number | null;
  lastQuoted: number | null;
  lastSold: number | null;
}

/**
 * An invoice charges GST by its own kind and fields: an export invoice by
 * its route (LUT or IGST paid, defaulting to the buyer's); a local one by its
 * place of supply, which can differ from the buyer's state (delivery to
 * another state). SEZ buyers are zero-rated like exports either way.
 */
export function invoiceRegime(
  company: OurRegistration,
  kind: InvoiceKind,
  party: { treatment: GstTreatment; placeOfSupply: string | null; exportRoute: ExportRoute | null },
  fields: { placeOfSupply?: string | null; exportRoute?: ExportRoute | null },
): { regime: SaleRegime; split: TaxSplit; placeOfSupply: string | null; problem: string | null } {
  const route = fields.exportRoute ?? party.exportRoute;
  if (kind === 'EXPORT' || party.treatment === 'SEZ') {
    const exported = saleRegime(company, { treatment: 'OVERSEAS', placeOfSupply: null, exportRoute: route });
    return { ...exported, placeOfSupply: kind === 'LOCAL' ? (fields.placeOfSupply ?? party.placeOfSupply ?? company.stateCode) : null };
  }
  const placeOfSupply = fields.placeOfSupply ?? party.placeOfSupply ?? company.stateCode;
  return { ...saleRegime(company, { treatment: party.treatment, placeOfSupply, exportRoute: null }), placeOfSupply };
}

/**
 * Where a typed rate came from: the first offered rate it equals, in the
 * order the line shows them; anything else was typed by hand.
 */
export function rateSourceOf(rate: number, offered: OfferedRates): LineRateSource {
  const same = (value: number | null) => value !== null && Math.abs(value - rate) < 0.005;
  if (same(offered.special)) return 'SPECIAL';
  if (same(offered.sheet)) return 'SHEET';
  if (same(offered.lastQuoted)) return 'LAST_QUOTED';
  if (same(offered.lastSold)) return 'LAST_SOLD';
  return 'MANUAL';
}

/** Schemes see three kinds of rate: a past document's rate counts as typed. */
export const schemeSourceOf = (source: LineRateSource) => (source === 'SPECIAL' ? 'SPECIAL' : source === 'SHEET' ? 'SHEET' : 'MANUAL');

/** QT/2627/0041, or QT/2627/0041-R2 after two revisions. */
export const quotationLabel = (number: string, revision: number) => (revision ? `${number}-R${revision}` : number);
