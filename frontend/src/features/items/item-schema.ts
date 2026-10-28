import { z } from "zod";

// Numbers are kept as text while typing (an empty field stays empty instead
// of becoming 0) and checked here.
const amount = (label: string) =>
  z.string().trim().regex(/^\d+(\.\d{1,2})?$/, `Enter the ${label} in rupees, for example 60.50`);
const optionalAmount = (label: string) => z.union([z.literal(""), amount(label)]);
const quantity = (label: string) =>
  z.string().trim().regex(/^\d+(\.\d{1,3})?$/, `Enter the ${label} as a number, for example 25`);
const optionalQuantity = (label: string) => z.union([z.literal(""), quantity(label)]);

export const itemSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the item name").max(120),
    sku: z
      .string()
      .trim()
      .min(2, "Enter a SKU or code")
      .max(40)
      .regex(/^[A-Za-z0-9-]+$/, "Use letters, digits and dashes only"),
    categoryId: z.string().min(1, "Pick a category"),
    subCategoryId: z.string(),
    brand: z.string(),
    description: z.string().max(500),
    // Every item carries its own HSN (confirmed 28 Oct 2026: it varies item to item).
    hsn: z.string().trim().regex(/^(\d{4}|\d{6}|\d{8})$/, "HSN is 4, 6 or 8 digits; exports need all 8"),
    gstOverride: z.string(),
    unitOverride: z.string(),
    alternateUnits: z.array(
      z.object({
        unit: z.string().min(1, "Pick a unit"),
        quantity: quantity("conversion"),
        /** true: "1 base unit = quantity of this unit"; false: "1 of this unit = quantity base units". */
        perBase: z.boolean(),
      }),
    ),
    weightKg: optionalQuantity("weight"),
    mrp: optionalAmount("MRP"),
    sellingPrice: amount("selling price"),
    minSellingPrice: optionalAmount("minimum selling price"),
    costPrice: amount("cost price"),
    preferredSupplier: z.string().max(120),
    openingStock: z.array(z.object({ godown: z.string(), quantity: optionalQuantity("opening stock") })),
    reorderLevel: optionalQuantity("reorder level"),
  })
  .refine((values) => !values.minSellingPrice || Number(values.sellingPrice) >= Number(values.minSellingPrice), {
    path: ["sellingPrice"],
    message: "Selling price is below the minimum selling price",
  })
  .refine((values) => !values.mrp || Number(values.sellingPrice) <= Number(values.mrp), {
    path: ["sellingPrice"],
    message: "Selling price is above the MRP",
  });

export type ItemFormValues = z.infer<typeof itemSchema>;
