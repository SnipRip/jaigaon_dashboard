import { describe, expect, it } from 'vitest';
import { cellToValue, isEmptyRow, locateColumns, RowProblem, rowValues, toIsoDate, type ImportColumn } from './import-cells.js';
import { fingerprintOf, readUpload, sheetHeaders, writeSheet } from './import-workbook.js';

type Row = { id: string; name: string };
const column = (overrides: Partial<ImportColumn<Row>>): ImportColumn<Row> => ({
  header: 'Name',
  field: 'name',
  kind: 'text',
  value: (row) => row.name,
  ...overrides,
});

const name = column({ required: true });
const kind = column({ header: 'Kind', field: 'kind', kind: 'choice', required: true, choices: { BANK: 'Bank account', CASH: 'Cash' } });
const balance = column({ header: 'Opening balance', field: 'openingBalance', kind: 'number' });
const onInvoice = column({ header: 'On invoices', field: 'showOnInvoice', kind: 'yesno' });
const asOf = column({ header: 'Balance as of', field: 'openingDate', kind: 'date' });
const brand = column({ header: 'Brand', field: 'brandId', kind: 'ref', ref: 'brand' });
const columns = [name, kind, balance, onInvoice, asOf, brand];

const resolve = (_: string, text: string) => {
  if (text === 'Hind TMT') return 'brand-1';
  throw new RowProblem(`No brand called "${text}"`);
};

describe('toIsoDate', () => {
  it('reads Excel dates and the usual typed forms', () => {
    expect(toIsoDate(new Date('2026-04-01T00:00:00Z'))).toBe('2026-04-01');
    expect(toIsoDate('2026-04-01')).toBe('2026-04-01');
    expect(toIsoDate('01-04-2026')).toBe('2026-04-01');
    expect(toIsoDate('1/4/2026')).toBe('2026-04-01');
  });

  it('refuses days that do not exist', () => {
    expect(toIsoDate('31-02-2026')).toBeNull();
    expect(toIsoDate('next week')).toBeNull();
  });
});

describe('cellToValue', () => {
  it('clears an optional field and leaves a required one or a Yes / No alone when blank', () => {
    expect(cellToValue(balance, '  ')).toBeNull();
    expect(cellToValue(name, null)).toBeUndefined();
    expect(cellToValue(onInvoice, '')).toBeUndefined();
  });

  it('reads numbers with rupee signs and commas, Yes / No and choices by label or value', () => {
    expect(cellToValue(balance, '₹ 1,50,000.50')).toBe(150000.5);
    expect(cellToValue(onInvoice, 'yes')).toBe(true);
    expect(cellToValue(onInvoice, 'No')).toBe(false);
    expect(cellToValue(kind, 'bank account')).toBe('BANK');
    expect(cellToValue(kind, 'CASH')).toBe('CASH');
    expect(cellToValue(name, 1234)).toBe('1234');
  });

  it('names the column and the fix when a cell is wrong', () => {
    expect(() => cellToValue(balance, 'ten')).toThrow('Opening balance: "ten" is not a number');
    expect(() => cellToValue(onInvoice, 'maybe')).toThrow('On invoices: write Yes or No');
    expect(() => cellToValue(kind, 'Wallet')).toThrow('Kind: pick one of Bank account, Cash');
  });
});

describe('rowValues', () => {
  it('matches headings in any order and case, and leaves out columns the sheet lacks', () => {
    const positions = locateColumns(columns, ['kind', 'NAME', 'Brand', 'Something else']);
    expect(rowValues(columns, positions, ['Cash', 'Petty cash', 'Hind TMT', 'x'], resolve)).toEqual({
      kind: 'CASH',
      name: 'Petty cash',
      brandId: 'brand-1',
    });
  });

  it('gathers every problem of a row into one reason', () => {
    const positions = locateColumns(columns, ['Name', 'Opening balance', 'Brand']);
    expect(() => rowValues(columns, positions, ['A', 'lots', 'Unknown'], resolve)).toThrow(
      'Opening balance: "lots" is not a number; No brand called "Unknown"',
    );
  });

  it('treats a row of blanks as empty', () => {
    expect(isEmptyRow([null, '  ', ''])).toBe(true);
    expect(isEmptyRow([null, 0])).toBe(false);
  });
});

describe('sheets', () => {
  it('reads back what it writes, and the fingerprint ignores how the file was saved', async () => {
    const written = await writeSheet('accounts', sheetHeaders(columns), columns, [
      ['SBI', 'Bank account', 450000, 'Yes', new Date('2026-04-01T00:00:00Z'), null, 'id-1'],
    ]);
    const sheet = await readUpload(written, 'accounts.xlsx');
    expect(sheet.headers.slice(0, 2)).toEqual(['Name', 'Kind']);
    expect(sheet.rows).toHaveLength(1);
    expect(toIsoDate(sheet.rows[0][4])).toBe('2026-04-01');

    const again = await readUpload(await writeSheet('other title', sheet.headers, columns, sheet.rows), 'copy.xlsx');
    expect(fingerprintOf('bank-cash', again)).toBe(fingerprintOf('bank-cash', sheet));
    expect(fingerprintOf('units', again)).not.toBe(fingerprintOf('bank-cash', sheet));
  });

  it('reads CSV too', async () => {
    const sheet = await readUpload(Buffer.from('Name,Kind\nPetty cash,Cash\n'), 'accounts.csv');
    expect(sheet).toEqual({ headers: ['Name', 'Kind'], rows: [['Petty cash', 'Cash']] });
  });
});
