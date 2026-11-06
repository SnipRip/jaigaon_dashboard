import { z } from "zod";
import { isoDate, repeatedItemIssue, stockLineSchema } from "./stock-line-schema";
import { REASONS } from "./stock-move-rules";

export const adjustmentSchema = z
  .object({
    date: isoDate("Pick the date"),
    godownId: z.string().min(1, "Pick the godown"),
    direction: z.enum(["OUT", "IN"]),
    reason: z.enum(["DAMAGED", "LOST", "CONSUMED", "COUNT_SHORT", "COUNT_EXCESS", "FOUND", "OTHER"], { message: "Pick a reason" }),
    notes: z.string().max(300),
    lines: z.array(stockLineSchema).min(1, "Add at least one item"),
  })
  .superRefine((values, ctx) => {
    if (!REASONS.find((option) => option.value === values.reason)?.directions.includes(values.direction)) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Pick a reason that fits" });
    }
    if (values.reason === "OTHER" && !values.notes.trim()) ctx.addIssue({ code: "custom", path: ["notes"], message: "Say why" });
    if (values.direction === "IN") {
      values.lines.forEach((line, index) => {
        if (!line.rate) ctx.addIssue({ code: "custom", path: ["lines", index, "rate"], message: "Stock added needs its cost" });
      });
    }
    repeatedItemIssue(values.lines, ctx);
  });

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
