// SAMPLE DATA for GST & export setup. LUT ARNs and AD codes are placeholders,
// not real numbers; the IEC is still to come from the client. Port code
// INJIGB (Jaigaon LCS) was confirmed by the client on 28 Oct 2026. The
// document list follows the accountant's walkthrough
// (transcripts/billing-accounting-2026-10-27.md) and the client's answers of
// 28 Oct 2026 (agent/context.md).
import type { ExportDocumentType, ExportSettings, Lut } from "./types";

export const lutRegister: Lut[] = [
  { arn: "AD1903250000001 (sample)", adCode: "0000001 (sample)", financialYear: "2025-26", validFrom: "2025-04-01", validTo: "2026-03-31" },
  { arn: "AD1904260000002 (sample)", adCode: "0000002 (sample)", financialYear: "2026-27", validFrom: "2026-04-01", validTo: "2027-03-31" },
];

export const exportSettings: ExportSettings = {
  iec: "",
  adBank: "",
  customsStation: "Jaigaon Land Customs Station",
  portCode: "INJIGB",
  defaultRoute: "lut",
  invoiceCurrency: "INR",
};

export const exportDocuments: ExportDocumentType[] = [
  {
    id: "e-invoice",
    name: "E-invoice (IRN)",
    issuedBy: "E-invoice portal",
    holds: "IRN, acknowledgement number and date, signed QR code printed on the bill",
    whenNeeded: "Every export and every B2B local invoice (turnover above ₹5 crore)",
    capturedOn: "Export invoice",
  },
  {
    id: "export-invoice",
    name: "Export tax invoice",
    issuedBy: "Us",
    holds: "Invoice number and date; quotes the LUT ARN, or charges IGST",
    whenNeeded: "Every export",
    capturedOn: "Export invoice",
  },
  {
    id: "customs-invoice",
    name: "Customs / commercial invoice",
    issuedBy: "Us",
    holds: "FOB value, 8-digit HS code, quantity and weight per line, for customs",
    whenNeeded: "Every export",
    capturedOn: "Shipment",
  },
  {
    id: "packing-list",
    name: "Packing list",
    issuedBy: "Us",
    holds: "Packages, marks, net and gross weight",
    whenNeeded: "Every export",
    capturedOn: "Shipment",
  },
  {
    id: "eway-bill",
    name: "E-way bill",
    issuedBy: "Us, on the GST portal",
    holds: "E-way bill number, vehicle number, from and to",
    whenNeeded: "Moving goods to the border, when the invoice is above ₹50,000",
    capturedOn: "Shipment",
  },
  {
    id: "lorry-receipt",
    name: "Lorry receipt / transport document",
    issuedBy: "Transporter",
    holds: "LR number, vehicle number, toll receipts if asked",
    whenNeeded: "Every export by road",
    capturedOn: "Shipment",
  },
  {
    id: "shipping-bill",
    name: "Shipping bill",
    issuedBy: "Customs, filed by our customs agent",
    holds: "Shipping bill number and date, port code (Jaigaon LCS: INJIGB). Goes into the GST return",
    whenNeeded: "Every export; the IGST refund is based on it",
    capturedOn: "Shipment",
  },
  {
    id: "leo",
    name: "LEO (Let Export Order)",
    issuedBy: "Customs",
    holds: "LEO number and date: customs has cleared the goods",
    whenNeeded: "Every export",
    capturedOn: "Shipment",
  },
  {
    id: "brc",
    name: "BRC / e-BRC",
    issuedBy: "Our bank",
    holds: "BRC / e-BRC number, date and amount. The buyer quotes our invoice number in the payment remarks",
    whenNeeded: "After payment; needed to close the export and for refunds",
    capturedOn: "Payment receipt",
  },
];
