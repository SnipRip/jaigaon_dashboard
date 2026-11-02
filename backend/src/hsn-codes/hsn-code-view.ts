import { toNumber } from '../common/decimal.js';
import type { HsnCode, HsnRate } from '../generated/prisma/client.js';

export interface HsnRateView {
  id: string;
  ratePct: number;
  /** YYYY-MM-DD. */
  effectiveFrom: string;
}

export interface HsnCodeView {
  id: string;
  code: string;
  kind: HsnCode['kind'];
  description: string;
  cessPct: number | null;
  reverseCharge: boolean;
  notes: string | null;
  /** Oldest first. */
  rates: HsnRateView[];
  /** Items whose HSN falls under this code (the most specific match). */
  itemCount: number;
}

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
/** A YYYY-MM-DD string as the midnight-UTC Date a `@db.Date` column stores. */
export const dateOnly = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const toRateView = (rate: HsnRate): HsnRateView => ({
  id: rate.id,
  ratePct: toNumber(rate.ratePct),
  effectiveFrom: isoDate(rate.effectiveFrom),
});

export const toHsnCodeView = (
  code: HsnCode & { rates: HsnRate[] },
  itemCount: number,
): HsnCodeView => ({
  id: code.id,
  code: code.code,
  kind: code.kind,
  description: code.description,
  cessPct: toNumber(code.cessPct),
  reverseCharge: code.reverseCharge,
  notes: code.notes,
  rates: code.rates
    .map(toRateView)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)),
  itemCount,
});
