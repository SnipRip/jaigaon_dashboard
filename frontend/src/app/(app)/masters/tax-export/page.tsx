import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { ExportDocumentsCard } from "@/features/tax-export/export-documents-card";
import { ExportSettingsForm } from "@/features/tax-export/export-settings-form";
import { GstDecisionTable } from "@/features/tax-export/gst-decision-table";
import { LutRegisterCard } from "@/features/tax-export/lut-register-card";
import { exportDocuments, exportSettings, lutRegister } from "@/features/tax-export/sample-data";

export const metadata: Metadata = { title: "GST & export setup" };

export default function TaxExportPage() {
  return (
    <>
      <SampleDataNotice />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <ExportSettingsForm
          companyState={COMPANY_TAX_PROFILE.stateCode}
          companyGstin={COMPANY_TAX_PROFILE.gstin}
          initial={exportSettings}
        />
        <LutRegisterCard initialLuts={lutRegister} />
      </div>
      <GstDecisionTable companyState={COMPANY_TAX_PROFILE.stateCode} />
      <ExportDocumentsCard documents={exportDocuments} />
    </>
  );
}
