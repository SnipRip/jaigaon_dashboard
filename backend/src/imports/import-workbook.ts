// Reading an uploaded sheet and writing the sheets we hand out (the master's
// records to fill in, and the skipped rows with their reasons).
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import { RowProblem, type CellValue, type ImportColumn } from './import-cells.js';

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
/** Upper bound per upload; larger lists are split into several files. */
export const MAX_ROWS = 50_000;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** Heading of the column the skipped-rows sheet adds; ignored when read back. */
export const PROBLEM_HEADER = 'Problem (fix the row and upload this sheet again)';
/** Heading of the column that ties a row to a stored record. */
export const RECORD_ID_HEADER = 'Record ID (do not change; blank for a new record)';

export interface UploadedSheet {
  headers: string[];
  /** Data rows (row 2 onwards), each as long as `headers`. */
  rows: CellValue[][];
}

// Formulas give their result, links their text, rich text its plain text.
function plain(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value;
  if ('result' in value) return plain(value.result as ExcelJS.CellValue);
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('text' in value) return String(value.text);
  if ('error' in value) return null;
  return null;
}

/** The first sheet of an .xlsx or .csv upload. */
export async function readUpload(buffer: Buffer, fileName: string): Promise<UploadedSheet> {
  const workbook = new ExcelJS.Workbook();
  try {
    // CSV cells stay text: exceljs would turn "07-11-2026" into 11 July
    // (month first) at local midnight, a day early in UTC. import-cells.ts
    // reads dates day first, and numbers and Yes / No from text.
    if (/\.csv$/i.test(fileName)) await workbook.csv.read(Readable.from(buffer), { map: (value: string) => value });
    else await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new RowProblem('The file could not be read. Save it as an Excel workbook (.xlsx) or CSV and try again.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 1) throw new RowProblem('The sheet is empty.');

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  for (let column = 1; column <= headerRow.cellCount; column++) {
    headers.push(String(plain(headerRow.getCell(column).value) ?? '').trim());
  }
  const rows: CellValue[][] = [];
  for (let number = 2; number <= sheet.rowCount; number++) {
    const row = sheet.getRow(number);
    rows.push(headers.map((_, index) => plain(row.getCell(index + 1).value)));
  }
  // Excel often counts formatted empty rows at the end.
  while (rows.length && rows[rows.length - 1].every((cell) => cell === null || String(cell).trim() === '')) rows.pop();
  if (rows.length > MAX_ROWS) {
    throw new RowProblem(`The sheet has ${rows.length} rows; split it into files of up to ${MAX_ROWS}.`);
  }
  return { headers, rows };
}

/** Same master, headings and cell values → same fingerprint, however the file was saved. */
export function fingerprintOf(master: string, sheet: UploadedSheet): string {
  const text = (cell: CellValue) => (cell instanceof Date ? cell.toISOString() : cell === null ? '' : String(cell).trim());
  const hash = createHash('sha256').update(master).update('\u0000');
  hash.update(sheet.headers.map((header) => header.toLowerCase()).join('\u0001'));
  for (const row of sheet.rows) hash.update('\u0002').update(row.map(text).join('\u0001'));
  return hash.digest('hex');
}

// exceljs supports one rule over a range (written as its sqref) but does not
// type it; one rule per column keeps a 5,000-row sheet small.
const rangeValidations = (sheet: ExcelJS.Worksheet) =>
  (sheet as unknown as { dataValidations: { add(range: string, rule: ExcelJS.DataValidation): void } }).dataValidations;

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF8' } };

/** The headings of the sheet we hand out for a master: its columns, then the record ID. */
export const sheetHeaders = <V>(columns: ImportColumn<V>[]) => [...columns.map((column) => column.header), RECORD_ID_HEADER];

/**
 * A sheet with these headings and rows. A heading that is one of the
 * master's columns gets its note, its date format and, for a choice or
 * Yes / No column, a dropdown. Downloaded to fill in, and written for
 * skipped rows (the uploaded headings plus the problem column).
 */
export async function writeSheet<V>(
  title: string,
  headers: string[],
  columns: ImportColumn<V>[],
  rows: CellValue[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = headers.map((header) => ({ header, width: Math.min(Math.max(header.length + 4, 14), 48) }));
  const head = sheet.getRow(1);
  head.font = { bold: true };
  head.fill = HEADER_FILL;
  for (const row of rows) sheet.addRow(row);

  // Dropdowns cover the filled rows and room for new ones.
  const lastRow = Math.max(rows.length + 1, 1000) + 1;
  headers.forEach((header, index) => {
    const column = columns.find((candidate) => candidate.header.toLowerCase() === header.toLowerCase());
    if (!column) return;
    const note = [column.required ? 'Required.' : '', column.hint ?? ''].filter(Boolean).join(' ');
    if (note) head.getCell(index + 1).note = note;
    const letter = sheet.getColumn(index + 1).letter;
    const options =
      column.kind === 'yesno' ? ['Yes', 'No'] : column.kind === 'choice' ? Object.values(column.choices ?? {}) : null;
    // Excel caps a list typed into the rule at 255 characters.
    if (options && options.join(',').length < 250) {
      rangeValidations(sheet).add(`${letter}2:${letter}${lastRow}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`"${options.join(',')}"`],
      });
    }
    if (column.kind === 'date') sheet.getColumn(index + 1).numFmt = 'dd-mm-yyyy';
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** An ISO date as an Excel date cell (UTC midnight, as Excel stores days). */
export const dateCell = (iso: string | null): CellValue => (iso ? new Date(`${iso}T00:00:00Z`) : null);
