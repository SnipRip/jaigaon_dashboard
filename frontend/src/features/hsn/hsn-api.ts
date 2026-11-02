// Calls for the HSN / SAC master, and the conversion from the backend's
// shape. No hooks here, so server components can import the path.
import { apiRequest } from "@/lib/api-client";
import type { HsnCodeView } from "@/types/hsn";
import type { HsnFormValues } from "./hsn-schema";
import type { HsnCode } from "./types";

export const HSN_CODES_PATH = "/hsn-codes";

export const toHsnCode = (view: HsnCodeView): HsnCode => ({
  id: view.id,
  code: view.code,
  kind: view.kind,
  description: view.description,
  rates: view.rates.map((rate) => ({ id: rate.id, ratePct: rate.ratePct, from: rate.effectiveFrom })),
  cessPct: view.cessPct ?? undefined,
  reverseCharge: view.reverseCharge || undefined,
  notes: view.notes ?? undefined,
  itemCount: view.itemCount,
});

const details = (values: HsnFormValues) => ({
  description: values.description,
  reverseCharge: values.reverseCharge,
  notes: values.notes.trim() || null,
});

/**
 * Saves the form. A new code is created with its first rate. On an existing
 * code the details are saved, and a rate or date that differs from the
 * newest entry is added to the history (the same date replaces that entry).
 */
export async function saveHsnCode(hsn: HsnCode | undefined, values: HsnFormValues): Promise<HsnCodeView> {
  const rate = { ratePct: Number(values.ratePct), effectiveFrom: values.from };
  if (!hsn) {
    return apiRequest<HsnCodeView>(HSN_CODES_PATH, {
      method: "POST",
      body: { kind: values.kind, code: values.code, ...details(values), ...rate },
    });
  }
  let saved = await apiRequest<HsnCodeView>(`${HSN_CODES_PATH}/${hsn.id}`, { method: "PATCH", body: details(values) });
  const newest = hsn.rates.at(-1);
  if (!newest || newest.ratePct !== rate.ratePct || newest.from !== rate.effectiveFrom) {
    saved = await apiRequest<HsnCodeView>(`${HSN_CODES_PATH}/${hsn.id}/rates`, { method: "POST", body: rate });
  }
  return saved;
}

export const removeHsnRate = (hsn: HsnCode, rateId: string) =>
  apiRequest<HsnCodeView>(`${HSN_CODES_PATH}/${hsn.id}/rates/${rateId}`, { method: "DELETE" });

export const deleteHsnCode = (hsn: HsnCode) => apiRequest(`${HSN_CODES_PATH}/${hsn.id}`, { method: "DELETE" });
