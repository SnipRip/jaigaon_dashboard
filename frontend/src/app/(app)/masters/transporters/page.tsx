import type { Metadata } from "next";
import { TransportersMaster } from "@/features/masters/transporters-master";

export const metadata: Metadata = { title: "Transporters" };

export default function TransportersPage() {
  return <TransportersMaster />;
}
