import { Info } from "lucide-react";

// Shown on every screen that still renders from a sample-data.ts file, so
// nobody mistakes placeholder figures for real business data. Remove it from
// a page when that page is wired to the backend. `children` replaces the
// text on a screen that is only partly sample data.
export function SampleDataNotice({ children }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-(--radius-tile) bg-warning-tint/85 px-3 py-1.5 text-[12.5px] font-medium text-warning-strong ring-1 ring-warning/20 ring-inset">
      <Info aria-hidden="true" className="size-4 shrink-0" />
      {children ?? "Sample data. This screen is not connected to the database yet."}
    </p>
  );
}
