// Every report the business reads (SOW 16), built from the sample records.
// Each becomes one backend query; the columns stay the same.
import { documentType } from "@/features/invoices/dispatch-documents";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { stateName } from "@/features/gst/indian-states";
import { expenses } from "@/features/expenses/sample-data";
import { hsnSummary, invoiceTax, invoiceTotals, lineTotals } from "@/features/invoices/invoice-rules";
import { invoices } from "@/features/invoices/sample-data";
import { resolveItemDefaults, stockStatus } from "@/features/items/item-rules";
import { categories, itemGroups, items } from "@/features/items/sample-data";
import { hsnCodes } from "@/features/hsn/sample-data";
import { expenseHeads, units } from "@/features/masters/sample-data";
import { parties } from "@/features/parties/sample-data";
import { payable, receivable } from "@/features/payments/payment-data";
import { buildProfitReport } from "@/features/profit/profit-report";
import { viewBill } from "@/features/purchases/bill-view";
import { bills } from "@/features/purchases/sample-data";
import { quotationFigures, quotationLabel, quotationStage } from "@/features/quotations/quotation-rules";
import { quotations } from "@/features/quotations/sample-data";
import { stageLabel } from "@/features/shipments/shipment-rules";
import { shipments } from "@/features/shipments/sample-data";
import type { Report } from "./types";

const state = COMPANY_TAX_PROFILE.stateCode;
const catalog = { categories, groups: itemGroups, items, hsnCodes };
const partyOf = (id: string) => parties.find((party) => party.id === id)!;
const issued = invoices.filter((invoice) => invoice.status === "issued");
const invoiceFigures = (invoice: (typeof invoices)[number]) => {
  const tax = invoiceTax(state, invoice, partyOf(invoice.partyId));
  return { tax, totals: invoiceTotals(invoice.lines, tax.regime) };
};
const billViews = bills.filter((bill) => bill.status === "open").map((bill) => viewBill(bill, parties, state, null));
const profit = buildProfitReport(invoices, shipments, items, expenses, parties);

const salesRegister: Report = {
  id: "sales-register",
  title: "Sales register",
  group: "Sales",
  description: "Every issued invoice with its taxable value and GST heads.",
  dateKey: "date",
  partyKey: "customer",
  columns: [
    { key: "date", label: "Date", kind: "date" },
    { key: "number", label: "Invoice", kind: "text" },
    { key: "customer", label: "Customer", kind: "text" },
    { key: "gstin", label: "GSTIN / country", kind: "text" },
    { key: "taxable", label: "Taxable", kind: "money" },
    { key: "cgst", label: "CGST", kind: "money" },
    { key: "sgst", label: "SGST", kind: "money" },
    { key: "igst", label: "IGST", kind: "money" },
    { key: "total", label: "Total", kind: "money" },
  ],
  rows: issued.map((invoice) => {
    const { totals } = invoiceFigures(invoice);
    const party = partyOf(invoice.partyId);
    return {
      date: invoice.date,
      number: invoice.number,
      customer: party.displayName,
      gstin: party.gstin ?? invoice.destinationCountry ?? "Unregistered",
      taxable: totals.taxable,
      cgst: totals.taxByName.CGST ?? 0,
      sgst: totals.taxByName.SGST ?? 0,
      igst: totals.taxByName.IGST ?? 0,
      total: totals.grandTotal,
      href: `/invoices/${invoice.id}`,
    };
  }),
};

const purchaseRegister: Report = {
  id: "purchase-register",
  title: "Purchase register",
  group: "Purchases",
  description: "Every vendor bill with GST, input credit and reverse charge.",
  dateKey: "date",
  partyKey: "vendor",
  columns: [
    { key: "date", label: "Date", kind: "date" },
    { key: "reference", label: "Bill", kind: "text" },
    { key: "vendorBill", label: "Vendor's no.", kind: "text" },
    { key: "vendor", label: "Vendor", kind: "text" },
    { key: "taxable", label: "Taxable", kind: "money" },
    { key: "tax", label: "GST", kind: "money" },
    { key: "itc", label: "Input credit", kind: "money" },
    { key: "rcm", label: "Reverse charge", kind: "money" },
    { key: "payable", label: "Payable", kind: "money" },
  ],
  rows: billViews.map(({ bill, vendor, totals }) => ({
    date: bill.date,
    reference: bill.reference,
    vendorBill: bill.vendorBillNumber,
    vendor: vendor.displayName,
    taxable: totals.taxable,
    tax: totals.reverseCharge ? 0 : totals.tax,
    itc: totals.itcClaimable,
    rcm: totals.reverseCharge ? totals.tax : 0,
    payable: totals.payable,
    href: `/purchases/${bill.id}`,
  })),
};

