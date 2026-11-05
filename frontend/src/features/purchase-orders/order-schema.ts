import { z } from "zod";

const decimal = (decimals: number, message: string) => z.string().trim().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`), message);
const isoDate = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export const orderSchema = z
  .object({
    vendorId: z.string().min(1, "Pick the vendor"),
    date: isoDate("Pick the order date"),
    expectedDate: z.string(),
    godownId: z.string().min(1, "Pick where it is delivered"),
    terms: z.string().max(1500),
    notes: z.string().max(300),
    lines: z
      .array(
        z.object({
          itemId: z.string().min(1, "Pick an item"),
          quantity: decimal(3, "Enter the quantity").refine((value) => Number(value) > 0, "More than 0"),
          rate: decimal(2, "Enter the rate"),
          discountPct: z.union([z.literal(""), decimal(2, "0 to 99")]).refine((value) => !value || Number(value) < 100, "0 to 99"),
        }),
      )
      .min(1, "Add at least one item"),
  })
  .superRefine((values, ctx) => {
    if (values.expectedDate && values.expectedDate < values.date) ctx.addIssue({ code: "custom", path: ["expectedDate"], message: "Before the order date" });
  });

export type OrderFormValues = z.infer<typeof orderSchema>;

export const DEFAULT_ORDER_TERMS = [
  "Deliver to the godown named above, with the e-way bill when the value is over ₹50,000.",
  "Rates are before GST and hold for this order.",
  "Bill to Jaigaon Quality Enterprise quoting this order number.",
].join("\n");
