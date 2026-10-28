// Actual profit cut four ways (SOW 14): by invoice, shipment, customer and
// item. Expenses booked on a shipment are shared over its invoices by sales
// value, and an invoice's expenses over its lines the same way, so every
// view adds up to the same total. Overheads are kept apart: they reduce net
// profit but belong to no sale.
import { expensesFor, sumAmount } from "@/features/expenses/expense-rules";
import type { Expense } from "@/features/expenses/types";
import type { Invoice } from "@/features/invoices/types";
import type { Item } from "@/features/items/types";
import type { Party } from "@/features/parties/types";
import type { Shipment } from "@/features/shipments/types";
import { addProfits, lineCost, lineSales, profitOf, type Profit } from "./profit-rules";

export interface ProfitRow extends Profit {
  key: string;
  label: string;
  detail?: string;
  href?: string;
}

const sales = (invoice: Invoice) => invoice.lines.reduce((sum, line) => sum + lineSales(line), 0);

export function buildProfitReport(invoices: Invoice[], shipments: Shipment[], items: Item[], expenses: Expense[], parties: Party[]) {
  const sold = invoices.filter((invoice) => invoice.status === "issued");
  const partyName = (id: string) => parties.find((party) => party.id === id)?.displayName ?? id;

  /** Expenses on the invoice itself plus its share of its shipment's. */
  const invoiceExpenses = (invoice: Invoice) => {
    const shipment = shipments.find((candidate) => candidate.invoiceIds.includes(invoice.id));
    let shared = 0;
    if (shipment) {
      const siblings = sold.filter((candidate) => shipment.invoiceIds.includes(candidate.id));
      const total = siblings.reduce((sum, candidate) => sum + sales(candidate), 0);
      shared = total ? (sumAmount(expensesFor(expenses, "shipment", shipment.id)) * sales(invoice)) / total : 0;
    }
    return sumAmount(expensesFor(expenses, "invoice", invoice.id)) + shared;
  };

  const byInvoice: ProfitRow[] = sold.map((invoice) => ({
    key: invoice.id,
    label: invoice.number,
    detail: partyName(invoice.partyId),
    href: `/invoices/${invoice.id}`,
    ...profitOf(sales(invoice), invoice.lines.reduce((sum, line) => sum + lineCost(line, items), 0), invoiceExpenses(invoice)),
  }));

  const byShipment: ProfitRow[] = shipments
    .map((shipment) => {
      const rows = byInvoice.filter((row) => shipment.invoiceIds.includes(row.key));
      return { key: shipment.id, label: shipment.number, detail: `${shipment.vehicleNumber} to ${shipment.destination}`, href: `/shipments/${shipment.id}`, ...addProfits(rows) };
    })
    .filter((row) => row.sales > 0);

  const byCustomer: ProfitRow[] = [...new Set(sold.map((invoice) => invoice.partyId))].map((partyId) => ({
    key: partyId,
    label: partyName(partyId),
    detail: `${sold.filter((invoice) => invoice.partyId === partyId).length} invoices`,
    href: `/customers/${partyId}`,
    ...addProfits(byInvoice.filter((row) => sold.find((invoice) => invoice.id === row.key)?.partyId === partyId)),
  }));

  const itemTotals = new Map<string, Profit[]>();
  for (const invoice of sold) {
    const expensesOnInvoice = invoiceExpenses(invoice);
    const invoiceSales = sales(invoice);
    for (const line of invoice.lines) {
      const share = invoiceSales ? (expensesOnInvoice * lineSales(line)) / invoiceSales : 0;
      itemTotals.set(line.itemId, [...(itemTotals.get(line.itemId) ?? []), profitOf(lineSales(line), lineCost(line, items), share)]);
    }
  }
  const byItem: ProfitRow[] = [...itemTotals].map(([itemId, rows]) => {
    const item = items.find((candidate) => candidate.id === itemId);
    return { key: itemId, label: item?.name ?? itemId, detail: item?.sku, href: `/items/${itemId}`, ...addProfits(rows) };
  });

  const overheads = sumAmount(expenses.filter((expense) => expense.allocation.kind === "overhead"));
  return { byInvoice, byShipment, byCustomer, byItem, total: addProfits(byInvoice), overheads };
}
