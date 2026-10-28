import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { transporters, vehicles } from "@/features/masters/sample-data";
import { TransportersMaster } from "@/features/masters/transporters-master";
import { parties } from "@/features/parties/sample-data";

export const metadata: Metadata = { title: "Transporters" };

const vendors = parties.filter((party) => party.roles.includes("vendor")).map(({ id, displayName }) => ({ id, displayName }));
const vehicleCounts = vehicles.reduce<Record<string, number>>((counts, vehicle) => {
  if (vehicle.transporterId) counts[vehicle.transporterId] = (counts[vehicle.transporterId] ?? 0) + 1;
  return counts;
}, {});

export default function TransportersPage() {
  return (
    <>
      <SampleDataNotice />
      <TransportersMaster transporters={transporters} vendors={vendors} vehicleCounts={vehicleCounts} />
    </>
  );
}
