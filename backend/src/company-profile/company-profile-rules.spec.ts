import { describe, expect, it } from 'vitest';
import { gstinCheckChar } from '../common/gst/gstin.js';
import {
  companyProblem,
  settleCompany,
  type CompanyFacts,
} from './company-profile-rules.js';

// A West Bengal GSTIN with a correct check character.
const first14 = '19ABCDE1234F1Z';
const GSTIN = first14 + gstinCheckChar(first14);

const base: CompanyFacts = { gstin: null, pan: null, stateCode: '19' };

describe('settleCompany', () => {
  it('fills the PAN from the GSTIN', () => {
    expect(settleCompany({ ...base, gstin: GSTIN }).pan).toBe('ABCDE1234F');
  });

  it('keeps a PAN that was sent', () => {
    expect(
      settleCompany({ ...base, gstin: GSTIN, pan: 'ZZZZZ9999Z' }).pan,
    ).toBe('ZZZZZ9999Z');
  });

  it('leaves the PAN alone without a valid GSTIN', () => {
    expect(settleCompany({ ...base, gstin: '19ABC' }).pan).toBeNull();
  });
});

describe('companyProblem', () => {
  it('accepts a profile without a GSTIN', () => {
    expect(companyProblem(base)).toBeNull();
  });

  it('accepts a GSTIN from our state with its PAN', () => {
    expect(
      companyProblem({ ...base, gstin: GSTIN, pan: 'ABCDE1234F' }),
    ).toBeNull();
  });

  it('rejects an unknown state code', () => {
    expect(companyProblem({ ...base, stateCode: '25' })).toBe(
      'Unknown GST state code',
    );
  });

  it('rejects a GSTIN with a wrong check character', () => {
    const wrong = first14 + (GSTIN.endsWith('A') ? 'B' : 'A');
    expect(companyProblem({ ...base, gstin: wrong })).toMatch(/last character/);
  });

  it('rejects a GSTIN from another state', () => {
    expect(companyProblem({ ...base, gstin: GSTIN, stateCode: '18' })).toBe(
      'Our GSTIN must start with our GST state code',
    );
  });

  it('rejects a PAN that differs from the GSTIN', () => {
    expect(companyProblem({ ...base, gstin: GSTIN, pan: 'ZZZZZ9999Z' })).toBe(
      'The PAN does not match the GSTIN',
    );
  });
});
