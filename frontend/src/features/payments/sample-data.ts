// SAMPLE DATA: receipts against the sample invoices, still read by the
// dashboard and reports (through payment-data.ts) until they move to real
// data. The payments pages use the backend (settlements-api.ts).
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { invoiceTax, invoiceTotals } from "@/features/invoices/invoice-rules";
import { invoices } from "@/features/invoices/sample-data";
import { parties } from "@/features/parties/sample-data";
import type { Settlement } from "./types";

const totalOf = (invoiceId: string) => {
  const invoice = invoices.find((candidate) => candidate.id === invoiceId)!;
  const party = parties.find((candidate) => candidate.id === invoice.partyId)!;
  return invoiceTotals(invoice.lines, invoiceTax(COMPANY_TAX_PROFILE.stateCode, invoice, party).regime).grandTotal;
};

export const receipts: Settlement[] = [
  {
    id: "rct-0028",
    direction: "in",
    number: "RCT/2627/0028",
    date: "2026-10-26",
    partyId: "druk-builders",
    amount: totalOf("exp-2627-0003"),
    mode: "bank-transfer",
    accountId: "sbi-current",
    reference: "Inward remittance, remarks EXP/2627/0003",
    allocations: [{ documentId: "exp-2627-0003", amount: totalOf("exp-2627-0003") }],
    brc: { number: "BRC-SAMPLE-0091", date: "2026-10-26" },
  },
  {
    id: "rct-0029",
    direction: "in",
    number: "RCT/2627/0029",
    date: "2026-10-20",
    partyId: "siliguri-infra",
    amount: 100000,
    mode: "cheque",
    accountId: "sbi-current",
    reference: "Cheque 000451",
    allocations: [{ documentId: "inv-2627-0031", amount: 100000 }],
  },
  {
    id: "rct-0030",
    direction: "in",
    number: "RCT/2627/0030",
    date: "2026-10-26",
    partyId: "walk-in",
    amount: totalOf("inv-2627-0059"),
    mode: "cash",
    accountId: "cash",
    allocations: [{ documentId: "inv-2627-0059", amount: totalOf("inv-2627-0059") }],
  },
];
