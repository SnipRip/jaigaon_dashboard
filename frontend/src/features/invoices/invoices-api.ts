// Calls for sales invoices, and the conversion from the backend's invoice to
// the `Invoice` the screens and the printed bill read. The backend prices
// every line and draws the stock on save; `stored` keeps those figures.
// Dispatch documents (IRN, challan, e-way bill, customs papers, BRC) are
// saved one at a time against an issued invoice and come back on it.
import { apiRequest } from "@/lib/api-client";
import type { DispatchDocumentKindView, InvoiceKindView, InvoiceView } from "@/types/invoice";
import type { DispatchDocument, DispatchDocumentKind, Invoice, InvoiceKind } from "./types";

export const INVOICES_PATH = "/invoices";

const KIND_VIEW: Record<DispatchDocumentKind, DispatchDocumentKindView> = {
  "e-invoice": "E_INVOICE",
  "lorry-challan": "LORRY_CHALLAN",
  "eway-bill": "EWAY_BILL",
  "customs-invoice": "CUSTOMS_INVOICE",
  "packing-list": "PACKING_LIST",
  "shipping-bill": "SHIPPING_BILL",
  leo: "LEO",
  brc: "BRC",
};
/** The backend's document kind → the screens' kind. */
export const KIND_OF = Object.fromEntries(Object.entries(KIND_VIEW).map(([kind, view]) => [view, kind])) as Record<DispatchDocumentKindView, DispatchDocumentKind>;

/** Stored documents keyed by the screens' kind; every detail as the text the form shows. */
const toDocuments = (view: InvoiceView): Invoice["documents"] =>
  Object.fromEntries(
    view.documents.map((document) => [
      KIND_OF[document.kind],
      {
        number: document.number,
        date: document.date,
        details: Object.fromEntries(Object.entries(document.details).map(([key, value]) => [key, String(value)])),
      } satisfies DispatchDocument,
    ]),
  );

export const toInvoiceKind = (kind: InvoiceKindView): InvoiceKind => (kind === "EXPORT" ? "export" : "local");

export function toInvoice(view: InvoiceView): Invoice {
  return {
    id: view.id,
    kind: toInvoiceKind(view.kind),
    number: view.number,
    date: view.date,
    status: view.status === "CANCELLED" ? "cancelled" : "issued",
    partyId: view.partyId,
    placeOfSupply: view.placeOfSupply ?? undefined,
    shipTo: view.shipToLine || view.shipToCity ? { line1: view.shipToLine ?? "", city: view.shipToCity ?? "" } : undefined,
    exportRoute: view.regime === "EXPORT_IGST" ? "igst" : view.regime === "EXPORT_LUT" ? "lut" : undefined,
    lutArn: view.lutArn ?? undefined,
    destinationCountry: view.destinationCountry ?? undefined,
    currency: view.currency,
    lines: view.lines.map((line) => ({
      itemId: line.itemId,
      description: line.description,
      hsn: line.hsn,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      discountPct: line.discountPct,
      gstRatePct: line.gstRatePct,
      schemeDiscount: line.schemeDiscount,
      freeQuantity: line.freeQuantity,
    })),
    vehicleNumber: view.vehicleNumber ?? undefined,
    documents: toDocuments(view),
    notes: view.notes ?? undefined,
    stored: view,
  };
}

export interface InvoiceBody {
  kind: InvoiceKindView;
  partyId: string;
  godownId: string;
  date: string;
  /** Null takes the next number in the series. */
  number: string | null;
  placeOfSupply: string | null;
  exportRoute: "LUT" | "IGST" | null;
  currency: "INR" | "BTN";
  shipToLine: string | null;
  shipToCity: string | null;
  vehicleNumber: string | null;
  notes: string | null;
  quotationId?: string;
  lines: { itemId: string; quantity: number; rate: number; discountPct: number }[];
}

export const createInvoice = (body: InvoiceBody) => apiRequest<InvoiceView>(INVOICES_PATH, { method: "POST", body });
export const cancelInvoice = (id: string, reason: string) =>
  apiRequest<InvoiceView>(`${INVOICES_PATH}/${id}/cancel`, { method: "POST", body: { reason } });

/** The next number a save on `date` would take (null when numbers are typed). */
export const numberPreviewPath = (kind: InvoiceKind, date: string) =>
  `/number-series/preview?kind=${kind === "export" ? "EXPORT_INVOICE" : "SALES_INVOICE"}&date=${date}`;

/** Attaches or corrects one dispatch document; returns the invoice with its documents. */
export const saveInvoiceDocument = (id: string, kind: DispatchDocumentKind, document: DispatchDocument) =>
  apiRequest<InvoiceView>(`${INVOICES_PATH}/${id}/documents/${KIND_VIEW[kind]}`, {
    method: "PUT",
    body: { number: document.number, date: document.date, details: document.details },
  });
export const removeInvoiceDocument = (id: string, kind: DispatchDocumentKind) =>
  apiRequest<InvoiceView>(`${INVOICES_PATH}/${id}/documents/${KIND_VIEW[kind]}`, { method: "DELETE" });
