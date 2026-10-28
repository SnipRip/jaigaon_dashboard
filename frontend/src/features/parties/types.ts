// Customers and vendors share one shape, as Zoho's contacts do; `roles` says
// which they are, and one party can be both.
import type { ExportRoute, GstTreatment } from "@/features/gst/gst-rules";

export type PartyRole = "customer" | "vendor";

export interface Address {
  line1: string;
  city: string;
  /** GST state code for India. */
  stateCode?: string;
  /** Outside India only. */
  country?: string;
  pin?: string;
}

export interface Party {
  id: string;
  roles: PartyRole[];
  kind: "business" | "individual";
  displayName: string;
  legalName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  whatsappOptIn?: boolean;

  treatment: GstTreatment;
  gstin?: string;
  pan?: string;
  /** Place of supply: GST state code. Overseas parties have none. */
  placeOfSupply?: string;
  /** Overseas: the buyer's own tax ID, e.g. Bhutan TPN. */
  foreignTaxId?: string;
  currency: "INR" | "BTN";
  exportRoute?: ExportRoute;

  billing: Address;
  shipping?: Address;

  creditDays: number;
  openingBalance: number;
  /** Customers. */
  creditLimit?: number;
  priceLevel?: string;
  /** Vendors. */
  udyamNumber?: string;
  isGta?: boolean;
  bankAccount?: { name: string; number: string; ifsc: string };

  /** Customers: what they owe. Vendors: what we owe. */
  outstanding: number;
  notes?: string;
}
