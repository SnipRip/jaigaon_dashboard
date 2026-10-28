export type CodeKind = "HSN" | "SAC";

export interface RateChange {
  ratePct: number;
  /** ISO date the rate applies from. */
  from: string;
}

export interface HsnCode {
  code: string;
  kind: CodeKind;
  description: string;
  /** Newest last. The current rate is the last one already in force. */
  rates: RateChange[];
  cessPct?: number;
  /** Services bought under reverse charge (e.g. goods transport agency). */
  reverseCharge?: boolean;
  notes?: string;
}
