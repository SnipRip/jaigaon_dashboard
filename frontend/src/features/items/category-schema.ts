import { z } from "zod";

// Used for both levels. A blank default means "inherit": a sub-category falls
// back to its category, a category to nothing.
export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(60),
  // Items take this HSN as a suggestion, and an item's HSN is 4, 6 or 8 digits.
  hsn: z.union([z.literal(""), z.string().regex(/^(\d{4}|\d{6}|\d{8})$/, "HSN is 4, 6 or 8 digits")]),
  gstRatePct: z.string(),
  unit: z.string(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
