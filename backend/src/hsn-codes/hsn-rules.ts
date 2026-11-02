// Pure rules of the HSN / SAC master. The frontend applies the same in
// features/hsn/hsn-rules.ts.

/** HSN for goods: 4, 6 or 8 digits. SAC for services: 4 or 6 digits starting 99. */
export const HSN_CODE_PATTERN = /^(\d{4}|\d{6}|\d{8})$/;
export const SAC_CODE_PATTERN = /^99\d{2}(\d{2})?$/;

export interface DatedRate {
  ratePct: number;
  /** ISO date, YYYY-MM-DD. */
  effectiveFrom: string;
}

/**
 * The master code an item's HSN falls under: the longest code in the master
 * that the item's HSN starts with. 72142090 takes 72142090, then 721420,
 * then 7214.
 */
export function bestMatch<T extends { code: string }>(
  codes: T[],
  hsn: string,
): T | undefined {
  let best: T | undefined;
  for (const candidate of codes) {
    if (
      hsn.startsWith(candidate.code) &&
      (!best || candidate.code.length > best.code.length)
    ) {
      best = candidate;
    }
  }
  return best;
}

/** The rate in force on an ISO date, or undefined before the first rate. */
export function rateOn(
  rates: DatedRate[],
  isoDate: string,
): number | undefined {
  let found: DatedRate | undefined;
  for (const rate of rates) {
    if (
      rate.effectiveFrom <= isoDate &&
      (!found || rate.effectiveFrom > found.effectiveFrom)
    )
      found = rate;
  }
  return found?.ratePct;
}
