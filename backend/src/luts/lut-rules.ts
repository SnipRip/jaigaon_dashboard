// How an LUT's dates fit together. The frontend checks the same in
// features/tax-export/lut-schema.ts.

/** Indian financial year of a YYYY-MM-DD date: "2026-27". */
export function financialYearOf(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export interface LutDates {
  validFrom: string;
  validTo: string;
}

/** Null when the dates are consistent, otherwise the problem. */
export function lutProblem({ validFrom, validTo }: LutDates): string | null {
  if (validTo < validFrom) return 'Valid to must be on or after valid from';
  // An LUT is filed for one financial year and lapses on 31 March.
  const year = financialYearOf(validFrom);
  if (financialYearOf(validTo) !== year) {
    return `An LUT covers one financial year: valid to must be on or before 31 March ${Number(year.slice(0, 4)) + 1}`;
  }
  return null;
}
