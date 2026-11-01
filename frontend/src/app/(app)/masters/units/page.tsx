import type { Metadata } from "next";
import { UnitsMaster } from "@/features/masters/units-master";

export const metadata: Metadata = { title: "Units" };

export default function UnitsPage() {
  return <UnitsMaster />;
}
