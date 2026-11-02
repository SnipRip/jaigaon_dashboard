// Calendar dates as the API sends them (YYYY-MM-DD) and as a `@db.Date`
// column stores them (midnight UTC).

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
/** A YYYY-MM-DD string as the midnight-UTC Date a `@db.Date` column stores. */
export const dateOnly = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
