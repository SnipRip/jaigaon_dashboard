import clsx from "clsx";
import Link from "next/link";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { STATUS_TEXT } from "@/components/ui/status-chip";
import type { ShipmentRow } from "./types";

interface ShipmentsCardProps {
  counts: { label: string; count: number }[];
  shipments: ShipmentRow[];
}

// Trucks to Bhutan by stage, and the latest ones with what holds each up.
export function ShipmentsCard({ counts, shipments }: ShipmentsCardProps) {
  return (
    <GlassCard className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <CardTitle>Bhutan shipments</CardTitle>
        <Link href="/shipments" className="ml-auto text-xs font-semibold text-brand hover:underline">
          All shipments
        </Link>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {counts.map(({ label, count }) => (
          <div key={label} className="flex flex-col-reverse glass-inset px-1 py-2.5">
            <dt className="text-xs font-semibold text-muted">{label}</dt>
            <dd className="text-lg leading-tight font-semibold tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      {shipments.map((shipment) => (
        <Link key={shipment.id} href={`/shipments/${shipment.id}`} className="group flex flex-col gap-1 border-t border-line pt-2.5">
          <div className="flex justify-between gap-2 text-[13px] font-semibold">
            <span className="group-hover:text-brand group-hover:underline">
              {shipment.number} · {shipment.vehicle}
            </span>
            <span className={clsx("whitespace-nowrap", STATUS_TEXT[shipment.tone])}>{shipment.status}</span>
          </div>
          <span className="text-xs font-semibold text-muted">{shipment.detail}</span>
        </Link>
      ))}
    </GlassCard>
  );
}
