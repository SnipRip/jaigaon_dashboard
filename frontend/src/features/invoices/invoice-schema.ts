import { z } from "zod";

const number = (label: string, decimals: number) =>
  z.string().trim().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`), `Enter the ${label}`);

/** Optional Indian vehicle registration, as on an e-way bill. Bills use it too. */
export const vehicleNumberSchema = z.union([z.literal(""), z.string().trim().regex(/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/i, "Like WB73E1234, no spaces")]);

export const invoiceSchema = z.object({
  /** Blank takes the next number in the series; typed only when the series allows it. */
  number: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(16, "GST allows at most 16 characters")
      .regex(/^[A-Za-z0-9/-]+$/, "Letters, digits, / and - only"),
  ]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the invoice date"),
  partyId: z.string().min(1, "Pick the customer"),
  godownId: z.string().min(1, "Pick the godown the goods leave from"),
  placeOfSupply: z.string(),
  shipToLine: z.string().max(160),
  shipToCity: z.string().max(60),
  exportRoute: z.enum(["lut", "igst"]),
  currency: z.enum(["INR", "BTN"]),
  /** Shown read-only when picked from the master; checked only when typed. */
  vehicleNumber: z.string(),
  /** Empty: typed, not from the vehicle master. */
  vehicleId: z.string(),
  notes: z.string().max(300),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, "Pick an item"),
        /** One of the item's units; blank = the base unit. Quantity and rate are in it. */
        unit: z.string(),
        quantity: number("quantity", 3).refine((value) => Number(value) > 0, "Must be more than 0"),
        rate: number("rate", 2),
        discountPct: z.union([z.literal(""), number("discount", 2).refine((value) => Number(value) < 100, "Below 100%")]),
      }),
    )
    .min(1, "Add at least one item"),
}).superRefine((values, ctx) => {
  const typed = vehicleNumberSchema.safeParse(values.vehicleNumber);
  if (!values.vehicleId && !typed.success) ctx.addIssue({ code: "custom", path: ["vehicleNumber"], message: typed.error.issues[0].message });
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
