import { CardTitle, GlassCard } from "@/components/ui/glass-card";

// Where the uploaded scan, PDF or photo will be shown beside its extracted
// data. A viewer with zoom, rotate and field highlighting replaces this
// placeholder when document storage is built.
export function DocumentPreview({ fileName }: { fileName: string }) {
  return (
    <GlassCard aria-label="Original document" className="flex flex-col gap-3.5">
      <CardTitle>Original document</CardTitle>
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-field-border bg-white/70 p-6 text-center">
        <span className="text-sm font-extrabold">{fileName}</span>
        <span className="max-w-xs text-[13px] font-semibold text-muted">
          The original file is shown here, and is always kept. Selecting a field highlights where it was read from.
        </span>
      </div>
    </GlassCard>
  );
}
