// Shipments on the backend: paths, the stage names the screens use, and the
// calls. The backend checks the invoices, the papers each stage needs and
// the dates again on every save (backend/src/shipments/shipment-rules.ts).
import { documentType } from "@/features/invoices/dispatch-documents";
import { KIND_OF } from "@/features/invoices/invoices-api";
import { apiRequest } from "@/lib/api-client";
import type { DispatchDocumentKindView } from "@/types/invoice";
import type { ShipmentStageView, ShipmentView } from "@/types/shipment";
import type { ShipmentStatus } from "./types";

export const SHIPMENTS_PATH = "/shipments";
export const shipmentPath = (id: string) => `${SHIPMENTS_PATH}/${id}`;
export const shipmentNumberPreviewPath = (date: string) => `/number-series/preview?kind=SHIPMENT&date=${date}`;
/** Shipment expenses saved before their shipment, waiting to be linked. */
export const UNLINKED_EXPENSES_PATH = "/expenses?unlinked=true";

export const STATUS_OF: Record<ShipmentStageView, ShipmentStatus> = {
  PLANNED: "planned",
  LOADING: "loading",
  IN_TRANSIT: "in-transit",
  AT_BORDER: "at-border",
  CLEARED: "cleared",
  DELIVERED: "delivered",
};
export const STAGE_OF = Object.fromEntries(Object.entries(STATUS_OF).map(([stage, status]) => [status, stage])) as Record<ShipmentStatus, ShipmentStageView>;

/** A backend document kind's name ("Shipping bill"). */
export const documentName = (kind: DispatchDocumentKindView) => documentType(KIND_OF[kind]).name;

/** Invoice ids already riding on a live shipment (other than `except`). */
export const shippedInvoiceIds = (shipments: ShipmentView[], except?: string) =>
  new Set(shipments.filter((shipment) => !shipment.cancelledAt && shipment.id !== except).flatMap((shipment) => shipment.invoices.map((invoice) => invoice.id)));

export interface ShipmentBody {
  date: string;
  partyId: string;
  invoiceIds: string[];
  vehicleNumber: string;
  /** From the vehicle master: the backend records its number. */
  vehicleId: string | null;
  transporterId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  destination: string;
  borderPoint: string;
  customsAgent: string | null;
  sealNumber: string | null;
  packages: number | null;
  grossWeightKg: number | null;
  notes: string | null;
}

export const createShipment = (body: ShipmentBody) => apiRequest<ShipmentView>(SHIPMENTS_PATH, { method: "POST", body });
export const updateShipment = (id: string, body: ShipmentBody) => apiRequest<ShipmentView>(shipmentPath(id), { method: "PUT", body });
export const advanceShipment = (id: string, body: { stage: ShipmentStageView; date: string; note: string | null }) =>
  apiRequest<ShipmentView>(`${shipmentPath(id)}/stage`, { method: "POST", body });
export const stepBackShipment = (id: string) => apiRequest<ShipmentView>(`${shipmentPath(id)}/stage/back`, { method: "POST" });
export const cancelShipment = (id: string, reason: string) => apiRequest<ShipmentView>(`${shipmentPath(id)}/cancel`, { method: "POST", body: { reason } });
export const linkShipmentExpenses = (id: string, expenseIds: string[]) =>
  apiRequest<ShipmentView>(`${shipmentPath(id)}/expenses`, { method: "POST", body: { expenseIds } });
export const unlinkShipmentExpense = (id: string, expenseId: string) => apiRequest<ShipmentView>(`${shipmentPath(id)}/expenses/${expenseId}`, { method: "DELETE" });
