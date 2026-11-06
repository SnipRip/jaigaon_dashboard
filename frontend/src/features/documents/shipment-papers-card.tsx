import { Check } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { ShipmentStageChip } from "@/features/shipments/shipment-stage-chip";
import { STATUS_OF } from "@/features/shipments/shipments-api";
import { formatDate } from "@/lib/format";
import type { DispatchDocumentKindView } from "@/types/invoice";
import type { PaperCellView, ShipmentPapersView } from "@/types/document-register";
import { NEEDED_BY_LABEL, PAPER_SHORT_NAMES } from "./documents-api";

/** Export papers in the order they happen; one column each. */
const COLUMNS = Object.keys(PAPER_SHORT_NAMES) as DispatchDocumentKindView[];

function PaperCell({ cell }: { cell: PaperCellView | undefined }) {
  if (!cell || cell.state === "OPTIONAL") return <span className="text-xs font-medium text-muted">Not needed</span>;
  if (cell.state === "MISSING") {
    return (
      <span title={`${NEEDED_BY_LABEL[cell.neededBy]}${cell.holdsTruck ? ": holds the truck" : ""}`}>
        <StatusChip tone={cell.holdsTruck ? "danger" : "warning"}>{cell.holdsTruck ? "Holds" : "Missing"}</StatusChip>
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-[76px] items-center gap-1" title={`${cell.number} · ${formatDate(cell.date)}`}>
      <Check aria-hidden="true" className="size-3.5 shrink-0 text-success-strong" />
      <span className="truncate font-mono text-[12px] tabular-nums">{cell.number}</span>
    </span>
  );
}

// One truck with its invoices and every paper on each: the number when it is
// attached, whether a missing one holds the truck's next step, or not needed
// (an e-way bill at or under ₹50,000).
export function ShipmentPapersCard({ shipment }: { shipment: ShipmentPapersView }) {
  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link href={`/shipments/${shipment.id}`} className="text-[15px] font-semibold text-brand hover:underline">
          {shipment.number}
        </Link>
        <ShipmentStageChip status={STATUS_OF[shipment.stage]} />
        <span className="text-xs font-semibold text-muted">
          {shipment.partyName} · {shipment.vehicleNumber} · loaded {formatDate(shipment.date)}
        </span>
      </div>
      <GlassTable className="min-w-[640px]">
        <thead>
          <tr>
            <th scope="col" className="text-left">Invoice</th>
            {COLUMNS.map((kind) => (
              <th key={kind} scope="col" className="text-left">
                {PAPER_SHORT_NAMES[kind]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-semibold">
          {shipment.invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <Link href={`/invoices/${invoice.id}`} className="font-semibold text-brand hover:underline">
                  {invoice.number}
                </Link>
                {invoice.status === "CANCELLED" && <div className="text-xs text-muted">Cancelled</div>}
              </td>
              {COLUMNS.map((kind) => (
                <td key={kind}>
                  <PaperCell cell={invoice.papers.find((cell) => cell.kind === kind)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </GlassTable>
      <p className="text-xs font-medium text-muted">Holds: the truck cannot take its next step until this paper is attached. Missing: needed later.</p>
    </GlassCard>
  );
}
