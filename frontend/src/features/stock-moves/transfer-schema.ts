import { z } from "zod";
import { isoDate, repeatedItemIssue, stockLineSchema } from "./stock-line-schema";

export const transferSchema = z
  .object({
    date: isoDate("Pick the date"),
    fromGodownId: z.string().min(1, "Pick where the stock leaves from"),
    toGodownId: z.string().min(1, "Pick where it goes"),
    vehicleNumber: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => !value || /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(value.replace(/[\s-]/g, "")), "Looks like WB73E1234"),
    notes: z.string().max(300),
    lines: z.array(stockLineSchema).min(1, "Add at least one item"),
  })
  .superRefine((values, ctx) => {
    if (values.fromGodownId && values.fromGodownId === values.toGodownId) ctx.addIssue({ code: "custom", path: ["toGodownId"], message: "Pick a different godown" });
    repeatedItemIssue(values.lines, ctx);
  });

export type TransferFormValues = z.infer<typeof transferSchema>;
