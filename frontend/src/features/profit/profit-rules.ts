// Profit on a quotation or an invoice in the browser: value before GST less
// cost (GST never reaches profit, context.md gap 2). The profit report itself
// is worked out on the server (backend/src/profit).
import { lineTotals } from "@/features/invoices/invoice-rules";
import type { Invoice } from "@/features/invoices/types";
import type { Item } from "@/features/items/types";

const money = (value: number) => Math.round(value * 100) / 100;

export interface Profit {
  sales: number;
  cost: number;
  expenses: number;
  profit: number;
  marginPct: number;
}

export function profitOf(sales: number, cost: number, expenses: number): Profit {
  const profit = money(sales - cost - expenses);
  return { sales: money(sales), cost: money(cost), expenses: money(expenses), profit, marginPct: sales ? (profit / sales) * 100 : 0 };
}

/** Value of an invoice line before GST. */
export const lineSales = (line: Invoice["lines"][number]) => lineTotals(line, "no-gst").taxable;

// Stock cost until invoices consume batches FIFO and keep the cost of the
// batches they drew from.
export const lineCost = (line: Invoice["lines"][number], items: Item[]) =>
  money(line.quantity * (items.find((item) => item.id === line.itemId)?.stockCost ?? 0));
