import { z } from "zod";
import { needsGstin } from "@/features/gst/gst-rules";
import { checkGstin, gstinStateCode } from "@/features/gst/gstin";

const amount = z.union([z.literal(""), z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount in rupees")]);
const days = z.string().trim().regex(/^\d{1,3}$/, "Enter the number of days, 0 for cash");

export const partySchema = z
  .object({
    roles: z.array(z.enum(["customer", "vendor"])).min(1, "Pick customer, vendor or both"),
    kind: z.enum(["business", "individual"]),
    displayName: z.string().trim().min(2, "Enter the name to show on documents").max(100),
    legalName: z.string().trim().max(120),
    contactPerson: z.string().trim().max(80),
    phone: z.string().trim().regex(/^$|^\+[1-9]\d{7,14}$/, "Use the country code, for example +919635312988 or +97517000001"),
    email: z.union([z.literal(""), z.email("Enter a valid email")]),

    treatment: z.enum(["registered", "composition", "unregistered", "consumer", "overseas", "sez"]),
    gstin: z.string().trim().toUpperCase(),
    pan: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "PAN is 5 letters, 4 digits, 1 letter")]),
    placeOfSupply: z.string(),
    country: z.string().trim(),
    foreignTaxId: z.string().trim().max(40),
    currency: z.enum(["INR", "BTN"]),
    exportRoute: z.enum(["lut", "igst"]),
    isGta: z.boolean(),

    addressLine: z.string().trim().max(160),
    city: z.string().trim().max(60),
    pin: z.union([z.literal(""), z.string().regex(/^\d{6}$/, "PIN code is 6 digits")]),

    creditDays: days,
    creditLimit: amount,
    priceLevel: z.string(),
    openingBalance: amount,
    udyamNumber: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, "Format: UDYAM-WB-00-0000000")]),
    bankName: z.string().trim().max(80),
    bankAccount: z.union([z.literal(""), z.string().regex(/^\d{9,18}$/, "Account number is 9 to 18 digits")]),
    ifsc: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "IFSC is 11 characters, like SBIN0001234")]),
    notes: z.string().max(500),
  })
  .superRefine((values, context) => {
    if (needsGstin(values.treatment)) {
      const check = checkGstin(values.gstin);
      if (!check.valid) context.addIssue({ code: "custom", path: ["gstin"], message: check.reason });
      else if (values.treatment !== "sez" && values.placeOfSupply && gstinStateCode(values.gstin) !== values.placeOfSupply) {
        context.addIssue({ code: "custom", path: ["placeOfSupply"], message: "Does not match the state in the GSTIN" });
      }
    }
    if (values.treatment === "overseas") {
      if (!values.country) context.addIssue({ code: "custom", path: ["country"], message: "Enter the country" });
    } else if (!values.placeOfSupply) {
      context.addIssue({ code: "custom", path: ["placeOfSupply"], message: "Pick the place of supply" });
    }
  });

export type PartyFormValues = z.infer<typeof partySchema>;
