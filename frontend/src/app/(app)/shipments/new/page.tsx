import type { Metadata } from "next";
import { ShipmentFormScreen } from "@/features/shipments/shipment-screens";

export const metadata: Metadata = { title: "New shipment" };

export default function NewShipmentPage() {
  return <ShipmentFormScreen />;
}
