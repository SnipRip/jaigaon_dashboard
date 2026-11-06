import type { Metadata } from "next";
import { VehiclesMaster } from "@/features/masters/vehicles-master";

export const metadata: Metadata = { title: "Vehicles" };

export default function VehiclesPage() {
  return <VehiclesMaster />;
}
