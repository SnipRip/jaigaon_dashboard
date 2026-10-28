// The dashboard's figures, worked out from the same sample records every
// other screen uses, so a number here always matches the page it links to.
// Becomes one backend summary endpoint later. Nothing here reads the clock:
// anything that depends on today is decided in the browser.
import { documentType } from "@/features/invoices/dispatch-documents";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { missingRegister } from "@/features/documents/document-register";
import { expenses } from "@/features/expenses/sample-data";
import { sumAmount } from "@/features/expenses/expense-rules";
import { invoices } from "@/features/invoices/sample-data";
import { stockStatus } from "@/features/items/item-rules";
import { items } from "@/features/items/sample-data";
import { reviewQueue } from "@/features/ocr/sample-data";
import { parties } from "@/features/parties/sample-data";
import { payable, receivable } from "@/features/payments/payment-data";
import { buildProfitReport } from "@/features/profit/profit-report";
import { viewBill } from "@/features/purchases/bill-view";
import { chargeBillsFor } from "@/features/purchases/purchase-rules";
import { bills } from "@/features/purchases/sample-data";
import { quotationFigures, quotationLabel } from "@/features/quotations/quotation-rules";
import { quotations } from "@/features/quotations/sample-data";
import { missingFor, nextStage, stageLabel } from "@/features/shipments/shipment-rules";
import { shipments } from "@/features/shipments/sample-data";
import { addDays } from "@/lib/dates";
import { formatDate, formatInr, formatPercent } from "@/lib/format";
import type { AttentionItem, DatedAlert, Kpi, PendingQuotation, ShipmentRow, TradingWeek } from "./types";

const state = COMPANY_TAX_PROFILE.stateCode;
const partyName = (id: string) => parties.find((party) => party.id === id)?.displayName ?? id;
const lakh = (amount: number) => Math.round(amount / 1000) / 100;

const profit = buildProfitReport(invoices, shipments, items, expenses, parties);
const goodsBills = bills.filter((bill) => bill.kind === "goods" && bill.status === "open").map((bill) => viewBill(bill, parties, state, null));
const purchases = goodsBills.reduce((sum, view) => sum + view.totals.taxable, 0);
const owedToUs = receivable.reduce((sum, document) => sum + document.balance, 0);
const issued = invoices.filter((invoice) => invoice.status === "issued");

export const kpis: Kpi[] = [
  {
    label: "Sales",
    value: profit.total.sales,
    note: `${issued.length} invoices, ${issued.filter((invoice) => invoice.kind === "export").length} to Bhutan · before GST`,
    noteTone: "neutral",
    href: "/invoices",
  },
  {
    label: "Purchases",
    value: purchases,
    note: `${goodsBills.length} goods bills from ${new Set(goodsBills.map((view) => view.vendor.id)).size} vendors · before GST`,
    noteTone: "neutral",
    href: "/purchases",
  },
  {
    label: "Actual profit",
    value: profit.total.profit,
    note: `${formatPercent(profit.total.marginPct)} after ${formatInr(profit.total.expenses)} direct expenses`,
    noteTone: profit.total.profit < 0 ? "danger" : "success",
    href: "/profit",
  },
  {
    label: "Receivable",
    value: owedToUs,
    note: `${receivable.filter((document) => document.balance > 0).length} invoices open · ${formatInr(payable.reduce((sum, document) => sum + document.balance, 0))} we owe vendors`,
    noteTone: "neutral",
    href: "/payments",
  },
];

/** Monday of the week a date falls in. */
const weekOf = (date: string) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));

export const tradingWeeks: TradingWeek[] = (() => {
  const weeks = new Map<string, { sales: number; purchase: number; profit: number }>();
  const bucket = (date: string) => {
    const key = weekOf(date);
    if (!weeks.has(key)) weeks.set(key, { sales: 0, purchase: 0, profit: 0 });
    return weeks.get(key)!;
  };
  for (const row of profit.byInvoice) {
    const invoice = invoices.find((candidate) => candidate.id === row.key)!;
    bucket(invoice.date).sales += row.sales;
    bucket(invoice.date).profit += row.profit;
  }
  for (const view of goodsBills) bucket(view.bill.date).purchase += view.totals.taxable;
  return [...weeks]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([week, totals]) => ({
      week: formatDate(week).slice(0, 6),
      sales: lakh(totals.sales),
      purchase: lakh(totals.purchase),
      profit: lakh(totals.profit),
    }));
})();

