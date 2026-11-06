import type { Metadata } from "next";
import { RateEnquiryWorkspace } from "@/features/rate-enquiry/rate-enquiry-workspace";

export const metadata: Metadata = { title: "Rate enquiry" };

export default function RateEnquiryPage() {
  return <RateEnquiryWorkspace />;
}
