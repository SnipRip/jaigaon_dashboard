import { z } from "zod";

export const expenseSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
    headId: z.string().min(1, "Pick the expense head"),
    description: z.string().trim().min(1, "Say what it was for").max(120),
    amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter the amount before GST")
      .refine((value) => Number(value) > 0, "Must be more than 0"),
    gstRatePct: z.string(),
    payeeKind: z.enum(["vendor", "other"]),
    vendorId: z.string(),
    payee: z.string().trim().max(80),
    paidFrom: z.string(),
    reference: z.string().trim().max(40),
    allocationKind: z.enum(["item-cost", "invoice", "shipment", "overhead"]),
    targetId: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.payeeKind === "vendor" && !values.vendorId) ctx.addIssue({ code: "custom", path: ["vendorId"], message: "Pick the vendor" });
    if (values.payeeKind === "other" && !values.payee) ctx.addIssue({ code: "custom", path: ["payee"], message: "Who was paid?" });
    if (values.allocationKind !== "overhead" && !values.targetId) ctx.addIssue({ code: "custom", path: ["targetId"], message: "Pick where the cost lands" });
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