const missing = missingRegister(invoices, parties, state);
const lowStock = items.filter((item) => stockStatus(item) !== "ok");
const untaggedCharges = bills.filter((bill) => bill.kind === "charges" && !bill.landedCostFor);
const goodsWithoutCharges = goodsBills.filter((view) => chargeBillsFor(bills, view.bill.id).length === 0 && view.totals.chargesValue === 0);
const overheads = sumAmount(expenses.filter((expense) => expense.allocation.kind === "overhead"));

const attentionCandidates: (AttentionItem | false)[] = [
  reviewQueue.length > 0 && {
    heading: `OCR · ${reviewQueue.length} documents waiting for review`,
    detail: Object.entries(reviewQueue.reduce<Record<string, number>>((counts, document) => ({ ...counts, [document.detectedType]: (counts[document.detectedType] ?? 0) + 1 }), {}))
      .map(([type, count]) => `${count} ${type}`)
      .join(", "),
    tone: "brand",
    href: "/ocr-inbox",
  },
  missing.length > 0 && {
    heading: `Documents · ${missing.length} required, not attached`,
    detail: missing
      .slice(0, 3)
      .map((entry) => `${entry.name} on ${entry.invoice.number}`)
      .join(", "),
    tone: "warning",
    href: "/documents",
  },
  lowStock.length > 0 && {
    heading: `Stock · ${lowStock.length} items at or below reorder level`,
    detail: lowStock
      .slice(0, 3)
      .map((item) => item.name)
      .join(", ") + (lowStock.length > 3 ? ` and ${lowStock.length - 3} more` : ""),
    tone: "warning",
    href: "/items",
  },
  untaggedCharges.length > 0 && {
    heading: `Landed cost · ${untaggedCharges.length} freight or labour bills not tagged`,
    detail: "Tag them to their purchase so the cost lands on the items",
    tone: "warning",
    href: "/purchases",
  },
  {
    heading: `Overheads · ${formatInr(overheads)} this period`,
    detail: `Rent, salary and office costs: net profit ${formatInr(profit.total.profit - overheads)}${goodsWithoutCharges.length ? ` · ${goodsWithoutCharges.length} purchases have no freight on record` : ""}`,
    tone: "neutral",
    href: "/profit",
  },
];

export const attentionItems = attentionCandidates.filter((item): item is AttentionItem => item !== false);

/** Overdue receivables and MSME bills, judged against today in the browser. */
export const datedAlerts: DatedAlert[] = [
  ...receivable
    .filter((document) => document.balance > 0)
    .map((document) => ({ kind: "receivable" as const, party: partyName(document.partyId), document: document.number, amount: document.balance, date: document.dueDate, href: document.href })),
  ...payable
    .filter((document) => document.balance > 0 && document.flag === "msme")
    .map((document) => ({ kind: "msme" as const, party: partyName(document.partyId), document: document.number, amount: document.balance, date: document.date, href: document.href })),
];

export const pendingQuotations: PendingQuotation[] = quotations
  .filter((quotation) => quotation.status === "draft" || quotation.status === "sent" || quotation.status === "accepted")
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((quotation) => ({
    id: quotation.id,
    label: quotationLabel(quotation),
    customer: partyName(quotation.partyId),
    value: quotationFigures(quotation, parties.find((party) => party.id === quotation.partyId)!, state, items).totals.grandTotal,
    validUntil: quotation.validUntil,
    status: quotation.status,
  }));

export const shipmentCounts = [
  { label: "Planned or loading", count: shipments.filter((shipment) => shipment.status === "planned" || shipment.status === "loading").length },
  { label: "On the road or at border", count: shipments.filter((shipment) => shipment.status === "in-transit" || shipment.status === "at-border").length },
  { label: "Cleared or delivered", count: shipments.filter((shipment) => shipment.status === "cleared" || shipment.status === "delivered").length },
];

export const shipmentRows: ShipmentRow[] = [...shipments]
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 4)
  .map((shipment) => {
    const carried = invoices.filter((invoice) => shipment.invoiceIds.includes(invoice.id));
    const next = nextStage(shipment.status);
    const blockers = next ? [...new Set(missingFor(next, carried).map(({ kind }) => documentType(kind).name))] : [];
    const shipmentProfit = profit.byShipment.find((row) => row.key === shipment.id);
    const detail = !next
      ? `${partyName(shipment.customerId)} · profit ${formatInr(shipmentProfit?.profit ?? 0)}`
      : blockers.length
        ? `${partyName(shipment.customerId)} · waiting for ${blockers.join(", ")}`
        : `${partyName(shipment.customerId)} · ready for ${stageLabel(next).toLowerCase()}`;
    return {
      id: shipment.id,
      number: shipment.number,
      vehicle: shipment.vehicleNumber,
      status: stageLabel(shipment.status),
      tone: !next ? "success" : blockers.length ? "warning" : "brand",
      detail,
    };
  });
