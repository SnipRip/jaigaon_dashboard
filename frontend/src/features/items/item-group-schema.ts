import { z } from "zod";
import { SKU_MAX, SKU_MESSAGE, SKU_PATTERN } from "./sku-rules";

export const itemGroupSchema = z.object({
  name: z.string().trim().min(2, "Enter the group name").max(100),
  // Optional, like SKUs; the SKU generator can start every variant with it.
  skuPrefix: z.union([z.literal(""), z.string().trim().min(2, "A prefix has at least 2 characters").max(20).regex(SKU_PATTERN, SKU_MESSAGE)]),
  categoryId: z.string().min(1, "Pick a category"),
  subCategoryId: z.string(),
  brand: z.string(),
  description: z.string().max(500),
  // Variants take this HSN, and an item's HSN is 4, 6 or 8 digits.
  hsnOverride: z.union([z.literal(""), z.string().regex(/^(\d{4}|\d{6}|\d{8})$/, "HSN is 4, 6 or 8 digits")]),
  gstOverride: z.string(),
  unitOverride: z.string(),
  attributes: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Name this attribute, for example Size"),
        options: z.array(z.string()).min(1, "Add at least one option"),
      }),
    )
    .min(1, "Add at least one attribute")
    .max(3, "Up to three attributes"),
});

export type ItemGroupFormValues = z.infer<typeof itemGroupSchema>;

const price = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a price");
const quantity = z.union([z.literal(""), z.string().trim().regex(/^\d+(\.\d{1,3})?$/, "Enter a number")]);

/** One generated variant, as edited in the variants table. */
// No cost column: an item's cost comes from its batches. A new variant's
// opening stock is its first batch, so it needs the rate it cost.
export const variantRowSchema = z
  .object({
    sku: z.union([z.literal(""), z.string().trim().min(2, "At least 2 characters").max(SKU_MAX).regex(SKU_PATTERN, "Letters, digits, - / .")]),
    openingStock: quantity,
    openingRate: z.union([z.literal(""), price]),
    reorderLevel: quantity,
  })
  .refine((row) => row.openingRate !== "" || !Number(row.openingStock), {
    path: ["openingRate"],
    message: "Enter the opening rate",
  });

export type VariantRow = z.infer<typeof variantRowSchema>;
