import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { NumberSeriesMaster } from "@/features/masters/number-series-master";
import { numberSeries } from "@/features/masters/sample-data";

export const metadata: Metadata = { title: "Number series" };

export default function NumberSeriesPage() {
  return (
    <>
      <SampleDataNotice />
      <NumberSeriesMaster series={numberSeries} />
    </>
  );
}
