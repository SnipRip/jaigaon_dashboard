import { Minus, Plus } from "lucide-react";

const STEP_BUTTON = "flex h-full w-10 shrink-0 items-center justify-center text-ink-soft hover:bg-white/70 disabled:text-ink/30";

interface QuantityStepperProps {
  id: string;
  /** What is being counted, read out with the minus and plus buttons. */
  itemName: string;
  value: number;
  onChange: (value: number) => void;
}

/** Quantity input with its own minus and plus buttons instead of the browser's spinner. */
export function QuantityStepper({ id, itemName, value, onChange }: QuantityStepperProps) {
  const change = (next: number) => onChange(Math.max(0, next));

  return (
    <div className="glass-field flex h-11 shrink-0 items-center overflow-hidden focus-within:border-brand">
      <button type="button" aria-label={`Decrease quantity, ${itemName}`} disabled={value <= 0} onClick={() => change(value - 1)} className={STEP_BUTTON}>
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(event) => change(Number(event.target.value))}
        className="h-full w-12 border-x border-line bg-transparent text-center text-sm font-bold text-ink tabular-nums"
      />
      <button type="button" aria-label={`Increase quantity, ${itemName}`} onClick={() => change(value + 1)} className={STEP_BUTTON}>
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