const sumBy = <T>(rows: T[], pick: (row: T) => number) => Math.round(rows.reduce((sum, row) => sum + pick(row), 0) * 100) / 100;
const outward = issued.map((invoice) => invoiceFigures(invoice).totals);
const outputTax = (name: "CGST" | "SGST" | "IGST") => sumBy(outward, (totals) => totals.taxByName[name] ?? 0);
const inputTax = (name: "CGST" | "SGST" | "IGST", reverse: boolean) =>
  sumBy(
    billViews.filter((view) => view.totals.reverseCharge === reverse),
    (view) => (view.totals.itcClaimable ? (view.totals.taxByName[name] ?? 0) * (view.totals.itcClaimable / view.totals.tax) : 0),
  );

const gstSummary: Report = {
  id: "gst-summary",
  title: "GST summary (3B view)",
  group: "GST",
  description: "Output tax on sales, input credit on purchases, reverse charge and what is left to pay, by head.",
  columns: [
    { key: "line", label: "", kind: "text" },
    { key: "cgst", label: "CGST", kind: "money", total: false },
    { key: "sgst", label: "SGST", kind: "money", total: false },
    { key: "igst", label: "IGST", kind: "money", total: false },
  ],
  rows: [
    { line: "Output tax on sales", cgst: outputTax("CGST"), sgst: outputTax("SGST"), igst: outputTax("IGST") },
    { line: "Reverse charge payable (paid in cash)", cgst: inputTax("CGST", true), sgst: inputTax("SGST", true), igst: inputTax("IGST", true) },
    { line: "Input credit on bills", cgst: inputTax("CGST", false), sgst: inputTax("SGST", false), igst: inputTax("IGST", false) },
    {
      line: "Net from the credit ledger, before set-off rules",
      cgst: Math.max(outputTax("CGST") - inputTax("CGST", false), 0),
      sgst: Math.max(outputTax("SGST") - inputTax("SGST", false), 0),
      igst: Math.max(outputTax("IGST") - inputTax("IGST", false), 0),
    },
    {
      line: "Exports under LUT (zero-rated value)",
      cgst: 0,
      sgst: 0,
      igst: sumBy(
        issued.filter((invoice) => invoiceFigures(invoice).tax.regime === "export-lut"),
        (invoice) => invoiceFigures(invoice).totals.taxable,
      ),
    },
  ],
};

const hsnReport: Report = {
  id: "hsn-summary",
  title: "HSN summary of sales",
  group: "GST",
  description: "Outward supplies by HSN and rate, as GSTR-1 table 12 asks.",
  columns: [
    { key: "hsn", label: "HSN", kind: "text" },
    { key: "uqc", label: "UQC", kind: "text" },
    { key: "quantity", label: "Quantity", kind: "quantity" },
    { key: "rate", label: "Rate", kind: "percent" },
    { key: "taxable", label: "Taxable", kind: "money" },
    { key: "tax", label: "Tax", kind: "money" },
  ],
  rows: Object.values(
    issued.reduce<Record<string, { hsn: string; uqc: string; quantity: number; rate: number; taxable: number; tax: number }>>((rows, invoice) => {
      const { tax } = invoiceFigures(invoice);
      for (const summary of hsnSummary(invoice.lines, tax.regime)) {
        const lines = invoice.lines.filter((line) => line.hsn === summary.hsn && line.gstRatePct === summary.ratePct);
        const key = `${summary.hsn}-${summary.ratePct}`;
        const unit = lines[0]?.unit;
        const row = rows[key] ?? { hsn: summary.hsn, uqc: units.find((candidate) => candidate.symbol === unit)?.uqc ?? "OTH", quantity: 0, rate: summary.ratePct, taxable: 0, tax: 0 };
        row.quantity += lines.reduce((sum, line) => sum + line.quantity, 0);
        row.taxable = Math.round((row.taxable + summary.taxable) * 100) / 100;
        row.tax = Math.round((row.tax + summary.tax) * 100) / 100;
        rows[key] = row;
      }
      return rows;
    }, {}),
  ),
};

