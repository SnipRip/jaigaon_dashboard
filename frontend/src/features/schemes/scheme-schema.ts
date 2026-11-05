import { z } from "zod";

const amount = /^\d+(\.\d{1,2})?$/;
const quantity = /^\d+(\.\d{1,3})?$/;
const optional = (pattern: RegExp, message: string) => z.union([z.literal(""), z.string().trim().regex(pattern, message)]);

// Field formats and the obvious pairings; the backend (scheme-rules.ts)
// checks the same and has the last word.
export const schemeSchema = z
  .object({
    name: z.string().trim().min(2, "At least 2 characters").max(80, "At most 80 characters"),
    description: z.string().max(300),
    level: z.enum(["LINE", "ORDER"]),
    benefit: z.enum(["PERCENT", "AMOUNT_PER_UNIT", "FLAT_AMOUNT", "FREE_QUANTITY"]),
    value: z.string().trim().regex(amount, "Enter the value"),
    buyQuantity: optional(quantity, "A quantity"),
    maxDiscount: optional(amount, "Rupees"),
    minQuantity: optional(quantity, "A quantity"),
    minValue: optional(amount, "Rupees"),
    targets: z.array(z.string()),
    partyScope: z.enum(["ALL", "INDIA", "OVERSEAS", "SELECTED"]),
    partyIds: z.array(z.string()),
    rateSources: z.array(z.enum(["SHEET", "SPECIAL", "MANUAL"])).min(1, "Pick at least one"),
    stackable: z.boolean(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the start date"),
    validTill: z.string(),
    notes: z.string().max(300),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const value = Number(values.value);
    if (value <= 0) issue("value", "Above 0");
    if (values.benefit === "PERCENT" && value >= 100) issue("value", "Under 100%");
    if (values.benefit === "FREE_QUANTITY" && !(Number(values.buyQuantity) > 0)) issue("buyQuantity", "How many to buy");
    if (values.partyScope === "SELECTED" && values.partyIds.length === 0) issue("partyIds", "Pick the customers");
    if (values.validTill && values.validTill < values.validFrom) issue("validTill", "Before the start date");
  });

export type SchemeFormValues = z.infer<typeof schemeSchema>;
