import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { GodownsMaster } from "@/features/masters/godowns-master";
import { godowns } from "@/features/masters/sample-data";

export const metadata: Metadata = { title: "Godowns" };

export default function GodownsPage() {
  return (
    <>
      <SampleDataNotice />
      <GodownsMaster godowns={godowns} />
    </>
  );
}
