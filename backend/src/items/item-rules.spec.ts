import {
  checkAttributes,
  checkPrices,
  checkVariantValues,
  inherited,
  openingValue,
  readAttributes,
  variantKey,
  variantName,
} from './item-rules.js';

const size = [{ name: 'Size', options: ['8 mm', '10 mm'] }];

describe('inherited', () => {
  it('takes the first level that is set, including zero', () => {
    expect(inherited(null, undefined, 0, 18)).toBe(0);
    expect(inherited<string>(undefined, 'kg')).toBe('kg');
    expect(inherited(null, null)).toBeNull();
  });
});

describe('checkPrices', () => {
  it('accepts a selling price between the minimum and the MRP', () => {
    expect(checkPrices({ mrp: 70, sellingPrice: 65, minSellingPrice: 60 })).toBeNull();
    expect(checkPrices({ sellingPrice: 65 })).toBeNull();
  });

  it('rejects a price below the minimum or above the MRP', () => {
    expect(checkPrices({ sellingPrice: 55, minSellingPrice: 60 })).toMatch(/minimum/);
    expect(checkPrices({ mrp: 60, sellingPrice: 65 })).toMatch(/MRP/);
  });
});

describe('checkAttributes', () => {
  it('accepts one to three attributes with distinct options', () => {
    expect(checkAttributes(size)).toBeNull();
  });

  it('rejects none, more than three, repeated names or options', () => {
    expect(checkAttributes([])).not.toBeNull();
    expect(checkAttributes(['A', 'B', 'C', 'D'].map((name) => ({ name, options: ['x'] })))).not.toBeNull();
    expect(checkAttributes([...size, { name: 'size', options: ['x'] }])).toMatch(/differ/);
    expect(checkAttributes([{ name: 'Size', options: ['8 mm', '8 MM'] }])).toMatch(/twice/);
    expect(checkAttributes([{ name: 'Size', options: [] }])).toMatch(/at least one/);
  });
});

describe('checkVariantValues', () => {
  it('needs exactly one listed option per attribute', () => {
    expect(checkVariantValues(size, { Size: '8 mm' })).toBeNull();
    expect(checkVariantValues(size, { Size: '12 mm' })).toMatch(/one of/);
    expect(checkVariantValues(size, { Size: '8 mm', Grade: 'x' })).not.toBeNull();
    expect(checkVariantValues(size, null)).not.toBeNull();
  });
});

describe('variant helpers', () => {
  const two = [...size, { name: 'Grade', options: ['Fe 500', 'Fe 600'] }];

  it('names a variant from the group and its values in attribute order', () => {
    expect(variantName('TMT Bar', two, { Grade: 'Fe 600', Size: '8 mm' })).toBe('TMT Bar 8 mm Fe 600');
  });

  it('gives the same key whatever order the values come in', () => {
    expect(variantKey(two, { Grade: 'Fe 600', Size: '8 mm' })).toBe(variantKey(two, { Size: '8 mm', Grade: 'Fe 600' }));
  });

  it('reads malformed stored attributes as none', () => {
    expect(readAttributes('x')).toEqual([]);
    expect(readAttributes([{ name: 'Size', options: [1] }])).toEqual([]);
    expect(readAttributes(size)).toEqual(size);
  });
});

describe('openingValue', () => {
  it('values stock at cost unless a value is given', () => {
    expect(openingValue(3, 4000)).toBe(12000);
    expect(openingValue(1.333, 10.01)).toBe(13.34);
    expect(openingValue(3, 4000, 11000)).toBe(11000);
  });
});
