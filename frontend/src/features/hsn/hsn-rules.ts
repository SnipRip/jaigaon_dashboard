import type { HsnCode } from "./types";

// The same rules as backend/src/hsn-codes/hsn-rules.ts.

/**
 * The rate in force on an ISO date. Documents pass their own date, so an
 * invoice dated before a rate change keeps the old rate.
 */
export function rateOn(hsn: HsnCode, isoDate: string): number | undefined {
  return hsn.rates.filter((change) => change.from <= isoDate).at(-1)?.ratePct;
}

/** The newest rate on record, even one that starts in the future; what the master screen shows. */
export const latestRate = (hsn: HsnCode) => hsn.rates.at(-1)?.ratePct;

/** The rate in force today: what a new item or document takes. */
export const currentRate = (hsn: HsnCode) => rateOn(hsn, new Date().toISOString().slice(0, 10));

/**
 * The master code an HSN falls under: the longest code in the master that it
 * starts with. 72142090 takes 72142090, then 721420, then 7214.
 */
export function findHsn(codes: HsnCode[], code?: string): HsnCode | undefined {
  if (!code) return undefined;
  let best: HsnCode | undefined;
  for (const hsn of codes) {
    if (code.startsWith(hsn.code) && (!best || hsn.code.length > best.code.length)) best = hsn;
  }
  return best;
}

export function matchesHsnSearch(hsn: HsnCode, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || `${hsn.code} ${hsn.description} ${hsn.kind}`.toLowerCase().includes(needle);
}
