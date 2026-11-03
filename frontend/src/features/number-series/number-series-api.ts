// Calls for the numbering master. No hooks here, so server components can
// import the path.
import { apiRequest } from "@/lib/api-client";
import type { NumberingMethod, NumberSeriesView } from "@/types/number-series";
import type { FormatValues } from "./format-schema";

export const NUMBER_SERIES_PATH = "/number-series";

/** Every kind, with the format in force and this year's figures for `date`. */
export const seriesListPath = (date: string) => `${NUMBER_SERIES_PATH}?date=${date}`;

/** Only kinds with a format: the All masters count. */
export const CONFIGURED_SERIES_PATH = `${NUMBER_SERIES_PATH}?configured=true`;

export const issuedPath = (series: NumberSeriesView, financialYear: string) =>
  `${NUMBER_SERIES_PATH}/${series.id}/issued?financialYear=${financialYear}`;

/** A blank Tally voucher type clears it. */
export const saveSeriesSettings = (series: NumberSeriesView, method: NumberingMethod, tallyVoucherType: string) =>
  apiRequest<NumberSeriesView>(`${NUMBER_SERIES_PATH}/${series.id}`, {
    method: "PATCH",
    body: { method, tallyVoucherType: tallyVoucherType.trim() || null },
  });

const formatBody = (values: FormatValues) => ({ ...values, startNumber: Number(values.startNumber) });

/** Adds a format, or saves `formatId` when given (only one that has issued nothing). */
export const saveFormat = (series: NumberSeriesView, values: FormatValues, formatId?: string) =>
  apiRequest<NumberSeriesView>(`${NUMBER_SERIES_PATH}/${series.id}/formats${formatId ? `/${formatId}` : ""}`, {
    method: formatId ? "PATCH" : "POST",
    body: formatBody(values),
  });

export const deleteFormat = (series: NumberSeriesView, formatId: string) =>
  apiRequest<NumberSeriesView>(`${NUMBER_SERIES_PATH}/${series.id}/formats/${formatId}`, { method: "DELETE" });
