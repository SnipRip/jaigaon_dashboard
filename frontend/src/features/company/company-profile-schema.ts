import { z } from "zod";
import { checkGstin, gstinPan, gstinStateCode } from "@/features/gst/gstin";

// The company profile form. The backend checks the same in
// src/company-profile/company-profile-rules.ts and the DTO.
const optional = (pattern: RegExp, message: string) => z.union([z.literal(""), z.string().trim().toUpperCase().regex(pattern, message)]);
const phone = z.string().trim().regex(/^$|^\+[1-9]\d{7,14}$/, "Use the country code, for example +919635312988");

export const companyProfileSchema = z
  .object({
    legalName: z.string().trim().min(2, "Enter the legal name").max(120),
    tradeName: z.string().trim().max(100),
    registration: z.enum(["REGULAR", "COMPOSITION", "UNREGISTERED"]),
    stateCode: z.string().regex(/^\d{2}$/, "Pick our GST state"),
    gstin: z.string().trim().toUpperCase(),
    pan: optional(/^[A-Z]{5}\d{4}[A-Z]$/, "PAN is 5 letters, 4 digits, 1 letter"),
    iec: optional(/^[A-Z0-9]{10}$/, "The IEC has 10 letters and digits"),
    addressLine: z.string().trim().max(160),
    city: z.string().trim().max(60),
    district: z.string().trim().max(60),
    pin: z.union([z.literal(""), z.string().regex(/^\d{6}$/, "PIN code is 6 digits")]),
    phone,
    altPhone: phone,
    email: z.union([z.literal(""), z.email("Enter a valid email")]),
    exportBank: z.string().trim().max(80),
    customsStation: z.string().trim().max(80),
    portCode: optional(/^[A-Z0-9]{6}$/, "Port codes have 6 letters and digits, as printed on the shipping bill"),
    defaultExportRoute: z.enum(["LUT", "IGST"]),
    exportCurrency: z.enum(["INR", "BTN"]),
  })
  .superRefine((values, context) => {
    if (!values.gstin) return;
    if (values.registration === "UNREGISTERED") {
      context.addIssue({ code: "custom", path: ["gstin"], message: "An unregistered business has no GSTIN" });
      return;
    }
    const check = checkGstin(values.gstin);
    if (!check.valid) context.addIssue({ code: "custom", path: ["gstin"], message: check.reason });
    else if (gstinStateCode(values.gstin) !== values.stateCode) {
      context.addIssue({ code: "custom", path: ["gstin"], message: "Our GSTIN must start with our GST state code" });
    } else if (values.pan && values.pan !== gstinPan(values.gstin)) {
      context.addIssue({ code: "custom", path: ["pan"], message: "The PAN does not match the GSTIN" });
    }
  });

export type CompanyProfileValues = z.infer<typeof companyProfileSchema>;
