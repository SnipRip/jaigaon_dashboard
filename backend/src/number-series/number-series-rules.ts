// How a number series fits together, and what may change once a document has
// taken a number from it. The migration's CHECK constraints hold the same.
import { isFinancialYear } from '../common/financial-year.js';

/** A GST invoice, credit or debit note number: at most 16 characters (CGST rule 46). */
export const MAX_NUMBER_LENGTH = 16;

export interface SeriesFormat {
  document: string;
  financialYear: string;
  prefix: string;
  nextNumber: number;
  padding: number;
}

/** "INV/2627/" + 9 padded to 4 → "INV/2627/0009". A longer number is never cut. */
export const formatNumber = (prefix: string, number: number, padding: number) =>
  `${prefix}${String(number).padStart(padding, '0')}`;

/** Null when the series is consistent, otherwise the problem. */
export function seriesProblem(series: SeriesFormat): string | null {
  if (!isFinancialYear(series.financialYear)) {
    return 'The financial year is two consecutive years, like 2026-27';
  }
  const next = formatNumber(series.prefix, series.nextNumber, series.padding);
  if (series.prefix.length + series.padding > MAX_NUMBER_LENGTH || next.length > MAX_NUMBER_LENGTH) {
    return `${next} is ${next.length} characters; GST allows ${MAX_NUMBER_LENGTH}. Shorten the prefix or the digits.`;
  }
  return null;
}

// Once a number is issued the series is in use: the numbers already on
// documents must stay unique and in order, so only the next number may move,
// and only forward.
export function changeProblem(
  stored: SeriesFormat & { lastIssued: number },
  next: SeriesFormat,
): string | null {
  if (stored.lastIssued === 0) return null;
  const locked = (['document', 'financialYear', 'prefix', 'padding'] as const).filter(
    (field) => stored[field] !== next[field],
  );
  if (locked.length > 0) {
    return `Numbers up to ${formatNumber(stored.prefix, stored.lastIssued, stored.padding)} are already issued, so only the next number can change`;
  }
  if (next.nextNumber <= stored.lastIssued) {
    return `Numbers up to ${stored.lastIssued} are already issued: the next number must be ${stored.lastIssued + 1} or more`;
  }
  return null;
}
