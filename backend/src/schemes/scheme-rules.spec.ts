import { applySchemes, schemeProblem, type SchemeFacts, type SchemeLine } from './scheme-rules.js';

const item = { id: 'tmt-8', categoryId: 'steel', subCategoryId: 'bars', brandId: 'hind' };
const cement = { id: 'cement', categoryId: 'cement-cat', subCategoryId: null, brandId: 'acc' };

const scheme = (overrides: Partial<SchemeFacts>): SchemeFacts => ({
  id: overrides.name ?? 's',
  name: 's',
  level: 'LINE',
  benefit: 'PERCENT',
  value: 5,
  buyQuantity: null,
  maxDiscount: null,
  minQuantity: null,
  minValue: null,
  partyScope: 'ALL',
  partyIds: [],
  targets: [],
  rateSources: ['SHEET', 'SPECIAL', 'MANUAL'],
  stackable: false,
  validFrom: '2026-11-01',
  validTill: null,
  isArchived: false,
  ...overrides,
});

const line = (overrides: Partial<SchemeLine> = {}): SchemeLine => ({
  key: '1',
  item,
  quantity: 100,
  rate: 60,
  discountPct: 0,
  rateSource: 'SHEET',
  ...overrides,
});

const DAY = '2026-11-05';
const india = { id: 'c1', overseas: false };

describe('applySchemes, line schemes', () => {
  it('takes a % off, capped at the maximum', () => {
    const result = applySchemes([scheme({ value: 5, maxDiscount: 200 })], [line()], india, DAY);
    // 5% of 6,000 is 300, capped at 200.
    expect(result.lines[0]).toMatchObject({ gross: 6000, schemeDiscount: 200, taxable: 5800 });
    expect(result.totalDiscount).toBe(200);
  });

  it('takes rupees off per unit and a flat amount', () => {
    const perUnit = applySchemes([scheme({ benefit: 'AMOUNT_PER_UNIT', value: 1.5 })], [line()], india, DAY);
    expect(perUnit.lines[0].schemeDiscount).toBe(150);
    const flat = applySchemes([scheme({ benefit: 'FLAT_AMOUNT', value: 500 })], [line()], india, DAY);
    expect(flat.lines[0].schemeDiscount).toBe(500);
  });

  it('applies the typed discount first and works on what is left', () => {
    const result = applySchemes([scheme({ value: 10 })], [line({ discountPct: 10 })], india, DAY);
    expect(result.lines[0]).toMatchObject({ gross: 5400, schemeDiscount: 540, taxable: 4860 });
  });

  it('needs the minimum quantity and value', () => {
    const schemes = [scheme({ minQuantity: 150 })];
    expect(applySchemes(schemes, [line()], india, DAY).totalDiscount).toBe(0);
    expect(applySchemes(schemes, [line({ quantity: 150 })], india, DAY).totalDiscount).toBe(450);
    expect(applySchemes([scheme({ minValue: 10000 })], [line()], india, DAY).totalDiscount).toBe(0);
  });

  it('only covers its items, categories and brands', () => {
    const lines = [line(), line({ key: '2', item: cement, quantity: 10, rate: 400 })];
    const byCategory = applySchemes([scheme({ targets: [{ itemId: null, categoryId: 'bars', brandId: null }] })], lines, india, DAY);
    expect(byCategory.lines.map((row) => row.schemeDiscount)).toEqual([300, 0]);
    const byBrand = applySchemes([scheme({ targets: [{ itemId: null, categoryId: null, brandId: 'acc' }] })], lines, india, DAY);
    expect(byBrand.lines.map((row) => row.schemeDiscount)).toEqual([0, 200]);
  });

  it('skips rate kinds it does not take, such as a special rate', () => {
    const schemes = [scheme({ rateSources: ['SHEET'] })];
    expect(applySchemes(schemes, [line({ rateSource: 'SPECIAL' })], india, DAY).totalDiscount).toBe(0);
    expect(applySchemes(schemes, [line({ rateSource: 'SHEET' })], india, DAY).totalDiscount).toBe(300);
  });

  it('gives only the best non-stackable scheme, and adds stackable ones', () => {
    const schemes = [
      scheme({ name: 'small', value: 2 }),
      scheme({ name: 'big', value: 4 }),
      scheme({ name: 'extra', benefit: 'AMOUNT_PER_UNIT', value: 1, stackable: true }),
    ];
    const result = applySchemes(schemes, [line()], india, DAY);
    expect(result.lines[0].applied.map((row) => [row.name, row.amount])).toEqual([
      ['big', 240],
      ['extra', 100],
    ]);
    expect(result.lines[0].taxable).toBe(5660);
  });

  it('never takes a line below zero', () => {
    const schemes = [scheme({ benefit: 'FLAT_AMOUNT', value: 5000 }), scheme({ name: 'x', benefit: 'FLAT_AMOUNT', value: 5000, stackable: true })];
    expect(applySchemes(schemes, [line()], india, DAY).lines[0]).toMatchObject({ schemeDiscount: 6000, taxable: 0 });
  });

  it('gives free units on top of a rupee scheme', () => {
    const schemes = [scheme({ name: 'pct' }), scheme({ name: 'free', benefit: 'FREE_QUANTITY', buyQuantity: 40, value: 1 })];
    const result = applySchemes(schemes, [line()], india, DAY);
    expect(result.lines[0]).toMatchObject({ schemeDiscount: 300, freeQuantity: 2 });
  });

  it('follows dates, archiving and the customer scope', () => {
    expect(applySchemes([scheme({ validFrom: '2026-11-06' })], [line()], india, DAY).totalDiscount).toBe(0);
    expect(applySchemes([scheme({ validTill: '2026-11-04' })], [line()], india, DAY).totalDiscount).toBe(0);
    expect(applySchemes([scheme({ isArchived: true })], [line()], india, DAY).totalDiscount).toBe(0);
    const overseas = scheme({ partyScope: 'OVERSEAS' });
    expect(applySchemes([overseas], [line()], india, DAY).totalDiscount).toBe(0);
    expect(applySchemes([overseas], [line()], { id: 'b', overseas: true }, DAY).totalDiscount).toBe(300);
    // A walk-in buyer (no customer) is in India.
    expect(applySchemes([scheme({ partyScope: 'INDIA' })], [line()], null, DAY).totalDiscount).toBe(300);
    const selected = scheme({ partyScope: 'SELECTED', partyIds: ['c1'] });
    expect(applySchemes([selected], [line()], india, DAY).totalDiscount).toBe(300);
    expect(applySchemes([selected], [line()], { id: 'c2', overseas: false }, DAY).totalDiscount).toBe(0);
  });
});

