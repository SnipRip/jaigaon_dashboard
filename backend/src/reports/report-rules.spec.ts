import { describe, expect, it } from 'vitest';
import { claimableHeads, gstSummaryRows, hsnRows, isReportId, marginPct, placeLabel, shipmentStage, stockStatus } from './report-rules.js';

describe('report rules', () => {
  it('knows the reports there are', () => {
    expect(isReportId('sales-register')).toBe(true);
    expect(isReportId('toString')).toBe(false);
  });

  it('works out the margin on the value before GST', () => {
    expect(marginPct(1000, 850)).toBe(15);
    expect(marginPct(0, 10)).toBe(0);
  });

  it('labels the place of supply and export country', () => {
    expect(placeLabel({ kind: 'LOCAL', placeOfSupply: '19', destinationCountry: null })).toBe('West Bengal');
    expect(placeLabel({ kind: 'EXPORT', placeOfSupply: null, destinationCountry: 'Bhutan' })).toBe('Export · Bhutan');
    expect(placeLabel({ kind: 'LOCAL', placeOfSupply: null, destinationCountry: null })).toBe('Unknown');
  });

  it('says out of stock, reorder or OK', () => {
    expect(stockStatus(0, 10)).toBe('Out of stock');
    expect(stockStatus(10, 10)).toBe('Reorder');
    expect(stockStatus(11, 10)).toBe('OK');
    expect(stockStatus(5, 0)).toBe('OK');
  });

  it('capitalises the shipment stage', () => {
    expect(shipmentStage('IN_TRANSIT')).toBe('On the way');
  });

  it('splits a bill credit over its heads as the claimable share', () => {
    expect(claimableHeads({ cgst: 90, sgst: 90, igst: 0, tax: 180, itcClaimable: 90, reverseCharge: false })).toEqual({ cgst: 45, sgst: 45, igst: 0 });
  });

  it('builds the 3B view: output, reverse charge, credit, net and LUT exports', () => {
    const rows = gstSummaryRows(
      [{ cgst: 900, sgst: 900, igst: 500 }],
      [
        { cgst: 300, sgst: 300, igst: 0, tax: 600, itcClaimable: 600, reverseCharge: false },
        { cgst: 25, sgst: 25, igst: 0, tax: 50, itcClaimable: 50, reverseCharge: true },
      ],
      [{ cgst: 9, sgst: 9, igst: 0 }],
      42000,
    );
    expect(rows.map((row) => row.line)).toHaveLength(5);
    expect(rows[1]).toMatchObject({ cgst: 25, sgst: 25, igst: 0 });
    expect(rows[2]).toMatchObject({ cgst: 334, sgst: 334, igst: 0 });
    expect(rows[3]).toMatchObject({ cgst: 566, sgst: 566, igst: 500 });
    expect(rows[4]).toMatchObject({ igst: 42000 });
  });

  it('groups invoice lines by HSN, unit and rate', () => {
    const rows = hsnRows([
      { hsn: '7214', uqc: 'KGS', ratePct: 18, quantity: 100.5, taxable: 6000, tax: 1080 },
      { hsn: '7214', uqc: 'KGS', ratePct: 18, quantity: 0.25, taxable: 15, tax: 2.7 },
      { hsn: '6810', uqc: 'NOS', ratePct: 18, quantity: 10, taxable: 500, tax: 90 },
    ]);
    expect(rows).toEqual([
      { hsn: '6810', uqc: 'NOS', quantity: 10, rate: 18, taxable: 500, tax: 90 },
      { hsn: '7214', uqc: 'KGS', quantity: 100.75, rate: 18, taxable: 6015, tax: 1082.7 },
    ]);
  });
});
