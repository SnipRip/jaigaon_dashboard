"use client";

import { useState } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { TextField } from "@/components/ui/text-field";
import { apiGet } from "@/lib/api-client";
import { useToday } from "@/lib/use-today";
import type { ProfitReportView } from "@/types/profit";
import { financialYearStart, profitPath } from "./profit-api";
import { ProfitWorkspace } from "./profit-workspace";

// The Actual profit page's client screen, on the backend (/profit). The
// period defaults to this financial year to date.
export function ProfitScreen() {
  const today = useToday();
  const [picked, setPicked] = useState<{ from?: string; to?: string }>({});
  const to = picked.to || today;
  const from = picked.from || (to ? financialYearStart(to) : null);
  const { data, error } = useSWR<ProfitReportView>(from && to && from <= to ? profitPath(from, to) : null, apiGet, { keepPreviousData: true });

  return (
    <div className="flex flex-col gap-3.5">
      <ListToolbar
        actions={
          <>
            <TextField label="From" type="date" value={from ?? ""} max={to ?? undefined} onChange={(event) => setPicked((current) => ({ ...current, from: event.target.value }))} />
            <TextField label="To" type="date" value={to ?? ""} min={from ?? undefined} onChange={(event) => setPicked((current) => ({ ...current, to: event.target.value }))} />
          </>
        }
      >
        <p className="text-sm font-medium text-ink-soft">Sales by invoice date. Overheads by the date they were spent.</p>
      </ListToolbar>
      {data ? <ProfitWorkspace report={data} /> : <LoadNotice error={error} what="actual profit" />}
    </div>
  );
}
