"use client";

import clsx from "clsx";
import { Check, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { ShipmentView } from "@/types/shipment";
import { SHIPMENT_STAGES, stageIndex, stageLabel } from "./shipment-rules";
import { advanceShipment, documentName, STATUS_OF, stepBackShipment } from "./shipments-api";

// Where the truck is: each stage with the date it was reached, what the next
// stage still needs (papers on the invoices), and the move itself with its
// date and a note. The last move can be undone when made by mistake.
export function ShipmentStageCard({ shipment, onChanged }: { shipment: ShipmentView; onChanged: (next: ShipmentView) => Promise<void> }) {
  const today = useToday();
  // Blank until typed: the move is dated today.
  const [typedDate, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const live = !shipment.cancelledAt;
  const current = stageIndex(STATUS_OF[shipment.stage]);
  const finished = current === SHIPMENT_STAGES.length - 1;
  const next = shipment.next;
  const blockers = next?.missing ?? [];
  // Each missing paper once, with the invoices it is missing on.
  const byKind = [...Map.groupBy(blockers, (blocker) => blocker.kind)];

  const date = typedDate || today || "";

  const run = async (action: () => Promise<ShipmentView>) => {
    setBusy(true);
    setProblem(null);
    try {
      await onChanged(await action());
      setNote("");
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="flex flex-col gap-3">
      <CardTitle>Where it is</CardTitle>
      <ol className="flex flex-col">
        {SHIPMENT_STAGES.map((stage, index) => {
          const event = shipment.events.find((candidate) => STATUS_OF[candidate.stage] === stage.status);
          // The last stage, once reached, is finished rather than in progress.
          const done = index < current || (finished && index === current);
          const isCurrent = index === current && !finished && live;
          return (
            <li key={stage.status} className="relative flex gap-2.5 pb-3.5 last:pb-0">
              {/* The line down to the next stage: green once this stage is passed. */}
              {index < SHIPMENT_STAGES.length - 1 && (
                <span aria-hidden="true" className={clsx("absolute top-5 bottom-0 left-[9px] w-0.5", done ? "bg-success" : "bg-ink/12")} />
              )}
              <span
                aria-hidden="true"
                className={clsx(
                  "relative flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  done && "border-success bg-success text-white",
                  isCurrent && "border-brand bg-white shadow-[0_0_0_3px_rgb(11_77_187/0.18)]",
                  !done && !isCurrent && "border-ink/20 bg-white",
                )}
              >
                {done && <Check strokeWidth={3} className="size-3" />}
                {isCurrent && <span className="size-2 rounded-full bg-brand" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={clsx("text-[13px] leading-5", done || isCurrent ? "font-semibold" : "font-medium text-muted")}>
                  {stage.label}
                  {index === current && <span className="sr-only"> (current)</span>}
                </span>
                <span className="text-xs font-semibold text-muted">
                  {event ? `${formatDate(event.date)}${event.note ? ` · ${event.note}` : ""}${event.by ? ` · ${event.by}` : ""}` : stage.hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {live && next && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-3">
          {blockers.length > 0 ? (
            <p className="rounded-(--radius-tile) bg-warning-tint px-4 py-3 text-sm font-semibold text-warning-strong">
              Before {stageLabel(STATUS_OF[next.stage]).toLowerCase()}: attach{" "}
              {byKind.map(([kind, missing], index) => (
                <span key={kind}>
                  {index > 0 && ", "}
                  {documentName(kind)}
                  {" on "}
                  {missing.map(({ invoiceId, invoice }, at) => (
                    <span key={invoiceId}>
                      {at > 0 && " and "}
                      <Link href={`/invoices/${invoiceId}`} className="font-semibold underline">
                        {invoice}
                      </Link>
                    </span>
                  ))}
                </span>
              ))}
              .
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-[150px_minmax(0,1fr)] xl:grid-cols-1">
              <TextField label="Date" type="date" value={date} max={today ?? undefined} onChange={(event) => setDate(event.target.value)} />
              <TextField label="Note (optional)" value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} placeholder="LEO number, who signed" />
            </div>
          )}
          <Button
            variant="success"
            disabled={blockers.length > 0 || busy || !date}
            onClick={() => run(() => advanceShipment(shipment.id, { stage: next.stage, date, note: note.trim() || null }))}
          >
            Move to {stageLabel(STATUS_OF[next.stage]).toLowerCase()}
          </Button>
        </div>
      )}
      {live && shipment.stage !== "PLANNED" && (
        <Button variant="neutral" disabled={busy} onClick={() => run(() => stepBackShipment(shipment.id))}>
          <Undo2 aria-hidden="true" />
          Undo {stageLabel(STATUS_OF[shipment.stage]).toLowerCase()}
        </Button>
      )}
      {problem && <FormMessage tone="error">{problem}</FormMessage>}
    </GlassCard>
  );
}
