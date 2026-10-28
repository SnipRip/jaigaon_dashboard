import type { HsnCode } from "./types";

/**
 * The rate in force on an ISO date. Documents pass their own date, so an
 * invoice dated before a rate change keeps the old rate.
 */
export function rateOn(hsn: HsnCode, isoDate: string): number | undefined {
  return hsn.rates.filter((change) => change.from <= isoDate).at(-1)?.ratePct;
}

/** The newest rate on record; what masters screens show. */
export const latestRate = (hsn: HsnCode) => hsn.rates.at(-1)?.ratePct;

export const findHsn = (codes: HsnCode[], code?: string) => (code ? codes.find((hsn) => hsn.code === code) : undefined);

export function matchesHsnSearch(hsn: HsnCode, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || `${hsn.code} ${hsn.description} ${hsn.kind}`.toLowerCase().includes(needle);
}
