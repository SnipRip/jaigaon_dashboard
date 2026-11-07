// How our own registration fields fit together. The frontend checks the same
// in features/company/company-profile-schema.ts.
import {
  gstinPan,
  gstinProblem,
  gstinStateCode,
  STATE_CODES,
} from '../common/gst/gstin.js';
import type { GstRegistration } from '../generated/prisma/enums.js';

/** The fields the rules look at, after an update is merged onto the stored profile. */
export interface CompanyFacts {
  gstin: string | null;
  pan: string | null;
  stateCode: string;
  registration: GstRegistration;
}

/** Fills the PAN from a valid GSTIN when it was left out. */
export function settleCompany<T extends CompanyFacts>(company: T): T {
  if (!company.gstin || gstinProblem(company.gstin)) return company;
  return { ...company, pan: company.pan ?? gstinPan(company.gstin) };
}

/** Null when the profile is consistent, otherwise the first problem found. */
export function companyProblem(company: CompanyFacts): string | null {
  if (!STATE_CODES.has(company.stateCode)) return 'Unknown GST state code';
  if (company.registration === 'UNREGISTERED' && company.gstin) {
    return 'An unregistered business has no GSTIN: clear it or pick regular or composition';
  }
  if (!company.gstin) return null;
  const problem = gstinProblem(company.gstin);
  if (problem) return problem;
  if (gstinStateCode(company.gstin) !== company.stateCode) {
    return 'Our GSTIN must start with our GST state code';
  }
  if (company.pan && company.pan !== gstinPan(company.gstin)) {
    return 'The PAN does not match the GSTIN';
  }
  return null;
}
