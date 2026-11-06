import { z } from "zod";

const amount = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount");
const optionalAmount = z.union([z.literal(""), amount]);

/** One row of "apply to": the document, what is open on it, what to apply (blank = nothing). */
export const allocationRow = z.object({
  kind: z.enum(["INVOICE", "BILL", "EXPENSE", "OPENING", "ADVANCE"]),
  documentId: z.string(),
  balance: z.number(),
  amount: optionalAmount,
});

/** Each row within its balance; the total within what is free to apply. */
function checkRows(rows: z.infer<typeof allocationRow>[], free: number, ctx: z.RefinementCtx, freePath: string) {
  let applied = 0;
  rows.forEach((row, index) => {
    const value = Number(row.amount) || 0;
    applied += value;
    if (value > row.balance + 0.005) ctx.addIssue({ code: "custom", path: ["allocations", index, "amount"], message: "More than the balance" });
  });
  if (applied > free + 0.005) ctx.addIssue({ code: "custom", path: [freePath], message: "Less than the total applied below" });
}

export const settlementSchema = z
  .object({
    partyId: z.string().min(1, "Pick who paid or who is paid"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
    amount: amount,
    mode: z.enum(["BANK_TRANSFER", "CHEQUE", "UPI", "CASH"]),
    accountId: z.string().min(1, "Pick the account"),
    reference: z.string().trim().max(60),
    tds: optionalAmount,
    brcNumber: z.string().trim().max(40),
    brcDate: z.string(),
    notes: z.string().max(300),
    allocations: z.array(allocationRow),
  })
  .superRefine((values, ctx) => {
    const free = (Number(values.amount) || 0) + (Number(values.tds) || 0);
    if (free <= 0) ctx.addIssue({ code: "custom", path: ["amount"], message: "Must be more than 0" });
    checkRows(values.allocations, free, ctx, "amount");
    if (values.brcNumber && !values.brcDate) ctx.addIssue({ code: "custom", path: ["brcDate"], message: "Pick the BRC date" });
    if (!values.brcNumber && values.brcDate) ctx.addIssue({ code: "custom", path: ["brcNumber"], message: "Enter the BRC number" });
  });

export type SettlementFormValues = z.infer<typeof settlementSchema>;

/** Applying what a receipt or payment kept as an advance. */
export const applyAdvanceSchema = (free: number) =>
  z.object({ allocations: z.array(allocationRow), free: z.number() }).superRefine((values, ctx) => {
    checkRows(values.allocations, free, ctx, "free");
    if (!values.allocations.some((row) => Number(row.amount) > 0)) ctx.addIssue({ code: "custom", path: ["free"], message: "Enter what to apply" });
  });

export type ApplyAdvanceValues = { allocations: z.infer<typeof allocationRow>[]; free: number };
