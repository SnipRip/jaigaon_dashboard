import type { Lut } from "./types";

export type LutStatus = "active" | "expiring" | "expired" | "upcoming";

const DAY = 24 * 60 * 60 * 1000;

/** "expiring" inside the last 30 days, so the next year's LUT is filed in time. */
export function lutStatus(lut: Lut, today: string): LutStatus {
  if (today < lut.validFrom) return "upcoming";
  if (today > lut.validTo) return "expired";
  const daysLeft = (Date.parse(lut.validTo) - Date.parse(today)) / DAY;
  return daysLeft <= 30 ? "expiring" : "active";
}

/** The LUT an export invoice dated `isoDate` must quote, if any. */
export const lutFor = (register: Lut[], isoDate: string) =>
  register.find((lut) => lut.validFrom <= isoDate && isoDate <= lut.validTo);

/** Indian financial year of a date: "2026-27". */
export function financialYearOf(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
