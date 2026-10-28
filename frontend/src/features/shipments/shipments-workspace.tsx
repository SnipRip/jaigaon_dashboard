"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import { documentType } from "@/features/invoices/dispatch-documents";
import type { Invoice } from "@/features/invoices/types";
import { formatDayMonth, formatQuantity } from "@/lib/format";
import { missingFor, nextStage } from "./shipment-rules";
import { ShipmentStageChip } from "./shipment-stage-chip";
import type { Shipment, ShipmentStatus } from "./types";

type StageFilter = "all" | "open" | "border" | "done";

const FILTERS: { value: StageFilter; label: string; statuses?: ShipmentStatus[] }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Planned and loading", statuses: ["planned", "loading"] },
  { value: "border", label: "On the road and at the border", statuses: ["in-transit", "at-border"] },
  { value: "done", label: "Cleared and delivered", statuses: ["cleared", "delivered"] },
];

interface ShipmentsWorkspaceProps {
  shipments: Shipment[];
  invoices: Invoice[];
  /** Customer id → name. */
  customers: Record<string, string>;
}

// Every truck to Bhutan, where it is, and which paper holds it up.
export function ShipmentsWorkspace({ shipments, invoices, customers }: ShipmentsWorkspaceProps) {
  const [filter, setFilter] = useState<StageFilter>("all");
  const [query, setQuery] = useState("");
  const invoicesOf = (shipment: Shipment) => invoices.filter((invoice) => shipment.invoiceIds.includes(invoice.id));
  const needle = query.trim().toLowerCase();
  const statuses = FILTERS.find((option) => option.value === filter)?.statuses;
  const visible = shipments.filter(
    (shipment) =>
      (!statuses || statuses.includes(shipment.status)) &&
      (!needle ||
        `${shipment.number} ${shipment.vehicleNumber} ${customers[shipment.customerId]} ${shipment.destination} ${invoicesOf(shipment)
          .map((invoice) => invoice.number)
          .join(" ")}`
          .toLowerCase()
          .includes(needle)),
  );
  const count = (...wanted: ShipmentStatus[]) => shipments.filter((shipment) => wanted.includes(shipment.status)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Shipments" value={formatQuantity(shipments.length)} />
        <StatTile label="Planned or loading" value={formatQuantity(count("planned", "loading"))} />
        <StatTile label="At the border" value={formatQuantity(count("at-border"))} tone={count("at-border") ? "warning" : undefined} />
        <StatTile label="Delivered" value={formatQuantity(count("delivered"))} tone="success" />
      </div>

      <GlassCard className="flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2.5">
          <Link href="/shipments/new" className={buttonClasses("success")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            New shipment
          </Link>
        </div>
        <SearchField
          id="shipment-search"
          label="Search shipments"
          value={query}
          onChange={setQuery}
          placeholder="Search by shipment, vehicle number, invoice or customer"
          trailing={`${visible.length} of ${shipments.length}`}
          prominent
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <FilterChip key={option.value} selected={filter === option.value} onClick={() => setFilter(option.value)}>
              {option.label}
            </FilterChip>
          ))}
        </div>
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
            {visible.map((shipment) => {
              const carried = invoicesOf(shipment);
              const next = nextStage(shipment.status);
              const missing = next ? missingFor(next, carried) : [];
              return (
                <tr key={shipment.id} className="align-top">
                  <td>
                    <Link href={`/shipments/${shipment.id}`} className="font-bold hover:text-brand hover:underline">
                      {shipment.number}
                    </Link>
                    <div className="text-xs text-muted">{formatDayMonth(shipment.date)}</div>
                  </td>
                  <td>
                    <div className="font-bold">{customers[shipment.customerId]}</div>
                    <div className="text-xs text-muted">to {shipment.destination}</div>
                  </td>
                  <td>
                    <div className="font-bold">{shipment.vehicleNumber}</div>
                    <div className="text-xs text-muted">{shipment.driverName ?? "Driver not set"}</div>
                  </td>
                  <td className="text-xs">
                    {carried.map((invoice) => (
                      <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block font-bold text-brand hover:underline">
                        {invoice.number}
                      </Link>
                    ))}
                  </td>
                  <td>
                    <ShipmentStageChip status={shipment.status} />
                  </td>
                  <td className="text-xs">
                    {!next ? (
                      <span className="text-success-strong">Done</span>
                    ) : missing.length ? (
                      <span className="text-warning-strong">
                        {[...new Set(missing.map(({ kind }) => documentType(kind).name))].join(", ")}
                      </span>
                    ) : (
                      <span className="text-ink-soft">Ready to move on</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">No shipments match.</p>}
      </GlassCard>
    </div>
  );
}
