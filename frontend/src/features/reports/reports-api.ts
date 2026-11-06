// The reports route (backend/src/reports): one report's rows for a period.
export const REPORTS_PATH = "/reports";

/** Blank dates are left out, so the backend uses this financial year to today. */
export function reportPath(id: string, { from, to }: { from?: string; to?: string }) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const search = query.toString();
  return `${REPORTS_PATH}/${id}${search ? `?${search}` : ""}`;
}
