// The dashboard's week buckets. Pure; dashboard.service.ts loads the facts.
import { addDays, dateOnly } from '../common/dates.js';

/** Weeks on the trading chart, this one included. */
export const CHART_WEEKS = 6;

/** Monday of the week a date falls in. */
export const weekOf = (date: string) => addDays(date, -((dateOnly(date).getUTCDay() + 6) % 7));

/** Mondays of the last `count` weeks up to the one `today` falls in, oldest first. */
export const recentWeeks = (today: string, count = CHART_WEEKS) => {
  const current = weekOf(today);
  return Array.from({ length: count }, (_, index) => addDays(current, (index - count + 1) * 7));
};

const money = (value: number) => Math.round(value * 100) / 100;

/** Amounts added up per week (one total per Monday in `weeks`); rows outside them are left out. */
export function sumByWeek(weeks: string[], rows: { date: string; amount: number }[]): number[] {
  const totals = new Map(weeks.map((week) => [week, 0]));
  for (const row of rows) {
    const week = weekOf(row.date);
    const total = totals.get(week);
    if (total !== undefined) totals.set(week, total + row.amount);
  }
  return weeks.map((week) => money(totals.get(week)!));
}
