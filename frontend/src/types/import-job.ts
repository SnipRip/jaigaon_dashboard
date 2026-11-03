// A master import as the backend returns it (backend/src/imports).
export interface ImportJobView {
  id: string;
  /** Importer key: "units", "customers" … */
  master: string;
  fileName: string;
  totalRows: number;
  /** Rows read so far. */
  doneRows: number;
  created: number;
  updated: number;
  skipped: number;
  status: "RUNNING" | "STOPPED" | "DONE";
  error: string | null;
  /** Set when this upload carried on a stopped import: the first row it read, as Excel numbers rows. */
  resumedFromRow: number | null;
  updatedAt: string;
}