describe('applySchemes, order schemes', () => {
  const lines = [line(), line({ key: '2', item: cement, quantity: 10, rate: 400 })];

  it('spreads the discount over the lines by value, capped', () => {
    const result = applySchemes([scheme({ level: 'ORDER', value: 2, maxDiscount: 150, minValue: 10000 })], lines, india, DAY);
    // 2% of 10,000 = 200, capped at 150: 6,000 carries 90, 4,000 carries 60.
    expect(result.lines.map((row) => row.schemeDiscount)).toEqual([90, 60]);
    expect(result.totalDiscount).toBe(150);
    expect(result.applied).toEqual([{ schemeId: 's', name: 's', level: 'ORDER', amount: 150, freeQuantity: 0 }]);
  });

  it('needs the minimum order value', () => {
    expect(applySchemes([scheme({ level: 'ORDER', minValue: 20000 })], lines, india, DAY).totalDiscount).toBe(0);
  });

  it('works on what is left after line schemes', () => {
    const result = applySchemes(
      [scheme({ name: 'line', value: 10, targets: [{ itemId: 'tmt-8', categoryId: null, brandId: null }] }), scheme({ name: 'order', level: 'ORDER', benefit: 'FLAT_AMOUNT', value: 94 })],
      lines,
      india,
      DAY,
    );
    // Line: 600 off the bars (5,400 left). Order: 94 over 9,400 → 54 and 40.
    expect(result.lines.map((row) => row.schemeDiscount)).toEqual([654, 40]);
    expect(result.totalDiscount).toBe(694);
  });

  it('shares out the rounding so the parts add up', () => {
    const three = [line({ key: 'a', quantity: 1, rate: 100 }), line({ key: 'b', quantity: 1, rate: 100 }), line({ key: 'c', quantity: 1, rate: 100 })];
    const result = applySchemes([scheme({ level: 'ORDER', benefit: 'FLAT_AMOUNT', value: 10 })], three, india, DAY);
    expect(result.lines.map((row) => row.schemeDiscount)).toEqual([3.33, 3.33, 3.34]);
    expect(result.totalDiscount).toBe(10);
  });
});

describe('schemeProblem', () => {
  const ok = scheme({});
  it('accepts a sound scheme', () => expect(schemeProblem(ok)).toBeNull());
  it('refuses wrong combinations', () => {
    expect(schemeProblem({ ...ok, level: 'ORDER', benefit: 'AMOUNT_PER_UNIT' })).toMatch(/order scheme/);
    expect(schemeProblem({ ...ok, value: 100 })).toMatch(/under 100/);
    expect(schemeProblem({ ...ok, benefit: 'FREE_QUANTITY' })).toMatch(/how many to buy/);
    expect(schemeProblem({ ...ok, buyQuantity: 5 })).toMatch(/only for a free/);
    expect(schemeProblem({ ...ok, rateSources: [] })).toMatch(/kind of rate/);
    expect(schemeProblem({ ...ok, partyScope: 'SELECTED' })).toMatch(/Pick the customers/);
    expect(schemeProblem({ ...ok, level: 'ORDER', minQuantity: 5 })).toMatch(/minimum value/);
    expect(schemeProblem({ ...ok, validTill: '2026-10-01' })).toMatch(/before valid from/);
    expect(schemeProblem({ ...ok, targets: [{ itemId: 'a', categoryId: 'b', brandId: null }] })).toMatch(/one item/);
  });
});
