import { describe, expect, it } from 'vitest';
import { lutProblem } from './lut-rules.js';

describe('lutProblem', () => {
  it('accepts a full financial year', () => {
    expect(
      lutProblem({ validFrom: '2026-04-01', validTo: '2027-03-31' }),
    ).toBeNull();
  });

  it('accepts an LUT filed mid-year', () => {
    expect(
      lutProblem({ validFrom: '2026-07-15', validTo: '2027-03-31' }),
    ).toBeNull();
  });

  it('rejects an end before the start', () => {
    expect(lutProblem({ validFrom: '2026-05-01', validTo: '2026-04-30' })).toBe(
      'Valid to must be on or after valid from',
    );
  });

  it('rejects dates in two financial years', () => {
    expect(lutProblem({ validFrom: '2026-04-01', validTo: '2027-04-01' })).toBe(
      'An LUT covers one financial year: valid to must be on or before 31 March 2027',
    );
    expect(lutProblem({ validFrom: '2027-02-01', validTo: '2027-06-30' })).toMatch(
      /31 March 2027$/,
    );
  });
});
