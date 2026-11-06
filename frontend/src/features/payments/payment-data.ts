// The sample invoices and bills as open documents, for the dashboard and
// reports until they move to real data. The payments pages use the backend.
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { invoices } from "@/features/invoices/sample-data";
import { parties } from "@/features/parties/sample-data";
import { bills } from "@/features/purchases/sample-data";
import { billDocuments, invoiceDocuments } from "./open-documents";
import { receipts } from "./sample-data";

export const receivable = invoiceDocuments(invoices, parties, receipts, COMPANY_TAX_PROFILE.stateCode);
export const payable = billDocuments(bills, parties, COMPANY_TAX_PROFILE.stateCode);
