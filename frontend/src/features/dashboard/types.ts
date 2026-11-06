// Shapes the dashboard cards take. dashboard-cards.ts fills them from the
// backend's summary (GET /dashboard).
import type { StatusTone } from "@/components/ui/status-chip";
import type { QuotationStatus } from "@/features/quotations/types";

export interface Kpi {
  label: string;
  value: number;
  note: string;
  noteTone: StatusTone;
  href: string;
}

export type TradingSeries = "sales" | "purchase" | "profit";

/** Amounts in ₹ lakh, one bar group per week; a series the user may not see is left out. */
export type TradingWeek = { week: string } & Partial<Record<TradingSeries, number>>;

export interface AttentionItem {
  heading: string;
  detail: string;
  tone: StatusTone;
  href?: string;
}

export interface PendingQuotation {
  id: string;
  label: string;
  customer: string;
  value: number;
  validUntil: string;
  status: QuotationStatus;
}

export interface ShipmentRow {
  id: string;
  number: string;
  vehicle: string;
  status: string;
  tone: StatusTone;
  detail: string;
}
