"use client";

import { clsx } from "clsx";
import { useState } from "react";
import useSWR from "swr";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { LoadNotice } from "@/components/ui/load-notice";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { apiGet } from "@/lib/api-client";
import { financialYearOf } from "@/lib/financial-year";
import { formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { NumberedKind, NumberSeriesView } from "@/types/number-series";
import { isMasterCode, KINDS, METHODS, resetLabel } from "./number-kinds";
import { seriesListPath } from "./number-series-api";
import { SeriesPanel } from "./series-panel";

// Every numbered kind in one list, grouped; the selected one's formats and
// settings below. Formats follow Tally's "applicable from" prefixes: a new
// format from a date, never an edit of one that has given out numbers.
export function NumberSeriesScreen() {
  const today = useToday();
  const { data, error, mutate } = useSWR<NumberSeriesView[]>(today ? seriesListPath(today) : null, apiGet);
  const [selected, setSelected] = useState<NumberedKind>("SALES_INVOICE");
  if (!data || !today) return <LoadNotice error={error} what="number series" />;

  const documents = data.filter((series) => !isMasterCode(series.kind));
  const setUp = data.filter((series) => series.current).length;
  const active = data.find((series) => series.kind === selected) ?? data[0];
  const groups = [...new Set(data.map((series) => KINDS[series.kind].group))];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Financial year" value={financialYearOf(today)} />
        <StatTile label="Set up" value={`${setUp} of ${data.length}`} tone={setUp < data.length ? "warning" : undefined} />
        <StatTile label="Numbers this year" value={formatQuantity(documents.reduce((sum, series) => sum + series.issued.total, 0))} />
        <StatTile label="Cancelled this year" value={formatQuantity(documents.reduce((sum, series) => sum + series.issued.cancelled, 0))} />
      </div>

      <GlassCard className="flex flex-col gap-3">
        <GlassTable className="min-w-[760px]">
          <thead>
            <tr>
              <th scope="col" className="text-left">Numbering</th>
              <th scope="col" className="text-left">Format in force</th>
              <th scope="col" className="text-left">Next number</th>
              <th scope="col" className="text-left">Restarts</th>
              <th scope="col" className="text-left">Given</th>
              <th scope="col" className="text-right">This year</th>
              <th scope="col" className="text-left">Tally voucher</th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group} className="font-semibold tabular-nums">
              <tr>
                <th scope="rowgroup" colSpan={7} className="pt-3 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  {group}
                </th>
              </tr>
              {data
                .filter((series) => KINDS[series.kind].group === group)
                .map((series) => {
                  const format = series.formats.find((candidate) => candidate.id === series.current?.formatId);
                  return (
                    <tr key={series.id} className={clsx(series.kind === active.kind && "bg-brand-tint/45")}>
                      <td className="text-left">
                        <button
                          type="button"
                          aria-pressed={series.kind === active.kind}
                          onClick={() => setSelected(series.kind)}
                          className="text-left font-semibold hover:text-brand hover:underline"
                        >
                          {KINDS[series.kind].label}
                        </button>
                      </td>
                      <td className="text-left whitespace-nowrap">{format ? <code>{format.pattern}</code> : <span className="text-muted">–</span>}</td>
                      <td className="text-left whitespace-nowrap">
                        {series.current ? series.current.next : <StatusChip tone="warning">Not set up</StatusChip>}
                      </td>
                      <td className="text-left text-muted">{format ? resetLabel(format.reset) : "–"}</td>
                      <td className="text-left text-muted">{METHODS.find((method) => method.value === series.method)?.short}</td>
                      <td className="text-right whitespace-nowrap">
                        {series.issued.total}
                        {series.issued.cancelled > 0 && <span className="text-xs text-muted"> · {series.issued.cancelled} cancelled</span>}
                      </td>
                      <td className="text-left text-muted">{series.tallyVoucherType ?? "–"}</td>
                    </tr>
                  );
                })}
            </tbody>
          ))}
        </GlassTable>
        <p className="text-xs font-semibold text-muted">
          Every number is kept, cancelled ones too, and never given twice: GST documents within the financial year (local and
          export invoices together, as the e-invoice portal checks them), codes for ever. In Tally, set these voucher types to
          Manual or Automatic (Manual Override) so synced entries keep these numbers.
        </p>
      </GlassCard>

      <SeriesPanel key={active.id} series={active} today={today} onChanged={mutate} />
    </div>
  );
}
