// The dashboard summary as the API returns it (GET /dashboard). A section is
// null when the user's role may not see the screen it comes from, so the
// card for it is left out rather than showing figures they cannot open.
import type { DispatchDocumentKind, QuotationStatus, SettlementDirection, ShipmentStage } from '../generated/prisma/enums.js';
import type { TargetKind } from '../settlements/settlement-rules.js';

export interface DashboardView {
  /** The period the totals cover: this financial year to today. */
  from: string;
  to: string;
  /** Mondays of the chart's weeks, oldest first; each series below has one figure per week. */
  weeks: string[];
  sales: { total: number; invoices: number; exportInvoices: number; byWeek: number[] } | null;
  purchases: { total: number; bills: number; vendors: number; byWeek: number[]; untaggedCharges: number } | null;
  profit: { sales: number; expenses: number; profit: number; marginPct: number; overheads: number; netProfit: number; byWeek: number[] } | null;
  outstanding: {
    receivable: number;
    openInvoices: number;
    payable: number;
    /**
     * What we must collect (with a due date) and what MSME vendors must be
     * paid by: judged against today in the browser. `kind` and `id` name
     * the invoice, bill, expense or opening balance, as on Payments.
     */
    dues: { direction: SettlementDirection; kind: TargetKind; id: string; partyId: string; partyName: string; number: string; balance: number; dueDate: string }[];
  } | null;
  documents: { missing: number; holdingTrucks: number; first: { kind: DispatchDocumentKind; invoiceNumber: string }[] } | null;
  stock: { low: number; first: string[] } | null;
  quotations: { id: string; number: string; revision: number; partyName: string; total: number; validUntil: string; status: QuotationStatus }[] | null;
  shipments: {
    counts: { planned: number; onTheRoad: number; done: number };
    latest: { id: string; number: string; vehicleNumber: string; stage: ShipmentStage; partyName: string; nextStage: ShipmentStage | null; waitingFor: DispatchDocumentKind[] }[];
  } | null;
}
