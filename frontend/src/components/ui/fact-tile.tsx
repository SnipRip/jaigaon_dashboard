import type { ReactNode } from "react";

/** One labelled fact in the header grid of a document page. Use inside a <dl>. */
export function FactTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="glass-inset px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}
