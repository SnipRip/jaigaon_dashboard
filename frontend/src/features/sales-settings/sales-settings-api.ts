"use client";

import useSWR from "swr";
import { apiGet, apiRequest } from "@/lib/api-client";
import type { SalesSettingsView } from "@/types/sales-settings";

export const SALES_SETTINGS_PATH = "/sales-settings";

/** The company's sales settings; read by the invoice form and the Settings page. */
export function useSalesSettings() {
  const { data, error, mutate } = useSWR<SalesSettingsView>(SALES_SETTINGS_PATH, apiGet);
  return { settings: data, error, mutate };
}

/** Administrators only. Send just what changed. */
export const saveSalesSettings = (changes: Partial<Pick<SalesSettingsView, "invoiceInStockOnly">>) =>
  apiRequest<SalesSettingsView>(SALES_SETTINGS_PATH, { method: "PATCH", body: changes });
