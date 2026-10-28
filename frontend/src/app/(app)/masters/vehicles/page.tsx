import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { transporters, vehicles } from "@/features/masters/sample-data";
import { VehiclesMaster } from "@/features/masters/vehicles-master";

export const metadata: Metadata = { title: "Vehicles" };

export default function VehiclesPage() {
  return (
    <>
      <SampleDataNotice />
      <VehiclesMaster vehicles={vehicles} transporters={transporters.map(({ id, name }) => ({ id, name }))} />
    </>
  );
}
