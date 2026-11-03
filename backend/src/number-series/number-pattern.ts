// Number patterns: fixed text plus tokens, like "INV/{FY}/{SEQ:4}". The
// frontend renders the same tokens for its live preview
// (features/number-series/number-pattern.ts).
import { financialYearOf } from '../common/financial-year.js';
import type { NumberedKind, NumberReset } from '../generated/prisma/enums.js';
import { KIND_RULES } from './numbered-kinds.js';

export const TOKENS = ['FY', 'FY_LONG', 'YYYY', 'YY', 'MM', 'SEQ'] as const;
type Token = (typeof TOKENS)[number];

export type PatternPart = { text: string } | { token: Token; width: number };

export const MAX_SEQ_WIDTH = 8;
const TOKEN = /\{([A-Z_]+)(?::(\d+))?\}/g;

/** The pattern's parts, or the problem with it. */
export function parsePattern(pattern: string): PatternPart[] | string {
  const parts: PatternPart[] = [];
  let last = 0;
  for (const match of pattern.matchAll(TOKEN)) {
    if (match.index > last)
      parts.push({ text: pattern.slice(last, match.index) });
    const token = match[1] as Token;
    if (!TOKENS.includes(token))
      return `{${match[1]}} is not a token. Use ${TOKENS.map((name) => `{${name}}`).join(', ')}`;
    const width = match[2] === undefined ? 0 : Number(match[2]);
    if (match[2] !== undefined && token !== 'SEQ')
      return `Only {SEQ} takes a width, as in {SEQ:4}`;
    if (width > MAX_SEQ_WIDTH)
      return `{SEQ} pads to at most ${MAX_SEQ_WIDTH} digits`;
    parts.push({ token, width });
    last = match.index + match[0].length;
  }
  if (last < pattern.length) parts.push({ text: pattern.slice(last) });
  if (parts.some((part) => 'text' in part && /[{}]/.test(part.text))) {
    return 'Write tokens in braces, like {FY} or {SEQ:4}';
  }
  return parts;
}

function tokenValue(
  token: Token,
  width: number,
  date: string,
  sequence: number,
) {
  const fy = financialYearOf(date);
  switch (token) {
    case 'FY':
      return fy.replace('-', '').slice(2);
    case 'FY_LONG':
      return fy;
    case 'YYYY':
      return date.slice(0, 4);
    case 'YY':
      return date.slice(2, 4);
    case 'MM':
      return date.slice(5, 7);
    case 'SEQ':
      return String(sequence).padStart(width, '0');
  }
}

/** The number for a running number on a date: INV/{FY}/{SEQ:4}, 7, 2026-11-03 → INV/2627/0007. */
export const renderNumber = (
  parts: PatternPart[],
  date: string,
  sequence: number,
) =>
  parts
    .map((part) =>
      'text' in part
        ? part.text
        : tokenValue(part.token, part.width, date, sequence),
    )
    .join('');

/** The counter a number on this date comes from: "2026-27", "2026-11" or "ALL". */
export function periodOf(reset: NumberReset, date: string): string {
  if (reset === 'YEARLY') return financialYearOf(date);
  if (reset === 'MONTHLY') return date.slice(0, 7);
  return 'ALL';
}

/** Where a number must be unique: its financial year, or for ever for master codes. */
export const uniqueWithinOf = (kind: NumberedKind, date: string) =>
  KIND_RULES[kind].uniquePerYear ? financialYearOf(date) : 'ALL';

const charactersOf = (kind: NumberedKind) => {
  const separators = KIND_RULES[kind].separators;
  return {
    pattern: new RegExp(`^[A-Z0-9${separators.replace('-', '\\-')}]*$`),
    words:
      separators.length > 1
        ? 'letters, digits, "-" and "/"'
        : 'letters, digits and "-"',
  };
};

/** Null when a finished number (typed, or rendered) fits its kind, otherwise the problem. */
export function numberProblem(
  kind: NumberedKind,
  number: string,
): string | null {
  const rules = KIND_RULES[kind];
  const characters = charactersOf(kind);
  if (!number) return 'Enter the number';
  if (!characters.pattern.test(number))
    return `${number}: use only ${characters.words}`;
  if (number.length > rules.maxLength) {
    return `${number} is ${number.length} characters; ${rules.gst ? 'GST allows' : 'the limit is'} ${rules.maxLength}`;
  }
  if (rules.gst ? !/^[A-Z1-9]/.test(number) : !/^[A-Z0-9]/.test(number)) {
    return rules.gst
      ? `${number}: a GST number starts with a letter or a digit from 1 to 9 (e-invoice rule)`
      : `${number}: start with a letter or a digit`;
  }
  return null;
}

/** Null when a pattern and reset can number this kind, otherwise the problem. */
export function patternProblem(
  kind: NumberedKind,
  pattern: string,
  reset: NumberReset,
): string | null {
  const rules = KIND_RULES[kind];
  const parts = parsePattern(pattern);
  if (typeof parts === 'string') return parts;
  const sequences = parts.filter(
    (part) => 'token' in part && part.token === 'SEQ',
  );
  if (sequences.length !== 1)
    return 'Put {SEQ} (the running number) in the pattern once';
  if (!rules.resets.includes(reset)) return 'Codes never restart: pick "Never"';
  // A monthly counter starts at 1 every month, so without the month in the
  // number the same number would come round again within the year.
  if (
    reset === 'MONTHLY' &&
    !parts.some((part) => 'token' in part && part.token === 'MM')
  ) {
    return 'A series that restarts every month needs {MM} in the pattern';
  }
  const characters = charactersOf(kind);
  const text = parts
    .flatMap((part) => ('text' in part ? [part.text] : []))
    .join('');
  if (!characters.pattern.test(text))
    return `Fixed text uses only ${characters.words}`;
  const first = parts[0];
  // The number's first character: the IRP refuses 0, "/" and "-".
  if (
    'token' in first &&
    (first.token === 'MM' || (first.token === 'SEQ' && first.width > 1))
  ) {
    return rules.gst
      ? 'A GST number cannot start with 0: begin with fixed text or the year'
      : 'Begin with fixed text or the year, so numbers do not start with 0';
  }
  // The shortest number this pattern makes must already fit.
  return numberProblem(kind, renderNumber(parts, '2026-04-01', 1));
}
