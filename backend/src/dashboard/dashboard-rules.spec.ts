import { describe, expect, it } from 'vitest';
import { recentWeeks, sumByWeek, weekOf } from './dashboard-rules.js';

describe('weekOf', () => {
  it('gives the Monday of the week', () => {
    expect(weekOf('2026-11-06')).toBe('2026-11-02'); // Friday
    expect(weekOf('2026-11-02')).toBe('2026-11-02'); // Monday
    expect(weekOf('2026-11-08')).toBe('2026-11-02'); // Sunday
  });
});

describe('recentWeeks', () => {
  it('lists Mondays up to this week, oldest first, across a month end', () => {
    expect(recentWeeks('2026-11-06', 3)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
  });
});

describe('sumByWeek', () => {
  it('adds amounts into their week and leaves out older ones', () => {
    const weeks = ['2026-10-26', '2026-11-02'];
    const rows = [
      { date: '2026-10-20', amount: 999 },
      { date: '2026-10-27', amount: 100.1 },
      { date: '2026-11-01', amount: 0.2 },
      { date: '2026-11-04', amount: 50 },
    ];
    expect(sumByWeek(weeks, rows)).toEqual([100.3, 50]);
  });
});
