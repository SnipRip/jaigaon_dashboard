import { z } from "zod";

const decimal = (decimals: number, message: string) => z.string().trim().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`), message);
export const isoDate = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

/** One item line on a transfer or adjustment. `rate` is used only for stock added. */
export const stockLineSchema = z.object({
  itemId: z.string().min(1, "Pick an item"),
  quantity: decimal(3, "Enter the quantity").refine((value) => Number(value) > 0, "More than 0"),
  rate: z.union([z.literal(""), decimal(4, "Enter the rate per unit")]),
});

export type StockLineValues = z.infer<typeof stockLineSchema>;

export const emptyStockLine: StockLineValues = { itemId: "", quantity: "", rate: "" };

/** Each item once: the backend draws an item's stock in one go. */
export function repeatedItemIssue(lines: StockLineValues[], ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  lines.forEach((line, index) => {
    if (!line.itemId) return;
    if (seen.has(line.itemId)) ctx.addIssue({ code: "custom", path: ["lines", index, "itemId"], message: "Already on another line" });
    seen.add(line.itemId);
  });
}