const stockSummary: Report = {
  id: "stock-summary",
  title: "Stock summary",
  group: "Stock",
  description: "Every item's stock, value at cost and reorder status.",
  columns: [
    { key: "sku", label: "SKU", kind: "text" },
    { key: "item", label: "Item", kind: "text" },
    { key: "stock", label: "In stock", kind: "quantity", total: false },
    { key: "unit", label: "Unit", kind: "text" },
    { key: "cost", label: "Cost", kind: "money", total: false },
    { key: "value", label: "Value", kind: "money" },
    { key: "status", label: "Status", kind: "text" },
  ],
  rows: items.map((item) => ({
    sku: item.sku,
    item: item.name,
    stock: item.stock,
    unit: resolveItemDefaults(catalog, item).unit.value ?? "",
    cost: item.costPrice,
    value: Math.round(item.stock * item.costPrice),
    status: { out: "Out of stock", low: "Reorder", ok: "OK" }[stockStatus(item)],
    href: `/items/${item.id}`,
  })),
};

const quotationReport: Report = {
  id: "quotations",
  title: "Quotation report",
  group: "Sales",
  description: "Quotations with value, margin and outcome.",
  dateKey: "date",
  partyKey: "customer",
  columns: [
    { key: "date", label: "Date", kind: "date" },
    { key: "number", label: "Quotation", kind: "text" },
    { key: "customer", label: "Customer", kind: "text" },
    { key: "value", label: "Value", kind: "money" },
    { key: "margin", label: "Margin", kind: "percent" },
    { key: "stage", label: "Stage", kind: "text" },
  ],
  rows: quotations.map((quotation) => {
    const party = partyOf(quotation.partyId);
    const figures = quotationFigures(quotation, party, state, items);
    return {
      date: quotation.date,
      number: quotationLabel(quotation),
      customer: party.displayName,
      value: figures.totals.grandTotal,
      margin: Math.round(figures.profit.marginPct * 10) / 10,
      stage: quotationStage(quotation, null),
      href: `/quotations/${quotation.id}`,
    };
  }),
};

const expenseReport: Report = {
  id: "expenses",
  title: "Expenses by head",
  group: "Money",
  description: "What was spent under each head, before GST, and where it landed.",
  columns: [
    { key: "head", label: "Head", kind: "text" },
    { key: "count", label: "Entries", kind: "quantity" },
    { key: "amount", label: "Before GST", kind: "money" },
    { key: "gst", label: "GST", kind: "money" },
  ],
  rows: expenseHeads
    .map((head) => {
      const entries = expenses.filter((expense) => expense.headId === head.id);
      return {
        head: head.name,
        count: entries.length,
        amount: sumBy(entries, (expense) => expense.amount),
        gst: sumBy(entries, (expense) => (expense.amount * expense.gstRatePct) / 100),
      };
    })
    .filter((row) => row.count > 0),
};

const outstandingReport: Report = {
  id: "outstanding",
  title: "Outstanding by party",
  group: "Money",
  description: "What each customer owes and what we owe each vendor.",
  partyKey: "party",
  columns: [
    { key: "party", label: "Party", kind: "text" },
    { key: "side", label: "Side", kind: "text" },
    { key: "documents", label: "Open documents", kind: "quantity" },
    { key: "balance", label: "Balance", kind: "money", total: false },
  ],
  rows: [...receivable, ...payable]
    .filter((document) => document.balance > 0)
    .reduce<{ party: string; side: string; documents: number; balance: number; href: string }[]>((rows, document) => {
      const side = document.direction === "in" ? "Owes us" : "We owe";
      const row = rows.find((candidate) => candidate.href === `/payments/ledger/${document.partyId}` && candidate.side === side);
      if (row) {
        row.documents += 1;
        row.balance += document.balance;
      } else rows.push({ party: partyOf(document.partyId).displayName, side, documents: 1, balance: document.balance, href: `/payments/ledger/${document.partyId}` });
      return rows;
    }, []),
};

