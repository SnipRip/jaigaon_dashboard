import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { itemCosts, stockByGodown, stockOnHand, stockValue } from './item-costs.js';

const opening = (quantity: number, value: number, drawn = 0) => ({
  quantity: new Prisma.Decimal(quantity),
  value: new Prisma.Decimal(value),
  drawn: new Prisma.Decimal(drawn),
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

describe('stockValue', () => {
  it('is the FIFO value of what is left, not quantity × the rounded average', () => {
    // 32 kg at a landed rate of 71.30595: worth 2,281.79; 32 × 71.31 (stockCost) would say 2,281.92.
    const held = source([], [batch(32, 71.30595)]);
    expect(itemCosts(held).stockCost).toBe(71.31);
    expect(stockValue(held)).toBe(2281.79);
  });

  it('values opening stock left at its own rate, plus each batch', () => {
    // 100 opening at ₹5,000 with 40 sold: 60 × 50 = 3,000; batch 10 × 56.5.
    expect(stockValue(source([opening(100, 5000, 40)], [batch(10, 56.5)]))).toBe(3565);
    expect(stockValue(source([]))).toBe(0);
  });
});

describe('stockOnHand', () => {
  it('adds opening stock and what is left of each batch, in thousandths', () => {
    expect(stockOnHand(source([opening(0.1, 1)], [batch(0.2, 1), batch(5, 1)]))).toBe(5.3);
  });
  it("leaves out what sales drew from the opening stock", () => {
    expect(stockOnHand(source([opening(100, 5000, 30.5)], [batch(20, 1)]))).toBe(89.5);
  });
});

describe("itemCosts after sales", () => {
  it("values the opening stock left at its own rate", () => {
    // 100 at ₹50, 60 sold: 40 left at ₹50, plus 100 at ₹56.
    expect(itemCosts(source([opening(100, 5000, 60)], [batch(100, 56)]))).toEqual({ lastLandedCost: 56, stockCost: 54.29 });
    // Sold out: no stock cost, the opening rate stays the last cost.
    expect(itemCosts(source([opening(10, 500, 10)]))).toEqual({ lastLandedCost: 50, stockCost: null });
  });
});

describe('lastLandedCost', () => {
  it('skips batches a transfer moved in or an adjustment added', () => {
    const moved = { ...batch(50, 40), billLineId: null };
    const billed = { ...batch(10, 56), billLineId: 'line' };
    expect(itemCosts(source([], [moved, billed])).lastLandedCost).toBe(56);
  });
});

describe('stockByGodown', () => {
  const d = (value: string) => new Prisma.Decimal(value);
  it('adds opening stock left and batches per godown, leaving out empty godowns', () => {
    expect(
      stockByGodown({
        openingStock: [
          { godownId: 'a', quantity: d('10.1'), drawn: d('0.1') },
          { godownId: 'b', quantity: d('5'), drawn: d('5') },
        ],
        stockBatches: [
          { godownId: 'a', remaining: d('0.2') },
          { godownId: 'c', remaining: d('3') },
          { godownId: 'b', remaining: d('0') },
        ],
      }),
    ).toEqual([
      { godownId: 'a', quantity: 10.2 },
      { godownId: 'c', quantity: 3 },
    ]);
  });
});
