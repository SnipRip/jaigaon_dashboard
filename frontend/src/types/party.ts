// A customer or vendor as the backend returns it (backend/src/parties).
export interface PartyView {
  id: string;
  isCustomer: boolean;
  isVendor: boolean;
  kind: "BUSINESS" | "INDIVIDUAL";
  displayName: string;
  legalName: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  treatment: "REGISTERED" | "COMPOSITION" | "UNREGISTERED" | "CONSUMER" | "OVERSEAS" | "SEZ";
  gstin: string | null;
  pan: string | null;
  placeOfSupply: string | null;
  country: string | null;
  foreignTaxId: string | null;
  currency: "INR" | "BTN";
  exportRoute: "LUT" | "IGST" | null;
  isGta: boolean;
  addressLine: string | null;
  city: string | null;
  pin: string | null;
  creditDays: number;
  creditLimit: number | null;
  /** Customers only. */
  priceLevelId: string | null;
  openingBalance: number;
  openingBalanceSide: "RECEIVABLE" | "PAYABLE";
  udyamNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  ifsc: string | null;
  notes: string | null;
  isArchived: boolean;
  /** What they owe us; negative when we owe them. Opening balance until postings exist. */
  balance: number;
}
