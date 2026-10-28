import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { PartyForm } from "@/features/parties/party-form";
import { priceLevels } from "@/features/parties/sample-data";

export const metadata: Metadata = { title: "New customer" };

export default function NewCustomerPage() {
  return (
    <>
      <SampleDataNotice />
      <PartyForm role="customer" priceLevels={priceLevels} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
