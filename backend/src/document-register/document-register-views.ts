// The export documents register as the API returns it (GET /documents/register):
// every document number on record, the required papers still missing on
// issued invoices, and each shipment's invoices with the state of every paper.
import type { DispatchDocumentKind, InvoiceKind, InvoiceStatus, ShipmentStage } from '../generated/prisma/enums.js';
import type { NeededBy, PaperCell } from './document-register-rules.js';

export type RegisterKind = DispatchDocumentKind | 'VENDOR_BILL' | 'PURCHASE_EWAY_BILL';

export interface ShipmentRef {
  id: string;
  number: string;
  stage: ShipmentStage;
}

export interface RegisterEntryView {
  kind: RegisterKind;
  number: string;
  date: string;
  /** The invoice or vendor bill it belongs to. */
  owner: { type: 'INVOICE' | 'BILL'; id: string; number: string };
  partyName: string;
  vehicle: string | null;
  /** The shipment carrying its invoice (not one cancelled since). */
  shipment: ShipmentRef | null;
  /** Its invoice is cancelled or its bill void: kept on record, read-only. */
  cancelled: boolean;
}

export interface MissingPaperView {
  kind: DispatchDocumentKind;
  neededBy: NeededBy;
  /** The truck carrying the invoice cannot take its next step without it. */
  holdsTruck: boolean;
  invoice: { id: string; number: string; date: string; kind: InvoiceKind };
  partyName: string;
  shipment: ShipmentRef | null;
}

export interface ShipmentPapersView {
  id: string;
  number: string;
  date: string;
  stage: ShipmentStage;
  partyName: string;
  vehicleNumber: string;
  invoices: { id: string; number: string; status: InvoiceStatus; papers: PaperCell[] }[];
}

export interface DocumentRegisterView {
  entries: RegisterEntryView[];
  missing: MissingPaperView[];
  shipments: ShipmentPapersView[];
}
