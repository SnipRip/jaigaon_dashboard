import { z } from "zod";

export const hsnSchema = z
  .object({
    kind: z.enum(["HSN", "SAC"]),
    code: z.string().trim(),
    description: z.string().trim().min(3, "Describe what the code covers").max(200),
    ratePct: z.string().min(1, "Pick the GST rate"),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date the rate applies from"),
    reverseCharge: z.boolean(),
    notes: z.string().max(300),
  })
  // HSN for goods: 4, 6 or 8 digits (8 on shipping bills). SAC for services: 6 digits starting 99.
  .refine((values) => (values.kind === "HSN" ? /^(\d{4}|\d{6}|\d{8})$/ : /^99\d{2}(\d{2})?$/).test(values.code), {
    path: ["code"],
    message: "HSN is 4, 6 or 8 digits; SAC is 4 or 6 digits starting with 99",
  });

export type HsnFormValues = z.infer<typeof hsnSchema>;
