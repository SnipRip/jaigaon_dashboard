import { describe, expect, it } from 'vitest';
import { financialYearOf, isFinancialYear } from './financial-year.js';

describe('financialYearOf', () => {
  it('starts the year on 1 April', () => {
    expect(financialYearOf('2026-04-01')).toBe('2026-27');
    expect(financialYearOf('2027-03-31')).toBe('2026-27');
  });

  it('pads the closing year across a century', () => {
    expect(financialYearOf('2099-12-01')).toBe('2099-00');
  });
});

describe('isFinancialYear', () => {
  it('accepts consecutive years', () => {
    expect(isFinancialYear('2026-27')).toBe(true);
    expect(isFinancialYear('2099-00')).toBe(true);
  });

  it('rejects other shapes', () => {
    expect(isFinancialYear('2026-28')).toBe(false);
    expect(isFinancialYear('2026')).toBe(false);
    expect(isFinancialYear('26-27')).toBe(false);
  });
});
