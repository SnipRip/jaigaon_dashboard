import { z } from "zod";
import { financialYearOf } from "@/lib/financial-year";

// The same checks as the backend (backend/src/luts): a 15-character ARN, an
// optional AD code, and dates inside one financial year.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const lutSchema = z
  .object({
    arn: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}[A-Z0-9]{13}$/, "The ARN is the 15-character number on the RFD-11 acknowledgement"),
    adCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^([A-Z0-9]{4,20})?$/, "The AD code is 4 to 20 letters and digits"),
    validFrom: isoDate,
    validTo: isoDate,
  })
  .refine((values) => values.validTo >= values.validFrom, { path: ["validTo"], message: "Must be on or after the start date" })
  .refine((values) => financialYearOf(values.validTo) === financialYearOf(values.validFrom), {
    path: ["validTo"],
    message: "An LUT covers one financial year: end it by 31 March",
  });

export type LutValues = z.infer<typeof lutSchema>;
