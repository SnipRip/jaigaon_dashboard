import { describe, expect, it } from 'vitest';
import { bestMatch, rateOn } from './hsn-rules.js';

describe('bestMatch', () => {
  const codes = [{ code: '7214' }, { code: '721420' }, { code: '7217' }];

  it('takes the longest code the HSN starts with', () => {
    expect(bestMatch(codes, '72142090')?.code).toBe('721420');
    expect(bestMatch(codes, '72149990')?.code).toBe('7214');
    expect(bestMatch(codes, '7214')?.code).toBe('7214');
  });

  it('finds nothing for an HSN outside the master', () => {
    expect(bestMatch(codes, '6810')).toBeUndefined();
    // A longer master code never matches a shorter item HSN.
    expect(bestMatch([{ code: '72142090' }], '7214')).toBeUndefined();
  });
});

describe('rateOn', () => {
  // Out of order on purpose: the newest date in force wins, not the last entry.
  const rates = [
    { ratePct: 12, effectiveFrom: '2025-09-22' },
    { ratePct: 18, effectiveFrom: '2017-07-01' },
  ];

  it('uses the rate in force on the date', () => {
    expect(rateOn(rates, '2024-01-01')).toBe(18);
    expect(rateOn(rates, '2025-09-22')).toBe(12);
    expect(rateOn(rates, '2026-11-02')).toBe(12);
  });

  it('has no rate before the first one', () => {
    expect(rateOn(rates, '2017-06-30')).toBeUndefined();
  });
});
