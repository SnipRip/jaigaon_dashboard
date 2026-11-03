import { describe, expect, it } from 'vitest';
import {
  numberProblem,
  parsePattern,
  patternProblem,
  periodOf,
  renderNumber,
  uniqueWithinOf,
  type PatternPart,
} from './number-pattern.js';

const render = (pattern: string, date: string, sequence: number) =>
  renderNumber(parsePattern(pattern) as PatternPart[], date, sequence);

describe('renderNumber', () => {
  it('fills every token', () => {
    expect(render('INV/{FY}/{SEQ:4}', '2026-11-03', 7)).toBe('INV/2627/0007');
    expect(render('B/{FY_LONG}/{SEQ:3}', '2027-03-31', 1)).toBe(
      'B/2026-27/001',
    );
    expect(render('JQE-{YY}{MM}-{SEQ:3}', '2026-11-03', 12)).toBe(
      'JQE-2611-012',
    );
    expect(render('{YYYY}/{SEQ}', '2026-11-03', 125)).toBe('2026/125');
    expect(render('C{SEQ:5}', '2026-11-03', 1)).toBe('C00001');
  });

  it('never cuts a number longer than its width', () => {
    expect(render('Q-{SEQ:2}', '2026-11-03', 1234)).toBe('Q-1234');
  });
});

describe('parsePattern', () => {
  it('names an unknown token', () => {
    expect(parsePattern('INV/{YEAR}/{SEQ}')).toMatch(
      /^\{YEAR\} is not a token/,
    );
  });

  it('refuses a width on anything but SEQ, and stray braces', () => {
    expect(parsePattern('{FY:2}{SEQ}')).toBe(
      'Only {SEQ} takes a width, as in {SEQ:4}',
    );
    expect(parsePattern('INV{SEQ')).toBe(
      'Write tokens in braces, like {FY} or {SEQ:4}',
    );
    expect(parsePattern('A{SEQ:9}')).toBe('{SEQ} pads to at most 8 digits');
  });
});

describe('periodOf and uniqueWithinOf', () => {
  it('picks the counter', () => {
    expect(periodOf('YEARLY', '2027-02-10')).toBe('2026-27');
    expect(periodOf('MONTHLY', '2027-02-10')).toBe('2027-02');
    expect(periodOf('NEVER', '2027-02-10')).toBe('ALL');
  });

  it('keeps documents unique per year and codes for ever', () => {
    expect(uniqueWithinOf('SALES_INVOICE', '2026-11-03')).toBe('2026-27');
    expect(uniqueWithinOf('CUSTOMER_CODE', '2026-11-03')).toBe('ALL');
  });
});

describe('patternProblem', () => {
  it('accepts the usual formats', () => {
    expect(
      patternProblem('SALES_INVOICE', 'INV/{FY}/{SEQ:4}', 'YEARLY'),
    ).toBeNull();
    expect(
      patternProblem('SALES_INVOICE', 'B-1/{FY_LONG}/{SEQ:3}', 'YEARLY'),
    ).toBeNull();
    expect(
      patternProblem('RECEIPT', 'RV{YY}{MM}{SEQ:3}', 'MONTHLY'),
    ).toBeNull();
    expect(patternProblem('CUSTOMER_CODE', 'C{SEQ:5}', 'NEVER')).toBeNull();
    expect(patternProblem('SALES_INVOICE', '{SEQ}', 'YEARLY')).toBeNull();
  });

  it('needs exactly one running number', () => {
    expect(patternProblem('QUOTATION', 'QT/{FY}', 'YEARLY')).toBe(
      'Put {SEQ} (the running number) in the pattern once',
    );
    expect(patternProblem('QUOTATION', '{SEQ}/{SEQ}', 'YEARLY')).toMatch(
      /once$/,
    );
  });

  it('keeps GST numbers to 16 characters', () => {
    expect(
      patternProblem('SALES_INVOICE', 'INVOICE/{FY_LONG}/{SEQ:4}', 'YEARLY'),
    ).toBe('INVOICE/2026-27/0001 is 20 characters; GST allows 16');
    // Not a GST document: 30 is the limit.
    expect(
      patternProblem('QUOTATION', 'QUOTATION/{FY_LONG}/{SEQ:4}', 'YEARLY'),
    ).toBeNull();
  });

  it('allows only the GST characters', () => {
    expect(patternProblem('SALES_INVOICE', 'INV_{SEQ:4}', 'YEARLY')).toBe(
      'Fixed text uses only letters, digits, "-" and "/"',
    );
    expect(patternProblem('ITEM_SKU', 'TMT/{SEQ:4}', 'NEVER')).toBe(
      'Fixed text uses only letters, digits and "-"',
    );
  });

  it('follows the e-invoice first-character rule', () => {
    expect(patternProblem('SALES_INVOICE', '{SEQ:4}', 'YEARLY')).toBe(
      'A GST number cannot start with 0: begin with fixed text or the year',
    );
    expect(patternProblem('SALES_INVOICE', '{MM}/{SEQ}', 'MONTHLY')).toMatch(
      /cannot start with 0/,
    );
    expect(patternProblem('SALES_INVOICE', '/INV/{SEQ}', 'YEARLY')).toMatch(
      /starts with a letter or a digit from 1 to 9/,
    );
  });

  it('needs the month when the count restarts monthly', () => {
    expect(patternProblem('RECEIPT', 'RV/{FY}/{SEQ:3}', 'MONTHLY')).toBe(
      'A series that restarts every month needs {MM} in the pattern',
    );
  });

  it('never restarts master codes', () => {
    expect(patternProblem('VENDOR_CODE', 'V{FY}{SEQ:3}', 'YEARLY')).toBe(
      'Codes never restart: pick "Never"',
    );
  });
});

describe('numberProblem', () => {
  it('checks a typed number', () => {
    expect(numberProblem('SALES_INVOICE', 'TALLY/2627/0450')).toBeNull();
    expect(numberProblem('SALES_INVOICE', '0450')).toMatch(/1 to 9/);
    expect(numberProblem('SALES_INVOICE', 'INV#1')).toBe(
      'INV#1: use only letters, digits, "-" and "/"',
    );
    expect(numberProblem('CREDIT_NOTE', 'CN/2026-27/000001')).toBe(
      'CN/2026-27/000001 is 17 characters; GST allows 16',
    );
  });
});
