// The export documents register on the backend (GET /documents/register) and
// the names the screen shows. Which papers are required, and whether one holds
// a truck, is decided on the server (backend/src/document-register).
import { documentName } from "@/features/shipments/shipments-api";
import type { DispatchDocumentKindView } from "@/types/invoice";
import type { NeededByView, RegisterEntryView, RegisterKindView } from "@/types/document-register";

export const DOCUMENT_REGISTER_PATH = "/documents/register";

const PURCHASE_KIND_NAMES: Record<"VENDOR_BILL" | "PURCHASE_EWAY_BILL", string> = {
  VENDOR_BILL: "Vendor bill",
  PURCHASE_EWAY_BILL: "E-way bill (purchase)",
};

export const registerKindName = (kind: RegisterKindView) =>
  kind === "VENDOR_BILL" || kind === "PURCHASE_EWAY_BILL" ? PURCHASE_KIND_NAMES[kind] : documentName(kind);

/** Every kind the register can hold, in the order papers happen. */
export const REGISTER_KINDS: RegisterKindView[] = [
  "E_INVOICE",
  "LORRY_CHALLAN",
  "EWAY_BILL",
  "CUSTOMS_INVOICE",
  "PACKING_LIST",
  "SHIPPING_BILL",
  "LEO",
  "BRC",
  "VENDOR_BILL",
  "PURCHASE_EWAY_BILL",
];

/** Short column heads for the papers-per-shipment grid. */
export const PAPER_SHORT_NAMES: Record<DispatchDocumentKindView, string> = {
  E_INVOICE: "IRN",
  LORRY_CHALLAN: "Challan",
  EWAY_BILL: "E-way bill",
  CUSTOMS_INVOICE: "Customs inv.",
  PACKING_LIST: "Packing list",
  SHIPPING_BILL: "Shipping bill",
  LEO: "LEO",
  BRC: "BRC",
};

export const NEEDED_BY_LABEL: Record<NeededByView, string> = {
  IN_TRANSIT: "Before the goods leave",
  AT_BORDER: "At the border",
  CLEARED: "For customs clearance",
  PAYMENT: "Once the payment is in",
};

export const ownerHref = (owner: RegisterEntryView["owner"]) => (owner.type === "INVOICE" ? `/invoices/${owner.id}` : `/purchases/${owner.id}`);
