"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDayMonth, formatQuantity } from "@/lib/format";
import type { ShipmentStageView, ShipmentView } from "@/types/shipment";
import { ShipmentStageChip } from "./shipment-stage-chip";
import { documentName, STATUS_OF } from "./shipments-api";

type StageFilter = "all" | "open" | "border" | "done" | "cancelled";

const FILTERS: { value: StageFilter; label: string; stages?: ShipmentStageView[] }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Planned and loading", stages: ["PLANNED", "LOADING"] },
  { value: "border", label: "On the road and at the border", stages: ["IN_TRANSIT", "AT_BORDER"] },
  { value: "done", label: "Cleared and delivered", stages: ["CLEARED", "DELIVERED"] },
  { value: "cancelled", label: "Cancelled" },
];

// Every truck to Bhutan, where it is, and which paper holds it up.
export function ShipmentsWorkspace({ shipments }: { shipments: ShipmentView[] }) {
  const [filter, setFilter] = useState<StageFilter>("all");
  const [query, setQuery] = useState("");
  const live = shipments.filter((shipment) => !shipment.cancelledAt);
  const needle = query.trim().toLowerCase();
  const stages = FILTERS.find((option) => option.value === filter)?.stages;
  const visible = shipments.filter(
    (shipment) =>
      (filter === "cancelled" ? Boolean(shipment.cancelledAt) : filter === "all" || (!shipment.cancelledAt && stages!.includes(shipment.stage))) &&
      (!needle ||
        `${shipment.number} ${shipment.vehicleNumber} ${shipment.partyName} ${shipment.destination} ${shipment.invoices.map((invoice) => invoice.number).join(" ")}`
          .toLowerCase()
          .includes(needle)),
  );
  const count = (...wanted: ShipmentStageView[]) => live.filter((shipment) => wanted.includes(shipment.stage)).length;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Shipments" value={formatQuantity(live.length)} />
        <StatTile label="Planned or loading" value={formatQuantity(count("PLANNED", "LOADING"))} />
        <StatTile label="At the border" value={formatQuantity(count("AT_BORDER"))} tone={count("AT_BORDER") ? "warning" : undefined} />
        <StatTile label="Delivered" value={formatQuantity(count("DELIVERED"))} tone="success" />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <Link href="/shipments/new" className={buttonClasses("success", undefined, "lg")}>
              <Plus aria-hidden="true" />
              New shipment
            </Link>
          }
        >
          <SearchField
            className="max-w-[340px] flex-[1_1_240px]"
            id="shipment-search"
            label="Search shipments"
            value={query}
            onChange={setQuery}
            placeholder="Search by shipment, vehicle number, invoice or buyer"
            trailing={`${visible.length} of ${shipments.length}`}
          />
          <FilterGroup label="Stage">
            {FILTERS.map((option) => (
              <FilterChip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
                {option.label}
              </FilterChip>
            ))}
          </FilterGroup>
        </ListToolbar>
        <GlassTable className="min-w-[920px]">
          <thead>
            <tr>
              <th scope="col" className="text-left">Shipment</th>
              <th scope="col" className="text-left">Buyer</th>
              <th scope="col" className="text-left">Vehicle</th>
              <th scope="col" className="text-left">Invoices</th>
              <th scope="col" className="text-left">Stage</th>
              <th scope="col" className="text-left">Holding it up</th>
            </tr>
          </thead>
          <tbody className="font-semibold">
            {visible.map((shipment) => (
              <tr key={shipment.id} className="align-top">
                <td>
                  <Link href={`/shipments/${shipment.id}`} className="font-semibold hover:text-brand hover:underline">
                    {shipment.number}
                  </Link>
                  <div className="text-xs text-muted">{formatDayMonth(shipment.date)}</div>
                </td>
                <td>
                  <div className="font-semibold">{shipment.partyName}</div>
                  <div className="text-xs text-muted">to {shipment.destination}</div>
                </td>
                <td>
                  <div className="font-semibold">{shipment.vehicleNumber}</div>
                  <div className="text-xs text-muted">{shipment.driverName ?? "Driver not set"}</div>
                </td>
                <td className="text-xs">
                  {shipment.invoices.map((invoice) => (
                    <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block font-semibold text-brand hover:underline">
                      {invoice.number}
                    </Link>
                  ))}
                </td>
                <td>{shipment.cancelledAt ? <StatusChip tone="neutral">Cancelled</StatusChip> : <ShipmentStageChip status={STATUS_OF[shipment.stage]} />}</td>
                <td className="text-xs">
                  {shipment.cancelledAt ? (
                    <span className="text-muted">–</span>
                  ) : !shipment.next ? (
                    <span className="text-success-strong">Done</span>
                  ) : shipment.next.missing.length ? (
                    <span className="text-warning-strong">{[...new Set(shipment.next.missing.map(({ kind }) => documentName(kind)))].join(", ")}</span>
                  ) : (
                    <span className="text-ink-soft">Ready to move on</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">{shipments.length ? "No shipments match." : "No shipments yet."}</p>}
      </GlassCard>
    </div>
  );
}
