// Calls for the number series master, and the conversion between the
// backend's shape and the one RecordMaster edits. No hooks here, so server
// components can import the path.
import type { NumberSeriesView } from "@/types/number-series";
import { persistence, type Changes } from "./masters-api";
import type { NumberSeries } from "./types";

export const NUMBER_SERIES_PATH = "/number-series";

export const toNumberSeries = (view: NumberSeriesView): NumberSeries => ({ ...view });

const numberSeriesBody = (changes: Changes) => ({
  document: changes.document,
  financialYear: changes.financialYear,
  prefix: changes.prefix,
  nextNumber: changes.nextNumber,
  padding: changes.padding,
});

/** No archive: an old year's series is history, and one in use cannot be deleted. */
export function numberSeriesPersistence(onSaved: () => void) {
  const { create, update, remove } = persistence(NUMBER_SERIES_PATH, toNumberSeries, numberSeriesBody, onSaved);
  return { create, update, remove };
}
