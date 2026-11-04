import { describe, expect, it } from 'vitest';
import {
  covers,
  effectivePrices,
  itemPriceProblem,
  marginOf,
  marginProblem,
  priceFromMargin,
  priceInForce,
  type ItemMasterPrices,
  type ItemPriceFacts,
} from './price-list-rules.js';

const item: ItemMasterPrices = {
  mrp: 120,
  costPrice: 80,
};

const entry = (overrides: Partial<ItemPriceFacts> = {}): ItemPriceFacts => ({
  id: 'p-1',
  itemId: 'tmt-12',
  validFrom: '2026-11-02',
  validTill: '2026-11-08',
  sellingPrice: 100,
  mrp: null,
  minSellingPrice: null,
  costPrice: null,
  isArchived: false,
  updatedAt: '2026-11-02T08:00:00.000Z',
  ...overrides,
});

describe('covers', () => {
  it('includes both ends and skips archived entries', () => {
    expect(covers(entry(), '2026-11-02')).toBe(true);
    expect(covers(entry(), '2026-11-08')).toBe(true);
    expect(covers(entry(), '2026-11-09')).toBe(false);
    expect(covers(entry({ isArchived: true }), '2026-11-04')).toBe(false);
  });
});

describe('priceInForce', () => {
  const week = entry({ id: 'week', sellingPrice: 100 });
  const wednesday = entry({
    id: 'wed',
    validFrom: '2026-11-04',
    validTill: '2026-11-04',
    sellingPrice: 104,
  });

  it('lets a later start override a range, then falls back to the range', () => {
    expect(priceInForce([week, wednesday], '2026-11-04')?.id).toBe('wed');
    expect(priceInForce([week, wednesday], '2026-11-05')?.id).toBe('week');
  });

  it('prefers the shorter range when two start the same day', () => {
    const day = entry({ id: 'day', validTill: '2026-11-02' });
    expect(priceInForce([week, day], '2026-11-02')?.id).toBe('day');
  });

  it('prefers the one saved last when the dates are the same', () => {
    const later = entry({ id: 'later', updatedAt: '2026-11-02T09:00:00.000Z' });
    expect(priceInForce([week, later], '2026-11-03')?.id).toBe('later');
  });

  it('gives nothing outside every range', () => {
    expect(priceInForce([week], '2026-11-10')).toBeUndefined();
  });
});

describe('effectivePrices', () => {
  it("takes a blank MRP and cost from the item; a minimum is the entry's own", () => {
    expect(
      effectivePrices(entry({ sellingPrice: 105, costPrice: 85 }), item),
    ).toEqual({
      sellingPrice: 105,
      mrp: 120,
      minSellingPrice: null,
      costPrice: 85,
    });
    expect(effectivePrices(entry(), item).costPrice).toBe(80);
  });
});

describe('margins', () => {
  it('works the margin on the selling price', () => {
    expect(marginOf(100, 80)).toBe(20);
    expect(marginOf(0, 80)).toBe(0);
    expect(marginOf(100, null)).toBeNull();
  });

  it('works the price back from a margin', () => {
    expect(priceFromMargin(80, 20)).toBe(100);
    expect(priceFromMargin(90, 10)).toBe(100);
  });

  it('refuses a margin of 100% or more', () => {
    expect(marginProblem(99.5)).toBeNull();
    expect(marginProblem(100)).not.toBeNull();
    expect(marginProblem(-101)).not.toBeNull();
  });
});

describe('itemPriceProblem', () => {
  it('accepts a price between the minimum and the MRP', () => {
    expect(itemPriceProblem(entry(), item)).toBeNull();
  });

  it('refuses reversed dates and a zero price', () => {
    expect(itemPriceProblem(entry({ validTill: '2026-11-01' }), item)).toMatch(
      /before/,
    );
    expect(itemPriceProblem(entry({ sellingPrice: 0 }), item)).toMatch(
      /more than/,
    );
  });

  it("checks against the item's MRP unless the entry gives its own, and the entry's minimum", () => {
    expect(itemPriceProblem(entry({ sellingPrice: 125 }), item)).toMatch(/MRP/);
    expect(
      itemPriceProblem(entry({ sellingPrice: 125, mrp: 130 }), item),
    ).toBeNull();
    expect(
      itemPriceProblem(entry({ sellingPrice: 85, minSellingPrice: 90 }), item),
    ).toMatch(/minimum/);
    expect(itemPriceProblem(entry({ sellingPrice: 85 }), item)).toBeNull();
  });
});
