import type { Metadata } from "next";
import { NumberSeriesMaster } from "@/features/masters/number-series-master";

export const metadata: Metadata = { title: "Number series" };

export default function NumberSeriesPage() {
  return <NumberSeriesMaster />;
}
