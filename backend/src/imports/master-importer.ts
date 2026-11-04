// What every master's importer provides. The runner (imports.service.ts)
// reads rows, finds the stored record each row is about, and calls create or
// update; the importer turns the row into the master's own DTO and calls the
// master's own service, so a row obeys exactly the rules the form does.
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { RowProblem, type ImportColumn } from './import-cells.js';
import type { RefBook, RefKind } from './ref-book.js';

export interface ImportContext {
  auth: AuthContext;
  refs: RefBook;
}

export interface MasterImporter<V extends { id: string } = { id: string }> {
  /** URL key: /imports/<key>. */
  key: string;
  /** "units", "customers": used in file names and messages. */
  title: string;
  /** The permission module: importing needs create and edit, downloading view. */
  module: string;
  columns: ImportColumn<V>[];
  /** Masters the columns name (loaded before reading or writing). */
  refs: RefKind[];
  /** Adds an "Archived" Yes / No column. */
  archivable: boolean;
  /** Every record, archived too, for the downloaded sheet. */
  list(context: ImportContext): Promise<V[]>;
  /**
   * Rows to fill in for one date (the price list's "sheet for a date"):
   * records with an empty id, so each uploaded row is matched by its
   * natural key. Masters without it download only `list`.
   */
  template?(date: string, context: ImportContext): Promise<V[]>;
  /** The stored record a row without a record ID is about, by its natural key (name, SKU, GSTIN…). */
  findExisting(values: Record<string, unknown>, context: ImportContext): Promise<string | null>;
  /** Creates the record; returns its id. */
  create(values: Record<string, unknown>, context: ImportContext): Promise<string>;
  update(id: string, values: Record<string, unknown>, context: ImportContext): Promise<void>;
}

const messages = (errors: ValidationError[]): string[] =>
  errors.flatMap((error) => [...Object.values(error.constraints ?? {}), ...messages(error.children ?? [])]);

/** The row as a DTO, checked as the global ValidationPipe checks a request body. */
export async function validDto<T extends object>(type: new () => T, plain: Record<string, unknown>): Promise<T> {
  const dto = plainToInstance(type, plain);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) throw new RowProblem(messages(errors).join('; '));
  return dto;
}

/** The fields of `values` the DTO takes (a sheet may carry more, such as the archive flag). */
export const pick = (values: Record<string, unknown>, fields: string[]) =>
  Object.fromEntries(fields.filter((field) => field in values).map((field) => [field, values[field]]));

/** A row value read as text (cells are text, numbers or dates by now). */
export const textOf = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

/** Same-name match ignoring case, for natural keys. */
export const sameText = (value: unknown) => ({ equals: textOf(value), mode: 'insensitive' as const });
