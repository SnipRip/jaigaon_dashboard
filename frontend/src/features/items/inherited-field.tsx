import type { ReactNode } from "react";
import { fieldLabelClasses } from "@/components/ui/text-field";
import { SOURCE_LABEL } from "./item-rules";
import type { ResolvedValue } from "./types";

interface InheritedFieldProps {
  label: string;
  /** What applies when this level sets nothing: the value one level up. */
  inherited: ResolvedValue<string | number>;
  /** How to show the inherited value, e.g. "18%". */
  format?: (value: string | number) => string;
  overridden: boolean;
  onOverride: () => void;
  onReset: () => void;
  /** "item" or "item group": the level being edited. */
  levelName?: string;
  /** The editor shown once the value is overridden here. */
  children: ReactNode;
}

// A value that normally comes down from the category tree. It shows the
// inherited value and where it comes from; "Change for this item" swaps in an
// editor, and "Use inherited" goes back.
export function InheritedField({
  label,
  inherited,
  format = String,
  overridden,
  onOverride,
  onReset,
  levelName = "item",
  children,
}: InheritedFieldProps) {
  if (overridden) {
    return (
      <div className="flex flex-col gap-1.5">
        {children}
        <button type="button" onClick={onReset} className="self-start text-xs font-bold text-brand hover:underline">
          Use inherited
          {inherited.value !== undefined && ` (${format(inherited.value)}, ${SOURCE_LABEL[inherited.source].toLowerCase()})`}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={fieldLabelClasses}>{label}</span>
      <div className="glass-inset flex h-11 items-center justify-between gap-2 rounded-full px-4">
        <span className="truncate text-sm font-bold">
          {inherited.value === undefined ? <span className="text-muted">Not set</span> : format(inherited.value)}
        </span>
        <span className="shrink-0 text-xs font-semibold text-muted">{SOURCE_LABEL[inherited.source]}</span>
      </div>
      <button type="button" onClick={onOverride} className="self-start text-xs font-bold text-brand hover:underline">
        {inherited.value === undefined ? "Set" : "Change"} for this {levelName}
      </button>
    </div>
  );
}
