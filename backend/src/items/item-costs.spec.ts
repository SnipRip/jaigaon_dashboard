import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { itemCosts, stockOnHand } from './item-costs.js';

const opening = (quantity: number, value: number) => ({
  quantity: new Prisma.Decimal(quantity),
  value: new Prisma.Decimal(value),
});
const batch = (remaining: number, landedRate: number) => ({
  remaining: new Prisma.Decimal(remaining),
  landedRate: new Prisma.Decimal(landedRate),
});
const source = (openingStock: ReturnType<typeof opening>[], stockBatches: ReturnType<typeof batch>[] = []) => ({ openingStock, stockBatches });

describe('itemCosts', () => {
  it('has no cost before any stock', () => {
    expect(itemCosts(source([]))).toEqual({ lastLandedCost: null, stockCost: null });
    expect(itemCosts(source([opening(0, 0)]))).toEqual({ lastLandedCost: null, stockCost: null });
  });

  it('is value ÷ quantity across godowns, to paise', () => {
    // 3 pieces at ₹4,000 are ₹4,000 each, never ₹14,000 (Tally's average).
    expect(itemCosts(source([opening(3, 12000)])).stockCost).toBe(4000);
    expect(itemCosts(source([opening(100, 57714), opening(100, 55143)]))).toEqual({
      lastLandedCost: 564.29,
      stockCost: 564.29,
    });
  });

  it('takes the newest bill batch as the last landed cost, and values what is left', () => {
    // Opening 100 at ₹50; bills: 200 left at ₹56.5 (newest), 100 at ₹55.
    const costs = itemCosts(source([opening(100, 5000)], [batch(200, 56.5), batch(100, 55)]));
    expect(costs.lastLandedCost).toBe(56.5);
    // (5,000 + 11,300 + 5,500) ÷ 400.
    expect(costs.stockCost).toBe(54.5);
  });

  it('keeps the last landed cost once a batch is sold out', () => {
    expect(itemCosts(source([], [batch(0, 61.2345)]))).toEqual({ lastLandedCost: 61.23, stockCost: null });
  });
});

describe('stockOnHand', () => {
  it('adds opening stock and what is left of each batch, in thousandths', () => {
    expect(stockOnHand(source([opening(0.1, 1)], [batch(0.2, 1), batch(5, 1)]))).toBe(5.3);
  });
});
