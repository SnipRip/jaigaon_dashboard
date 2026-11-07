import { allocateLandedCost, billDueDays, billFigures, billTax, chargeRate, lineWeightKg } from './purchase-rules.js';

const WB = '19';
const US = { stateCode: WB, registration: 'REGULAR' as const };
const registered = { treatment: 'REGISTERED' as const, placeOfSupply: WB, isGta: false };
const line = (quantity: number, rate: number, extra: Partial<Parameters<typeof billFigures>[1][number]> = {}) => ({
  quantity,
  rate,
  discountPct: 0,
  gstRatePct: 18,
  itcEligible: true,
  weightKg: quantity,
  ...extra,
});

describe('billTax', () => {
  it('follows the vendor and the source of supply', () => {
    expect(billTax(US, registered, WB)).toEqual({ regime: 'INTRA_STATE', itc: true, split: 'INTRA' });
    expect(billTax(US, registered, '10')).toEqual({ regime: 'INTER_STATE', itc: true, split: 'INTER' });
    expect(billTax(US, { ...registered, treatment: 'UNREGISTERED', placeOfSupply: null }, null)).toEqual({ regime: 'NO_GST', itc: false, split: 'NONE' });
    expect(billTax(US, { ...registered, isGta: true }, WB)).toEqual({ regime: 'REVERSE_CHARGE', itc: true, split: 'INTRA' });
  });

  it('claims nothing when we are a composition dealer', () => {
    const us = { ...US, registration: 'COMPOSITION' as const };
    expect(billTax(us, registered, WB)).toEqual({ regime: 'INTRA_STATE', itc: false, split: 'INTRA' });
    expect(billTax(us, { ...registered, isGta: true }, WB)).toEqual({ regime: 'REVERSE_CHARGE', itc: false, split: 'INTRA' });
    const figures = billFigures('GOODS', [line(100, 50)].map((entry) => ({ ...entry, itcEligible: false })), [], billTax(us, registered, WB));
    expect(figures).toMatchObject({ tax: 900, itcClaimable: 0, itcLost: 900, cost: 5900 });
  });

  it('pays no reverse charge on freight when we are unregistered', () => {
    const us = { ...US, registration: 'UNREGISTERED' as const };
    expect(billTax(us, { ...registered, isGta: true }, WB)).toEqual({ regime: 'NO_GST', itc: false, split: 'NONE' });
    expect(billTax(us, registered, '10')).toEqual({ regime: 'INTER_STATE', itc: false, split: 'INTER' });
  });
});

describe('billFigures', () => {
  it('works out a goods bill with freight on it at the bill rate', () => {
    const figures = billFigures('GOODS', [line(1000, 55), line(10, 300, { gstRatePct: 12 })], [{ amount: 2000, gstRatePct: 0 }], billTax(US, registered, WB));
    expect(figures.goodsValue).toBe(58000);
    expect(figures.chargesValue).toBe(2000);
    // 55,000 × 18% + 3,000 × 12% + freight 2,000 × 18% (the largest line's rate).
    expect(figures.tax).toBe(9900 + 360 + 360);
    expect(figures.cgst).toBe(figures.sgst);
    expect(figures.chargeRates).toEqual([18]);
    expect(figures.payable).toBe(70620);
    expect(figures.cost).toBe(60000);
    expect(figures.itcClaimable).toBe(10620);
  });

  it('adds GST that cannot be claimed to cost', () => {
    const figures = billFigures('GOODS', [line(100, 50, { itcEligible: false })], [], billTax(US, registered, '10'));
    expect(figures).toMatchObject({ igst: 900, itcLost: 900, cost: 5900, payable: 5900 });
    expect(figures.lines[0].ownCost).toBe(5900);
  });

  it('owes a reverse-charge transporter only the freight', () => {
    const tax = billTax(US, { ...registered, isGta: true }, WB);
    const rate = chargeRate(tax, { gst: 'FOLLOWS_BILL', gstRatePct: null }, 18);
    const figures = billFigures('CHARGES', [], [{ amount: 8000, gstRatePct: rate }], tax);
    expect(figures).toMatchObject({ tax: 400, payable: 8000, itcClaimable: 400, cost: 8000 });
  });

  it('rounds the payable to the rupee', () => {
    const figures = billFigures('GOODS', [line(3, 33.33)], [], billTax(US, registered, WB));
    expect(figures.payable - figures.roundOff).toBeCloseTo(117.99, 2);
  });
});

describe('chargeRate', () => {
  const tax = billTax(US, registered, WB);
  it('takes the head first, then the printed rate', () => {
    expect(chargeRate(tax, { gst: 'NONE', gstRatePct: null }, 18)).toBe(0);
    expect(chargeRate(tax, { gst: 'OWN_RATE', gstRatePct: 12 }, 18)).toBe(12);
    expect(chargeRate(tax, { gst: 'FOLLOWS_BILL', gstRatePct: null }, 5)).toBe(5);
    expect(chargeRate(billTax(US, { ...registered, treatment: 'UNREGISTERED' }, null), { gst: 'FOLLOWS_BILL', gstRatePct: null }, 18)).toBe(0);
  });
});

describe('allocateLandedCost', () => {
  const lines = [
    { quantity: 1000, weightKg: 1000, taxable: 55000, ownCost: 55000 },
    { quantity: 10, weightKg: 500, taxable: 3000, ownCost: 3000 },
  ];

  it('spreads by value, quantity or weight, the last line taking the rounding', () => {
    const byValue = allocateLandedCost(lines, 5800, 'VALUE')!;
    expect(byValue.map((row) => row.landedShare)).toEqual([5500, 300]);
    expect(byValue[0].landedRate).toBe(60.5);
    expect(byValue[1].landedRate).toBe(330);
    const byWeight = allocateLandedCost(lines, 1500, 'WEIGHT')!;
    expect(byWeight.map((row) => row.landedShare)).toEqual([1000, 500]);
    const byQuantity = allocateLandedCost(lines, 100, 'QUANTITY')!;
    expect(byQuantity.map((row) => row.landedShare)).toEqual([99.01, 0.99]);
  });

  it('cannot spread by weight when a weight is unknown', () => {
    expect(allocateLandedCost([{ ...lines[0], weightKg: null }], 100, 'WEIGHT')).toBeNull();
  });
});

describe('small rules', () => {
  it('reads weight from the unit or the item', () => {
    expect(lineWeightKg(2, 'ton', null)).toBe(2000);
    expect(lineWeightKg(10, 'pcs', 11)).toBe(110);
    expect(lineWeightKg(10, 'pcs', null)).toBeNull();
  });
  it('caps credit at 45 days for MSME vendors', () => {
    expect(billDueDays({ creditDays: 60, udyamNumber: 'UDYAM-WB-1' })).toBe(45);
    expect(billDueDays({ creditDays: 60, udyamNumber: null })).toBe(60);
  });
});
