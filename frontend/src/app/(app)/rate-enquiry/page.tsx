import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { RateEnquiryWorkspace } from "@/features/rate-enquiry/rate-enquiry-workspace";
import { categories, customers, products } from "@/features/rate-enquiry/sample-data";

export const metadata: Metadata = { title: "Rate enquiry" };

export default function RateEnquiryPage() {
  return (
    <>
      <SampleDataNotice />
      <RateEnquiryWorkspace products={products} categories={categories} customers={customers} />
    </>
  );
}
