"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { LoadNotice } from "@/components/ui/load-notice";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { apiGet } from "@/lib/api-client";
import { formatDate, formatQuantity } from "@/lib/format";
import type { TransporterView } from "@/types/transporter";
import { TRANSPORTERS_PATH, withArchived } from "./masters-api";

type Filter = "all" | "gta" | "no-gstin" | "archived";

const FILTERS: { value: Filter; label: string; test?: (transporter: TransporterView) => boolean }[] = [
  { value: "all", label: "All" },
  { value: "gta", label: "Reverse charge (GTA)", test: (transporter) => transporter.isGta },
  { value: "no-gstin", label: "Without GSTIN", test: (transporter) => !transporter.gstin },
  { value: "archived", label: "Archived" },
];

/** How their freight bills are taxed, from the vendor record. */
function freightGst(transporter: TransporterView): { label: string; tone: StatusTone } {
  if (transporter.isGta) return { label: "Reverse charge (GTA)", tone: "warning" };
  if (transporter.treatment === "REGISTERED") return { label: "Forward charge", tone: "neutral" };
  if (transporter.treatment === "COMPOSITION") return { label: "Composition, no GST", tone: "neutral" };
  return { label: "No GST bill", tone: "neutral" };
}

const matches = (transporter: TransporterView, needle: string) =>
  !needle || [transporter.displayName, transporter.gstin, transporter.phone, transporter.contactPerson].some((text) => text?.toLowerCase().includes(needle));

// Transporters (real): a view of the vendors who carry our goods, not a
// table of its own. A vendor shows here when it bills freight as a GTA, has
// a hired vehicle on the vehicle master or carried a shipment. Name, GSTIN
// and GTA are edited on the vendor record; trucks on the vehicle master.
export function TransportersMaster() {
  const { data, error } = useSWR<TransporterView[]>(withArchived(TRANSPORTERS_PATH), apiGet);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  if (!data) return <LoadNotice error={error} what="transporters" />;

  const live = data.filter((transporter) => !transporter.isArchived);
  const shown = filter === "archived" ? data.filter((transporter) => transporter.isArchived) : live;
  const test = FILTERS.find((option) => option.value === filter)?.test;
  const needle = query.trim().toLowerCase();
  const visible = shown.filter((transporter) => (!test || test(transporter)) && matches(transporter, needle));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Transporters" value={formatQuantity(live.length)} />
        <StatTile label="Under reverse charge" value={formatQuantity(live.filter((transporter) => transporter.isGta).length)} />
        <StatTile label="Without GSTIN" value={formatQuantity(live.filter((transporter) => !transporter.gstin).length)} />
        <StatTile label="Vehicles on record" value={formatQuantity(live.reduce((sum, transporter) => sum + transporter.vehicleCount, 0))} />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <>
              <Link href="/masters/vehicles" className={buttonClasses("outline", undefined, "lg")}>
                Vehicles
              </Link>
              <Link href="/vendors/new" className={buttonClasses("primary", undefined, "lg")}>
                <Plus aria-hidden="true" />
                New vendor
              </Link>
            </>
          }
        >
          <SearchField
            className="max-w-[340px] flex-[1_1_240px]"
            id="transporter-search"
            label="Search transporters"
            value={query}
            onChange={setQuery}
            placeholder="Search by name, GSTIN or phone"
            trailing={`${visible.length} of ${shown.length}`}
          />
          <FilterGroup label="Show">
            {FILTERS.map((option) => (
              <FilterChip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
                {option.label}
              </FilterChip>
            ))}
          </FilterGroup>
        </ListToolbar>

        <GlassTable className="min-w-[860px]">
          <thead>
            <tr className="text-right">
              <th scope="col" className="text-left">Transporter</th>
              <th scope="col" className="text-left">Transporter ID (e-way bill)</th>
              <th scope="col" className="text-left">Freight GST</th>
              <th scope="col">Vehicles</th>
              <th scope="col">Shipments</th>
              <th scope="col">Last shipment</th>
            </tr>
          </thead>
          <tbody className="text-right font-semibold tabular-nums">
            {visible.map((transporter) => {
              const gst = freightGst(transporter);
              return (
                <tr key={transporter.id} className="align-top">
                  <td className="text-left">
                    <Link href={`/vendors/${transporter.id}`} className="font-semibold hover:text-brand hover:underline">
                      {transporter.displayName}
                    </Link>
                    <div className="text-xs text-muted">{[transporter.contactPerson, transporter.phone].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="text-left">
                    {transporter.gstin ?? (
                      <>
                        <span className="text-muted">No GSTIN</span>
                        <div className="text-xs font-normal text-muted">E-way bill by vehicle number</div>
                      </>
                    )}
                  </td>
                  <td className="text-left">
                    <StatusChip tone={gst.tone}>{gst.label}</StatusChip>
                  </td>
                  <td className={transporter.vehicleCount ? undefined : "text-muted"}>{formatQuantity(transporter.vehicleCount)}</td>
                  <td className={transporter.shipmentCount ? undefined : "text-muted"}>{formatQuantity(transporter.shipmentCount)}</td>
                  <td className={transporter.lastShipmentDate ? undefined : "text-muted"}>
                    {transporter.lastShipmentDate ? formatDate(transporter.lastShipmentDate) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No transporters match.</p>}
      </GlassCard>
      <p className="text-[13px] text-muted">
        A vendor shows here once it is marked GTA, has a hired vehicle on the vehicle master or has carried a shipment. Edit the name, GSTIN and GTA on the vendor record.
      </p>
    </div>
  );
}
