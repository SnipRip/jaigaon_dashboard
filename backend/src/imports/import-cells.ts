// Turning Excel cells into the values a master's DTO takes, and back. Pure:
// no database, so the rules are tested on their own (import-cells.spec.ts).
import type { RefKind, RefNames } from './ref-book.js';

/** A cell as read from or written to the sheet. */
export type CellValue = string | number | boolean | Date | null;

export type ColumnKind = 'text' | 'number' | 'yesno' | 'date' | 'choice' | 'ref';

export interface ImportColumn<V> {
  /** The heading in row 1. */
  header: string;
  /** The DTO field the cell fills. */
  field: string;
  kind: ColumnKind;
  /** choice: DTO value → label written in the sheet (either is read back). */
  choices?: Record<string, string>;
  /** ref: the master the name points at; the DTO gets its id. */
  ref?: RefKind;
  /** Shown as the heading's note; a required column says so. */
  required?: boolean;
  /**
   * Optional but never empty (it has a default: credit days, opening
   * balance): a blank cell leaves the stored value, or the default for a
   * new record, instead of clearing it.
   */
  keepIfBlank?: boolean;
  hint?: string;
  /** The cell for a record in the downloaded sheet. */
  value: (record: V, refs: RefNames) => CellValue;
}

/** One row's problem; the row is skipped with this reason. */
export class RowProblem extends Error {}

const YES = new Set(['yes', 'y', 'true', '1']);
const NO = new Set(['no', 'n', 'false', '0']);

const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-04-01", "01-04-2026", "1/4/2026" or an Excel date → "2026-04-01". */
export function toIsoDate(cell: CellValue): string | null {
  if (cell instanceof Date) {
    // Excel dates arrive as UTC midnight of the day shown.
    return Number.isNaN(cell.getTime()) ? null : cell.toISOString().slice(0, 10);
  }
  const text = String(cell).trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) return checkedDate(+match[1], +match[2], +match[3]);
  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (match) return checkedDate(+match[3], +match[2], +match[1]);
  return null;
}

function checkedDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? `${year}-${pad(month)}-${pad(day)}` : null;
}

const isBlank = (cell: CellValue | undefined) => cell === null || cell === undefined || String(cell).trim() === '';

/**
 * The DTO value for one cell. A blank cell clears an optional field (null)
 * and leaves a required one, a Yes / No or a field with a default as it is
 * (undefined), so a half-filled sheet never wipes a stored name or flag.
 */
export function cellToValue<V>(column: ImportColumn<V>, cell: CellValue | undefined): unknown {
  if (isBlank(cell)) return column.required || column.keepIfBlank || column.kind === 'yesno' ? undefined : null;
  const text = String(cell).trim();
  switch (column.kind) {
    case 'text':
    case 'ref':
      return typeof cell === 'number' ? String(cell) : text;
    case 'number': {
      if (typeof cell === 'number') return cell;
      const number = Number(text.replace(/[₹,\s]/g, ''));
      if (!Number.isFinite(number)) throw new RowProblem(`${column.header}: "${text}" is not a number`);
      return number;
    }
    case 'yesno': {
      if (typeof cell === 'boolean') return cell;
      const answer = text.toLowerCase();
      if (YES.has(answer)) return true;
      if (NO.has(answer)) return false;
      throw new RowProblem(`${column.header}: write Yes or No`);
    }
    case 'date': {
      const iso = toIsoDate(cell as CellValue);
      if (!iso) throw new RowProblem(`${column.header}: "${text}" is not a date (use 01-04-2026)`);
      return iso;
    }
    case 'choice': {
      const wanted = text.toLowerCase();
      const found = Object.entries(column.choices ?? {}).find(
        ([value, label]) => value.toLowerCase() === wanted || label.toLowerCase() === wanted,
      );
      if (!found) {
        throw new RowProblem(`${column.header}: pick one of ${Object.values(column.choices ?? {}).join(', ')}`);
      }
      return found[0];
    }
  }
}

/** Where each column sits in the uploaded sheet; headings match ignoring case and spaces, in any order. */
export function locateColumns<V>(columns: ImportColumn<V>[], headers: string[]): Map<string, number> {
  const normal = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
  const positions = new Map<string, number>();
  headers.forEach((header, index) => {
    const column = columns.find((candidate) => normal(candidate.header) === normal(header));
    if (column && !positions.has(column.field)) positions.set(column.field, index);
  });
  return positions;
}

/** The row's values by DTO field; columns missing from the sheet stay out (unchanged). */
export function rowValues<V>(
  columns: ImportColumn<V>[],
  positions: Map<string, number>,
  cells: CellValue[],
  /** A ref column's name → the record's id; throws RowProblem when there is none. */
  resolve: (kind: RefKind, name: string) => string,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const problems: string[] = [];
  for (const column of columns) {
    const index = positions.get(column.field);
    if (index === undefined) continue;
    try {
      const value = cellToValue(column, cells[index]);
      if (value === undefined) continue;
      values[column.field] = column.kind === 'ref' && typeof value === 'string' ? resolve(column.ref!, value) : value;
    } catch (error) {
      problems.push((error as Error).message);
    }
  }
  if (problems.length) throw new RowProblem(problems.join('; '));
  return values;
}

/** A row with nothing in it is not data (Excel keeps formatted empty rows). */
export const isEmptyRow = (cells: CellValue[]) => cells.every(isBlank);
