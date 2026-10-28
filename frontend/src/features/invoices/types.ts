// Sales invoices. Two kinds, chosen first: a local GST tax invoice for buyers
// in India, and an export invoice for Bhutan and other overseas buyers. The
// documents that follow a dispatch (lorry hire challan, e-way bill, customs
// invoice, shipping bill, LEO, BRC) are attached to the invoice afterwards.
import type { ExportRoute } from "@/features/gst/gst-rules";
import type { Address } from "@/features/parties/types";

export type InvoiceKind = "local" | "export";

export interface InvoiceLine {
  itemId: string;
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  /** Per unit, before GST. */
  rate: number;
  discountPct: number;
  gstRatePct: number;
}

export type DispatchDocumentKind =
  | "e-invoice"
  | "lorry-challan"
  | "eway-bill"
  | "customs-invoice"
  | "packing-list"
  | "shipping-bill"
  | "leo"
  | "brc";

/** One attached document: its number, date and kind-specific details. */
export interface DispatchDocument {
  number: string;
  date: string;
  /** Field key → value, as defined for the kind in dispatch-documents.ts. */
  details: Record<string, string>;
  /** Name of the uploaded scan, once file storage exists. */
  fileName?: string;
}

export interface Invoice {
  id: string;
  kind: InvoiceKind;
  /** Up to 16 characters, unique in the financial year (CGST rule 46). */
  number: string;
  date: string;
  status: "draft" | "issued" | "cancelled";
  partyId: string;
  /** GST state code of the place of supply. Local invoices only. */
  placeOfSupply?: string;
  shipTo?: Address;
  /** Export invoices. */
  exportRoute?: ExportRoute;
  lutArn?: string;
  destinationCountry?: string;
  currency: "INR" | "BTN";
  lines: InvoiceLine[];
  vehicleNumber?: string;
  documents: Partial<Record<DispatchDocumentKind, DispatchDocument>>;
  notes?: string;
}
