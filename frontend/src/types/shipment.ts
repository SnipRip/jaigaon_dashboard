// Shipments as the backend returns them (backend/src/shipments).
import type { DispatchDocumentKindView, InvoiceStatusView } from "./invoice";

export type ShipmentStageView = "PLANNED" | "LOADING" | "IN_TRANSIT" | "AT_BORDER" | "CLEARED" | "DELIVERED";

export interface ShipmentInvoiceView {
  id: string;
  number: string;
  date: string;
  status: InvoiceStatusView;
  total: number;
  documents: { kind: DispatchDocumentKindView; number: string; date: string }[];
}

export interface ShipmentExpenseView {
  id: string;
  number: string;
  date: string;
  head: string;
  description: string;
  payeeName: string;
  amount: number;
  /** What it takes off profit: the amount plus GST that cannot be claimed. */
  cost: number;
  /** Null: spent on the shipment itself; else the invoice it was booked on. */
  invoice: { id: string; number: string } | null;
  cancelled: boolean;
}

export interface ShipmentProfitView {
  sales: number;
  cost: number;
  expenses: number;
  profit: number;
  marginPct: number;
}

export interface ShipmentView {
  id: string;
  number: string;
  date: string;
  partyId: string;
  partyName: string;
  stage: ShipmentStageView;
  vehicleNumber: string;
  /** Picked from the vehicle master; null for a truck typed in. */
  vehicleId: string | null;
  transporterId: string | null;
  transporterName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  destination: string;
  borderPoint: string;
  customsAgent: string | null;
  sealNumber: string | null;
  packages: number | null;
  grossWeightKg: number | null;
  notes: string | null;
  invoices: ShipmentInvoiceView[];
  events: { stage: ShipmentStageView; date: string; note: string | null; by: string | null }[];
  /** The stage it can move to and the papers it is waiting for; null once delivered or cancelled. */
  next: { stage: ShipmentStageView; missing: { invoiceId: string; invoice: string; kind: DispatchDocumentKindView }[] } | null;
  /** True once it left the yard: the invoices no longer change. */
  invoicesLocked: boolean;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  /** Detail only. */
  expenses: ShipmentExpenseView[] | null;
  profit: ShipmentProfitView | null;
}
