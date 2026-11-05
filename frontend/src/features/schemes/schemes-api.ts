// Calls for the scheme master and the scheme preview a document asks for.
import { apiRequest } from "@/lib/api-client";
import type { SchemeRateSource, SchemeResultView, SchemeTargetView, SchemeView } from "@/types/scheme";

export const SCHEMES_PATH = "/schemes";
export const EVALUATE_SCHEMES_PATH = "/schemes/evaluate";

/** The body the backend takes for a new or changed scheme. */
export type SchemeBody = Omit<SchemeView, "id" | "isArchived">;

export const saveScheme = (id: string | undefined, body: SchemeBody) =>
  id ? apiRequest<SchemeView>(`${SCHEMES_PATH}/${id}`, { method: "PATCH", body }) : apiRequest<SchemeView>(SCHEMES_PATH, { method: "POST", body });

export const setSchemeArchived = (id: string, isArchived: boolean) =>
  apiRequest<SchemeView>(`${SCHEMES_PATH}/${id}`, { method: "PATCH", body: { isArchived } });

export const deleteScheme = (id: string) => apiRequest(`${SCHEMES_PATH}/${id}`, { method: "DELETE" });

export interface SchemeLineInput {
  key: string;
  itemId: string;
  quantity: number;
  rate: number;
  discountPct: number;
  rateSource: SchemeRateSource;
}

/** SWR fetcher: key [path, partyId, date, lines as JSON]. */
export const fetchSchemeResult = ([, partyId, date, lines]: readonly [string, string | undefined, string, string]) =>
  apiRequest<SchemeResultView>(EVALUATE_SCHEMES_PATH, { method: "POST", body: { partyId, date, lines: JSON.parse(lines) as SchemeLineInput[] } });

/** "item:<id>" / "category:<id>" / "brand:<id>": one picker over all three. */
export const targetKey = (target: SchemeTargetView) =>
  target.itemId ? `item:${target.itemId}` : target.categoryId ? `category:${target.categoryId}` : `brand:${target.brandId}`;

export function fromTargetKey(key: string): SchemeTargetView {
  const [kind, id] = key.split(":");
  return { itemId: kind === "item" ? id : null, categoryId: kind === "category" ? id : null, brandId: kind === "brand" ? id : null };
}
