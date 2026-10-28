import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { findReport, REPORTS } from "@/features/reports/report-definitions";
import { ReportView } from "@/features/reports/report-view";

type ReportParams = PageProps<"/reports/[reportId]">["params"];

export function generateStaticParams() {
  return REPORTS.map((report) => ({ reportId: report.id }));
}

export async function generateMetadata({ params }: { params: ReportParams }): Promise<Metadata> {
  return { title: findReport((await params).reportId)?.title ?? "Report" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function ReportPage({ params }: { params: ReportParams }) {
  return (
    <Suspense>
      <ReportBody params={params} />
    </Suspense>
  );
}

async function ReportBody({ params }: { params: ReportParams }) {
  const report = findReport((await params).reportId);
  if (!report) notFound();
  return (
    <>
      <SampleDataNotice />
      <ReportView report={report} />
    </>
  );
}
