import { describe, expect, it } from 'vitest';
import { changeProblem, formatNumber, seriesProblem } from './number-series-rules.js';

const invoices = {
  document: 'SALES_INVOICE',
  financialYear: '2026-27',
  prefix: 'INV/2627/',
  nextNumber: 9,
  padding: 4,
};

describe('formatNumber', () => {
  it('pads the number', () => {
    expect(formatNumber('INV/2627/', 9, 4)).toBe('INV/2627/0009');
  });

  it('never cuts a number longer than the padding', () => {
    expect(formatNumber('Q-', 12345, 4)).toBe('Q-12345');
  });
});

describe('seriesProblem', () => {
  it('accepts a normal series', () => {
    expect(seriesProblem(invoices)).toBeNull();
  });

  it('rejects a financial year that is not consecutive', () => {
    expect(seriesProblem({ ...invoices, financialYear: '2026-28' })).toMatch(/like 2026-27/);
  });

  it('rejects numbers over 16 characters', () => {
    expect(seriesProblem({ ...invoices, prefix: 'INVOICE/2627/', padding: 4 })).toBe(
      'INVOICE/2627/0009 is 17 characters; GST allows 16. Shorten the prefix or the digits.',
    );
  });

  it('rejects a next number that has outgrown the space', () => {
    expect(seriesProblem({ ...invoices, padding: 7, nextNumber: 123456789 })).toMatch(/18 characters/);
  });
});

describe('changeProblem', () => {
  const stored = { ...invoices, lastIssued: 8 };

  it('allows any change before the first number is issued', () => {
    expect(changeProblem({ ...stored, lastIssued: 0 }, { ...invoices, prefix: 'SI/', nextNumber: 1 })).toBeNull();
  });

  it('lets the next number move forward', () => {
    expect(changeProblem(stored, { ...invoices, nextNumber: 20 })).toBeNull();
  });

  it('refuses a number already issued', () => {
    expect(changeProblem(stored, { ...invoices, nextNumber: 8 })).toBe(
      'Numbers up to 8 are already issued: the next number must be 9 or more',
    );
  });

  it('locks the format once in use', () => {
    expect(changeProblem(stored, { ...invoices, prefix: 'SI/2627/' })).toBe(
      'Numbers up to INV/2627/0008 are already issued, so only the next number can change',
    );
    expect(changeProblem(stored, { ...invoices, financialYear: '2027-28' })).toMatch(/only the next number/);
  });
});
