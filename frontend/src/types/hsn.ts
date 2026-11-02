// An HSN / SAC code as the backend returns it (backend/src/hsn-codes).
export interface HsnCodeView {
  id: string;
  code: string;
  kind: "HSN" | "SAC";
  description: string;
  cessPct: number | null;
  reverseCharge: boolean;
  notes: string | null;
  /** Oldest first. */
  rates: { id: string; ratePct: number; effectiveFrom: string }[];
  /** Items whose HSN falls under this code. */
  itemCount: number;
}
