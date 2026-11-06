import { z } from "zod";
import { allocationRow } from "./settlement-schema";

/**
 * A refund of advances: whose advances (customers' receipts or our payments
 * to vendors), the party, how the money moves, and what of each advance goes
 * back. The amount is the total of the rows, so there is no amount box.
 */
export const refundSchema = z
  .object({
    kept: z.enum(["RECEIPT", "PAYMENT"]),
    partyId: z.string().min(1, "Pick the party"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
    mode: z.enum(["BANK_TRANSFER", "CHEQUE", "UPI", "CASH"]),
    accountId: z.string().min(1, "Pick the account"),
    reference: z.string().trim().max(60),
    notes: z.string().max(300),
    allocations: z.array(allocationRow),
  })
  .superRefine((values, ctx) => {
    let total = 0;
    values.allocations.forEach((row, index) => {
      const value = Number(row.amount) || 0;
      total += value;
      if (value > row.balance + 0.005) ctx.addIssue({ code: "custom", path: ["allocations", index, "amount"], message: "More than the advance left" });
    });
    if (values.partyId && total <= 0) ctx.addIssue({ code: "custom", path: ["allocations"], message: "Enter what to refund on at least one advance" });
  });

export type RefundFormValues = z.infer<typeof refundSchema>;
