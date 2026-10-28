import { z } from "zod";
import { vehicleNumberSchema } from "@/features/invoices/invoice-schema";

const isoDate = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);
const decimal = (decimals: number) => new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);

// Lines and charges are checked only for the bill kind in use: the form
// keeps both lists so switching kind does not lose what was typed.
export const billSchema = z
  .object({
    kind: z.enum(["goods", "charges"]),
    vendorId: z.string().min(1, "Pick the vendor"),
    vendorBillNumber: z.string().trim().min(1, "Enter the number printed on the vendor's bill").max(30, "At most 30 characters"),
    date: isoDate("Pick the bill date"),
    dueDate: isoDate("Pick the due date"),
    sourceOfSupply: z.string(),
    landedCostFor: z.string(),
    ewayNumber: z.union([z.literal(""), z.string().trim().regex(/^\d{12}$/, "12 digits")]),
    ewayDate: z.string(),
    vehicleNumber: vehicleNumberSchema,
    notes: z.string().max(300),
    lines: z.array(
      z.object({
        itemId: z.string(),
        quantity: z.string().trim(),
        rate: z.string().trim(),
        discountPct: z.string().trim(),
        itc: z.enum(["eligible", "ineligible"]),
      }),
    ),
    charges: z.array(
      z.object({
        head: z.enum(["freight", "loading", "unloading", "labour", "other"]),
        description: z.string().max(80),
        amount: z.string().trim(),
        gstRatePct: z.string(),
      }),
    ),
  })
  .superRefine((values, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    if (values.dueDate && values.date && values.dueDate < values.date) issue(["dueDate"], "Due date cannot be before the bill date");
    if (values.ewayNumber && !values.ewayDate) issue(["ewayDate"], "Pick the e-way bill date");

    if (values.kind === "goods") {
      if (values.lines.length === 0) issue(["lines"], "Add at least one item");
      values.lines.forEach((line, index) => {
        if (!line.itemId) issue(["lines", index, "itemId"], "Pick an item");
        if (!decimal(3).test(line.quantity) || Number(line.quantity) <= 0) issue(["lines", index, "quantity"], "Enter the quantity");
        if (!decimal(2).test(line.rate)) issue(["lines", index, "rate"], "Enter the rate");
        if (line.discountPct && (!decimal(2).test(line.discountPct) || Number(line.discountPct) >= 100)) issue(["lines", index, "discountPct"], "0 to 99");
      });
    } else if (values.charges.length === 0) {
      issue(["charges"], "Add at least one charge");
    }
    values.charges.forEach((charge, index) => {
      if (!decimal(2).test(charge.amount) || Number(charge.amount) <= 0) issue(["charges", index, "amount"], "Enter the amount");
    });
  });

export type BillFormValues = z.infer<typeof billSchema>;
