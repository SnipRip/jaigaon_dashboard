import { invoiceRegime, rateSourceOf, saleRegime, schemeSourceOf } from './sale-rules.js';

describe('saleRegime', () => {
  const WB = '19';
  it('follows the buyer', () => {
    expect(saleRegime(WB, { treatment: 'REGISTERED', placeOfSupply: WB, exportRoute: null })).toEqual({ regime: 'INTRA_STATE', split: 'INTRA' });
    expect(saleRegime(WB, { treatment: 'REGISTERED', placeOfSupply: '18', exportRoute: null })).toEqual({ regime: 'INTER_STATE', split: 'INTER' });
    expect(saleRegime(WB, { treatment: 'UNREGISTERED', placeOfSupply: null, exportRoute: null }).regime).toBe('INTRA_STATE');
    expect(saleRegime(WB, { treatment: 'OVERSEAS', placeOfSupply: null, exportRoute: 'LUT' })).toEqual({ regime: 'EXPORT_LUT', split: 'NONE' });
    expect(saleRegime(WB, { treatment: 'OVERSEAS', placeOfSupply: null, exportRoute: 'IGST' })).toEqual({ regime: 'EXPORT_IGST', split: 'INTER' });
  });
});

describe('rateSourceOf', () => {
  const offered = { special: 59.75, sheet: 61.25, lastQuoted: 60, lastSold: null };
  it('names the offered rate the line took, in the order shown', () => {
    expect(rateSourceOf(59.75, offered)).toBe('SPECIAL');
    expect(rateSourceOf(61.25, offered)).toBe('SHEET');
    expect(rateSourceOf(60, offered)).toBe('LAST_QUOTED');
    expect(rateSourceOf(60.5, offered)).toBe('MANUAL');
    // The same figure on two sources counts as the first.
    expect(rateSourceOf(61.25, { ...offered, special: 61.25 })).toBe('SPECIAL');
  });
  it('treats past documents as typed rates for schemes', () => {
    expect(schemeSourceOf('LAST_QUOTED')).toBe('MANUAL');
    expect(schemeSourceOf('SHEET')).toBe('SHEET');
  });
});

describe('invoiceRegime', () => {
  const WB = '19';
  const local = { treatment: 'REGISTERED' as const, placeOfSupply: WB, exportRoute: null };
  const bhutan = { treatment: 'OVERSEAS' as const, placeOfSupply: null, exportRoute: 'LUT' as const };
  it('charges a local invoice by its own place of supply', () => {
    expect(invoiceRegime(WB, 'LOCAL', local, {})).toEqual({ regime: 'INTRA_STATE', split: 'INTRA', placeOfSupply: WB });
    // Delivered to Assam: IGST, whatever the buyer's own state.
    expect(invoiceRegime(WB, 'LOCAL', local, { placeOfSupply: '18' })).toEqual({ regime: 'INTER_STATE', split: 'INTER', placeOfSupply: '18' });
    // A walk-in with no state buys here.
    expect(invoiceRegime(WB, 'LOCAL', { treatment: 'CONSUMER', placeOfSupply: null, exportRoute: null }, {}).placeOfSupply).toBe(WB);
  });
  it('charges an export by its route, defaulting to the buyer', () => {
    expect(invoiceRegime(WB, 'EXPORT', bhutan, {})).toEqual({ regime: 'EXPORT_LUT', split: 'NONE', placeOfSupply: null });
    expect(invoiceRegime(WB, 'EXPORT', bhutan, { exportRoute: 'IGST' })).toEqual({ regime: 'EXPORT_IGST', split: 'INTER', placeOfSupply: null });
  });
});
