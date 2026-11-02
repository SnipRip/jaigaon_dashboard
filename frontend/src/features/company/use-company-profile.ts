"use client";

import useSWR from "swr";
import { apiGet } from "@/lib/api-client";
import type { CompanyProfileView } from "@/types/company";
import { COMPANY_PROFILE_PATH } from "./company-profile-api";

/** Our company profile; screens that need our GST state wait for it. */
export function useCompanyProfile() {
  const { data, error, mutate } = useSWR<CompanyProfileView>(COMPANY_PROFILE_PATH, apiGet);
  return { profile: data, error, mutate };
}
