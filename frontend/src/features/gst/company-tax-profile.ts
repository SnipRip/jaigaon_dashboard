// SAMPLE, for the screens still on sample data (quotations, invoices,
// purchases, payments, reports, dashboard). The real profile is stored
// (backend /company-profile, features/company) and read by the GST & export
// setup screen and the Customers and Vendors screens; each sample screen moves
// to it when it is wired to the backend.
export const COMPANY_TAX_PROFILE = {
  legalName: "Jaigaon Quality Enterprise",
  address: "M.G. Road, Jaigaon 736182, District Alipurduar, West Bengal",
  phone: "+91 96353 12988 · Bhutan +975 7766 7493",
  email: "jaigaonquality.ent@gmail.com",
  stateCode: "19",
  gstin: undefined as string | undefined,
  iec: undefined as string | undefined,
};
