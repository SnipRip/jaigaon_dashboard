// Shapes the dashboard cards take. dashboard-data.ts fills them from the
// records the rest of the app uses.
import type { StatusTone } from "@/components/ui/status-chip";
import type { QuotationStatus } from "@/features/quotations/types";

export interface Kpi {
  label: string;
  value: number;
  note: string;
  noteTone: StatusTone;
  href: string;
}

/** Amounts in ₹ lakh, one bar group per week. */
export interface TradingWeek {
  week: string;
  sales: number;
  purchase: number;
  profit: number;
}

export interface AttentionItem {
  heading: string;
  detail: string;
  tone: StatusTone;
  href?: string;
}

/** A money item that becomes an alert only once today's date is known. */
export interface DatedAlert {
  kind: "receivable" | "msme";
  party: string;
  document: string;
  amount: number;
  /** Receivable: due date. MSME: bill date (45 days run from it). */
  date: string;
  href: string;
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
