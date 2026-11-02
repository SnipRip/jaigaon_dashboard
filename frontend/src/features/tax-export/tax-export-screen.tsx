"use client";

import { LoadNotice } from "@/components/ui/load-notice";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { saveCompanyProfile, toCompanyValues } from "@/features/company/company-profile-api";
import { CompanyProfileForm } from "@/features/company/company-profile-form";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { ExportDocumentsCard } from "./export-documents-card";
import { GstDecisionTable } from "./gst-decision-table";
import { LutRegisterCard } from "./lut-register-card";
import { exportDocuments, lutRegister } from "./sample-data";

// GST & export setup: the company profile is stored; the LUT register is
// still sample data.
export function TaxExportScreen() {
  const { profile, error, mutate } = useCompanyProfile();
  if (!profile) return <LoadNotice error={error} what="the company profile" />;
  return (
    <>
      <CompanyProfileForm
        initial={toCompanyValues(profile)}
        onSave={async (values) => {
          const saved = await saveCompanyProfile(values);
          await mutate(saved, { revalidate: false });
          return toCompanyValues(saved);
        }}
      />
      <SampleDataNotice>The LUT register below is sample data. It is not connected to the database yet.</SampleDataNotice>
      <LutRegisterCard initialLuts={lutRegister} />
      <GstDecisionTable companyState={profile.stateCode} />
      <ExportDocumentsCard documents={exportDocuments} />
    </>
  );
}
