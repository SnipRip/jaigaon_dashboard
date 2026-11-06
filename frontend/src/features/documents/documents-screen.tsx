"use client";

import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { apiGet } from "@/lib/api-client";
import type { DocumentRegisterView } from "@/types/document-register";
import { DOCUMENT_REGISTER_PATH } from "./documents-api";
import { DocumentsWorkspace } from "./documents-workspace";

// The export documents page's client screen, on the backend (/documents/register).
export function DocumentsScreen() {
  const { data, error } = useSWR<DocumentRegisterView>(DOCUMENT_REGISTER_PATH, apiGet);
  if (!data) return <LoadNotice error={error} what="the documents register" />;
  return <DocumentsWorkspace register={data} />;
}
