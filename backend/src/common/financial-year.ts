// Indian financial years run 1 April to 31 March. LUTs and number series are
// both kept per year.

export const FINANCIAL_YEAR_PATTERN = /^\d{4}-\d{2}$/;

/** Indian financial year of a YYYY-MM-DD date: "2026-27". */
export function financialYearOf(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** True for "2026-27", false for "2026-28" or "2026": the second part follows the first. */
export function isFinancialYear(value: string): boolean {
  if (!FINANCIAL_YEAR_PATTERN.test(value)) return false;
  const start = Number(value.slice(0, 4));
  return financialYearOf(`${start}-04-01`) === value;
}
