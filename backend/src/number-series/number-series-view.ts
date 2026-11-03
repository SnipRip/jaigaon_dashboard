import { isoDate } from '../common/dates.js';
import type { IssuedNumber, NumberFormat } from '../generated/prisma/client.js';
import type {
  IssuedNumberStatus,
  NumberedKind,
  NumberingMethod,
  NumberReset,
} from '../generated/prisma/enums.js';

export interface NumberFormatView {
  id: string;
  applicableFrom: string;
  pattern: string;
  startNumber: number;
  reset: NumberReset;
  /** Numbers this format has given out, cancelled ones included. */
  issuedCount: number;
  /** Has issued a number: it can no longer change or be deleted. */
  locked: boolean;
}

/** GSTR-1 table 13 style figures for one financial year (master codes: all time). */
export interface IssuedSummary {
  /** "2026-27", or "ALL" for master codes. */
  period: string;
  total: number;
  cancelled: number;
  first: string | null;
  last: string | null;
}

/** One kind's numbering as the API returns it. */
export interface NumberSeriesView {
  id: string;
  kind: NumberedKind;
  method: NumberingMethod;
  tallyVoucherType: string | null;
  /** Newest first. */
  formats: NumberFormatView[];
  /** The format in force on the requested date and the number a save would take; null when none. */
  current: { formatId: string; next: string } | null;
  issued: IssuedSummary;
}

export const toNumberFormatView = (
  format: NumberFormat,
  issuedCount: number,
): NumberFormatView => ({
  id: format.id,
  applicableFrom: isoDate(format.applicableFrom),
  pattern: format.pattern,
  startNumber: format.startNumber,
  reset: format.reset,
  issuedCount,
  locked: issuedCount > 0,
});

export interface IssuedNumberView {
  id: string;
  number: string;
  documentDate: string;
  /** Null for a typed number. */
  formatId: string | null;
  status: IssuedNumberStatus;
  documentId: string | null;
}

export const toIssuedNumberView = (issued: IssuedNumber): IssuedNumberView => ({
  id: issued.id,
  number: issued.number,
  documentDate: isoDate(issued.documentDate),
  formatId: issued.formatId,
  status: issued.status,
  documentId: issued.documentId,
});

/** What `issue` hands back to the document's save. */
export interface ClaimedNumber {
  /** The register row, to cancel later. */
  id: string;
  number: string;
}
