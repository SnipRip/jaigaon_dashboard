"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { saveCompanyProfile, toCompanyValues } from "@/features/company/company-profile-api";
import { CompanyProfileForm } from "@/features/company/company-profile-form";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { apiGet } from "@/lib/api-client";
import type { LutView } from "@/types/lut";
import { ExportDocumentsCard } from "./export-documents-card";
import { GstDecisionTable } from "./gst-decision-table";
import { LutRegisterCard } from "./lut-register-card";
import { LUTS_PATH, toLut } from "./luts-api";
import { exportDocuments } from "./sample-data";

// GST & export setup: the company profile and the LUT register are stored;
// the decision table and document list are fixed rules.
export function TaxExportScreen() {
  const { profile, error, mutate } = useCompanyProfile();
  const luts = useSWR<LutView[]>(LUTS_PATH, apiGet);
  const register = useMemo(() => luts.data?.map(toLut), [luts.data]);
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
      {register ? (
        <LutRegisterCard
          luts={register}
          onChanged={async () => {
            await luts.mutate();
          }}
        />
      ) : (
        <LoadNotice error={luts.error} what="the LUT register" />
      )}
      <GstDecisionTable company={profile} />
      <ExportDocumentsCard documents={exportDocuments} />
    </>
  );
}
