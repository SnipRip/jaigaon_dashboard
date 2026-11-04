import { describe, expect, it } from 'vitest';
import {
  inForce,
  overlappingRate,
  rangesOverlap,
  resolveRate,
  specialRatePartyProblem,
  specialRateProblem,
  targetRank,
  type ListedPrice,
  type PricedItem,
  type SpecialRateFacts,
} from './pricing-rules.js';

const item: PricedItem = {
  id: 'tmt-12',
  categoryId: 'iron',
  subCategoryId: 'tmt',
  mrp: 70,
};

const special = (
  overrides: Partial<SpecialRateFacts> = {},
): SpecialRateFacts => ({
  id: 'sr-1',
  partyId: 'tashi',
  itemId: 'tmt-12',
  categoryId: null,
  kind: 'NET',
  value: 60,
  validFrom: '2026-11-01',
  validTill: '2026-11-30',
  isArchived: false,
  ...overrides,
});

const listed: ListedPrice = {
  id: 'pl-1',
  validFrom: '2026-11-15',
  validTill: '2026-11-15',
  sellingPrice: 64,
  mrp: 70,
  minSellingPrice: 62,
};

const day = '2026-11-15';

describe('targetRank', () => {
  it('ranks item, then sub-category, then category', () => {
    expect(targetRank({ itemId: 'tmt-12', categoryId: null }, item)).toBe(0);
    expect(targetRank({ itemId: null, categoryId: 'tmt' }, item)).toBe(1);
    expect(targetRank({ itemId: null, categoryId: 'iron' }, item)).toBe(2);
  });

  it('does not fit another item or category', () => {
    expect(
      targetRank({ itemId: 'tmt-16', categoryId: null }, item),
    ).toBeUndefined();
    expect(
      targetRank({ itemId: null, categoryId: 'cement' }, item),
    ).toBeUndefined();
    expect(
      targetRank(
        { itemId: null, categoryId: null },
        { ...item, subCategoryId: null },
      ),
    ).toBeUndefined();
  });
});

describe('resolveRate', () => {
  it('has no rate without a special rate or a rate-sheet price', () => {
    expect(resolveRate(item, undefined, day, [])).toEqual({ rate: null, source: null });
    expect(resolveRate(item, 'tashi', day, [special({ isArchived: true })])).toEqual({ rate: null, source: null });
  });

  it('takes the rate sheet when no special rate applies', () => {
    const quote = resolveRate(item, 'druk', day, [special()], listed);
    expect(quote).toMatchObject({ rate: 64, source: 'price-list', priceList: { id: 'pl-1', sellingPrice: 64 } });
  });

  it('puts the special rate first, even under the sheet minimum', () => {
    const quote = resolveRate(item, 'tashi', day, [special()], listed);
    expect(quote).toMatchObject({ rate: 60, source: 'special', priceList: { id: 'pl-1' } });
  });

  it("takes a special discount off the day's rate, else off MRP", () => {
    const discount = [special({ kind: 'DISCOUNT', value: 5 })];
    expect(resolveRate(item, 'tashi', day, discount, listed).rate).toBe(60.8);
    expect(resolveRate(item, 'tashi', day, discount).rate).toBe(66.5);
    // Nothing to take it off: the rate sheet (none here) decides.
    expect(resolveRate({ ...item, mrp: null }, 'tashi', day, discount)).toEqual({ rate: null, source: null });
  });

  it('uses the most specific special rate', () => {
    const rates = [
      special({ id: 'cat', itemId: null, categoryId: 'iron', value: 58 }),
      special({ id: 'sub', itemId: null, categoryId: 'tmt', value: 59 }),
    ];
    expect(resolveRate(item, 'tashi', day, rates).special?.id).toBe('sub');
    expect(resolveRate(item, 'tashi', day, [...rates, special()]).special?.id).toBe('sr-1');
  });

  it('ignores a special rate out of its dates', () => {
    expect(resolveRate(item, 'tashi', '2026-12-01', [special()], listed).source).toBe('price-list');
  });
});

describe('inForce', () => {
  it('runs from valid from to valid till, both days included', () => {
    expect(inForce(special(), '2026-11-01')).toBe(true);
    expect(inForce(special(), '2026-11-30')).toBe(true);
    expect(inForce(special(), '2026-12-01')).toBe(false);
    expect(inForce(special({ validTill: null }), '2030-01-01')).toBe(true);
  });
});

describe('save checks', () => {
  it('needs exactly one target', () => {
    expect(specialRateProblem({ ...special(), categoryId: 'iron' })).toMatch(
      /not both/,
    );
    expect(specialRateProblem({ ...special(), itemId: null })).toMatch(
      /Pick the item/,
    );
  });

  it('checks the rate value and the dates', () => {
    expect(specialRateProblem(special())).toBeNull();
    expect(specialRateProblem(special({ value: 0 }))).toMatch(/net rate/);
    expect(
      specialRateProblem(special({ kind: 'DISCOUNT', value: 100 })),
    ).toMatch(/discount/);
    expect(specialRateProblem(special({ kind: 'DISCOUNT', value: 0 }))).toMatch(
      /discount/,
    );
    expect(specialRateProblem(special({ validTill: '2026-10-31' }))).toMatch(
      /before/,
    );
    expect(specialRateProblem(special({ validTill: null }))).toBeNull();
  });

  it('gives special rates to live customers only', () => {
    expect(
      specialRatePartyProblem({ isCustomer: true, isArchived: false }),
    ).toBeNull();
    expect(
      specialRatePartyProblem({ isCustomer: false, isArchived: false }),
    ).toMatch(/customers only/);
    expect(
      specialRatePartyProblem({ isCustomer: true, isArchived: true }),
    ).toMatch(/archived/);
  });
});

describe('overlapping special rates', () => {
  it('compares date ranges, open ends included', () => {
    const november = { validFrom: '2026-11-01', validTill: '2026-11-30' };
    expect(
      rangesOverlap(november, { validFrom: '2026-11-30', validTill: null }),
    ).toBe(true);
    expect(
      rangesOverlap(november, { validFrom: '2026-12-01', validTill: null }),
    ).toBe(false);
    expect(
      rangesOverlap({ validFrom: '2026-01-01', validTill: null }, november),
    ).toBe(true);
    expect(
      rangesOverlap(november, {
        validFrom: '2026-10-01',
        validTill: '2026-10-31',
      }),
    ).toBe(false);
  });

  it('finds another live rate for the same customer and target on the same days', () => {
    const existing = [special()];
    const next = {
      ...special(),
      id: undefined,
      validFrom: '2026-11-20',
      validTill: null,
    };
    expect(overlappingRate(next, existing)?.id).toBe('sr-1');
    expect(
      overlappingRate({ ...next, validFrom: '2026-12-01' }, existing),
    ).toBeUndefined();
    expect(
      overlappingRate({ ...next, partyId: 'druk' }, existing),
    ).toBeUndefined();
    expect(
      overlappingRate({ ...next, itemId: null, categoryId: 'iron' }, existing),
    ).toBeUndefined();
    expect(
      overlappingRate(next, [special({ isArchived: true })]),
    ).toBeUndefined();
    // Editing a rate never clashes with itself.
    expect(overlappingRate({ ...special() }, existing)).toBeUndefined();
  });
});
