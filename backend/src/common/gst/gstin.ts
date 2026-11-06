// GSTIN format and check digit, and the GST state codes. The frontend has the
// same rules in features/gst/gstin.ts and indian-states.ts.
import { STATE_NAMES } from './state-names.js';

// 15 characters: state code (2), PAN (10), entity number (1), "Z", check character (1).
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The check character for the first 14 characters (GSTN's base-36 scheme). */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let index = 0; index < 14; index++) {
    const product = CHARS.indexOf(first14[index]) * (index % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

/** Null when valid, otherwise what is wrong. */
export function gstinProblem(gstin: string): string | null {
  if (gstin.length !== 15) return 'A GSTIN has 15 characters';
  if (!GSTIN_PATTERN.test(gstin))
    return 'This is not in GSTIN format, for example 19ABCDE1234F1Z5';
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) {
    return 'The GSTIN’s last character does not match. Check for a typing mistake';
  }
  if (!STATE_CODES.has(gstin.slice(0, 2)))
    return 'The GSTIN starts with an unknown state code';
  return null;
}

export const gstinStateCode = (gstin: string) => gstin.slice(0, 2);
export const gstinPan = (gstin: string) => gstin.slice(2, 12);

/** GST state codes in use (state-names.ts). */
export const STATE_CODES = new Set(Object.keys(STATE_NAMES));
