import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { PartyForm } from "@/features/parties/party-form";
import { priceLevels } from "@/features/parties/sample-data";

export const metadata: Metadata = { title: "New vendor" };

export default function NewVendorPage() {
  return (
    <>
      <SampleDataNotice />
      <PartyForm role="vendor" priceLevels={priceLevels} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
