// A shipment is one truck crossing into Bhutan (SOW 10): the export
// invoices it carries, the vehicle and driver, the customs agent, and where
// it is between our yard and the buyer. Its papers live on the invoices.

export type ShipmentStatus = "planned" | "loading" | "in-transit" | "at-border" | "cleared" | "delivered";

export interface ShipmentEvent {
  status: ShipmentStatus;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
}

export interface Shipment {
  id: string;
  /** SHP/2627/0001 */
  number: string;
  date: string;
  customerId: string;
  invoiceIds: string[];
  vehicleNumber: string;
  transporterId?: string;
  driverName?: string;
  driverPhone?: string;
  /** Delivery town in Bhutan. */
  destination: string;
  borderPoint: string;
  customsAgent?: string;
  sealNumber?: string;
  packages?: number;
  grossWeightKg?: number;
  status: ShipmentStatus;
  events: ShipmentEvent[];
  notes?: string;
}
