import type { ReactNode } from "react";
import { Tooltip } from "./tooltip";

// A square icon button for a table row's actions (edit, archive, delete),
// with its label as a tooltip and for screen readers.
export function IconAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={
          danger
            ? "glass-control glass-press flex size-9 items-center justify-center text-danger-strong hover:bg-danger-tint/80"
            : "glass-control glass-press flex size-9 items-center justify-center text-ink-soft hover:bg-white/80"
        }
      >
        {children}
      </button>
    </Tooltip>
  );
}
