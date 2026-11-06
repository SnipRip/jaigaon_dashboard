// Every report the business reads (SOW 16): title, group, description and
// columns. The rows come from the backend (GET /reports/:id), keyed by these
// columns.
import { documentType } from "@/features/invoices/dispatch-documents";
import type { Report } from "./types";

const salesRegister: Report = {
  id: "sales-register",
  title: "Sales register",
  group: "Sales",
  description: "Every issued invoice with its taxable value and GST heads.",
  period: true,
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
};

const purchaseRegister: Report = {
  id: "purchase-register",
  title: "Purchase register",
  group: "Purchases",
  description: "Every vendor bill with GST, input credit and reverse charge.",
  period: true,
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
};

const gstSummary: Report = {
  id: "gst-summary",
  title: "GST summary (3B view)",
  group: "GST",
  description: "Output tax on sales, input credit on bills and expenses, reverse charge and what is left to pay, by head.",
  period: true,
  columns: [
    { key: "line", label: "", kind: "text" },
    { key: "cgst", label: "CGST", kind: "money", total: false },
    { key: "sgst", label: "SGST", kind: "money", total: false },
    { key: "igst", label: "IGST", kind: "money", total: false },
  ],
};

const hsnReport: Report = {
  id: "hsn-summary",
  title: "HSN summary of sales",
  group: "GST",
  description: "Outward supplies by HSN and rate, as GSTR-1 table 12 asks.",
  period: true,
  columns: [
    { key: "hsn", label: "HSN", kind: "text" },
    { key: "uqc", label: "UQC", kind: "text" },
    { key: "quantity", label: "Quantity", kind: "quantity" },
    { key: "rate", label: "Rate", kind: "percent" },
    { key: "taxable", label: "Taxable", kind: "money" },
    { key: "tax", label: "Tax", kind: "money" },
  ],
};

const stockSummary: Report = {
  id: "stock-summary",
  title: "Stock summary",
  group: "Stock",
  description: "Every item's stock, value at cost and reorder status.",
  period: false,
  columns: [
    { key: "sku", label: "SKU", kind: "text" },
    { key: "item", label: "Item", kind: "text" },
    { key: "stock", label: "In stock", kind: "quantity", total: false },
    { key: "unit", label: "Unit", kind: "text" },
    { key: "cost", label: "Stock cost", kind: "money", total: false },
    { key: "value", label: "Value", kind: "money" },
    { key: "status", label: "Status", kind: "text" },
  ],
};

const quotationReport: Report = {
  id: "quotations",
  title: "Quotation report",
  group: "Sales",
  description: "Quotations with value, margin and outcome.",
  period: true,
  partyKey: "customer",
  columns: [
    { key: "date", label: "Date", kind: "date" },
    { key: "number", label: "Quotation", kind: "text" },
    { key: "customer", label: "Customer", kind: "text" },
    { key: "value", label: "Value", kind: "money" },
    { key: "margin", label: "Margin", kind: "percent" },
    { key: "stage", label: "Stage", kind: "text" },
  ],
};

const expenseReport: Report = {
  id: "expenses",
  title: "Expenses by head",
  group: "Money",
  description: "What was spent under each head, before GST, and where it landed.",
  period: true,
  columns: [
    { key: "head", label: "Head", kind: "text" },
    { key: "group", label: "Tally group", kind: "text" },
    { key: "count", label: "Entries", kind: "quantity" },
    { key: "amount", label: "Before GST", kind: "money" },
    { key: "gst", label: "GST", kind: "money" },
  ],
};

const outstandingReport: Report = {
  id: "outstanding",
  title: "Outstanding by party",
  group: "Money",
  description: "What each customer owes and what we owe each vendor.",
  period: false,
  partyKey: "party",
  columns: [
    { key: "party", label: "Party", kind: "text" },
    { key: "side", label: "Side", kind: "text" },
    { key: "documents", label: "Open documents", kind: "quantity" },
    { key: "balance", label: "Balance", kind: "money", total: false },
  ],
};

const shipmentReport: Report = {
  id: "shipments",
  title: "Shipment report",
  group: "Export",
  description: "Each truck to Bhutan with its stage, value and profit.",
  period: true,
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
};

const exportRegister: Report = {
  id: "export-register",
  title: "Export register",
  group: "Export",
  description: "Every export invoice with route, LUT, shipping bill, LEO and BRC: the papers the GST refund and FEMA ask for.",
  period: true,
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
};

const placeOfSupplyReport: Report = {
  id: "sales-by-state",
  title: "Sales by place of supply",
  group: "GST",
  description: "Taxable sales by state (and exports), for the state-wise split in returns.",
  period: true,
  columns: [
    { key: "place", label: "Place of supply", kind: "text" },
    { key: "invoices", label: "Invoices", kind: "quantity" },
    { key: "taxable", label: "Taxable", kind: "money" },
  ],
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
