// The vehicle master as the backend returns it (backend/src/vehicles/vehicle-view.ts).
export type VehicleTypeView = "TRUCK_10" | "TRUCK_6" | "TRAILER" | "PICKUP";

export interface VehicleView {
  id: string;
  /** Upper case, no spaces. */
  number: string;
  type: VehicleTypeView;
  capacityTons: number | null;
  ownership: "OWN" | "HIRED";
  /** A transport vendor; hired vehicles only. */
  transporterId: string | null;
  transporterName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  notes: string | null;
  isArchived: boolean;
  /** Shipments that carried it: such a vehicle is archived, not deleted. */
  shipmentCount: number;
}
