"use client";

import { SelectField } from "@/components/ui/select-field";
import type { UnitChoice } from "./line-units";

interface LineUnitSelectProps {
  /** From unitChoices(): the base unit first. Empty before an item is picked. */
  choices: UnitChoice[];
  /** The line's unit; blank = the base unit. */
  value: string;
  /** Gets the picked unit and its factor. */
  onChange: (unit: string, factor: number) => void;
}

// The unit a quotation, invoice, order or bill line is entered in. Locked to
// the base unit when the item has no other units.
export function LineUnitSelect({ choices, value, onChange }: LineUnitSelectProps) {
  const current = choices.find((choice) => choice.unit === value)?.unit ?? choices[0]?.unit;
  return (
    <SelectField
      label="Unit"
      options={choices.map((choice) => ({ value: choice.unit, label: choice.unit }))}
      value={current}
      disabled={choices.length <= 1}
      onValueChange={(unit) => onChange(unit, choices.find((choice) => choice.unit === unit)?.factor ?? 1)}
    />
  );
}
