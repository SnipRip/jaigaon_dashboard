import clsx from "clsx";
import type { ReactNode } from "react";

interface FilterGroupProps {
  /** Read by screen readers: what the options choose between. */
  label: string;
  children: ReactNode;
  className?: string;
}

/** The recessed track a row of FilterChips sits in, so filters never look like buttons. */
export function FilterGroup({ label, children, className }: FilterGroupProps) {
  return (
    <div role="group" aria-label={label} className={clsx("segment-track self-start", className)}>
      {children}
    </div>
  );
}
