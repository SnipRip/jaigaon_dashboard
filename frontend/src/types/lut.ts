// An LUT register entry as the backend returns it (backend/src/luts).
export interface LutView {
  id: string;
  /** "2026-27", worked out from validFrom. */
  financialYear: string;
  arn: string;
  adCode: string | null;
  validFrom: string;
  validTo: string;
}
