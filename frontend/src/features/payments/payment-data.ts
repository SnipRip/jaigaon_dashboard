// The sample invoices and bills as open documents, and lookup names, shared
// by the payment pages. Becomes backend queries later.
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { invoices } from "@/features/invoices/sample-data";
import { moneyAccounts } from "@/features/masters/sample-data";
import { parties } from "@/features/parties/sample-data";
import { bills } from "@/features/purchases/sample-data";
import { billDocuments, invoiceDocuments } from "./open-documents";
import { receipts } from "./sample-data";

export const receivable = invoiceDocuments(invoices, parties, receipts, COMPANY_TAX_PROFILE.stateCode);
export const payable = billDocuments(bills, parties, COMPANY_TAX_PROFILE.stateCode);

export const accountOptions = moneyAccounts.filter((account) => !account.archived).map((account) => ({ value: account.id, label: account.name }));

export const partyOptions = (role: "customer" | "vendor") =>
  parties.filter((party) => party.roles.includes(role)).map((party) => ({ value: party.id, label: party.displayName }));

/** Party and account id → name. */
export const names: Record<string, string> = Object.fromEntries([
  ...parties.map((party) => [party.id, party.displayName]),
  ...moneyAccounts.map((account) => [account.id, account.name]),
]);

/** Invoice and bill id → number. */
export const documentNumbers: Record<string, string> = Object.fromEntries([
  ...invoices.map((invoice) => [invoice.id, invoice.number]),
  ...bills.map((bill) => [bill.id, bill.reference]),
]);
