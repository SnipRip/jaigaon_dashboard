// Quotations (SOW 5): numbered, valid till a date, revised in place with the
// old totals kept, and converted to an invoice once accepted.
import type { InvoiceLine } from "@/features/invoices/types";

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "converted";

export interface QuotationRevision {
  revision: number;
  date: string;
  total: number;
  note: string;
}

export interface Quotation {
  id: string;
  /** QT/2627/0041; revisions print as QT/2627/0041-R1. */
  number: string;
  revision: number;
  date: string;
  validUntil: string;
  partyId: string;
  status: QuotationStatus;
  lines: InvoiceLine[];
  terms: string;
  notes?: string;
  /** Once converted. */
  invoiceId?: string;
  history: QuotationRevision[];
  /** Sent on WhatsApp, once that is connected. */
  sentOn?: string;
}
