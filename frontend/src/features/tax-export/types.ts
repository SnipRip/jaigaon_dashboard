import type { ExportRoute } from "@/features/gst/gst-rules";

/**
 * One financial year's export registrations: the LUT (filed on the GST
 * portal, form RFD-11) and the AD code, which the client says is issued
 * afresh every year (28 Oct 2026).
 */
export interface Lut {
  arn: string;
  adCode?: string;
  financialYear: string;
  validFrom: string;
  validTo: string;
}

export interface ExportSettings {
  /** Importer-Exporter Code from DGFT. */
  iec: string;
  /** Bank that receives export payments. The AD code itself is per year, on Lut. */
  adBank: string;
  customsStation: string;
  portCode: string;
  defaultRoute: ExportRoute;
  invoiceCurrency: "INR" | "BTN";
}

/** A document an export needs, and the screen where its number is entered. */
export interface ExportDocumentType {
  id: string;
  name: string;
  issuedBy: string;
  holds: string;
  whenNeeded: string;
  capturedOn: "Export invoice" | "Shipment" | "Payment receipt";
}
