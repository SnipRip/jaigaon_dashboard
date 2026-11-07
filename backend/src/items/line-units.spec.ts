import { describe, expect, it } from 'vitest';
import { settleReportingUnit } from './item-rules.js';
import { enteredColumns, factorOf, inReportingUnit, toBaseLine, type ItemUnits } from './line-units.js';

const cement: ItemUnits = {
  name: 'Cement OPC 53',
  unit: 'kg',
  alternates: [
    { unit: 'bag', factor: 50 },
    { unit: 'ton', factor: 1000 },
  ],
  reportingUnit: null,
};

const blocks: ItemUnits = { name: 'AAC Block', unit: 'pcs', alternates: [{ unit: 'cbm', factor: 83.3333 }], reportingUnit: 'cbm' };

describe('line units', () => {
  it('knows the units an item is traded in', () => {
    expect(factorOf(cement, null)).toBe(1);
    expect(factorOf(cement, 'kg')).toBe(1);
    expect(factorOf(cement, 'bag')).toBe(50);
    expect(factorOf(cement, 'box')).toBeNull();
  });

  it('turns a line in bags into kilograms at the same value', () => {
    const line = toBaseLine(cement, { unit: 'bag', quantity: 10, rate: 355 });
    expect(line).toMatchObject({ quantity: 500, lineUnit: 'bag', lineQuantity: 10, lineRate: 355, unitFactor: 50 });
    expect(line.quantity * line.rate).toBeCloseTo(3550, 9);
    expect(enteredColumns(line)).toMatchObject({ rate: 7.1, lineUnit: 'bag' });
  });

  it('keeps the value exact when the base rate does not divide evenly', () => {
    const line = toBaseLine({ ...cement, alternates: [{ unit: 'pack', factor: 3 }] }, { unit: 'pack', quantity: 1000, rate: 355 });
    expect(line.quantity).toBe(3000);
    expect(Math.round(line.quantity * line.rate * 100) / 100).toBe(355000);
  });

  it('treats the base unit and a blank unit alike', () => {
    expect(toBaseLine(cement, { unit: 'kg', quantity: 25, rate: 7 })).toMatchObject({ quantity: 25, rate: 7, lineUnit: null, unitFactor: 1 });
    expect(toBaseLine(cement, { quantity: 25, rate: 7 }).lineUnit).toBeNull();
  });

  it('refuses a unit the item is not traded in', () => {
    expect(() => toBaseLine(cement, { unit: 'box', quantity: 1, rate: 1 })).toThrow(/not traded in box/);
  });

  it('reports quantities in the reporting unit', () => {
    expect(inReportingUnit(cement, 500)).toEqual({ reportUnit: 'kg', reportQuantity: 500 });
    expect(inReportingUnit(blocks, 250)).toEqual({ reportUnit: 'cbm', reportQuantity: 3 });
  });
});

describe('reporting unit', () => {
  it('stores the base unit as null and accepts only the item\'s units', () => {
    expect(settleReportingUnit('kg', ['bag'], 'kg')).toEqual({ reportingUnitId: null, problem: null });
    expect(settleReportingUnit('kg', ['bag'], undefined)).toEqual({ reportingUnitId: null, problem: null });
    expect(settleReportingUnit('kg', ['bag'], 'bag')).toEqual({ reportingUnitId: 'bag', problem: null });
    expect(settleReportingUnit('kg', [], 'bag').problem).toMatch(/base unit or one of/);
  });
});