const shipmentReport: Report = {
  id: "shipments",
  title: "Shipment report",
  group: "Export",
  description: "Each truck to Bhutan with its stage, value and profit.",
  dateKey: "date",
  partyKey: "buyer",
  columns: [
    { key: "date", label: "Date", kind: "date" },
    { key: "number", label: "Shipment", kind: "text" },
    { key: "buyer", label: "Buyer", kind: "text" },
    { key: "vehicle", label: "Vehicle", kind: "text" },
    { key: "stage", label: "Stage", kind: "text" },
    { key: "sales", label: "Sales", kind: "money" },
    { key: "expenses", label: "Expenses", kind: "money" },
    { key: "profit", label: "Profit", kind: "money" },
  ],
  rows: shipments.map((shipment) => {
    const row = profit.byShipment.find((candidate) => candidate.key === shipment.id);
    return {
      date: shipment.date,
      number: shipment.number,
      buyer: partyOf(shipment.customerId).displayName,
      vehicle: shipment.vehicleNumber,
      stage: stageLabel(shipment.status),
      sales: row?.sales ?? 0,
      expenses: row?.expenses ?? 0,
      profit: row?.profit ?? 0,
      href: `/shipments/${shipment.id}`,
    };
  }),
};

const exportRegister: Report = {
  id: "export-register",
  title: "Export register",
  group: "Export",
  description: "Every export invoice with route, LUT, shipping bill, LEO and BRC: the papers the GST refund and FEMA ask for.",
  dateKey: "date",
  partyKey: "buyer",
  columns: [
    { key: "date", label: "Date", kind: "date" },
    { key: "number", label: "Invoice", kind: "text" },
    { key: "buyer", label: "Buyer", kind: "text" },
    { key: "route", label: "Route", kind: "text" },
    { key: "value", label: "Value", kind: "money" },
    { key: "shippingBill", label: documentType("shipping-bill").name, kind: "text" },
    { key: "leo", label: "LEO", kind: "text" },
    { key: "brc", label: "BRC", kind: "text" },
  ],
  rows: issued
    .filter((invoice) => invoice.kind === "export")
    .map((invoice) => ({
      date: invoice.date,
      number: invoice.number,
      buyer: partyOf(invoice.partyId).displayName,
      route: invoice.exportRoute === "igst" ? "IGST paid" : `LUT ${invoice.lutArn ?? ""}`.trim(),
      value: invoice.lines.reduce((sum, line) => sum + lineTotals(line, "no-gst").taxable, 0),
      shippingBill: invoice.documents["shipping-bill"]?.number ?? "Pending",
      leo: invoice.documents.leo?.number ?? "Pending",
      brc: invoice.documents.brc?.number ?? "Pending",
      href: `/invoices/${invoice.id}`,
    })),
};

const placeOfSupplyReport: Report = {
  id: "sales-by-state",
  title: "Sales by place of supply",
  group: "GST",
  description: "Taxable sales by state (and exports), for the state-wise split in returns.",
  columns: [
    { key: "place", label: "Place of supply", kind: "text" },
    { key: "invoices", label: "Invoices", kind: "quantity" },
    { key: "taxable", label: "Taxable", kind: "money" },
  ],
  rows: Object.values(
    issued.reduce<Record<string, { place: string; invoices: number; taxable: number }>>((rows, invoice) => {
      const place = invoice.kind === "export" ? `Export · ${invoice.destinationCountry ?? "Bhutan"}` : (stateName(invoice.placeOfSupply) ?? "Unknown");
      const row = rows[place] ?? { place, invoices: 0, taxable: 0 };
      row.invoices += 1;
      row.taxable = Math.round((row.taxable + invoiceFigures(invoice).totals.taxable) * 100) / 100;
      rows[place] = row;
      return rows;
    }, {}),
  ),
};

export const REPORTS: Report[] = [
  salesRegister,
  quotationReport,
  purchaseRegister,
  gstSummary,
  hsnReport,
  placeOfSupplyReport,
  stockSummary,
  expenseReport,
  outstandingReport,
  shipmentReport,
  exportRegister,
];

export const findReport = (id: string) => REPORTS.find((report) => report.id === id);
