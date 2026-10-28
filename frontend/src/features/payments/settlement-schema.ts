import { z } from "zod";

const amount = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount");
const optionalAmount = z.union([z.literal(""), amount]);

export const settlementSchema = z
  .object({
    partyId: z.string().min(1, "Pick who paid or who is paid"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
    amount: amount.refine((value) => Number(value) > 0, "Must be more than 0"),
    mode: z.enum(["bank-transfer", "cheque", "upi", "cash"]),
    accountId: z.string().min(1, "Pick the account"),
    reference: z.string().trim().max(60),
    tds: optionalAmount,
    brcNumber: z.string().trim().max(40),
    brcDate: z.string(),
    notes: z.string().max(300),
    allocations: z.array(z.object({ documentId: z.string(), balance: z.number(), amount: optionalAmount })),
  })
  .superRefine((values, ctx) => {
    let applied = 0;
    values.allocations.forEach((allocation, index) => {
      const value = Number(allocation.amount) || 0;
      applied += value;
      if (value > allocation.balance + 0.005) ctx.addIssue({ code: "custom", path: ["allocations", index, "amount"], message: "More than the balance" });
    });
    const available = (Number(values.amount) || 0) + (Number(values.tds) || 0);
    if (applied > available + 0.005) ctx.addIssue({ code: "custom", path: ["amount"], message: "Less than the total applied below" });
    if (values.brcNumber && !values.brcDate) ctx.addIssue({ code: "custom", path: ["brcDate"], message: "Pick the BRC date" });
  });

export type SettlementFormValues = z.infer<typeof settlementSchema>;
