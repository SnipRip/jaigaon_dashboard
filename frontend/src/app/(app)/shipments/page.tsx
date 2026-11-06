import type { Metadata } from "next";
import { ShipmentsScreen } from "@/features/shipments/shipment-screens";

export const metadata: Metadata = { title: "Shipments" };

export default function ShipmentsPage() {
  return <ShipmentsScreen />;
}
