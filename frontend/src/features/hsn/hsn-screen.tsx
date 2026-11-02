"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { GST_RATES } from "@/features/items/item-rules";
import { apiGet } from "@/lib/api-client";
import type { HsnCodeView } from "@/types/hsn";
import { HSN_CODES_PATH, toHsnCode } from "./hsn-api";
import { HsnWorkspace } from "./hsn-workspace";

// The HSN / SAC master screen, loading the codes from the backend.
export function HsnScreen() {
  const { data, error, mutate } = useSWR<HsnCodeView[]>(HSN_CODES_PATH, apiGet);
  const codes = useMemo(() => data?.map(toHsnCode), [data]);
  if (!codes) return <LoadNotice error={error} what="HSN and SAC codes" />;
  return (
    <HsnWorkspace
      codes={codes}
      gstRates={GST_RATES}
      onChanged={async () => {
        await mutate();
      }}
    />
  );
}
