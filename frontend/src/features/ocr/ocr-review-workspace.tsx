"use client";

import { useState } from "react";
import { DocumentPreview } from "./document-preview";
import { ExtractedDataPanel } from "./extracted-data-panel";
import { ReviewQueue } from "./review-queue";
import type { ChainLink, ExtractedField, QueuedDocument } from "./sample-data";

interface OcrReviewWorkspaceProps {
  queue: QueuedDocument[];
  fields: ExtractedField[];
  shipment: { reference: string; matchedOn: string };
  chain: ChainLink[];
}

// Holds which queued document is open. With sample data every document shows
// the same extracted fields; the backend will return them per document.
export function OcrReviewWorkspace({ queue, fields, shipment, chain }: OcrReviewWorkspaceProps) {
  const [selectedId, setSelectedId] = useState(queue[0].id);
  const selected = queue.find((document) => document.id === selectedId) ?? queue[0];

  return (
    <>
      <ReviewQueue documents={queue} selectedId={selected.id} onSelect={setSelectedId} />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <DocumentPreview fileName={selected.fileName} />
        <ExtractedDataPanel key={selected.id} detectedType={selected.detectedType} fields={fields} shipment={shipment} chain={chain} />
      </div>
    </>
  );
}
