// SAMPLE DATA for the OCR inbox. Invented documents and values that show the
// shape the OCR pipeline will produce. Replace with backend calls when the
// document-processing module is built.
import type { StatusTone } from "@/components/ui/status-chip";

export const DOCUMENT_TYPES = [
  "Shipping Bill",
  "LEO Copy",
  "Purchase Invoice",
  "Sales Invoice",
  "Packing List",
  "E-Way Bill",
  "Transport Document",
  "Other Supporting Document",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface QueuedDocument {
  id: string;
  fileName: string;
  detectedType: DocumentType;
  /** 0 to 100. Below 80 the type is shown as unsure. */
  typeConfidence: number;
  uploaded: string;
}

export const reviewQueue: QueuedDocument[] = [
  { id: "doc-1", fileName: "scan_1310_0931.pdf", detectedType: "Shipping Bill", typeConfidence: 96, uploaded: "Today, 9:31 am" },
  { id: "doc-2", fileName: "scan_1310_0934.pdf", detectedType: "Shipping Bill", typeConfidence: 91, uploaded: "Today, 9:34 am" },
  { id: "doc-3", fileName: "IMG_20261012_1702.jpg", detectedType: "LEO Copy", typeConfidence: 88, uploaded: "Yesterday" },
  { id: "doc-4", fileName: "hind_tmt_bill.jpg", detectedType: "Purchase Invoice", typeConfidence: 58, uploaded: "Yesterday" },
];

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  /** 0 to 100. Below 80 the field is flagged for checking. */
  confidence: number;
}

export const LOW_CONFIDENCE_BELOW = 80;

export const extractedFields: ExtractedField[] = [
  { key: "shippingBillNo", label: "Shipping Bill no.", value: "SB/JGN/004471", confidence: 97 },
  { key: "shippingBillDate", label: "Shipping Bill date", value: "12 Oct 2026", confidence: 95 },
  { key: "invoiceNo", label: "Invoice no.", value: "EXP/26-27/0191", confidence: 93 },
  { key: "consignee", label: "Consignee", value: "Tashi Construction, Thimphu", confidence: 90 },
  { key: "vehicleNo", label: "Vehicle no.", value: "WB 73 E 4471", confidence: 94 },
  { key: "totalValue", label: "Total value", value: "₹4,82,600", confidence: 61 },
];

export const matchedShipment = {
  reference: "SHP-0413",
  matchedOn: "invoice number and vehicle number",
};

export interface ChainLink {
  label: string;
  state: "linked" | "current" | "missing";
}

export const CHAIN_TONE: Record<ChainLink["state"], StatusTone> = {
  linked: "success",
  current: "brand",
  missing: "warning",
};

/** Invoice → Shipping Bill → LEO → Packing List → E-Way Bill → Transport Document. */
export const documentChain: ChainLink[] = [
  { label: "Invoice", state: "linked" },
  { label: "Shipping Bill", state: "current" },
  { label: "LEO copy", state: "missing" },
  { label: "Packing list", state: "linked" },
  { label: "E-Way Bill", state: "linked" },
  { label: "Transport document", state: "missing" },
];
