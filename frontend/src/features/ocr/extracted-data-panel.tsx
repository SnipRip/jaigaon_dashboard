import { Button } from "@/components/ui/button";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { StatusChip } from "@/components/ui/status-chip";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  CHAIN_TONE,
  DOCUMENT_TYPES,
  LOW_CONFIDENCE_BELOW,
  type ChainLink,
  type DocumentType,
  type ExtractedField,
} from "./sample-data";

interface ExtractedDataPanelProps {
  detectedType: DocumentType;
  fields: ExtractedField[];
  shipment: { reference: string; matchedOn: string };
  chain: ChainLink[];
}

// The verification form from SOW section 12: review and correct what OCR
// read, see which shipment it matched, then approve, re-process or reject.
// The actions are disabled until the OCR pipeline exists on the backend.
export function ExtractedDataPanel({ detectedType, fields, shipment, chain }: ExtractedDataPanelProps) {
  const fieldsToCheck = fields.filter((field) => field.confidence < LOW_CONFIDENCE_BELOW).length;

  return (
    <GlassCard aria-label="Extracted data" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <CardTitle>Extracted data</CardTitle>
        {fieldsToCheck > 0 && (
          <StatusChip tone="warning">
            {fieldsToCheck} {fieldsToCheck === 1 ? "field needs" : "fields need"} checking
          </StatusChip>
        )}
      </div>

      <form className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <SelectField
          label="Document type"
          defaultValue={detectedType}
          options={DOCUMENT_TYPES.map((type) => ({ value: type, label: type }))}
        />
        {fields.map((field) => {
          const isLow = field.confidence < LOW_CONFIDENCE_BELOW;
          return (
            <TextField
              key={field.key}
              label={field.label}
              defaultValue={field.value}
              hint={isLow ? `Check this: ${field.confidence}% confidence` : undefined}
              className={isLow ? "border-2 !border-warning bg-warning-tint/60" : undefined}
            />
          );
        })}
      </form>

      <div className="flex flex-col gap-2.5 border-t border-line pt-4">
        <h3 className="text-sm font-semibold">Matched to shipment {shipment.reference}</h3>
        <p className="text-[13px] font-semibold text-muted">
          Matched on {shipment.matchedOn}. Approving adds this document to the shipment&apos;s chain.
        </p>
        <ul className="flex flex-wrap gap-2">
          {chain.map((link) => (
            <li key={link.label}>
              <StatusChip tone={CHAIN_TONE[link.state]}>
                {link.label} · {link.state === "current" ? "this document" : link.state}
              </StatusChip>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2.5 border-t border-line pt-4">
        <Button variant="success" disabled size="lg" className="flex-[2_1_200px]">
          Approve and link to {shipment.reference}
        </Button>
        <Button variant="neutral" disabled size="lg" className="flex-[1_1_120px]">
          Re-process
        </Button>
        <Button variant="danger" disabled size="lg" className="flex-[1_1_120px]">
          Reject
        </Button>
      </div>
      <p className="text-xs font-semibold text-muted">
        Nothing is saved to invoices, stock or shipments until a document is approved. These actions switch on when
        the OCR module is built.
      </p>
    </GlassCard>
  );
}
