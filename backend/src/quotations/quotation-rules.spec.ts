import { rateSourceOf, saleRegime, schemeSourceOf } from './quotation-rules.js';

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
