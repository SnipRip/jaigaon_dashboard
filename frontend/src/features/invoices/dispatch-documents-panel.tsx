"use client";

import clsx from "clsx";
import { CircleCheck, CircleDashed, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { StatusChip } from "@/components/ui/status-chip";
import { AttachDocumentForm } from "./attach-document-form";
import { documentsFor, type DispatchDocumentType } from "./dispatch-documents";
import { isDocumentRequired, realisationDueDate } from "./invoice-rules";
import type { DispatchDocument, DispatchDocumentKind, Invoice } from "./types";
import { formatDate } from "@/lib/format";

interface DispatchDocumentsPanelProps {
  invoice: Invoice;
  grandTotal: number;
  /** B2B and export invoices need an IRN; see needsEinvoice. */
  einvoice: boolean;
  onChange: (kind: DispatchDocumentKind, document: DispatchDocument) => void;
}

const STAGES = ["E-invoice", "Dispatch", "Customs", "Payment"] as const;

// Everything that follows the bill, in the order it happens. An export is
// complete when every row is ticked; a local invoice only needs the e-way
// bill above ₹50,000.
export function DispatchDocumentsPanel({ invoice, grandTotal, einvoice, onChange }: DispatchDocumentsPanelProps) {
  const [editing, setEditing] = useState<DispatchDocumentType | null>(null);
  const types = documentsFor(invoice.kind);
  const isRequired = (type: DispatchDocumentType) => isDocumentRequired(type.kind, invoice, grandTotal, einvoice);
  const required = types.filter(isRequired);
  const done = required.filter((type) => invoice.documents[type.kind]).length;
  const canAttach = invoice.status === "issued";

  const suggestions: Record<string, string> = {
    date: invoice.date,
    vehicle: invoice.vehicleNumber ?? "",
    fobValue: invoice.kind === "export" ? String(grandTotal) : "",
    amount: String(grandTotal),
    portCode: "INJIGB",
  };

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>{invoice.kind === "export" ? "Export documents" : "Transport documents"}</CardTitle>
        <StatusChip tone={done === required.length ? "success" : "warning"}>
          {done} of {required.length} attached
        </StatusChip>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
        <div className="h-full rounded-full bg-success" style={{ width: `${required.length ? (done / required.length) * 100 : 100}%` }} />
      </div>
      {!canAttach && <p className="text-sm font-semibold text-muted">Documents are attached once the invoice is issued.</p>}

      {STAGES.map((stage) => {
        const inStage = types.filter((type) => type.stage === stage);
        if (inStage.length === 0 || (stage === "E-invoice" && !einvoice)) return null;
        return (
          <section key={stage} className="flex flex-col gap-2">
            <h3 className="text-xs font-extrabold tracking-wide text-muted uppercase">{stage}</h3>
            <ul className="flex flex-col gap-2">
              {inStage.map((type) => {
                const document = invoice.documents[type.kind];
                return (
                  <li key={type.kind} className={clsx("glass-inset flex items-start gap-3 rounded-[18px] p-3", !document && isRequired(type) && "ring-1 ring-warning/30 ring-inset")}>
                    {document ? (
                      <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                    ) : (
                      <CircleDashed aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold">{type.name}</span>
                        {!isRequired(type) && <StatusChip tone="neutral">Optional</StatusChip>}
                      </div>
                      {document ? (
                        <span className="text-xs font-semibold text-ink-soft tabular-nums">
                          {document.number} · {formatDate(document.date)}
                          {type.fields
                            .filter((field) => document.details[field.key])
                            .map((field) => ` · ${field.label.replace(/ \(.+\)$/, "")} ${document.details[field.key]}`)
                            .join("")}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted">{type.purpose}</span>
                      )}
                      {type.kind === "brc" && !document && invoice.status === "issued" && (
                        <span className="text-xs font-bold text-warning-strong">
                          Payment due in by {formatDate(realisationDueDate(invoice))} (FEMA period; confirm with the bank)
                        </span>
                      )}
                    </div>
                    <Button
                      variant={document ? "neutral" : "outline"}
                      disabled={!canAttach}
                      onClick={() => setEditing(type)}
                      aria-label={document ? `Edit ${type.name}` : `Attach ${type.name}`}
                      className={document ? "w-11 px-0" : undefined}
                    >
                      {document ? <Pencil aria-hidden="true" className="size-4" /> : "Attach"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <GlassModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? `${invoice.documents[editing.kind] ? "Edit" : "Attach"} ${editing.name.toLowerCase()}` : ""}
        description={editing ? `${editing.purpose}. For invoice ${invoice.number}.` : undefined}
      >
        {editing && (
          <AttachDocumentForm
            type={editing}
            existing={invoice.documents[editing.kind]}
            suggestions={suggestions}
            onCancel={() => setEditing(null)}
            onSave={(document) => {
              onChange(editing.kind, document);
              setEditing(null);
            }}
          />
        )}
      </GlassModal>
    </GlassCard>
  );
}
