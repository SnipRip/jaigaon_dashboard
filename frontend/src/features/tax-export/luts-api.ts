// Calls for the LUT register, and the conversion from the backend's shape.
// No hooks here, so server components can import the path.
import { apiRequest } from "@/lib/api-client";
import type { LutView } from "@/types/lut";
import type { LutValues } from "./lut-schema";
import type { Lut } from "./types";

export const LUTS_PATH = "/luts";

export const toLut = (view: LutView): Lut => ({
  id: view.id,
  arn: view.arn,
  adCode: view.adCode ?? undefined,
  financialYear: view.financialYear,
  validFrom: view.validFrom,
  validTo: view.validTo,
});

export const toLutValues = (lut: Lut): LutValues => ({
  arn: lut.arn,
  adCode: lut.adCode ?? "",
  validFrom: lut.validFrom,
  validTo: lut.validTo,
});

/** Creates the entry, or saves it when `lut` is given. A blank AD code clears it. */
export const saveLut = (lut: Lut | undefined, values: LutValues) =>
  apiRequest<LutView>(lut ? `${LUTS_PATH}/${lut.id}` : LUTS_PATH, {
    method: lut ? "PATCH" : "POST",
    body: { ...values, adCode: values.adCode || null },
  });

export const deleteLut = (lut: Lut) => apiRequest(`${LUTS_PATH}/${lut.id}`, { method: "DELETE" });
