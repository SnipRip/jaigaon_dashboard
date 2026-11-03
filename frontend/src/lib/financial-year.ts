// Indian financial years run 1 April to 31 March. LUTs and number series are
// both kept per year.

/** Indian financial year of a YYYY-MM-DD date: "2026-27". */
export function financialYearOf(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
