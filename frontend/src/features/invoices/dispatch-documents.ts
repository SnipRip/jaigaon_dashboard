// The documents attached to an invoice after it is issued, in the order they
// happen: e-invoice registration (IRN), load and move (challan, e-way bill), customs (customs invoice,
// packing list, shipping bill, LEO), then money (BRC). Local invoices only
// use the movement documents.
import type { DispatchDocumentKind, InvoiceKind } from "./types";

export interface DocumentField {
  key: string;
  label: string;
  placeholder?: string;
  /** Checked on entry; message shown when it fails. */
  pattern?: RegExp;
  message?: string;
  inputMode?: "text" | "numeric" | "decimal";
}

export interface DispatchDocumentType {
  kind: DispatchDocumentKind;
  name: string;
  /** Short line under the name. */
  purpose: string;
  stage: "E-invoice" | "Dispatch" | "Customs" | "Payment";
  for: InvoiceKind[];
  numberLabel: string;
  numberPattern?: RegExp;
  numberMessage?: string;
  fields: DocumentField[];
}

export const DISPATCH_DOCUMENTS: DispatchDocumentType[] = [
  {
    kind: "e-invoice",
    name: "E-invoice (IRN)",
    purpose: "Registered on the e-invoice portal: the IRN, acknowledgement and signed QR code go on the bill. Needed because turnover is above ₹5 crore",
    stage: "E-invoice",
    for: ["local", "export"],
    numberLabel: "IRN",
    numberPattern: /^[0-9a-f]{64}$/i,
    numberMessage: "The IRN is 64 letters and digits",
    fields: [{ key: "ackNo", label: "Acknowledgement number", inputMode: "numeric", pattern: /^\d{15}$/, message: "15 digits" }],
  },
  {
    kind: "lorry-challan",
    name: "Lorry hire challan",
    purpose: "The truck hired to carry the goods",
    stage: "Dispatch",
    for: ["local", "export"],
    numberLabel: "Challan / LR number",
    fields: [
      { key: "transporter", label: "Transporter", placeholder: "Royal Transport Lines" },
      {
        key: "vehicle",
        label: "Vehicle number",
        placeholder: "WB73E1234",
        pattern: /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/i,
        message: "Like WB73E1234, no spaces",
      },
      { key: "freight", label: "Freight (₹)", inputMode: "decimal", pattern: /^\d+(\.\d{1,2})?$/, message: "Enter an amount" },
    ],
  },
  {
    kind: "eway-bill",
    name: "E-way bill",
    purpose: "Needed above ₹50,000 to move goods by road; for exports, up to the border",
    stage: "Dispatch",
    for: ["local", "export"],
    numberLabel: "E-way bill number",
    numberPattern: /^\d{12}$/,
    numberMessage: "An e-way bill number is 12 digits",
    fields: [{ key: "validUntil", label: "Valid until", placeholder: "YYYY-MM-DD", pattern: /^\d{4}-\d{2}-\d{2}$/, message: "Use YYYY-MM-DD" }],
  },
  {
    kind: "customs-invoice",
    name: "Customs invoice",
    purpose: "Invoice for customs with FOB value and 8-digit HS codes",
    stage: "Customs",
    for: ["export"],
    numberLabel: "Customs invoice number",
    fields: [{ key: "fobValue", label: "FOB value (₹)", inputMode: "decimal", pattern: /^\d+(\.\d{1,2})?$/, message: "Enter an amount" }],
  },
  {
    kind: "packing-list",
    name: "Packing list",
    purpose: "Packages, net and gross weight",
    stage: "Customs",
    for: ["export"],
    numberLabel: "Packing list number",
    fields: [
      { key: "packages", label: "Packages", inputMode: "numeric", pattern: /^\d+$/, message: "Enter a count" },
      { key: "grossKg", label: "Gross weight (kg)", inputMode: "decimal", pattern: /^\d+(\.\d{1,3})?$/, message: "Enter kilograms" },
    ],
  },
  {
    kind: "shipping-bill",
    name: "Shipping bill",
    purpose: "Filed by our customs agent at the Jaigaon land customs station; we record its number. Goes into the GST return",
    stage: "Customs",
    for: ["export"],
    numberLabel: "Shipping bill number",
    numberPattern: /^\d{6,8}$/,
    numberMessage: "Usually 7 digits",
    fields: [{ key: "portCode", label: "Port code (Jaigaon LCS is INJIGB)", placeholder: "INJIGB", pattern: /^[A-Z0-9]{6}$/i, message: "6 letters and digits" }],
  },
  {
    kind: "leo",
    name: "LEO (Let Export Order)",
    purpose: "Customs has cleared the goods to leave India",
    stage: "Customs",
    for: ["export"],
    numberLabel: "LEO number",
    fields: [],
  },
  {
    kind: "brc",
    name: "BRC / e-BRC",
    purpose: "The bank's realisation certificate: the export payment has come in. The buyer quotes our invoice number in the payment remarks",
    stage: "Payment",
    for: ["export"],
    numberLabel: "BRC / e-BRC number",
    fields: [
      { key: "amount", label: "Amount realised (₹)", inputMode: "decimal", pattern: /^\d+(\.\d{1,2})?$/, message: "Enter an amount" },
      { key: "bank", label: "Bank", placeholder: "AD bank that received it" },
    ],
  },
];

export const documentsFor = (kind: InvoiceKind) => DISPATCH_DOCUMENTS.filter((type) => type.for.includes(kind));
export const documentType = (kind: DispatchDocumentKind) => DISPATCH_DOCUMENTS.find((type) => type.kind === kind)!;
