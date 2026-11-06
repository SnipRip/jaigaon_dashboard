// A report is a table: typed columns here, plain rows from the backend
// (GET /reports/:id), so one viewer can filter, total, print and download
// any of them as CSV.

export interface ReportColumn {
  key: string;
  label: string;
  kind: "text" | "money" | "quantity" | "date" | "percent";
  /** Money and quantity columns are summed in the footer unless false. */
  total?: boolean;
}

export type ReportRow = Record<string, string | number> & { href?: string };

/** Report groups, in the order the catalogue and the report list show them. */
export const REPORT_GROUPS = ["Sales", "Purchases", "GST", "Stock", "Money", "Export"] as const;

export interface Report {
  id: string;
  title: string;
  group: (typeof REPORT_GROUPS)[number];
  description: string;
  columns: ReportColumn[];
  /** Covers a period (From / To, this financial year by default); otherwise it shows where things stand today. */
  period: boolean;
  /** Column holding the party name the party filter uses. */
  partyKey?: string;
}

/** A report's rows as the backend returns them; from / to are null for a report of today. */
export interface ReportDataView {
  from: string | null;
  to: string | null;
  rows: ReportRow[];
}
