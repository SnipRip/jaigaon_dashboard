import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { InvoicesWorkspace } from "@/features/invoices/invoices-workspace";
import { invoices } from "@/features/invoices/sample-data";
import { parties } from "@/features/parties/sample-data";

export const metadata: Metadata = { title: "Sales & invoices" };

export default function InvoicesPage() {
  return (
    <>
      <SampleDataNotice />
      <InvoicesWorkspace invoices={invoices} parties={parties} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
