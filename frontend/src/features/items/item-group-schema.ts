import { z } from "zod";

export const itemGroupSchema = z.object({
  name: z.string().trim().min(2, "Enter the group name").max(100),
  skuPrefix: z
    .string()
    .trim()
    .min(2, "Enter a SKU prefix")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, digits and dashes only"),
  categoryId: z.string().min(1, "Pick a category"),
  subCategoryId: z.string(),
  brand: z.string(),
  description: z.string().max(500),
  hsnOverride: z.union([z.literal(""), z.string().regex(/^\d{4,8}$/, "HSN is 4 to 8 digits")]),
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
export const variantRowSchema = z.object({
  sku: z.string().trim().min(2, "Enter a SKU").regex(/^[A-Za-z0-9-]+$/, "Letters, digits, dashes"),
  costPrice: price,
  sellingPrice: price,
  openingStock: quantity,
  reorderLevel: quantity,
});

export type VariantRow = z.infer<typeof variantRowSchema>;
