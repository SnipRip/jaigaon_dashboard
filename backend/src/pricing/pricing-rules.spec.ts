import { describe, expect, it } from 'vitest';
import {
  duplicateSlab,
  inForce,
  levelDiscountFor,
  levelDiscountProblem,
  overlappingRate,
  rangesOverlap,
  resolveRate,
  slabProblem,
  specialRatePartyProblem,
  specialRateProblem,
  targetRank,
  type LevelFacts,
  type PricedItem,
  type SlabFacts,
  type SpecialRateFacts,
} from './pricing-rules.js';

const item: PricedItem = {
  id: 'tmt-12',
  categoryId: 'iron',
  subCategoryId: 'tmt',
  mrp: 70,
  sellingPrice: 64,
  minSellingPrice: 55,
};

const level: LevelFacts = {
  id: 'dealer',
  name: 'Dealer',
  discountPct: 10,
  isArchived: false,
  categoryDiscounts: [],
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

const slab = (overrides: Partial<SlabFacts> = {}): SlabFacts => ({
  id: 'slab-1',
  itemId: 'tmt-12',
  categoryId: null,
  minQuantity: 1000,
  discountPct: 2,
  isArchived: false,
  ...overrides,
});

const empty = { specialRates: [], slabs: [] };
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
  it('gives the selling price with no customer, level or special rate', () => {
    expect(resolveRate(item, undefined, 1, day, empty)).toMatchObject({
      rate: 64,
      source: 'standard',
    });
    expect(resolveRate(item, { id: 'walk-in' }, 1, day, empty)).toMatchObject({
      rate: 64,
      source: 'standard',
    });
  });

  it('takes the price level off MRP', () => {
    const quote = resolveRate(item, { id: 'tashi', level }, 1, day, empty);
    expect(quote).toMatchObject({ rate: 63, source: 'price-level' });
    expect(quote.level).toEqual({
      id: 'dealer',
      name: 'Dealer',
      discountPct: 10,
    });
  });

  it('uses the level discount of the sub-category, then the category, then the level', () => {
    const byCategory = {
      ...level,
      categoryDiscounts: [{ categoryId: 'iron', discountPct: 5 }],
    };
    expect(levelDiscountFor(byCategory, item)).toBe(5);
    const bySub = {
      ...level,
      categoryDiscounts: [
        ...byCategory.categoryDiscounts,
        { categoryId: 'tmt', discountPct: 8 },
      ],
    };
    expect(levelDiscountFor(bySub, item)).toBe(8);
    expect(
      levelDiscountFor(bySub, {
        ...item,
        categoryId: 'cement',
        subCategoryId: null,
      }),
    ).toBe(10);
  });

  it('skips an archived level, and a level when the item has no MRP', () => {
    expect(
      resolveRate(
        item,
        { id: 'tashi', level: { ...level, isArchived: true } },
        1,
        day,
        empty,
      ).source,
    ).toBe('standard');
    expect(
      resolveRate({ ...item, mrp: null }, { id: 'tashi', level }, 1, day, empty)
        .source,
    ).toBe('standard');
  });

  it('puts a special rate in force ahead of the price level', () => {
    const quote = resolveRate(item, { id: 'tashi', level }, 1, day, {
      specialRates: [special()],
      slabs: [],
    });
    expect(quote).toMatchObject({ rate: 60, source: 'special' });
    expect(quote.special?.id).toBe('sr-1');
  });

  it('ignores a special rate for another customer, out of its dates or archived', () => {
    const book = (rate: SpecialRateFacts) => ({
      specialRates: [rate],
      slabs: [],
    });
    const level0 = { id: 'tashi', level };
    expect(
      resolveRate(item, level0, 1, day, book(special({ partyId: 'druk' })))
        .source,
    ).toBe('price-level');
    expect(
      resolveRate(item, level0, 1, '2026-12-01', book(special())).source,
    ).toBe('price-level');
    expect(
      resolveRate(item, level0, 1, '2026-10-31', book(special())).source,
    ).toBe('price-level');
    expect(
      resolveRate(item, level0, 1, day, book(special({ isArchived: true })))
        .source,
    ).toBe('price-level');
  });

  it('takes a discount special rate off MRP, or off the selling price without one', () => {
    const book = {
      specialRates: [special({ kind: 'DISCOUNT', value: 15 })],
      slabs: [],
    };
    expect(resolveRate(item, { id: 'tashi' }, 1, day, book).rate).toBe(59.5);
    const noMrp = { ...item, mrp: null, minSellingPrice: null };
    expect(resolveRate(noMrp, { id: 'tashi' }, 1, day, book).rate).toBe(54.4);
  });

  it('prefers the item special rate over a category one', () => {
    const category = special({
      id: 'sr-cat',
      itemId: null,
      categoryId: 'iron',
      value: 58,
    });
    const book = { specialRates: [category, special()], slabs: [] };
    expect(resolveRate(item, { id: 'tashi' }, 1, day, book).special?.id).toBe(
      'sr-1',
    );
    expect(
      resolveRate(item, { id: 'tashi' }, 1, day, {
        specialRates: [category],
        slabs: [],
      }).rate,
    ).toBe(58);
  });

  it('takes the largest slab reached, most specific target first', () => {
    const slabs = [
      slab(),
      slab({ id: 'slab-2', minQuantity: 5000, discountPct: 4 }),
      slab({
        id: 'slab-cat',
        itemId: null,
        categoryId: 'iron',
        minQuantity: 10,
        discountPct: 9,
      }),
    ];
    expect(
      resolveRate(item, undefined, 999, day, {
        specialRates: [],
        slabs: [slab()],
      }).slab,
    ).toBeUndefined();
    expect(
      resolveRate(item, undefined, 6000, day, { specialRates: [], slabs }).slab
        ?.id,
    ).toBe('slab-2');
    expect(
      resolveRate(item, undefined, 1200, day, { specialRates: [], slabs }),
    ).toMatchObject({ rate: 62.72 });
    // Below every item slab, the category slab is the only one reached.
    expect(
      resolveRate(item, undefined, 50, day, { specialRates: [], slabs }).slab
        ?.id,
    ).toBe('slab-cat');
  });

  it('never goes below the minimum selling price', () => {
    const book = { specialRates: [special({ value: 50 })], slabs: [] };
    expect(resolveRate(item, { id: 'tashi' }, 1, day, book)).toMatchObject({
      rate: 55,
      source: 'minimum',
    });
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
  it('keeps level discounts from 0 to under 100%', () => {
    expect(levelDiscountProblem(0)).toBeNull();
    expect(levelDiscountProblem(99.99)).toBeNull();
    expect(levelDiscountProblem(100)).not.toBeNull();
    expect(levelDiscountProblem(-1)).not.toBeNull();
  });

  it('needs exactly one target', () => {
    expect(specialRateProblem({ ...special(), categoryId: 'iron' })).toMatch(
      /not both/,
    );
    expect(specialRateProblem({ ...special(), itemId: null })).toMatch(
      /Pick the item/,
    );
    expect(slabProblem({ ...slab(), itemId: null })).toMatch(/Pick the item/);
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

  it('checks slab quantity and discount', () => {
    expect(slabProblem(slab())).toBeNull();
    expect(slabProblem(slab({ minQuantity: 0 }))).not.toBeNull();
    expect(slabProblem(slab({ discountPct: 100 }))).not.toBeNull();
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

  it('finds a second slab from the same quantity', () => {
    expect(
      duplicateSlab({ itemId: 'tmt-12', categoryId: null, minQuantity: 1000 }, [
        slab(),
      ])?.id,
    ).toBe('slab-1');
    expect(
      duplicateSlab({ itemId: 'tmt-12', categoryId: null, minQuantity: 2000 }, [
        slab(),
      ]),
    ).toBeUndefined();
  });
});
