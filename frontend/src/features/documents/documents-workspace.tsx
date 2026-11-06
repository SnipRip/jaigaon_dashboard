"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatTile } from "@/components/ui/stat-tile";
import { ViewTabs } from "@/components/ui/view-tabs";
import { formatQuantity } from "@/lib/format";
import type { DocumentRegisterView } from "@/types/document-register";
import { MissingPapersCard } from "./missing-papers-card";
import { RegisterTableCard } from "./register-table-card";
import { ShipmentPapersCard } from "./shipment-papers-card";

type View = "register" | "shipments";

// The export documents register (SOW 12): every document number, each
// truck's papers per invoice, and the required papers still to attach.
export function DocumentsWorkspace({ register }: { register: DocumentRegisterView }) {
  const [view, setView] = useState<View>("register");
  const { entries, missing, shipments } = register;
  const holding = missing.filter((paper) => paper.holdsTruck).length;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Documents on record" value={formatQuantity(entries.length)} />
        <StatTile label="Required, not attached" value={formatQuantity(missing.length)} tone={missing.length ? "warning" : undefined} />
        <StatTile label="Holding a truck" value={formatQuantity(holding)} tone={holding ? "danger" : undefined} />
        <StatTile label="Shipping bills and LEOs" value={formatQuantity(entries.filter((entry) => entry.kind === "SHIPPING_BILL" || entry.kind === "LEO").length)} />
      </div>

      <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <ViewTabs
            label="Documents view"
            value={view}
            onChange={setView}
            tabs={[
              { value: "register", label: "Every document", count: entries.length },
              { value: "shipments", label: "By shipment", count: shipments.length },
            ]}
          />
          {view === "register" ? (
            <RegisterTableCard entries={entries} />
          ) : shipments.length === 0 ? (
            <GlassCard>
              <p className="py-6 text-center text-[13px] text-muted">No shipments yet.</p>
            </GlassCard>
          ) : (
            shipments.map((shipment) => <ShipmentPapersCard key={shipment.id} shipment={shipment} />)
          )}
        </div>
        <MissingPapersCard missing={missing} />
      </div>
    </div>
  );
}
