// The export documents register as the backend returns it
// (backend/src/document-register, GET /documents/register).
import type { DispatchDocumentKindView, InvoiceKindView, InvoiceStatusView } from "./invoice";
import type { ShipmentStageView } from "./shipment";

export type RegisterKindView = DispatchDocumentKindView | "VENDOR_BILL" | "PURCHASE_EWAY_BILL";
/** When a paper is needed: before a shipment stage, or once the export payment is in (BRC). */
export type NeededByView = "IN_TRANSIT" | "AT_BORDER" | "CLEARED" | "PAYMENT";

export interface ShipmentRefView {
  id: string;
  number: string;
  stage: ShipmentStageView;
}

export interface RegisterEntryView {
  kind: RegisterKindView;
  number: string;
  date: string;
  owner: { type: "INVOICE" | "BILL"; id: string; number: string };
  partyName: string;
  vehicle: string | null;
  shipment: ShipmentRefView | null;
  /** Its invoice is cancelled or its bill void. */
  cancelled: boolean;
}

export interface MissingPaperView {
  kind: DispatchDocumentKindView;
  neededBy: NeededByView;
  /** The truck carrying the invoice cannot take its next step without it. */
  holdsTruck: boolean;
  invoice: { id: string; number: string; date: string; kind: InvoiceKindView };
  partyName: string;
  shipment: ShipmentRefView | null;
}

export type PaperCellView =
  | { kind: DispatchDocumentKindView; state: "ATTACHED"; number: string; date: string }
  | { kind: DispatchDocumentKindView; state: "MISSING"; neededBy: NeededByView; holdsTruck: boolean }
  | { kind: DispatchDocumentKindView; state: "OPTIONAL" };

export interface ShipmentPapersView {
  id: string;
  number: string;
  date: string;
  stage: ShipmentStageView;
  partyName: string;
  vehicleNumber: string;
  invoices: { id: string; number: string; status: InvoiceStatusView; papers: PaperCellView[] }[];
}

export interface DocumentRegisterView {
  entries: RegisterEntryView[];
  missing: MissingPaperView[];
  shipments: ShipmentPapersView[];
}
