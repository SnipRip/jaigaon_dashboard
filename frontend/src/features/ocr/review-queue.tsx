import clsx from "clsx";
import { LOW_CONFIDENCE_BELOW, type QueuedDocument } from "./sample-data";

interface ReviewQueueProps {
  documents: QueuedDocument[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Uploaded documents waiting for a person to check the extracted data. */
export function ReviewQueue({ documents, selectedId, onSelect }: ReviewQueueProps) {
  return (
    <section aria-label="Documents waiting for review" className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
      {documents.map((document) => {
        const isSelected = document.id === selectedId;
        const isUnsure = document.typeConfidence < LOW_CONFIDENCE_BELOW;
        return (
          <button
            key={document.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(document.id)}
            className={clsx(
              "glass-press flex flex-col gap-1 px-4 py-3.5 text-left",
              isSelected ? "glass-selected rounded-[18px] text-ink" : "glass-inset hover:bg-white/60",
            )}
          >
            <span className={clsx("text-xs font-extrabold", isUnsure ? "text-warning-strong" : isSelected ? "text-brand" : "text-muted")}>
              {document.detectedType} · {isUnsure ? "type unsure" : `${document.typeConfidence}% match`}
            </span>
            <span className="truncate text-sm font-extrabold">{document.fileName}</span>
            <span className="text-xs font-semibold text-muted">Uploaded {document.uploaded.toLowerCase()}</span>
          </button>
        );
      })}
    </section>
  );
}
