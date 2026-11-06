// A transport vendor as the backend returns it (backend/src/transporters/transporter-view.ts).
import type { PartyView } from "./party";

export interface TransporterView {
  id: string;
  displayName: string;
  contactPerson: string | null;
  phone: string | null;
  treatment: PartyView["treatment"];
  /** Goes on the e-way bill as the transporter ID. */
  gstin: string | null;
  /** Bills freight as a goods transport agency: reverse charge. */
  isGta: boolean;
  isArchived: boolean;
  /** Live vehicles on the vehicle master. */
  vehicleCount: number;
  /** Shipments carried, cancelled ones left out. */
  shipmentCount: number;
  /** YYYY-MM-DD. */
  lastShipmentDate: string | null;
}
