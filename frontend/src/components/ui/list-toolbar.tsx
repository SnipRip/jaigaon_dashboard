import type { ReactNode } from "react";

interface ListToolbarProps {
  /** Search and filters, on the left. */
  children: ReactNode;
  /** Buttons, on the right; put the main action last. */
  actions?: ReactNode;
}

// The row above a list table: what narrows the list on the left, what acts on
// it on the right, so filters and buttons never share a place or a look.
// Sits at the top of a GlassCard; on a narrow screen the two halves wrap.
export function ListToolbar({ children, actions }: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-[1_1_420px] flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
