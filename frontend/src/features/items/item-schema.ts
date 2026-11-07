import { z } from "zod";
import { SKU_MAX, SKU_MESSAGE, SKU_PATTERN } from "./sku-rules";

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
    // Optional (client, 7 Nov 2026); the Generate button fills one in.
    sku: z.union([z.literal(""), z.string().trim().min(2, "A SKU has at least 2 characters").max(SKU_MAX).regex(SKU_PATTERN, SKU_MESSAGE)]),
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
    /** GST reporting unit (Tally's reporting UQC): "" = the base unit. */
    reportingUnit: z.string(),
    weightKg: optionalQuantity("weight"),
    mrp: optionalAmount("MRP"),
    preferredSupplier: z.string().max(120),
    openingStock: z.array(z.object({ godown: z.string(), quantity: optionalQuantity("opening stock") })),
    // The item's cost is never typed: each batch has its own landed rate. The
    // opening stock is the first batch, so it needs one.
    openingRate: optionalAmount("opening rate"),
    reorderLevel: optionalQuantity("reorder level"),
  })
  .refine((values) => values.openingRate !== "" || values.openingStock.every((row) => !Number(row.quantity)), {
    path: ["openingRate"],
    message: "Enter what the opening stock cost per unit",
  });

export type ItemFormValues = z.infer<typeof itemSchema>;
