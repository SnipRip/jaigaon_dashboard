// Invoices and bills as documents money is settled against: total, what is
// settled, what is left, and when it falls due.
import { invoiceTax, invoiceTotals } from "@/features/invoices/invoice-rules";
import type { Invoice } from "@/features/invoices/types";
import type { Party } from "@/features/parties/types";
import { viewBill } from "@/features/purchases/bill-view";
import { isMsme } from "@/features/purchases/purchase-rules";
import type { Bill } from "@/features/purchases/types";
import { addDays } from "@/lib/dates";
import { settledAgainst } from "./payment-rules";
import type { OpenDocument, Settlement } from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

/** Issued invoices; settled from the receipts applied to each. */
export function invoiceDocuments(invoices: Invoice[], parties: Party[], receipts: Settlement[], companyState: string): OpenDocument[] {
  return invoices
    .filter((invoice) => invoice.status === "issued")
    .map((invoice) => {
      const party = parties.find((candidate) => candidate.id === invoice.partyId)!;
      const total = invoiceTotals(invoice.lines, invoiceTax(companyState, invoice, party).regime).grandTotal;
      const settled = settledAgainst(receipts, invoice.id);
      return {
        id: invoice.id,
        direction: "in",
        number: invoice.number,
        date: invoice.date,
        dueDate: addDays(invoice.date, party.creditDays),
        partyId: party.id,
        total,
        settled,
        balance: money(Math.max(total - settled, 0)),
        href: `/invoices/${invoice.id}`,
        flag: invoice.kind === "export" ? "export" : undefined,
      };
    });
}

/** Open vendor bills; settled is the bill's paid amount. */
export function billDocuments(bills: Bill[], parties: Party[], companyState: string): OpenDocument[] {
  return bills
    .filter((bill) => bill.status === "open")
    .map((bill) => {
      const view = viewBill(bill, parties, companyState, null);
      return {
        id: bill.id,
        direction: "out",
        number: `${bill.reference} (${bill.vendorBillNumber})`,
        date: bill.date,
        dueDate: bill.dueDate,
        partyId: bill.vendorId,
        total: view.totals.payable,
        settled: bill.paid,
        balance: money(Math.max(view.totals.payable - bill.paid, 0)),
        href: `/purchases/${bill.id}`,
        flag: isMsme(view.vendor) ? "msme" : undefined,
      };
    });
}
