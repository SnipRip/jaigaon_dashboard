// Actual profit (SOW 15): sales value less purchase cost less the expenses
// allocated to the sale. All figures before GST: GST never reaches profit
// (context.md, gap 2). Purchase cost is the item's cost price today; it
// becomes the FIFO landed rate once stock moves are recorded.
import { expensesFor, sumAmount } from "@/features/expenses/expense-rules";
import type { Expense } from "@/features/expenses/types";
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

export const addProfits = (profits: Profit[]) =>
  profitOf(
    profits.reduce((sum, row) => sum + row.sales, 0),
    profits.reduce((sum, row) => sum + row.cost, 0),
    profits.reduce((sum, row) => sum + row.expenses, 0),
  );

/** Value of an invoice line before GST. */
export const lineSales = (line: Invoice["lines"][number]) => lineTotals(line, "no-gst").taxable;

export const lineCost = (line: Invoice["lines"][number], items: Item[]) =>
  money(line.quantity * (items.find((item) => item.id === line.itemId)?.costPrice ?? 0));

export function invoiceProfit(invoice: Invoice, items: Item[], expenses: Expense[]): Profit {
  return profitOf(
    invoice.lines.reduce((sum, line) => sum + lineSales(line), 0),
    invoice.lines.reduce((sum, line) => sum + lineCost(line, items), 0),
    sumAmount(expensesFor(expenses, "invoice", invoice.id)),
  );
}

/** A shipment's invoices plus the expenses booked on the shipment itself. */
export function shipmentProfit(shipmentId: string, shipmentInvoices: Invoice[], items: Item[], expenses: Expense[]): Profit {
  const invoicesProfit = addProfits(shipmentInvoices.map((invoice) => invoiceProfit(invoice, items, expenses)));
  return profitOf(invoicesProfit.sales, invoicesProfit.cost, invoicesProfit.expenses + sumAmount(expensesFor(expenses, "shipment", shipmentId)));
}
