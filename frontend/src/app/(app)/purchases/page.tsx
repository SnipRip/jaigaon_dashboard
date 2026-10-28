import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { parties } from "@/features/parties/sample-data";
import { PurchasesWorkspace } from "@/features/purchases/purchases-workspace";
import { bills } from "@/features/purchases/sample-data";

export const metadata: Metadata = { title: "Vendor bills" };

export default function PurchasesPage() {
  return (
    <>
      <SampleDataNotice />
      <PurchasesWorkspace bills={bills} parties={parties} companyState={COMPANY_TAX_PROFILE.stateCode} />
    </>
  );
}
