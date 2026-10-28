import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { OcrReviewWorkspace } from "@/features/ocr/ocr-review-workspace";
import { documentChain, extractedFields, matchedShipment, reviewQueue } from "@/features/ocr/sample-data";

export const metadata: Metadata = { title: "OCR inbox" };

export default function OcrInboxPage() {
  return (
    <>
      <SampleDataNotice />
      <OcrReviewWorkspace queue={reviewQueue} fields={extractedFields} shipment={matchedShipment} chain={documentChain} />
    </>
  );
}
