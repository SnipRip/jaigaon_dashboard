"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { GlassModal } from "@/components/ui/glass-modal";
import { TextField } from "@/components/ui/text-field";
import type { BulkChange } from "./price-edits";

interface BulkChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How many rows the change applies to. */
  count: number;
  onApply: (change: BulkChange) => void;
}

const KINDS: { value: BulkChange["kind"]; label: string; field: string; hint: string }[] = [
  { value: "amount", label: "Change by ₹", field: "Change per unit (₹)", hint: "Negative lowers the price: -2.50" },
  { value: "percent", label: "Change by %", field: "Change (%)", hint: "Negative lowers the price: -3" },
  { value: "margin", label: "Set margin", field: "Margin (%)", hint: "Price worked out from each row's cost" },
];

// One change to many rows at once (+₹5 on every TMT bar, margin 10% on a
// category). It fills the rows' cells; nothing saves until Save changes.
export function BulkChangeDialog({ open, onOpenChange, count, onApply }: BulkChangeDialogProps) {
  const [kind, setKind] = useState<BulkChange["kind"]>("amount");
  const [text, setText] = useState("");
  const value = Number(text.trim());
  const valid = /^-?\d+(\.\d{1,2})?$/.test(text.trim()) && (kind !== "margin" || (value >= -100 && value < 100));
  const chosen = KINDS.find((candidate) => candidate.value === kind)!;

  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      title="Change prices together"
      description={`Applies to ${count} ${count === 1 ? "row" : "rows"}. Check them in the table, then save.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onApply({ kind, value });
              onOpenChange(false);
              setText("");
            }}
          >
            Apply to {count}
          </Button>
        </div>
      }
    >
      <FilterGroup label="Kind of change">
        {KINDS.map((candidate) => (
          <FilterChip key={candidate.value} selected={kind === candidate.value} onClick={() => setKind(candidate.value)}>
            {candidate.label}
          </FilterChip>
        ))}
      </FilterGroup>
      <TextField
        label={chosen.field}
        inputMode="decimal"
        autoFocus
        value={text}
        hint={chosen.hint}
        error={text && !valid ? (kind === "margin" ? "A margin from -100 to under 100, up to 2 decimals" : "A number, up to 2 decimals") : undefined}
        onChange={(event) => setText(event.target.value)}
      />
    </GlassModal>
  );
}
