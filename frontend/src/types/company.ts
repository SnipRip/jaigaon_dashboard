// Our own company profile as the backend returns it (backend/src/company-profile).
export interface CompanyProfileView {
  legalName: string;
  tradeName: string | null;
  gstin: string | null;
  pan: string | null;
  /** GST state code of our registration, e.g. "19". */
  stateCode: string;
  iec: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  pin: string | null;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  exportBank: string | null;
  customsStation: string | null;
  portCode: string | null;
  defaultExportRoute: "LUT" | "IGST";
  exportCurrency: "INR" | "BTN";
  updatedAt: string;
}
