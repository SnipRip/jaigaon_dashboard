// Calls for customer special rates and the line rate options, and the
// conversion between the backend's shapes and the ones the Rates screen
// edits. No hooks here, so server components can import the paths.
import { persistence, type Changes } from "@/features/masters/masters-api";
import type { MasterRecord } from "@/features/masters/record-master";
import { apiRequest } from "@/lib/api-client";
import type { LineRateOptionsView, RateTargetView, SpecialRateView } from "@/types/pricing";
import type { RateTarget, SpecialRate } from "./types";

export const SPECIAL_RATES_PATH = "/special-rates";
export const LINE_OPTIONS_PATH = "/rates/line-options";

const target = (view: RateTargetView): RateTarget => ({ itemId: view.itemId ?? undefined, categoryId: view.categoryId ?? undefined });

export const toSpecialRate = (view: SpecialRateView): SpecialRate => ({
  id: view.id,
  customerId: view.partyId,
  ...target(view),
  kind: view.kind === "NET" ? "net" : "discount",
  value: view.value,
  validFrom: view.validFrom,
  validTill: view.validTill ?? undefined,
  notes: view.notes ?? undefined,
  archived: view.isArchived,
});

// The form picks an item or a category in one list; its value says which.
export const targetKey = (rate: RateTarget) => (rate.itemId ? `item:${rate.itemId}` : `category:${rate.categoryId}`);
const fromTargetKey = (key: unknown): RateTargetView => {
  const [kind, id] = String(key).split(":");
  return kind === "item" ? { itemId: id, categoryId: null } : { itemId: null, categoryId: id };
};

const specialRateBody = (changes: Changes) => ({
  partyId: changes.customerId,
  ...fromTargetKey(changes.target),
  kind: String(changes.kind).toUpperCase(),
  value: changes.value,
  validFrom: changes.validFrom,
  validTill: changes.validTill ?? null,
  notes: changes.notes ?? null,
});

/** `decorate` adds what the screen shows (a title, the form's target key) to each saved record. */
export const specialRatePersistence = <R extends MasterRecord>(onSaved: () => void, decorate: (rate: SpecialRate) => R) =>
  persistence<SpecialRateView, R>(SPECIAL_RATES_PATH, (view) => decorate(toSpecialRate(view)), specialRateBody, onSaved);

/** Every item of a document in one call; no party is a walk-in buyer. */
export const fetchLineOptions = ([, partyId, date, itemIds]: readonly [string, string | undefined, string, string[]]) =>
  apiRequest<LineRateOptionsView[]>(LINE_OPTIONS_PATH, { method: "POST", body: { partyId, date, itemIds } });
