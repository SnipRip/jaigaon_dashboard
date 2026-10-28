import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { items } from "@/features/items/sample-data";
import { parties } from "@/features/parties/sample-data";
import { QuotationsWorkspace } from "@/features/quotations/quotations-workspace";
import { quotations } from "@/features/quotations/sample-data";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotationsPage() {
  return (
    <>
      <SampleDataNotice />
      <QuotationsWorkspace quotations={quotations} parties={parties} items={items} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
