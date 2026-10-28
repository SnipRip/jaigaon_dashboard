import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { PartiesWorkspace } from "@/features/parties/parties-workspace";
import { parties } from "@/features/parties/sample-data";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return (
    <>
      <SampleDataNotice />
      <PartiesWorkspace role="vendor" parties={parties} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
