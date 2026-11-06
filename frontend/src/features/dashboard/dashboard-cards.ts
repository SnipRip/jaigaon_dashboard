// Turns the backend's dashboard summary into what each card shows. Pure, no
// clock: anything that depends on today (overdue, MSME days, expired
// quotations) is decided in the card from `useToday`.
import { quotationLabel } from "@/features/quotations/quotation-rules";
import type { QuotationStatus } from "@/features/quotations/types";
import { documentName, STATUS_OF } from "@/features/shipments/shipments-api";
import { stageLabel } from "@/features/shipments/shipment-rules";
import { formatDayMonth, formatInr, formatPercent } from "@/lib/format";
import type { DashboardView } from "@/types/dashboard";
import type { AttentionItem, Kpi, PendingQuotation, ShipmentRow, TradingSeries, TradingWeek } from "./types";

const lakh = (amount: number) => Math.round(amount / 1000) / 100;
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const andMore = (names: string[], total: number) => names.join(", ") + (total > names.length ? ` and ${total - names.length} more` : "");

export function dashboardKpis(view: DashboardView): Kpi[] {
  const kpis: (Kpi | false)[] = [
    !!view.sales && {
      label: "Sales",
      value: view.sales.total,
      note: `${plural(view.sales.invoices, "invoice")}, ${view.sales.exportInvoices} to Bhutan · before GST`,
      noteTone: "neutral",
      href: "/invoices",
    },
    !!view.purchases && {
      label: "Purchases",
      value: view.purchases.total,
      note: `${plural(view.purchases.bills, "goods bill")} from ${plural(view.purchases.vendors, "vendor")} · before GST`,
      noteTone: "neutral",
      href: "/purchases",
    },
    !!view.profit && {
      label: "Actual profit",
      value: view.profit.profit,
      note: `${formatPercent(view.profit.marginPct)} after ${formatInr(view.profit.expenses)} direct expenses`,
      noteTone: view.profit.profit < 0 ? "danger" : "success",
      href: "/profit",
    },
    !!view.outstanding && {
      label: "Receivable",
      value: view.outstanding.receivable,
      note: `${plural(view.outstanding.openInvoices, "invoice")} open · ${formatInr(view.outstanding.payable)} we owe vendors`,
      noteTone: "neutral",
      href: "/payments",
    },
  ];
  return kpis.filter((kpi): kpi is Kpi => kpi !== false);
}

/** The series the user may see, and one bar group per week. */
export function tradingWeeks(view: DashboardView): { series: TradingSeries[]; weeks: TradingWeek[] } {
  const sources: [TradingSeries, number[] | undefined][] = [
    ["sales", view.sales?.byWeek],
    ["purchase", view.purchases?.byWeek],
    ["profit", view.profit?.byWeek],
  ];
  const shown = sources.filter((source): source is [TradingSeries, number[]] => !!source[1]);
  return {
    series: shown.map(([key]) => key),
    weeks: view.weeks.map((week, index) => ({
      week: formatDayMonth(week),
      ...Object.fromEntries(shown.map(([key, values]) => [key, lakh(values[index])])),
    })),
  };
}

/** Alerts that do not depend on today: papers, stock, landed cost, overheads. */
export function attentionItems(view: DashboardView): AttentionItem[] {
  const { documents, stock, purchases, profit } = view;
  const items: (AttentionItem | false)[] = [
    !!documents?.missing && {
      heading: `Documents · ${documents.missing} required, not attached${documents.holdingTrucks ? ` · ${documents.holdingTrucks} holding a truck` : ""}`,
      detail: andMore(
        documents.first.map((paper) => `${documentName(paper.kind)} on ${paper.invoiceNumber}`),
        documents.missing,
      ),
      tone: documents.holdingTrucks ? "danger" : "warning",
      href: "/documents",
    },
    !!stock?.low && {
      heading: `Stock · ${plural(stock.low, "item")} at or below reorder level`,
      detail: andMore(stock.first, stock.low),
      tone: "warning",
      href: "/items",
    },
    !!purchases?.untaggedCharges && {
      heading: `Landed cost · ${plural(purchases.untaggedCharges, "freight or labour bill")} not tagged`,
      detail: "Tag them to their purchase so the cost lands on the items",
      tone: "warning",
      href: "/purchases",
    },
    !!profit && {
      heading: `Overheads · ${formatInr(profit.overheads)} this year`,
      detail: `Rent, salary and office costs: net profit ${formatInr(profit.netProfit)}`,
      tone: "neutral",
      href: "/profit",
    },
  ];
  return items.filter((item): item is AttentionItem => item !== false);
}

export const pendingQuotations = (view: DashboardView): PendingQuotation[] =>
  (view.quotations ?? []).map((quotation) => ({
    id: quotation.id,
    label: quotationLabel(quotation),
    customer: quotation.partyName,
    value: quotation.total,
    validUntil: quotation.validUntil,
    status: quotation.status.toLowerCase() as QuotationStatus,
  }));

export function shipmentSummary(shipments: NonNullable<DashboardView["shipments"]>): { counts: { label: string; count: number }[]; rows: ShipmentRow[] } {
  return {
    counts: [
      { label: "Planned or loading", count: shipments.counts.planned },
      { label: "On the road or at border", count: shipments.counts.onTheRoad },
      { label: "Cleared or delivered", count: shipments.counts.done },
    ],
    rows: shipments.latest.map((shipment) => {
      const next = shipment.nextStage ? stageLabel(STATUS_OF[shipment.nextStage]).toLowerCase() : null;
      const papers = [...new Set(shipment.waitingFor.map(documentName))];
      return {
        id: shipment.id,
        number: shipment.number,
        vehicle: shipment.vehicleNumber,
        status: stageLabel(STATUS_OF[shipment.stage]),
        tone: !next ? "success" : papers.length ? "warning" : "brand",
        detail: `${shipment.partyName} · ${!next ? "delivered" : papers.length ? `waiting for ${papers.join(", ")}` : `ready for ${next}`}`,
      };
    }),
  };
}
