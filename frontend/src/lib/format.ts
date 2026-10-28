// Display formatting shared by every screen. Indian digit grouping throughout.
const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantity = new Intl.NumberFormat("en-IN");

const fullDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

const dateTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Totals and balances: ₹1,77,484 */
export const formatInr = (amount: number) => inrWhole.format(amount);

/** Unit rates: ₹58.24 */
export const formatRate = (amount: number) => inrPrecise.format(amount);

export const formatQuantity = (value: number) => quantity.format(value);

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

/** A YYYY-MM-DD date as the calendar day, never shifted by time zone: 05 Oct 2026 */
export const formatDate = (iso: string) => fullDate.format(new Date(`${iso}T00:00:00`));

/** Same, without the year, for lists of recent documents: 05 Oct */
export const formatDayMonth = (iso: string) => dayMonth.format(new Date(`${iso}T00:00:00`));

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** "Admin User" -> "AU", for avatar tiles. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "");
}
