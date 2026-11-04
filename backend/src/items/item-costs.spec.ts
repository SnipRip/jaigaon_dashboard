import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { itemCosts } from './item-costs.js';

const batch = (quantity: number, value: number) => ({
  quantity: new Prisma.Decimal(quantity),
  value: new Prisma.Decimal(value),
});

describe('itemCosts', () => {
  it('has no cost before any stock', () => {
    expect(itemCosts([])).toEqual({ lastLandedCost: null, stockCost: null });
    expect(itemCosts([batch(0, 0)])).toEqual({ lastLandedCost: null, stockCost: null });
  });

  it('is value ÷ quantity across godowns, to paise', () => {
    // 3 pieces at ₹4,000 are ₹4,000 each, never ₹14,000 (Tally's average).
    expect(itemCosts([batch(3, 12000)]).stockCost).toBe(4000);
    expect(itemCosts([batch(100, 57714), batch(100, 55143)])).toEqual({
      lastLandedCost: 564.29,
      stockCost: 564.29,
    });
  });
});
