import { describe, expect, it } from 'vitest';
import { toIsoDate } from './import-cells.js';
import { readUpload } from './import-workbook.js';

describe('readUpload', () => {
  it('keeps CSV cells as text, so dates are read day first and never shift a day', async () => {
    const csv = 'Item SKU,Valid from,Price\nTMT-12,07-11-2026,66.5\n';
    const sheet = await readUpload(Buffer.from(csv), 'prices.csv');
    expect(sheet.headers).toEqual(['Item SKU', 'Valid from', 'Price']);
    expect(sheet.rows).toEqual([['TMT-12', '07-11-2026', '66.5']]);
    expect(toIsoDate(sheet.rows[0][1])).toBe('2026-11-07');
  });
});
