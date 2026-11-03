// The live preview of a number pattern while it is typed. The backend renders
// and checks the same tokens (backend/src/number-series/number-pattern.ts);
// it decides whether a pattern is allowed.
import { financialYearOf } from "@/lib/financial-year";

/** Token help, with what each gives on 3 Nov 2026. */
export const TOKEN_HELP = [
  { token: "{FY}", example: "2627" },
  { token: "{FY_LONG}", example: "2026-27" },
  { token: "{YYYY}", example: "2026" },
  { token: "{YY}", example: "26" },
  { token: "{MM}", example: "11" },
  { token: "{SEQ:4}", example: "0001" },
];

/** INV/{FY}/{SEQ:4}, 2026-11-03, 7 → INV/2627/0007. Unknown tokens are left as typed. */
export function renderPattern(pattern: string, date: string, sequence: number): string {
  const fy = financialYearOf(date);
  return pattern.toUpperCase().replace(/\{([A-Z_]+)(?::(\d+))?\}/g, (whole, token: string, width?: string) => {
    switch (token) {
      case "FY":
        return fy.replace("-", "").slice(2);
      case "FY_LONG":
        return fy;
      case "YYYY":
        return date.slice(0, 4);
      case "YY":
        return date.slice(2, 4);
      case "MM":
        return date.slice(5, 7);
      case "SEQ":
        return String(sequence).padStart(Number(width ?? 0), "0");
      default:
        return whole;
    }
  });
}
