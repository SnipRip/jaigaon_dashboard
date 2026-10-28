import type { ReactNode } from "react";

/** One labelled fact in the header grid of a document page. Use inside a <dl>. */
export function FactTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="glass-inset rounded-[18px] p-3">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="font-extrabold">{children}</dd>
    </div>
  );
}
