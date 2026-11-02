// How a party's fields fit together. The frontend checks the same in
// features/parties/party-schema.ts; these are the ones the database relies on.
import {
  gstinPan,
  gstinProblem,
  gstinStateCode,
  STATE_CODES,
} from '../common/gst/gstin.js';
import type { BalanceSide, GstTreatment } from '../generated/prisma/enums.js';

/** The fields the rules look at, after an update is merged onto the stored party. */
export interface PartyFacts {
  isCustomer: boolean;
  isVendor: boolean;
  treatment: GstTreatment;
  gstin: string | null;
  pan: string | null;
  placeOfSupply: string | null;
  country: string | null;
  foreignTaxId: string | null;
  currency: 'INR' | 'BTN';
  exportRoute: 'LUT' | 'IGST' | null;
  isGta: boolean;
  creditLimit: number | null;
  /** Customers only. */
  priceLevelId: string | null;
  openingBalanceSide: BalanceSide;
}

export const needsGstin = (treatment: GstTreatment) =>
  treatment === 'REGISTERED' ||
  treatment === 'COMPOSITION' ||
  treatment === 'SEZ';

/** The sidebar modules a party belongs to, for permission checks. */
export const partyModules = (party: {
  isCustomer: boolean;
  isVendor: boolean;
}) => [
  ...(party.isCustomer ? ['/customers'] : []),
  ...(party.isVendor ? ['/vendors'] : []),
];

/**
 * Fills what follows from other fields, so callers need not send it: the
 * place of supply and PAN from a GSTIN, and the balance side from a single
 * role. Clears fields that do not apply to the treatment or roles.
 */
export function settleParty<T extends PartyFacts>(party: T): T {
  const settled = { ...party };
  const overseas = party.treatment === 'OVERSEAS';
  if (
    needsGstin(party.treatment) &&
    party.gstin &&
    !gstinProblem(party.gstin)
  ) {
    settled.pan ??= gstinPan(party.gstin);
    // An SEZ unit's place of supply is where the SEZ is, which the GSTIN gives too.
    settled.placeOfSupply ??= gstinStateCode(party.gstin);
  }
  if (overseas) {
    settled.exportRoute = party.isCustomer
      ? (party.exportRoute ?? 'LUT')
      : null;
  } else {
    settled.exportRoute = null;
  }
  if (!party.isVendor) settled.isGta = false;
  if (!party.isCustomer) {
    settled.creditLimit = null;
    settled.priceLevelId = null;
  }
  if (party.isCustomer !== party.isVendor) {
    settled.openingBalanceSide = party.isCustomer ? 'RECEIVABLE' : 'PAYABLE';
  }
  return settled;
}

/** Null when the party is consistent, otherwise the first problem found. */
export function partyProblem(party: PartyFacts): string | null {
  if (!party.isCustomer && !party.isVendor)
    return 'Pick customer, vendor or both';

  if (needsGstin(party.treatment)) {
    if (!party.gstin) return 'Enter the GSTIN';
    const problem = gstinProblem(party.gstin);
    if (problem) return problem;
    if (party.pan && party.pan !== gstinPan(party.gstin))
      return 'The PAN does not match the GSTIN';
    if (
      party.treatment !== 'SEZ' &&
      party.placeOfSupply !== gstinStateCode(party.gstin)
    ) {
      return 'The place of supply does not match the state in the GSTIN';
    }
  } else if (party.gstin) {
    return 'Only registered, composition and SEZ parties have a GSTIN';
  }

  if (party.treatment === 'OVERSEAS') {
    if (!party.country) return 'Enter the country';
    if (party.placeOfSupply)
      return 'A party outside India has no place of supply';
  } else {
    if (!party.placeOfSupply) return 'Pick the place of supply';
    if (!STATE_CODES.has(party.placeOfSupply))
      return 'Unknown GST state code for the place of supply';
    if (party.country) return 'Country is only for a party outside India';
    if (party.foreignTaxId)
      return 'A foreign tax ID is only for a party outside India';
    if (party.currency !== 'INR')
      return 'Only a party outside India can be billed in BTN';
  }
  return null;
}
