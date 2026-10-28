// A report is a table: typed columns and plain rows, so one viewer can
// filter, total, print and download any of them as CSV.

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
  rows: ReportRow[];
  /** Column holding the date the period filter uses. */
  dateKey?: string;
  /** Column holding the party name the party filter uses. */
  partyKey?: string;
}
