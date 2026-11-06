// Calendar dates as the API sends them (YYYY-MM-DD) and as a `@db.Date`
// column stores them (midnight UTC).

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
/** A YYYY-MM-DD string as the midnight-UTC Date a `@db.Date` column stores. */
export const dateOnly = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in India (YYYY-MM-DD). A server clock in UTC is a day behind until 05:30. */
export const todayInIndia = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    new Date(),
  );

const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
/** "3 Nov 2026", for messages. */
export const formatDate = (iso: string) => DAY_MONTH_YEAR.format(dateOnly(iso));

/** A YYYY-MM-DD date moved by whole days. */
export const addDays = (iso: string, days: number) => isoDate(new Date(dateOnly(iso).getTime() + days * 86_400_000));
