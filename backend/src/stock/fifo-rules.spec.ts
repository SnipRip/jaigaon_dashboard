import { describe, expect, it } from 'vitest';
import { costOfDraws, openingLeft, openingRate, planFifo } from './fifo-rules.js';

describe('planFifo', () => {
  const slices = [
    { batchId: null, available: 50, rate: 52 },
    { batchId: 'b1', available: 100, rate: 57.1497 },
    { batchId: 'b2', available: 200, rate: 59.5 },
  ];

  it('takes the oldest stock first, across slices', () => {
    expect(planFifo(slices, 120)).toEqual({
      draws: [
        { batchId: null, quantity: 50, rate: 52 },
        { batchId: 'b1', quantity: 70, rate: 57.1497 },
      ],
      short: 0,
    });
  });

  it('stops at the first slice that covers the quantity', () => {
    expect(planFifo(slices, 30).draws).toEqual([{ batchId: null, quantity: 30, rate: 52 }]);
  });

  it('skips empty slices', () => {
    expect(planFifo([{ batchId: 'b0', available: 0, rate: 40 }, ...slices.slice(1)], 10).draws).toEqual([{ batchId: 'b1', quantity: 10, rate: 57.1497 }]);
  });

  it('reports what it could not cover', () => {
    const plan = planFifo(slices, 400);
    expect(plan.short).toBe(50);
    expect(plan.draws.reduce((sum, draw) => sum + draw.quantity, 0)).toBe(350);
  });

  it('keeps decimals exact', () => {
    const plan = planFifo([{ batchId: 'a', available: 0.1, rate: 10 }, { batchId: 'b', available: 0.2, rate: 20 }], 0.3);
    expect(plan.short).toBe(0);
    expect(plan.draws.map((draw) => draw.quantity)).toEqual([0.1, 0.2]);
  });
});

describe('costOfDraws', () => {
  it('is quantity × rate over the draws, to paise', () => {
    // 50 × 52 + 70 × 57.1497 = 2,600 + 4,000.479.
    expect(costOfDraws([{ quantity: 50, rate: 52 }, { quantity: 70, rate: 57.1497 }])).toBe(6600.48);
    expect(costOfDraws([])).toBe(0);
  });
});

describe('opening stock', () => {
  it('rates the opening stock at value ÷ quantity', () => {
    expect(openingRate(3, 12000)).toBe(4000);
    expect(openingRate(7, 100)).toBe(14.2857);
    expect(openingRate(0, 0)).toBe(0);
  });
  it('leaves quantity − drawn', () => {
    expect(openingLeft(0.3, 0.1)).toBe(0.2);
  });
});
