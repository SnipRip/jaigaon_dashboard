// SAMPLE DATA for receipts and vendor payments. Receipt amounts are worked
// out from the sample invoices so they settle them exactly; payments match
// the paid amounts on the sample bills. References are invented.
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

export const vendorPayments: Settlement[] = [
  { id: "pay-0019", direction: "out", number: "PAY/2627/0019", date: "2026-10-12", partyId: "bhoomi-buildings", amount: 200000, mode: "bank-transfer", accountId: "sbi-current", reference: "UTR SBIN0000000019", allocations: [{ documentId: "pur-2627-0012", amount: 200000 }] },
  { id: "pay-0020", direction: "out", number: "PAY/2627/0020", date: "2026-10-12", partyId: "royal-transport", amount: 18000, mode: "bank-transfer", accountId: "sbi-current", reference: "UTR SBIN0000000020", allocations: [{ documentId: "pur-2627-0017", amount: 18000 }] },
  { id: "pay-0021", direction: "out", number: "PAY/2627/0021", date: "2026-10-10", partyId: "jaigaon-loaders", amount: 5000, mode: "cash", accountId: "cash", allocations: [{ documentId: "pur-2627-0018", amount: 5000 }] },
  { id: "pay-0022", direction: "out", number: "PAY/2627/0022", date: "2026-10-16", partyId: "kalchini-bricks", amount: 73600, mode: "cash", accountId: "cash", notes: "Paid on delivery", allocations: [{ documentId: "pur-2627-0015", amount: 73600 }] },
  { id: "pay-0023", direction: "out", number: "PAY/2627/0023", date: "2026-10-20", partyId: "magadh-aac", amount: 203550, mode: "bank-transfer", accountId: "hdfc-od", reference: "UTR HDFC0000000023", allocations: [{ documentId: "pur-2627-0013", amount: 203550 }] },
];

export const nextSequence = { in: 31, out: 24 };
