import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { REPORTS } from "@/features/reports/report-definitions";
import { ReportsCatalogue } from "@/features/reports/reports-catalogue";

export const metadata: Metadata = { title: "Reports & MIS" };

export default function ReportsPage() {
  return (
    <>
      <SampleDataNotice />
      <ReportsCatalogue reports={REPORTS} />
    </>
  );
}
