import { z } from "zod";

const amount = z.union([z.literal(""), z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount")]);

// The loan entry dialog. Amounts stay strings while typed; fields a kind
// does not use are left blank and sent as 0.
export const loanEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
  principal: amount,
  interest: amount,
  tds: amount,
  charges: amount,
  bankAccountId: z.string(),
  reference: z.string().trim().max(40, "Too long"),
  voucherNumber: z.string().trim().max(30, "Too long"),
});

export type LoanEntryValues = z.infer<typeof loanEntrySchema>;
