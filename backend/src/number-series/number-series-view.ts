import type { NumberSeries } from '../generated/prisma/client.js';
import type { SeriesDocument } from '../generated/prisma/enums.js';
import { formatNumber } from './number-series-rules.js';

/** A number series as the API returns it, with the number the next document will take. */
export interface NumberSeriesView {
  id: string;
  document: SeriesDocument;
  financialYear: string;
  prefix: string;
  nextNumber: number;
  padding: number;
  /** 0 until a document takes a number. */
  lastIssued: number;
  /** "INV/2627/0009". */
  preview: string;
}

export const toNumberSeriesView = (series: NumberSeries): NumberSeriesView => ({
  id: series.id,
  document: series.document,
  financialYear: series.financialYear,
  prefix: series.prefix,
  nextNumber: series.nextNumber,
  padding: series.padding,
  lastIssued: series.lastIssued,
  preview: formatNumber(series.prefix, series.nextNumber, series.padding),
});
