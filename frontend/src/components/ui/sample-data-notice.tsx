import { Info } from "lucide-react";

// Shown on every screen that still renders from a sample-data.ts file, so
// nobody mistakes placeholder figures for real business data. Remove it from
// a page when that page is wired to the backend.
export function SampleDataNotice() {
  return (
    <p className="flex items-center gap-2 rounded-full bg-warning-tint/70 px-4 py-2 text-[13px] font-semibold text-warning-strong ring-1 ring-warning/15 ring-inset">
      <Info aria-hidden="true" className="size-4 shrink-0" />
      Sample data. This screen is not connected to the database yet.
    </p>
  );
}
